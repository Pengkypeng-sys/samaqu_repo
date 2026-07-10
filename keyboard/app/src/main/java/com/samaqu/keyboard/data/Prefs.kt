package com.samaqu.keyboard.data

import android.content.Context
import androidx.core.content.edit

private const val PREFS = "samaqu_prefs"
private const val KEY_API_URL = "api_url"
private const val KEY_API_KEY = "api_key"

class Prefs(ctx: Context) {
    private val sp = ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var apiUrl: String
        get() = sp.getString(KEY_API_URL, "http://192.168.1.100:3000") ?: "http://192.168.1.100:3000"
        set(v) = sp.edit { putString(KEY_API_URL, v) }

    var apiKey: String
        get() = sp.getString(KEY_API_KEY, "") ?: ""
        set(v) = sp.edit { putString(KEY_API_KEY, v) }

    val authHeader get() = "ApiKey $apiKey"
}
