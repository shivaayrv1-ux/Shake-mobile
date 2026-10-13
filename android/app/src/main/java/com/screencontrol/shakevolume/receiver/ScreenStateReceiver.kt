package com.screencontrol.shakevolume.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ScreenStateReceiver(
    private val onScreenStateChanged: (isScreenOn: Boolean) -> Unit
) : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        when (intent?.action) {
            Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
                onScreenStateChanged.invoke(true)
            }
            Intent.ACTION_SCREEN_OFF -> {
                onScreenStateChanged.invoke(false)
            }
        }
    }
}
