package com.samaqu.keyboard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.samaqu.keyboard.overlay.OverlayService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        // nothing to start on boot — IME starts on demand
    }
}
