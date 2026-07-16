package com.samaqu.keyboard.ui

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.Prefs
import com.samaqu.keyboard.network.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private var currentFragment: Fragment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val dashUrl   = "https://samaqu-repo.vercel.app"
        val ongkirUrl = "https://cekongkir.com"

        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNav)

        fun show(fragment: Fragment, id: Int) {
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit()
            currentFragment = fragment
            bottomNav.selectedItemId = id
        }

        // Settings gear
        findViewById<TextView>(R.id.btnSettings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        // Handle intent from keyboard
        val tab = intent?.getStringExtra("tab")
        val startId = when (tab) {
            "ongkir"    -> R.id.nav_ongkir
            "autotext"  -> R.id.nav_autotext
            "pending"   -> R.id.nav_pending
            "dashboard" -> R.id.nav_dashboard
            else        -> R.id.nav_invoice
        }

        // Load initial fragment without triggering listener
        val initFragment: Fragment = when (startId) {
            R.id.nav_ongkir    -> OngkirFragment()
            R.id.nav_autotext  -> AutoTextFragment()
            R.id.nav_pending   -> WebViewFragment.newInstance("$dashUrl/orders")
            R.id.nav_dashboard -> WebViewFragment.newInstance(dashUrl)
            else               -> InvoiceFragment()
        }
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, initFragment)
            .commit()
        currentFragment = initFragment
        bottomNav.selectedItemId = startId

        checkForUpdate()

        bottomNav.setOnItemSelectedListener { item ->
            val frag: Fragment = when (item.itemId) {
                R.id.nav_invoice   -> InvoiceFragment()
                R.id.nav_ongkir    -> OngkirFragment()
                R.id.nav_autotext  -> AutoTextFragment()
                R.id.nav_pending   -> WebViewFragment.newInstance("$dashUrl/orders")
                R.id.nav_dashboard -> WebViewFragment.newInstance(dashUrl)
                else -> return@setOnItemSelectedListener false
            }
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, frag)
                .commit()
            currentFragment = frag
            true
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val tab = intent.getStringExtra("tab") ?: return
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNav)
        bottomNav.selectedItemId = when (tab) {
            "ongkir"    -> R.id.nav_ongkir
            "autotext"  -> R.id.nav_autotext
            "pending"   -> R.id.nav_pending
            "dashboard" -> R.id.nav_dashboard
            else        -> R.id.nav_invoice
        }
    }

    private fun checkForUpdate() {
        val prefs = Prefs(this)
        if (prefs.apiUrl.isBlank()) return
        lifecycleScope.launch {
            try {
                RetrofitClient.init(prefs.apiUrl)
                val info = withContext(Dispatchers.IO) {
                    RetrofitClient.api.getLatestVersion()
                }
                val serverVer  = info["version"] ?: return@launch
                val apkUrl     = info["apk_url"] ?: return@launch
                val changelog  = info["changelog"] ?: ""
                val currentVer = packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0"
                if (serverVer != currentVer && apkUrl.isNotBlank()) {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("📦 Update Tersedia — v$serverVer")
                        .setMessage(changelog.ifBlank { "Versi baru tersedia. Segera update untuk fitur & perbaikan terbaru." })
                        .setPositiveButton("Download Sekarang") { _, _ ->
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl)))
                        }
                        .setNegativeButton("Nanti", null)
                        .show()
                }
            } catch (_: Exception) {}
        }
    }

    override fun onBackPressed() {
        val wvf = currentFragment as? WebViewFragment
        if (wvf?.canGoBack() == true) wvf.goBack() else super.onBackPressed()
    }
}
