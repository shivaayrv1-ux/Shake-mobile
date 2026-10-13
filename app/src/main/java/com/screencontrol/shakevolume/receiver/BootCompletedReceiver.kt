package com.screencontrol.shakevolume.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.screencontrol.shakevolume.service.ScreenControlForegroundService
import com.screencontrol.shakevolume.util.PreferencesManager

class BootCompletedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON"
        ) {
            Log.i("BootCompletedReceiver", "Device boot completed. Checking service preferences...")

            val prefs = PreferencesManager(context)
            if (prefs.isShakeToWakeEnabled) {
                val serviceIntent = Intent(context, ScreenControlForegroundService::class.java).apply {
                    this.action = ScreenControlForegroundService.ACTION_START
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
                Log.i("BootCompletedReceiver", "Restored ScreenControlForegroundService on boot.")
            }
        }
    }
}
