package com.screencontrol.shakevolume.util

import android.content.Context
import android.content.SharedPreferences

class PreferencesManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var isShakeToWakeEnabled: Boolean
        get() = prefs.getBoolean(KEY_SHAKE_TO_WAKE, true)
        set(value) = prefs.edit().putBoolean(KEY_SHAKE_TO_WAKE, value).apply()

    var isVolumeUpToWakeEnabled: Boolean
        get() = prefs.getBoolean(KEY_VOLUME_UP_TO_WAKE, true)
        set(value) = prefs.edit().putBoolean(KEY_VOLUME_UP_TO_WAKE, value).apply()

    var shakeThreshold: Float
        get() = prefs.getFloat(KEY_SHAKE_THRESHOLD, DEFAULT_SHAKE_THRESHOLD)
        set(value) = prefs.edit().putFloat(KEY_SHAKE_THRESHOLD, value).apply()

    var shakeCooldownMs: Long
        get() = prefs.getLong(KEY_SHAKE_COOLDOWN_MS, DEFAULT_COOLDOWN_MS)
        set(value) = prefs.edit().putLong(KEY_SHAKE_COOLDOWN_MS, value).apply()

    companion object {
        private const val PREFS_NAME = "screen_control_prefs"
        private const val KEY_SHAKE_TO_WAKE = "pref_shake_to_wake"
        private const val KEY_VOLUME_UP_TO_WAKE = "pref_volume_up_to_wake"
        private const val KEY_SHAKE_THRESHOLD = "pref_shake_threshold"
        private const val KEY_SHAKE_COOLDOWN_MS = "pref_shake_cooldown_ms"

        // Default sensitivity threshold: ~13.5 m/s² net acceleration
        // High enough to prevent accidental pocket walking triggers, sensitive enough for intentional shake.
        const val DEFAULT_SHAKE_THRESHOLD = 13.5f

        // Cooldown between triggers to prevent bouncing or multi-toggling
        const val DEFAULT_COOLDOWN_MS = 2000L
    }
}
