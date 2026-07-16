package com.samaqu.keyboard.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.CategoryWithTemplates
import com.samaqu.keyboard.data.TemplateRepository
import com.samaqu.keyboard.ime.SamaQuAccessibility
import com.samaqu.keyboard.ui.TemplateAdapter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class OverlayService : Service() {

    private lateinit var wm: WindowManager
    private var toolbarView: View? = null
    private var panelView: View? = null
    private lateinit var repo: TemplateRepository
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var allCategories: List<CategoryWithTemplates> = emptyList()
    private var keyboardTop = -1
    private var panelOpen = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        repo = TemplateRepository(this)
        wm = getSystemService(WindowManager::class.java)
        startForeground(1, buildNotification())
        scope.launch { allCategories = withContext(Dispatchers.IO) { repo.getTemplates() } }
        // Show toolbar at bottom by default (before keyboard detected)
        showToolbar(defaultToolbarY())
    }

    private fun buildNotification(): Notification {
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(NotificationChannel("samaqu", "SAMAQU", NotificationManager.IMPORTANCE_LOW))
        return NotificationCompat.Builder(this, "samaqu")
            .setContentTitle("SAMAQU aktif")
            .setContentText("Tap kolom chat di WA untuk mulai")
            .setSmallIcon(android.R.drawable.ic_menu_send)
            .setOngoing(true)
            .build()
    }

    private fun defaultToolbarY(): Int {
        val screenH = resources.displayMetrics.heightPixels
        val navBarH = navigationBarHeight()
        return screenH - navBarH - dp(48)
    }

    private fun navigationBarHeight(): Int {
        val resId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
        return if (resId > 0) resources.getDimensionPixelSize(resId) else dp(48)
    }

    fun onKeyboardShown(kbTop: Int) {
        if (kbTop <= 0) return
        keyboardTop = kbTop
        repositionToolbar(kbTop - dp(48))
        if (panelOpen) repositionPanel()
    }

    fun onKeyboardHidden() {
        keyboardTop = -1
        repositionToolbar(defaultToolbarY())
        removePanel()
        panelOpen = false
    }

    private fun showToolbar(yPos: Int) {
        val view = LayoutInflater.from(this).inflate(R.layout.overlay_toolbar, null)
        toolbarView = view
        wm.addView(view, toolbarLP(yPos))
        view.findViewById<View>(R.id.btnAutoText).setOnClickListener { togglePanel() }
        view.findViewById<View>(R.id.btnSync).setOnClickListener { doSync() }
    }

    private fun repositionToolbar(yPos: Int) {
        toolbarView?.let { wm.updateViewLayout(it, toolbarLP(yPos)) }
    }

    private fun toolbarLP(yPos: Int) = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT, dp(48),
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT
    ).apply { gravity = Gravity.TOP or Gravity.START; x = 0; y = yPos }

    private fun togglePanel() {
        if (panelOpen) { removePanel(); panelOpen = false } else { showPanel(); panelOpen = true }
    }

    private fun showPanel() {
        val panel = LayoutInflater.from(this).inflate(R.layout.overlay_panel, null)
        panelView = panel
        wm.addView(panel, panelLP())

        val adp = TemplateAdapter { text -> insertText(text) }
        panel.findViewById<RecyclerView>(R.id.templateList).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = adp
        }
        val tabs = panel.findViewById<LinearLayout>(R.id.categoryTabs)
        val syncStatus = panel.findViewById<TextView>(R.id.syncStatus)

        panel.findViewById<TextView>(R.id.btnClose).setOnClickListener { removePanel(); panelOpen = false }
        panel.findViewById<TextView>(R.id.btnSync).setOnClickListener {
            syncStatus.setTextColor(0xFFEAB308.toInt())
            scope.launch {
                val ok = withContext(Dispatchers.IO) { repo.sync() }.isSuccess
                allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
                renderCategories(adp, tabs)
                syncStatus.setTextColor(if (ok) 0xFF22C55E.toInt() else 0xFFEF4444.toInt())
            }
        }
        renderCategories(adp, tabs)
    }

    private fun repositionPanel() {
        panelView?.let { wm.updateViewLayout(it, panelLP()) }
    }

    private fun panelLP(): WindowManager.LayoutParams {
        val toolbarY = if (keyboardTop > 0) keyboardTop - dp(48) else defaultToolbarY()
        val panelH = dp(260)
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, panelH,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP or Gravity.START; x = 0; y = toolbarY - panelH }
    }

    private fun removePanel() {
        panelView?.let { wm.removeView(it) }
        panelView = null
    }

    private fun doSync() {
        scope.launch {
            withContext(Dispatchers.IO) { repo.sync() }
            allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
        }
    }

    private fun renderCategories(adp: TemplateAdapter, tabs: LinearLayout) {
        tabs.removeAllViews()
        if (allCategories.isEmpty()) return
        adp.submitList(allCategories.first().templates)
        allCategories.forEach { cat ->
            val tab = TextView(this).apply {
                text = cat.category.name
                textSize = 12f
                setPadding(dp(14), 0, dp(14), 0)
                setTextColor(0xFF1E40AF.toInt())
                setBackgroundResource(android.R.drawable.btn_default_small)
                setOnClickListener { adp.submitList(cat.templates) }
            }
            tabs.addView(tab)
        }
    }

    private fun insertText(text: String) {
        if (!SamaQuAccessibility.paste(text, this)) {
            getSystemService(ClipboardManager::class.java)
                .setPrimaryClip(ClipData.newPlainText("samaqu", text))
            Toast.makeText(this, "✓ Disalin! Tahan lalu Paste di chat", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroy() {
        instance = null
        scope.cancel()
        toolbarView?.let { wm.removeView(it) }
        removePanel()
        super.onDestroy()
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    companion object {
        var instance: OverlayService? = null
        fun start(ctx: android.content.Context) = ctx.startForegroundService(Intent(ctx, OverlayService::class.java))
        fun stop(ctx: android.content.Context) = ctx.stopService(Intent(ctx, OverlayService::class.java))
    }
}
