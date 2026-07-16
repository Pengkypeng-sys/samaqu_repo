package com.samaqu.keyboard.data

import android.content.Context
import com.samaqu.keyboard.network.RetrofitClient
import org.json.JSONArray
import org.json.JSONObject

class TemplateRepository(ctx: Context) {
    private val dao = AppDatabase.get(ctx).templateDao()
    private val prefs = Prefs(ctx)

    suspend fun getTemplates(): List<CategoryWithTemplates> = dao.getAllWithTemplates()

    suspend fun sync(): Result<Unit> = runCatching {
        RetrofitClient.init(prefs.apiUrl)
        val remote = RetrofitClient.api.getTemplates()
        dao.clearTemplates()
        dao.clearCategories()
        dao.insertCategories(remote.map { CachedCategory(it.id, it.name) })
        dao.insertTemplates(remote.flatMap { cat ->
            cat.templates.map { CachedTemplate(it.id, cat.id, it.content) }
        })
        // Sync bank accounts
        runCatching {
            val banks = RetrofitClient.api.getBankAccounts().filter { it.isActive }
            val arr = JSONArray()
            banks.forEach { b ->
                arr.put(JSONObject().apply {
                    put("bank_name", b.bankName)
                    put("account_number", b.accountNumber)
                    put("account_holder", b.accountHolder)
                })
            }
            prefs.bankAccountsJson = arr.toString()
        }
    }
}
