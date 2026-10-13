package com.screencontrol.shakevolume.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorManager
import android.media.AudioManager
import android.media.VolumeProvider
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.screencontrol.shakevolume.MainActivity
import com.screencontrol.shakevolume.R
import com.screencontrol.shakevolume.receiver.ScreenStateReceiver
import com.screencontrol.shakevolume.sensor.ShakeDetector
import com.screencontrol.shakevolume.util.PowerUtils
import com.screencontrol.shakevolume.util.PreferencesManager

/**
 * Long-lived foreground service maintaining:
 * 1. Accelerometer sensor monitoring for intentional shake-to-wake / shake-to-lock gestures.
 * 2. MediaSession hardware volume key routing to wake the screen when screen is off,
 *    and passing volume directly through when screen is on.
 * 3. Partial WakeLock to prevent CPU suspension during background sensor and key processing.
 */
class ScreenControlForegroundService : Service() {

    private lateinit var preferencesManager: PreferencesManager
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var shakeDetector: ShakeDetector? = null

    private var screenStateReceiver: ScreenStateReceiver? = null
    private var partialWakeLock: PowerManager.WakeLock? = null
    private var mediaSession: MediaSession? = null

    companion object {
        private const val TAG = "ScreenCtrlService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "screen_control_service_channel"

        const val ACTION_START = "com.screencontrol.action.START"
        const val ACTION_STOP = "com.screencontrol.action.STOP"
        const val ACTION_SETTINGS_CHANGED = "com.screencontrol.action.SETTINGS_CHANGED"

        var isRunning: Boolean = false
            private set
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "ScreenControlForegroundService created.")
        preferencesManager = PreferencesManager(this)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager

