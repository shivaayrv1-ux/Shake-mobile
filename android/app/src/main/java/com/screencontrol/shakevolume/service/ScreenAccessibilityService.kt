package com.screencontrol.shakevolume.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.os.Build
import android.util.Log
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import com.screencontrol.shakevolume.util.PowerUtils
import com.screencontrol.shakevolume.util.PreferencesManager

/**
 * Accessibility Service providing:
 * 1. Native, biometric-friendly screen locking via performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) (Android 9+)
 * 2. Hardware key observation via onKeyEvent (intercepting Volume UP when the display is off to wake,
 *    and passing through untouched when display is on for normal volume adjustment).
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

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        if (!::preferencesManager.isInitialized) {
            preferencesManager = PreferencesManager(this)
        }

        // Programmatically configure FLAG_REQUEST_FILTER_KEY_EVENTS to guarantee
        // key event delivery across OEM ROMs (Samsung OneUI, Xiaomi MIUI, ColorOS, etc.)
        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.flags = info.flags or
                AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS or
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        serviceInfo = info

        Log.i(TAG, "ScreenAccessibilityService connected with FLAG_REQUEST_FILTER_KEY_EVENTS active.")
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

        if (isVolumeUp && preferencesManager.isVolumeUpToWakeEnabled) {
            val isInteractive = PowerUtils.isScreenInteractive(this)

            if (!isInteractive) {
                // Screen is OFF: Wake screen on Volume UP and consume event so volume does NOT change
                if (event.action == KeyEvent.ACTION_DOWN) {
                    Log.i(TAG, "Volume UP received while screen OFF -> Waking display...")
                    PowerUtils.turnScreenOn(this)
                }
                // Return true for both ACTION_DOWN and ACTION_UP to prevent volume change while screen was off
                return true
            } else {
                // Screen is ON: User wants normal volume adjustment!
                // Pass event directly through without interception
                return super.onKeyEvent(event)
            }
        }

        // Pass all other keys to system
        return super.onKeyEvent(event)
    }
}
