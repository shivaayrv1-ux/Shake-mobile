export interface AndroidProjectFile {
  path: string;
  name: string;
  type: 'kotlin' | 'xml' | 'gradle' | 'markdown' | 'properties';
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    path: 'app/src/main/java/com/screencontrol/shakevolume/MainActivity.kt',
    name: 'MainActivity.kt',
    type: 'kotlin',
    description: 'Main UI Activity handling toggles, status indicators, and permission setup',
    content: `package com.screencontrol.shakevolume

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.screencontrol.shakevolume.databinding.ActivityMainBinding
import com.screencontrol.shakevolume.service.ScreenAccessibilityService
import com.screencontrol.shakevolume.service.ScreenControlForegroundService
import com.screencontrol.shakevolume.util.PreferencesManager

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: PreferencesManager

    private val requestNotificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                syncServiceState()
            } else {
                Toast.makeText(this, "Notification permission needed for foreground service", Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = PreferencesManager(this)

        setupUI()
        setupListeners()
        requestNotificationPermissionIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        updatePermissionIndicators()
        updateFeatureStatuses()
    }

    private fun setupUI() {
        binding.switchShake.isChecked = prefs.isShakeToWakeEnabled
        binding.switchVolumeUp.isChecked = prefs.isVolumeUpToWakeEnabled

        updatePermissionIndicators()
        updateFeatureStatuses()
        syncServiceState()
    }

    private fun setupListeners() {
        // Toggle 1: Enable Shake to Wake
        binding.switchShake.setOnCheckedChangeListener { _, isChecked ->
            prefs.isShakeToWakeEnabled = isChecked
            updateFeatureStatuses()
            syncServiceState()
            val msg = if (isChecked) "Shake to Wake enabled" else "Shake to Wake disabled"
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }

        // Toggle 2: Enable Volume UP to Wake
        binding.switchVolumeUp.setOnCheckedChangeListener { _, isChecked ->
            prefs.isVolumeUpToWakeEnabled = isChecked
            updateFeatureStatuses()
            val msg = if (isChecked) "Volume UP to Wake enabled" else "Volume UP to Wake disabled"
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }

        binding.btnOpenAccessibility.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            try {
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Unable to open Accessibility Settings directly", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnDisableBatteryOpt.setOnClickListener {
            requestIgnoreBatteryOptimization()
        }
    }

    private fun syncServiceState() {
        val shouldRun = prefs.isShakeToWakeEnabled

        val serviceIntent = Intent(this, ScreenControlForegroundService::class.java)
        if (shouldRun) {
            serviceIntent.action = ScreenControlForegroundService.ACTION_START
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this, serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } else {
            serviceIntent.action = ScreenControlForegroundService.ACTION_STOP
            startService(serviceIntent)
        }
    }

    private fun updateFeatureStatuses() {
        val isShakeOn = prefs.isShakeToWakeEnabled
        val isVolumeOn = prefs.isVolumeUpToWakeEnabled
        val isAccessibilityEnabled = isAccessibilityServiceEnabled()

        // Update Feature 1 (Shake to Wake)
        if (isShakeOn) {
            binding.indicatorShake.setBackgroundResource(R.drawable.dot_active)
            binding.tvShakeStatus.text = getString(R.string.status_active)
            binding.tvShakeStatus.setTextColor(ContextCompat.getColor(this, R.color.status_green))
        } else {
            binding.indicatorShake.setBackgroundResource(R.drawable.dot_gray)
            binding.tvShakeStatus.text = getString(R.string.status_disabled)
            binding.tvShakeStatus.setTextColor(ContextCompat.getColor(this, R.color.status_gray))
        }

        // Update Feature 2 (Volume UP to Wake)
        if (!isVolumeOn) {
            binding.indicatorVolume.setBackgroundResource(R.drawable.dot_gray)
            binding.tvVolumeStatus.text = getString(R.string.status_disabled)
            binding.tvVolumeStatus.setTextColor(ContextCompat.getColor(this, R.color.status_gray))
        } else if (!isAccessibilityEnabled) {
            binding.indicatorVolume.setBackgroundResource(R.drawable.dot_amber)
            binding.tvVolumeStatus.text = getString(R.string.status_permission_needed)
            binding.tvVolumeStatus.setTextColor(ContextCompat.getColor(this, R.color.status_amber))
        } else {
            binding.indicatorVolume.setBackgroundResource(R.drawable.dot_active)
            binding.tvVolumeStatus.text = "Active (Screen Dim/Standby)"
            binding.tvVolumeStatus.setTextColor(ContextCompat.getColor(this, R.color.status_green))
        }

        // Global Engine Badge
        if (isShakeOn || (isVolumeOn && isAccessibilityEnabled)) {
            binding.tvGlobalEngineBadge.text = "ONLINE"
            binding.tvGlobalEngineBadge.setTextColor(ContextCompat.getColor(this, R.color.status_green))
        } else {
            binding.tvGlobalEngineBadge.text = "STANDBY"
            binding.tvGlobalEngineBadge.setTextColor(ContextCompat.getColor(this, R.color.status_gray))
        }
    }

    private fun updatePermissionIndicators() {
        val isAccessEnabled = isAccessibilityServiceEnabled()
        if (isAccessEnabled) {
            binding.tvAccessibilityStatus.text = "Enabled & Connected"
            binding.tvAccessibilityStatus.setTextColor(ContextCompat.getColor(this, R.color.status_green))
            binding.btnOpenAccessibility.text = getString(R.string.permission_granted)
            binding.btnOpenAccessibility.isEnabled = false
        } else {
            binding.tvAccessibilityStatus.text = "Required for native screen lock & key events"
            binding.tvAccessibilityStatus.setTextColor(ContextCompat.getColor(this, R.color.text_tertiary))
            binding.btnOpenAccessibility.text = getString(R.string.permission_required)
            binding.btnOpenAccessibility.isEnabled = true
        }

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isBatteryIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            powerManager?.isIgnoringBatteryOptimizations(packageName) ?: false
        } else {
            true
        }

        if (isBatteryIgnored) {
            binding.tvBatteryStatus.text = "Unrestricted (Doze safe)"
            binding.tvBatteryStatus.setTextColor(ContextCompat.getColor(this, R.color.status_green))
            binding.btnDisableBatteryOpt.text = getString(R.string.permission_granted)
            binding.btnDisableBatteryOpt.isEnabled = false
        } else {
            binding.tvBatteryStatus.text = "Optimized (May sleep on screen off)"
            binding.tvBatteryStatus.setTextColor(ContextCompat.getColor(this, R.color.text_tertiary))
            binding.btnDisableBatteryOpt.text = getString(R.string.permission_required)
            binding.btnDisableBatteryOpt.isEnabled = true
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        if (ScreenAccessibilityService.isServiceRunning()) return true

        val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager ?: return false
        val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
        val expectedServiceName = "\${packageName}/\${ScreenAccessibilityService::class.java.canonicalName}"

        for (service in enabledServices) {
            if (service.id.equals(expectedServiceName, ignoreCase = true) ||
                service.resolveInfo.serviceInfo.packageName == packageName
            ) {
                return true
            }
        }
        return false
    }

    private fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } catch (e: Exception) {
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                startActivity(fallbackIntent)
            }
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/screencontrol/shakevolume/sensor/ShakeDetector.kt',
    name: 'ShakeDetector.kt',
    type: 'kotlin',
    description: 'Vector magnitude Euclidean shake detection with direction reversal filtering & cooldown',
    content: `package com.screencontrol.shakevolume.sensor

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.os.SystemClock
import android.util.Log
import kotlin.math.sqrt

/**
 * Battery-efficient, robust accelerometer shake detector.
 *
 * Distinguishes intentional vigorous shakes from regular walking or car vibrations by:
 * 1. Computing Euclidean acceleration vector magnitude minus gravity.
 * 2. Requiring rapid directional reversals within a narrow time window.
 * 3. Enforcing a strict post-trigger cooldown period.
 */
class ShakeDetector(
    private var threshold: Float = 13.5f,
    private var cooldownMs: Long = 2000L,
    private val onShakeDetected: () -> Unit
) : SensorEventListener {

    private var lastTriggerTime: Long = 0L
    private var directionChangeCount: Int = 0
    private var lastDirectionChangeTime: Long = 0L
    private var lastX: Float = 0f
    private var lastY: Float = 0f
    private var lastZ: Float = 0f

    companion object {
        private const val TAG = "ShakeDetector"
        private const val GRAVITY_EARTH = 9.80665f
        private const val DIRECTION_CHANGE_WINDOW_MS = 450L
        private const val MIN_DIRECTION_CHANGES = 2
    }

    fun updateThreshold(newThreshold: Float) {
        this.threshold = newThreshold
    }

    fun updateCooldown(newCooldownMs: Long) {
        this.cooldownMs = newCooldownMs
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val now = SystemClock.elapsedRealtime()

        // 1. Check cooldown period
        if (now - lastTriggerTime < cooldownMs) {
            return
        }

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]

        // 2. Vector magnitude calculation
        val totalAcceleration = sqrt(x * x + y * y + z * z)
        val netAcceleration = totalAcceleration - GRAVITY_EARTH

        // 3. Threshold check
        if (netAcceleration > threshold) {
            val deltaX = x - lastX
            val deltaY = y - lastY
            val deltaZ = z - lastZ

            val movementMagnitude = sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ)

            if (movementMagnitude > threshold * 0.75f) {
                if (now - lastDirectionChangeTime < DIRECTION_CHANGE_WINDOW_MS) {
                    directionChangeCount++
                    if (directionChangeCount >= MIN_DIRECTION_CHANGES) {
                        lastTriggerTime = now
                        directionChangeCount = 0
                        Log.d(TAG, "Valid shake detected! NetAcc: $netAcceleration, Count: $directionChangeCount")
                        onShakeDetected.invoke()
                    }
                } else {
                    directionChangeCount = 1
                }
                lastDirectionChangeTime = now
            }
        } else {
            if (now - lastDirectionChangeTime > DIRECTION_CHANGE_WINDOW_MS) {
                directionChangeCount = 0
            }
        }

        lastX = x
        lastY = y
        lastZ = z
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
}`
  },
  {
    path: 'app/src/main/java/com/screencontrol/shakevolume/service/ScreenControlForegroundService.kt',
    name: 'ScreenControlForegroundService.kt',
    type: 'kotlin',
    description: 'Background Foreground Service maintaining accelerometer listener & Partial WakeLock during screen off',
    content: `package com.screencontrol.shakevolume.service

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
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.screencontrol.shakevolume.MainActivity
import com.screencontrol.shakevolume.receiver.ScreenStateReceiver
import com.screencontrol.shakevolume.sensor.ShakeDetector
import com.screencontrol.shakevolume.util.PowerUtils
import com.screencontrol.shakevolume.util.PreferencesManager

