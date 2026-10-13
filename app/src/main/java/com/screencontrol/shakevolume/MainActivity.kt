package com.screencontrol.shakevolume

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
        // Initialize switch states from stored preferences
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

        // Setup Step 1: Open Accessibility Settings
        binding.btnOpenAccessibility.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            try {
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Unable to open Accessibility Settings directly", Toast.LENGTH_SHORT).show()
            }
        }

        // Setup Step 2: Request Battery Optimization Whitelist
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
        // 1. Accessibility status
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

        // 2. Battery Optimization status
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
        val expectedServiceName = "${packageName}/${ScreenAccessibilityService::class.java.canonicalName}"

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
}
