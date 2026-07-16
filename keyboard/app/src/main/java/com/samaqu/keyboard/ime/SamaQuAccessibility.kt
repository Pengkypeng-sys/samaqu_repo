package com.samaqu.keyboard.ime

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import com.samaqu.keyboard.overlay.OverlayService

class SamaQuAccessibility : AccessibilityService() {

    override fun onServiceConnected() {
        instance = this
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOWS_CHANGED or AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        serviceInfo = info
        // ponytail: overlay not needed — full IME is active
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val kbWin = windows.find { it.type == AccessibilityWindowInfo.TYPE_INPUT_METHOD }
        if (kbWin != null) {
            val bounds = Rect()
            kbWin.getBoundsInScreen(bounds)
            OverlayService.instance?.onKeyboardShown(bounds.top)
        } else {
            OverlayService.instance?.onKeyboardHidden()
        }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    companion object {
        var instance: SamaQuAccessibility? = null

        fun paste(text: String, ctx: Context): Boolean {
            val svc = instance ?: return false
            val root = svc.rootInActiveWindow ?: return false
            val node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            if (node != null) {
                val args = Bundle()
                args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                if (node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) return true
                val clip = ctx.getSystemService(ClipboardManager::class.java)
                clip.setPrimaryClip(ClipData.newPlainText("samaqu", text))
                node.performAction(AccessibilityNodeInfo.ACTION_PASTE)
                return true
            }
            return false
        }
    }
}