class ScreenControlForegroundService : Service() {

    private lateinit var preferencesManager: PreferencesManager
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var shakeDetector: ShakeDetector? = null
    private var screenStateReceiver: ScreenStateReceiver? = null
    private var partialWakeLock: PowerManager.WakeLock? = null

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
        preferencesManager = PreferencesManager(this)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager

        accelerometer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER, true)
                ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        } else {
            sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        }

        setupShakeDetector()
        registerScreenStateReceiver()
        acquirePartialWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        when (action) {
            ACTION_STOP -> {
                stopForegroundService()
                return START_NOT_STICKY
            }
            ACTION_SETTINGS_CHANGED -> {
                updateSettings()
            }
            else -> {
                startInForeground()
                startSensorListening()
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
            .setContentText("Monitoring motion for screen control")
            .setSmallIcon(android.R.drawable.ic_lock_idle_power)
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
                description = "Keeps shake-to-wake and screen control active in background"
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
        if (!preferencesManager.isShakeToWakeEnabled) return

        val isScreenOn = PowerUtils.isScreenInteractive(this)
        Log.i(TAG, "Shake trigger activated! Screen interactive: $isScreenOn")

        if (isScreenOn) {
            PowerUtils.turnScreenOff(this)
        } else {
            PowerUtils.turnScreenOn(this)
        }
    }

    private fun startSensorListening() {
        val sensor = accelerometer ?: return
        shakeDetector?.let { detector ->
            sensorManager.registerListener(detector, sensor, SensorManager.SENSOR_DELAY_UI)
        }
    }

    private fun stopSensorListening() {
        shakeDetector?.let { detector ->
            sensorManager.unregisterListener(detector)
        }
    }

    private fun updateSettings() {
        shakeDetector?.apply {
            updateThreshold(preferencesManager.shakeThreshold)
            updateCooldown(preferencesManager.shakeCooldownMs)
        }
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
        }
    }

    private fun releasePartialWakeLock() {
        partialWakeLock?.let {
            if (it.isHeld) it.release()
        }
        partialWakeLock = null
    }

    private fun registerScreenStateReceiver() {
        screenStateReceiver = ScreenStateReceiver { isScreenOn ->
            Log.d(TAG, "Screen state broadcast: isScreenOn=$isScreenOn")
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
            try { unregisterReceiver(it) } catch (e: Exception) {}
        }
        screenStateReceiver = null
    }

    private fun stopForegroundService() {
        isRunning = false
        stopSensorListening()
        unregisterScreenStateReceiver()
        releasePartialWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForegroundService()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`
  },
  {
    path: 'app/src/main/java/com/screencontrol/shakevolume/service/ScreenAccessibilityService.kt',
    name: 'ScreenAccessibilityService.kt',
    type: 'kotlin',
    description: 'Accessibility Service executing GLOBAL_ACTION_LOCK_SCREEN & intercepting Volume UP key events',
    content: `package com.screencontrol.shakevolume.service

import android.accessibilityservice.AccessibilityService
import android.os.Build
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import com.screencontrol.shakevolume.util.PowerUtils
import com.screencontrol.shakevolume.util.PreferencesManager

class ScreenAccessibilityService : AccessibilityService() {

    private lateinit var preferencesManager: PreferencesManager

    companion object {
        private const val TAG = "ScreenAccessService"
        private var instance: ScreenAccessibilityService? = null

        fun isServiceRunning(): Boolean = instance != null

        fun lockScreen(): Boolean {
            val service = instance ?: return false
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                service.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
            } else {
                false
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        preferencesManager = PreferencesManager(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onKeyEvent(event: KeyEvent?): Boolean {
        if (event == null) return super.onKeyEvent(event)

        val isVolumeUp = event.keyCode == KeyEvent.KEYCODE_VOLUME_UP
        val isActionDown = event.action == KeyEvent.ACTION_DOWN

        if (isVolumeUp && isActionDown) {
            val isVolumeWakeEnabled = preferencesManager.isVolumeUpToWakeEnabled

            if (isVolumeWakeEnabled) {
                val isInteractive = PowerUtils.isScreenInteractive(this)
                if (!isInteractive) {
                    Log.i(TAG, "Volume UP received while screen off. Waking screen...")
                    PowerUtils.turnScreenOn(this)
                    return true
                }
            }
        }

        return super.onKeyEvent(event)
    }
}`
  },
  {
    path: 'app/src/main/java/com/screencontrol/shakevolume/util/PowerUtils.kt',
    name: 'PowerUtils.kt',
    type: 'kotlin',
    description: 'Handles SCREEN_BRIGHT_WAKE_LOCK screen waking and AccessibilityService screen locking',
    content: `package com.screencontrol.shakevolume.util

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.screencontrol.shakevolume.receiver.ScreenAdminReceiver
import com.screencontrol.shakevolume.service.ScreenAccessibilityService

object PowerUtils {

    private const val TAG = "PowerUtils"
    private const val WAKE_LOCK_TAG = "ShakeVolume:ScreenWakeLock"
    private const val WAKE_LOCK_TIMEOUT_MS = 3000L

    fun isScreenInteractive(context: Context): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return powerManager?.isInteractive ?: true
    }

    @Suppress("DEPRECATION")
    fun turnScreenOn(context: Context) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        try {
            val wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                WAKE_LOCK_TAG
            )
            wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS)
            vibrateFeedback(context)
            Log.i(TAG, "Screen woke up successfully via WakeLock")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to turn screen ON", e)
        }
    }

    fun turnScreenOff(context: Context): Boolean {
        if (ScreenAccessibilityService.isServiceRunning()) {
            val locked = ScreenAccessibilityService.lockScreen()
            if (locked) {
                vibrateFeedback(context)
                Log.i(TAG, "Screen locked via AccessibilityService GLOBAL_ACTION_LOCK_SCREEN")
                return true
            }
        }

        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val adminComponent = ComponentName(context, ScreenAdminReceiver::class.java)

        if (dpm != null && dpm.isAdminActive(adminComponent)) {
            try {
                dpm.lockNow()
                vibrateFeedback(context)
                return true
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException invoking lockNow()", e)
            }
        }

        return false
    }

    fun vibrateFeedback(context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(45, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                vibrator?.vibrate(45)
            }
        } catch (e: Exception) {}
    }
}`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    type: 'xml',
    description: 'Manifest defining WAKE_LOCK, FOREGROUND_SERVICE, AccessibilityService, and Boot Receiver',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.screencontrol.shakevolume">

    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <uses-feature
        android:name="android.hardware.sensor.accelerometer"
        android:required="true" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.ShakeVolumeScreenControl"
        tools:targetApi="35">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.ScreenControlForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Low-power hardware accelerometer sensor monitoring for shake-to-wake screen control" />
        </service>

        <service
            android:name=".service.ScreenAccessibilityService"
            android:enabled="true"
            android:exported="true"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <receiver
            android:name=".receiver.BootCompletedReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

        <receiver
            android:name=".receiver.ScreenAdminReceiver"
            android:description="@string/device_admin_description"
            android:label="@string/device_admin_label"
            android:permission="android.permission.BIND_DEVICE_ADMIN"
            android:exported="true">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin_sample" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`
  },
  {
    path: 'app/src/main/res/layout/activity_main.xml',
    name: 'activity_main.xml',
    type: 'xml',
    description: 'Material 3 Dark Theme layout with two feature switches, status badges, and setup guides',
    content: `<!-- See full file in android/app/src/main/res/layout/activity_main.xml -->`
  },
  {
    path: 'app/build.gradle.kts',
    name: 'app/build.gradle.kts',
    type: 'gradle',
    description: 'Gradle configuration targeting SDK 35 with Kotlin & ViewBinding',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.screencontrol.shakevolume"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.screencontrol.shakevolume"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
}`
  }
];
