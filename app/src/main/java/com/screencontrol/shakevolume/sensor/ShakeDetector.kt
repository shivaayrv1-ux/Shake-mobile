package com.screencontrol.shakevolume.sensor

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.os.SystemClock
import android.util.Log
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Battery-efficient, responsive accelerometer shake detector.
 *
 * Distinguishes intentional shakes from pocket walking/vibrations by:
 * 1. Computing Euclidean acceleration vector deviation from gravity.
 * 2. Requiring directional movement reversals within a generous human-wrist motion window (750ms).
 * 3. Enforcing a strict post-trigger cooldown period to prevent debounce jitter.
 */
class ShakeDetector(
    private var threshold: Float = 8.5f,
    private var cooldownMs: Long = 1800L,
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
        // 750ms provides a natural human hand-shake window (previous 450ms was overly strict)
        private const val DIRECTION_CHANGE_WINDOW_MS = 750L
    }

    fun updateThreshold(newThreshold: Float) {
        this.threshold = newThreshold
        Log.d(TAG, "ShakeDetector threshold updated to $newThreshold m/s²")
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

        // 2. Vector magnitude deviation from Earth gravity (handles both positive and negative G forces)
        val totalAcceleration = sqrt(x * x + y * y + z * z)
        val netAcceleration = abs(totalAcceleration - GRAVITY_EARTH)

        // 3. Threshold check
        if (netAcceleration > threshold) {
            // Check for directional movement delta
            val deltaX = x - lastX
            val deltaY = y - lastY
            val deltaZ = z - lastZ

            val movementMagnitude = sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ)

            // When user sets light sensitivity (< 7.0), require lower directional magnitude
            val requiredMagnitude = if (threshold < 7.0f) threshold * 0.5f else threshold * 0.6f

            if (movementMagnitude > requiredMagnitude) {
                if (now - lastDirectionChangeTime < DIRECTION_CHANGE_WINDOW_MS) {
                    directionChangeCount++
                    // For sensitive setting, 1 strong or 2 standard direction changes triggers; otherwise 2
                    val minChanges = if (threshold <= 6.0f) 1 else 2
                    if (directionChangeCount >= minChanges) {
                        // Confirmed valid intentional shake!
                        lastTriggerTime = now
                        directionChangeCount = 0
                        Log.i(TAG, "Valid shake detected! NetAcc: $netAcceleration, Threshold: $threshold")
                        onShakeDetected.invoke()
                    }
                } else {
                    directionChangeCount = 1
                }
                lastDirectionChangeTime = now
            }
        } else {
            // Reset direction count if idle past window
            if (now - lastDirectionChangeTime > DIRECTION_CHANGE_WINDOW_MS) {
                directionChangeCount = 0
            }
        }

        lastX = x
        lastY = y
        lastZ = z
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No-op for accelerometer
    }
}