        // Attempt to find a hardware wake-up sensor first (supported on modern SoCs)
        accelerometer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER, true)
                ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        } else {
            sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }

        setupShakeDetector()
        setupMediaSession()
        registerScreenStateReceiver()
        acquirePartialWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        when (action) {
            ACTION_STOP -> {
                Log.i(TAG, "Received ACTION_STOP. Shutting down foreground service.")
                stopForegroundService()
                return START_NOT_STICKY
            }
            ACTION_SETTINGS_CHANGED -> {
                updateSettings()
            }
            else -> {
                startInForeground()
                startSensorListening()
                updateMediaSessionVolumeRouting(PowerUtils.isScreenInteractive(this))
                isRunning = true
            }
        }

        return START_STICKY
    }

    private fun startInForeground() {
        createNotificationChannel()

        val openActivityIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openActivityIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Shake & Volume Screen Control")
            .setContentText("Monitoring motion & buttons for screen control")
            .setSmallIcon(R.drawable.ic_shake)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screen Control Background Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps shake-to-wake and volume wake active in background"
                setShowBadge(false)
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun setupShakeDetector() {
        shakeDetector = ShakeDetector(
            threshold = preferencesManager.shakeThreshold,
            cooldownMs = preferencesManager.shakeCooldownMs
        ) {
            handleShakeTriggered()
        }
    }

    private fun handleShakeTriggered() {
        if (!preferencesManager.isShakeToWakeEnabled) {
            Log.d(TAG, "Shake detected but feature is disabled in preferences.")
            return
        }

        val isScreenOn = PowerUtils.isScreenInteractive(this)
        Log.i(TAG, "Shake trigger activated! Current screen interactive: $isScreenOn")

        if (isScreenOn) {
            // Screen is currently ON -> turn screen OFF
            PowerUtils.turnScreenOff(this)
        } else {
            // Screen is currently OFF -> turn screen ON
            PowerUtils.turnScreenOn(this)
        }
    }

    /**
     * Initializes MediaSession.
     * When screen is OFF, MediaSession intercepts hardware Volume UP button presses.
     * When screen is ON, it releases remote volume handling to Android's native audio stream.
     */
    private fun setupMediaSession() {
        try {
            mediaSession = MediaSession(this, "ShakeVolumeMediaSession").apply {
                setCallback(object : MediaSession.Callback() {})
                val playbackState = PlaybackState.Builder()
                    .setState(PlaybackState.STATE_PLAYING, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                    .setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE)
                    .build()
                setPlaybackState(playbackState)
                isActive = true
            }
            updateMediaSessionVolumeRouting(PowerUtils.isScreenInteractive(this))
            Log.i(TAG, "MediaSession initialized successfully for hardware key routing.")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing MediaSession: ${e.message}")
        }
    }

    /**
     * Updates MediaSession routing based on current display state:
     * - Screen OFF: Remote VolumeProvider captures Volume UP to wake screen.
     * - Screen ON: Native Local stream playback allows normal Volume UP adjustment.
     */
    private fun updateMediaSessionVolumeRouting(isScreenOn: Boolean) {
        val session = mediaSession ?: return

        if (!preferencesManager.isVolumeUpToWakeEnabled) {
            // Feature disabled: always use local native volume
            session.setPlaybackToLocal(AudioManager.STREAM_MUSIC)
            return
        }

        if (!isScreenOn) {
            // Screen is OFF: capture volume key events
            val volumeProvider = object : VolumeProvider(VOLUME_CONTROL_RELATIVE, 100, 50) {
                override fun onAdjustVolume(direction: Int) {
                    Log.d(TAG, "MediaSession VolumeProvider onAdjustVolume: direction=$direction")
                    if (direction > 0 && preferencesManager.isVolumeUpToWakeEnabled) {
                        // Volume UP pressed while screen is OFF -> wake display!
                        Log.i(TAG, "Hardware Volume UP pressed while screen OFF -> Waking screen...")
                        PowerUtils.turnScreenOn(applicationContext)
                    }
                }
            }
            session.setPlaybackToRemote(volumeProvider)
            Log.d(TAG, "MediaSession routed to remote VolumeProvider (Screen OFF mode).")
        } else {
            // Screen is ON: restore native system volume handling
            session.setPlaybackToLocal(AudioManager.STREAM_MUSIC)
            Log.d(TAG, "MediaSession routed to local STREAM_MUSIC (Screen ON mode - normal volume).")
        }
    }

    private fun startSensorListening() {
        val sensor = accelerometer
        if (sensor == null) {
            Log.e(TAG, "No Accelerometer sensor available on this device!")
            return
        }

        if (!preferencesManager.isShakeToWakeEnabled) {
            Log.d(TAG, "Shake detection disabled, skipping sensor registration.")
            return
        }

        shakeDetector?.let { detector ->
            val registered = sensorManager.registerListener(
                detector,
                sensor,
                SensorManager.SENSOR_DELAY_UI
            )
            Log.i(TAG, "Sensor listener registered: $registered (Wake-up sensor: ${sensor.isWakeUpSensor})")
        }
    }

    private fun stopSensorListening() {
        shakeDetector?.let { detector ->
            sensorManager.unregisterListener(detector)
            Log.i(TAG, "Sensor listener unregistered.")
        }
    }

    private fun updateSettings() {
        shakeDetector?.apply {
            updateThreshold(preferencesManager.shakeThreshold)
            updateCooldown(preferencesManager.shakeCooldownMs)
        }

        if (preferencesManager.isShakeToWakeEnabled) {
            startSensorListening()
        } else {
            stopSensorListening()
        }

        updateMediaSessionVolumeRouting(PowerUtils.isScreenInteractive(this))
    }

    private fun acquirePartialWakeLock() {
        if (partialWakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            partialWakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ShakeVolume:ForegroundServiceWakeLock"
            )?.apply {
                setReferenceCounted(false)
                acquire()
            }
            Log.d(TAG, "Partial WakeLock acquired.")
        }
    }

    private fun releasePartialWakeLock() {
        partialWakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.d(TAG, "Partial WakeLock released.")
            }
        }
        partialWakeLock = null
    }

    private fun registerScreenStateReceiver() {
        screenStateReceiver = ScreenStateReceiver { isScreenOn ->
            Log.d(TAG, "Screen state broadcast received: isScreenOn=$isScreenOn")
            updateMediaSessionVolumeRouting(isScreenOn)
        }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        registerReceiver(screenStateReceiver, filter)
    }

    private fun unregisterScreenStateReceiver() {
        screenStateReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: IllegalArgumentException) {
                // Already unregistered
            }
        }
        screenStateReceiver = null
    }

    private fun stopForegroundService() {
        isRunning = false
        stopSensorListening()
        unregisterScreenStateReceiver()
        releasePartialWakeLock()

        mediaSession?.apply {
            isActive = false
            release()
        }
        mediaSession = null

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForegroundService()
        Log.i(TAG, "ScreenControlForegroundService destroyed.")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
