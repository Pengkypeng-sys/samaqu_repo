package com.samaqu.keyboard.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.CategoryWithTemplates
import com.samaqu.keyboard.data.TemplateRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AutoTextFragment : Fragment() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var adapter: TemplateAdapter? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_autotext, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val tabs = view.findViewById<LinearLayout>(R.id.categoryTabs)
        val rv   = view.findViewById<RecyclerView>(R.id.templateList)

        val adp = TemplateAdapter { text ->
            val cm = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("template", text))
            Toast.makeText(requireContext(), "Disalin!", Toast.LENGTH_SHORT).show()
        }
        adapter = adp
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adp

        scope.launch {
            val repo = TemplateRepository(requireContext())
            val cats = withContext(Dispatchers.IO) { repo.getTemplates() }
            renderTabs(tabs, adp, cats)
        }
    }

    private fun renderTabs(tabs: LinearLayout, adp: TemplateAdapter, cats: List<CategoryWithTemplates>) {
        tabs.removeAllViews()
        if (cats.isEmpty()) return
        adp.submitList(cats.first().templates)
        cats.forEach { cat ->
            val tab = TextView(requireContext()).apply {
                text = cat.category.name
                textSize = 12f
                setPadding(36, 8, 36, 8)
                setTextColor(0xFF1D4ED8.toInt())
                setBackgroundResource(R.drawable.tab_bg)
                typeface = android.graphics.Typeface.SERIF
                background = requireContext().getDrawable(R.drawable.tab_bg)
                setOnClickListener { adp.submitList(cat.templates) }
            }
            tabs.addView(tab)
        }
    }

    override fun onDestroyView() {
        scope.cancel()
        super.onDestroyView()
    }
}
