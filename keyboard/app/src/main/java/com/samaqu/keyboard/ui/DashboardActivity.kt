package com.samaqu.keyboard.ui

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.samaqu.keyboard.R

class DashboardActivity : AppCompatActivity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)

        val wv = findViewById<WebView>(R.id.webView)
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true
        wv.webViewClient = WebViewClient()
        wv.loadUrl("https://samaqu-repo.vercel.app")
    }

    override fun onBackPressed() {
        val wv = findViewById<WebView>(R.id.webView)
        if (wv.canGoBack()) wv.goBack() else super.onBackPressed()
    }
}
