package com.samaqu.keyboard.ui

import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.CachedCategory
import com.samaqu.keyboard.data.CachedTemplate
import com.samaqu.keyboard.data.CategoryWithTemplates
import com.samaqu.keyboard.data.Prefs
import com.samaqu.keyboard.data.TemplateRepository
import com.samaqu.keyboard.network.RetrofitClient
import kotlinx.coroutines.*

class AutoTextFragment : Fragment() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var adapter: TemplateAdapter? = null
    private var cats: List<CategoryWithTemplates> = emptyList()
    private var tabs: LinearLayout? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_autotext, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        tabs = view.findViewById(R.id.categoryTabs)
        val rv = view.findViewById<RecyclerView>(R.id.templateList)

        val adp = TemplateAdapter { text ->
            val cm = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("template", text))
            Toast.makeText(requireContext(), "Disalin!", Toast.LENGTH_SHORT).show()
        }
        adapter = adp
        rv.layoutManager = LinearLayoutManager(requireContext())
        rv.adapter = adp

        view.findViewById<View>(R.id.fabAddTemplate).setOnClickListener { showAddDialog() }

        loadTemplates()
    }

    private fun loadTemplates() {
        scope.launch {
            val repo = TemplateRepository(requireContext())
            cats = withContext(Dispatchers.IO) { repo.getTemplates() }
            renderTabs(cats)
        }
    }

    private fun renderTabs(cats: List<CategoryWithTemplates>) {
        val tabsView = tabs ?: return
        tabsView.removeAllViews()
        if (cats.isEmpty()) return
        adapter?.submitList(cats.first().templates)
        cats.forEach { cat ->
            val tab = TextView(requireContext()).apply {
                text = cat.category.name
                textSize = 12f
                setPadding(36, 8, 36, 8)
                setTextColor(0xFF1D4ED8.toInt())
                background = requireContext().getDrawable(R.drawable.tab_bg)
                setOnClickListener { adapter?.submitList(cat.templates) }
            }
            tabsView.addView(tab)
        }
    }

    private fun showAddDialog() {
        val prefs = Prefs(requireContext())
        val ctx = requireContext()

        val layout = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }

        val categoryNames = cats.map { it.category.name }.toMutableList()
        categoryNames.add("+ Kategori Baru")

        val spinnerLabel = TextView(ctx).apply { text = "Kategori"; textSize = 12f; setPadding(0,0,0,4) }
        val spinner = Spinner(ctx)
        val spinnerAdapter = ArrayAdapter(ctx, android.R.layout.simple_spinner_item, categoryNames)
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinner.adapter = spinnerAdapter

        val newCatInput = EditText(ctx).apply {
            hint = "Nama kategori baru"
            visibility = View.GONE
            setPadding(0, 8, 0, 8)
        }

        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                newCatInput.visibility = if (pos == categoryNames.size - 1) View.VISIBLE else View.GONE
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        val contentLabel = TextView(ctx).apply { text = "Isi Template"; textSize = 12f; setPadding(0, 16, 0, 4) }
        val contentInput = EditText(ctx).apply {
            hint = "Tulis pesan template..."
            minLines = 3
            maxLines = 6
            gravity = android.view.Gravity.TOP
        }

        layout.addView(spinnerLabel)
        layout.addView(spinner)
        layout.addView(newCatInput)
        layout.addView(contentLabel)
        layout.addView(contentInput)

        AlertDialog.Builder(ctx)
            .setTitle("Tambah Template")
            .setView(layout)
            .setPositiveButton("Simpan") { _, _ ->
                val content = contentInput.text.toString().trim()
                if (content.isBlank()) { Toast.makeText(ctx, "Isi template kosong", Toast.LENGTH_SHORT).show(); return@setPositiveButton }
                val isNewCat = spinner.selectedItemPosition == categoryNames.size - 1
                val newCatName = newCatInput.text.toString().trim()
                if (isNewCat && newCatName.isBlank()) { Toast.makeText(ctx, "Nama kategori kosong", Toast.LENGTH_SHORT).show(); return@setPositiveButton }

                scope.launch {
                    try {
                        RetrofitClient.init(prefs.apiUrl)
                        val auth = "Bearer ${prefs.apiKey}"
                        val catId: Int
                        if (isNewCat) {
                            val created = withContext(Dispatchers.IO) {
                                RetrofitClient.api.createCategory(auth, mapOf("name" to newCatName))
                            }
                            catId = created.id
                        } else {
                            catId = cats[spinner.selectedItemPosition].category.id
                        }
                        withContext(Dispatchers.IO) {
                            RetrofitClient.api.createTemplate(auth, mapOf("categoryId" to catId, "content" to content))
                        }
                        // Re-sync local cache
                        val repo = TemplateRepository(requireContext())
                        withContext(Dispatchers.IO) { repo.sync() }
                        cats = withContext(Dispatchers.IO) { repo.getTemplates() }
                        renderTabs(cats)
                        Toast.makeText(ctx, "Template disimpan!", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        Toast.makeText(ctx, "Gagal: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    override fun onDestroyView() {
        scope.cancel()
        super.onDestroyView()
    }
}
