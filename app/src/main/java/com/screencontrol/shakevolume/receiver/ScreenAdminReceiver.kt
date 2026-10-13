package com.screencontrol.shakevolume.receiver

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast

/**
 * Device Administrator Receiver.
 * Serves as an alternative fallback for locking the screen on Android versions older than Android 9 (Pie),
 * or where Accessibility Service is not active.
 */
class ScreenAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i("ScreenAdminReceiver", "Device Admin enabled.")
        Toast.makeText(context, "Screen Lock Administrator enabled", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.i("ScreenAdminReceiver", "Device Admin disabled.")
    }
}
