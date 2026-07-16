package com.samaqu.keyboard.ui

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.Fragment
import com.samaqu.keyboard.R

class WebViewFragment : Fragment() {

    companion object {
        private const val ARG_URL = "url"
        fun newInstance(url: String) = WebViewFragment().apply {
            arguments = Bundle().apply { putString(ARG_URL, url) }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        val wv = inflater.inflate(R.layout.fragment_webview, container, false) as WebView
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true
        wv.webViewClient = WebViewClient()
        wv.loadUrl(arguments?.getString(ARG_URL) ?: "about:blank")
        return wv
    }

    fun canGoBack(): Boolean {
        val wv = view as? WebView ?: return false
        return wv.canGoBack()
    }

    fun goBack() {
        (view as? WebView)?.goBack()
    }
}
