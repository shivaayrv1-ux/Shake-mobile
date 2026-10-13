package com.screencontrol.shakevolume.util

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.screencontrol.shakevolume.receiver.ScreenAdminReceiver
import com.screencontrol.shakevolume.service.ScreenAccessibilityService
import com.screencontrol.shakevolume.ui.WakeUpActivity

object PowerUtils {

    private const val TAG = "PowerUtils"
    private const val WAKE_LOCK_TAG = "ShakeVolume:ScreenWakeLock"
    private const val WAKE_LOCK_TIMEOUT_MS = 3000L

    /**
     * Checks if the device screen is currently interactive (ON).
     */
    fun isScreenInteractive(context: Context): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return powerManager?.isInteractive ?: true
    }

    /**
     * Wakes up the screen using PowerManager with ACQUIRE_CAUSES_WAKEUP
     * and triggers transparent WakeUpActivity for seamless OEM compatibility.
     */
    @Suppress("DEPRECATION")
    fun turnScreenOn(context: Context) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        if (powerManager == null) {
            Log.e(TAG, "PowerManager unavailable")
            return
        }

        try {
            // 1. Hardware WakeLock with ACQUIRE_CAUSES_WAKEUP to wake display and reset user activity timer
            val wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                WAKE_LOCK_TAG
            )
            wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS)

            // 2. Launch transparent WakeUpActivity to guarantee lock screen illumination on modern Android
            try {
                val wakeIntent = Intent(context, WakeUpActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_NO_ANIMATION or
                                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
                    )
                }
                context.startActivity(wakeIntent)
            } catch (e: Exception) {
                Log.d(TAG, "WakeUpActivity supplementary launch skipped: ${e.message}")
            }

            vibrateFeedback(context)
            Log.i(TAG, "Screen woke up successfully via WakeLock & WakeUpActivity")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire WakeLock to turn screen ON", e)
        }
    }

    /**
     * Turns screen OFF / Locks screen.
     * Uses AccessibilityService performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) on Android 9+ (API 28+),
     * which locks the screen cleanly WITHOUT disabling biometric unlock!
     * Falls back to DevicePolicyManager.lockNow() on older versions or if accessibility is not enabled.
     */
    fun turnScreenOff(context: Context): Boolean {
        // Preferred modern mechanism: Accessibility Service (Android 9+ / API 28+)
        if (ScreenAccessibilityService.isServiceRunning()) {
            val locked = ScreenAccessibilityService.lockScreen()
            if (locked) {
                vibrateFeedback(context)
                Log.i(TAG, "Screen locked via AccessibilityService GLOBAL_ACTION_LOCK_SCREEN")
                return true
            }
        }

        // Secondary fallback: Device Administration Policy Manager
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val adminComponent = ComponentName(context, ScreenAdminReceiver::class.java)

        if (dpm != null && dpm.isAdminActive(adminComponent)) {
            try {
                dpm.lockNow()
                vibrateFeedback(context)
                Log.i(TAG, "Screen locked via DevicePolicyManager.lockNow()")
                return true
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException invoking lockNow()", e)
            }
        }

        Log.w(TAG, "Cannot turn screen OFF: neither Accessibility Service nor Device Admin is enabled")
        return false
    }

    /**
     * Subtle haptic feedback confirming screen toggle action.
     */
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
        } catch (e: Exception) {
            Log.d(TAG, "Vibration omitted or permission missing: ${e.message}")
        }
    }
}
