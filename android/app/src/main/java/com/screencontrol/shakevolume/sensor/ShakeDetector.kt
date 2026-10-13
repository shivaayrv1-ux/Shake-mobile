package com.screencontrol.shakevolume.sensor

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
        valy = event.values[1]
        val z = event.values[2]

        // 2. Vector magnitude calculation
        val totalAcceleration = sqrt(x * x + y * y + z * z)
        val netAcceleration = totalAcceleration - GRAVITY_EARTH

        // 3. Threshold check
        if (netAcceleration > threshold) {
            // Check for directional reversal (shake back-and-forth)
            val deltaX = x - lastX
            val deltaY = y - lastY
            val deltaZ = z - lastZ

            val movementMagnitude = sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ)

            if (movementMagnitude > threshold * 0.75f) {
                if (now - lastDirectionChangeTime < DIRECTION_CHANGE_WINDOW_MS) {
                    directionChangeCount++
                    if (directionChangeCount >= MIN_DIRECTION_CHANGES) {
                        // Confirmed valid intentional shake!
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
