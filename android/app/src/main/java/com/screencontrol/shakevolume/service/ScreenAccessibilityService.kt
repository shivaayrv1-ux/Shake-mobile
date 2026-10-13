package com.screencontrol.shakevolume.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import com.screencontrol.shakevolume.util.PowerUtils
import com.screencontrol.shakevolume.util.PreferencesManager

/**
 * Accessibility Service providing:
 * 1. Native, biometric-friendly screen locking via performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) (Android 9+)
 * 2. Hardware key observation via onKeyEvent (intercepting Volume UP when the OS delivers key events)
 *
 * TECHNICAL LIMITATION NOTE (Screen-Off Hardware Key Interception):
 * In standard, non-rooted Android, when the screen is powered off and the CPU enters deep sleep (suspend state),
 * the Linux kernel input subsystem suspends key event delivery to user-space AccessibilityServices.
 * While this service hooks KEYCODE_VOLUME_UP immediately upon waking/dimming, true deep-sleep hardware
 * interception requires either active media playback (MediaSession) or kernel-level key wake flags (gpio-keys).
 */
class ScreenAccessibilityService : AccessibilityService() {

    private lateinit var preferencesManager: PreferencesManager

    companion object {
        private const val TAG = "ScreenAccessService"
        private var instance: ScreenAccessibilityService? = null

        fun isServiceRunning(): Boolean = instance != null

        /**
         * Invokes Android 9+ (API 28+) GLOBAL_ACTION_LOCK_SCREEN.
         * Locks without invalidating fingerprint or facial recognition credentials.
         */
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
        Log.i(TAG, "ScreenAccessibilityService created and bound.")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.i(TAG, "ScreenAccessibilityService destroyed.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // We do not inspect UI hierarchy; only key events and global actions are handled.
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted by system.")
    }

    override fun onKeyEvent(event: KeyEvent?): Boolean {
        if (event == null) return super.onKeyEvent(event)

        val isVolumeUp = event.keyCode == KeyEvent.KEYCODE_VOLUME_UP
        val isActionDown = event.action == KeyEvent.ACTION_DOWN

        if (isVolumeUp && isActionDown) {
            val isVolumeWakeEnabled = preferencesManager.isVolumeUpToWakeEnabled
            Log.d(TAG, "Hardware Key: KEYCODE_VOLUME_UP detected. Feature enabled: $isVolumeWakeEnabled")

            if (isVolumeWakeEnabled) {
                val isInteractive = PowerUtils.isScreenInteractive(this)
                if (!isInteractive) {
                    // Screen is non-interactive or turning off; trigger wake lock!
                    Log.i(TAG, "Volume UP received while screen off. Waking screen...")
                    PowerUtils.turnScreenOn(this)
                    // Return true to consume the key so volume level doesn't jump
                    return true
                }
            }
        }

        // Return false to pass the event to system volume manager under normal interactive usage
        return super.onKeyEvent(event)
    }
}
