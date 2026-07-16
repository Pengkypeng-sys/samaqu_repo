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

    var lastPendingCount: Int
        get() = sp.getInt("last_pending", 0)
        set(v) = sp.edit { putInt("last_pending", v) }

    var keySize: String
        get() = sp.getString("key_size", "normal") ?: "normal"
        set(v) = sp.edit { putString("key_size", v) }

    var biteshipKey: String
        get() = sp.getString("biteship_key", "") ?: ""
        set(v) = sp.edit { putString("biteship_key", v) }

    // Stored as JSON: [{"bank_name":"BCA","account_number":"123","account_holder":"Andi"}]
    var bankAccountsJson: String
        get() = sp.getString("bank_accounts", "[]") ?: "[]"
        set(v) = sp.edit { putString("bank_accounts", v) }

    var storeName: String
        get() = sp.getString("store_name", "SAMAQU") ?: "SAMAQU"
        set(v) = sp.edit { putString("store_name", v) }

    var invoiceFooter: String
        get() = sp.getString("invoice_footer", "") ?: ""
        set(v) = sp.edit { putString("invoice_footer", v) }

    var invoiceHeader: String
        get() = sp.getString("invoice_header", "") ?: ""
        set(v) = sp.edit { putString("invoice_header", v) }

    var invoiceSeparator: String
        get() = sp.getString("invoice_separator", "─────────────────────") ?: "─────────────────────"
        set(v) = sp.edit { putString("invoice_separator", v) }

    var invoiceShowPricePer: Boolean
        get() = sp.getString("invoice_show_price_per", "1") != "0"
        set(v) = sp.edit { putString("invoice_show_price_per", if (v) "1" else "0") }

    var invoiceShowSubtotal: Boolean
        get() = sp.getString("invoice_show_subtotal", "1") != "0"
        set(v) = sp.edit { putString("invoice_show_subtotal", if (v) "1" else "0") }
}
