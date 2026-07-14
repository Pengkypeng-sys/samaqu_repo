package com.samaqu.keyboard.ime

import android.inputmethodservice.InputMethodService
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.CategoryWithTemplates
import com.samaqu.keyboard.data.TemplateRepository
import com.samaqu.keyboard.ui.TemplateAdapter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SamaQuIME : InputMethodService() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var repo: TemplateRepository
    private var adapter: TemplateAdapter? = null
    private var categoryTabs: LinearLayout? = null
    private var syncStatus: TextView? = null
    private var allCategories: List<CategoryWithTemplates> = emptyList()

    override fun onCreate() {
        super.onCreate()
        repo = TemplateRepository(this)
    }

    override fun onCreateInputView(): View {
        val panel = layoutInflater.inflate(R.layout.keyboard_panel, null)

        categoryTabs = panel.findViewById(R.id.categoryTabs)
        syncStatus = panel.findViewById(R.id.syncStatus)

        val adp = TemplateAdapter { content -> insertText(content) }
        adapter = adp
        panel.findViewById<RecyclerView>(R.id.templateList).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = adp
        }

        panel.findViewById<TextView>(R.id.btnSwitchKeyboard).setOnClickListener {
            switchToNextInputMethod(false)
        }
        panel.findViewById<TextView>(R.id.btnSync).setOnClickListener { doSync() }
        panel.findViewById<TextView>(R.id.btnOrder).setOnClickListener {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            intent?.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            intent?.let { startActivity(it) }
        }

        loadCached()
        return panel
    }

    private fun loadCached() {
        scope.launch {
            allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
            renderCategories()
        }
    }

    private fun doSync() {
        syncStatus?.setTextColor(0xFFEAB308.toInt())
        scope.launch {
            val result = withContext(Dispatchers.IO) { repo.sync() }
            if (result.isSuccess) {
                allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
                renderCategories()
                syncStatus?.setTextColor(0xFF22C55E.toInt())
            } else {
                syncStatus?.setTextColor(0xFFEF4444.toInt())
            }
        }
    }

    private fun renderCategories() {
        categoryTabs?.removeAllViews()
        if (allCategories.isEmpty()) return
        selectCategory(allCategories.first())
        allCategories.forEach { cat ->
            val tab = layoutInflater.inflate(android.R.layout.simple_list_item_1, categoryTabs, false) as TextView
            tab.text = cat.category.name
            tab.textSize = 13f
            tab.setPadding(32, 0, 32, 0)
            tab.setOnClickListener { selectCategory(cat) }
            categoryTabs?.addView(tab)
        }
    }

    private fun selectCategory(cat: CategoryWithTemplates) {
        adapter?.submitList(cat.templates)
    }

    private fun insertText(text: String) {
        currentInputConnection?.commitText(text, 1)
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
