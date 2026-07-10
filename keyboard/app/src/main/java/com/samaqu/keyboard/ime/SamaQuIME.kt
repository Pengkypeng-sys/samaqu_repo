package com.samaqu.keyboard.ime

import android.view.View
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.TemplateRepository
import com.samaqu.keyboard.ui.TemplateAdapter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SamaQuIME : LifecycleIME() {

    private lateinit var repo: TemplateRepository
    private lateinit var adapter: TemplateAdapter
    private lateinit var categoryTabs: LinearLayout
    private lateinit var syncStatus: TextView

    private var allCategories: List<com.samaqu.keyboard.data.CategoryWithTemplates> = emptyList()

    override fun onCreate() {
        super.onCreate()
        repo = TemplateRepository(this)
    }

    override fun onCreateInputView(): View {
        val panel = layoutInflater.inflate(R.layout.keyboard_panel, null)

        categoryTabs = panel.findViewById(R.id.categoryTabs)
        syncStatus = panel.findViewById(R.id.syncStatus)

        adapter = TemplateAdapter { content -> insertText(content) }
        panel.findViewById<RecyclerView>(R.id.templateList).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = this@SamaQuIME.adapter
        }

        panel.findViewById<ImageButton>(R.id.btnSync).setOnClickListener { doSync() }
        panel.findViewById<ImageButton>(R.id.btnOrder).setOnClickListener {
            // ponytail: open browser to dashboard /orders — deep-link into IME is complex
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            intent?.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            intent?.let { startActivity(it) }
        }

        loadCached()
        return panel
    }

    private fun loadCached() {
        lifecycleScope.launch {
            allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
            renderCategories()
        }
    }

    private fun doSync() {
        syncStatus.setTextColor(0xFFEAB308.toInt()) // yellow = syncing
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { repo.sync() }
            if (result.isSuccess) {
                allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
                renderCategories()
                syncStatus.setTextColor(0xFF22C55E.toInt()) // green
            } else {
                syncStatus.setTextColor(0xFFEF4444.toInt()) // red
            }
        }
    }

    private fun renderCategories() {
        categoryTabs.removeAllViews()
        if (allCategories.isEmpty()) return

        selectCategory(allCategories.first())
        allCategories.forEach { cat ->
            val tab = layoutInflater.inflate(
                android.R.layout.simple_list_item_1, categoryTabs, false
            ) as TextView
            tab.text = cat.category.name
            tab.textSize = 13f
            tab.setPadding(32, 0, 32, 0)
            tab.setOnClickListener { selectCategory(cat) }
            categoryTabs.addView(tab)
        }
    }

    private fun selectCategory(cat: com.samaqu.keyboard.data.CategoryWithTemplates) {
        adapter.submitList(cat.templates)
    }

    private fun insertText(text: String) {
        currentInputConnection?.commitText(text, 1)
    }
}
