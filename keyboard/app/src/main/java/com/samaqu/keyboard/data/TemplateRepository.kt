package com.samaqu.keyboard.data

import android.content.Context
import com.samaqu.keyboard.network.RetrofitClient

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
    }
}
