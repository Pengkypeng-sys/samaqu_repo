package com.samaqu.keyboard.ime

import android.annotation.SuppressLint
import android.inputmethodservice.InputMethodService
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
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
import java.text.NumberFormat
import java.util.Locale

private const val CODE_SYMBOLS = -100
private const val CODE_QWERTY  = -101

class SamaQuIME : InputMethodService(), KeyboardView.OnKeyboardActionListener {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private lateinit var repo: TemplateRepository
    private var allCategories: List<CategoryWithTemplates> = emptyList()

    private var keyboardView: KeyboardView? = null
    private var qwerty: Keyboard? = null
    private var symbols: Keyboard? = null
    private var caps = false

    private var templatePanel: View? = null
    private var invoicePanel: View? = null
    private var webPanel: View? = null
    private var emojiPanel: View? = null
    private var categoryTabs: LinearLayout? = null
    private var templateAdapter: TemplateAdapter? = null
    private var pendingPanel: View? = null
    private var orderAdapter: com.samaqu.keyboard.ui.OrderAdapter? = null
    private var rootView: View? = null
    private var focusedField: EditText? = null

    override fun onCreate() {
        super.onCreate()
        repo = TemplateRepository(this)
    }

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_main, null)
        rootView = view

        val large = com.samaqu.keyboard.data.Prefs(this).keySize == "large"
        qwerty  = Keyboard(this, if (large) R.xml.qwerty_large  else R.xml.qwerty)
        symbols = Keyboard(this, if (large) R.xml.symbols_large else R.xml.symbols)

        keyboardView = view.findViewById<SamaQuKeyboardView>(R.id.keyboardView).also {
            it.keyboard = qwerty
            it.setOnKeyboardActionListener(this)
            it.isPreviewEnabled = false
        }

        templatePanel = view.findViewById(R.id.templatePanel)
        invoicePanel  = view.findViewById(R.id.invoicePanel)
        webPanel      = view.findViewById(R.id.webPanel)
        pendingPanel  = view.findViewById(R.id.pendingPanel)
        emojiPanel    = view.findViewById(R.id.emojiPanel)
        categoryTabs  = view.findViewById(R.id.categoryTabs)

        // Emoji panel
        val emojiAdp = com.samaqu.keyboard.ui.EmojiAdapter { emoji ->
            currentInputConnection?.commitText(emoji, 1)
        }
        view.findViewById<RecyclerView>(R.id.emojiList).apply {
            layoutManager = androidx.recyclerview.widget.GridLayoutManager(context, 8)
            adapter = emojiAdp
        }
        val emojiTabs = view.findViewById<LinearLayout>(R.id.emojiCategoryTabs)
        com.samaqu.keyboard.ui.EMOJI_CATEGORIES.entries.forEachIndexed { i, (label, emojis) ->
            val tab = TextView(this).apply {
                text = label.split(" ").first() // hanya emoji icon
                textSize = 18f
                setPadding(14, 4, 14, 4)
                background = if (i == 0) getDrawable(R.drawable.tab_bg) else null
                setOnClickListener {
                    emojiAdp.setCategory(emojis)
                    for (j in 0 until emojiTabs.childCount)
                        emojiTabs.getChildAt(j).background = null
                    background = getDrawable(R.drawable.tab_bg)
                }
            }
            emojiTabs.addView(tab)
        }
        view.findViewById<TextView>(R.id.btnCloseEmoji).setOnClickListener { hideAllPanels() }

        // Pending orders adapter
        val oadp = com.samaqu.keyboard.ui.OrderAdapter { order ->
            val buyer = order.buyerName?.ifBlank { "Kakak" } ?: "Kakak"
            val msg = "Halo $buyer 😊\n\nPesanan #${order.id} sudah kami terima ya kak.\nMohon kirimkan bukti pembayaran ke sini agar pesanan segera kami proses.\n\nTerima kasih! 🙏"
            currentInputConnection?.commitText(msg, 1)
            hideAllPanels()
        }
        orderAdapter = oadp
        view.findViewById<RecyclerView>(R.id.pendingList).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = oadp
        }
        view.findViewById<TextView>(R.id.btnClosePending).setOnClickListener { hideAllPanels() }

        // Shipping spinner
        val shippingOptions = listOf("Gojek Instant", "J&T Express", "Lalamove", "SiCepat", "JNE", "Anteraja", "Shopee Express")
        view.findViewById<Spinner>(R.id.invShipping).adapter =
            ArrayAdapter(this, android.R.layout.simple_spinner_item, shippingOptions).also {
                it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            }

        // Auto Text panel
        val adp = TemplateAdapter { text ->
            currentInputConnection?.commitText(text, 1)
            hideAllPanels()
        }
        templateAdapter = adp
        view.findViewById<RecyclerView>(R.id.templateList).apply {
            layoutManager = LinearLayoutManager(context)
            adapter = adp
        }

        // Toolbar buttons
        view.findViewById<LinearLayout>(R.id.btnAutoText).setOnClickListener { showPanel(templatePanel) }
        view.findViewById<LinearLayout>(R.id.btnSync).setOnClickListener { doSync() }
        view.findViewById<LinearLayout>(R.id.btnInvoice).setOnClickListener { showPanel(invoicePanel) }
        view.findViewById<LinearLayout>(R.id.btnOngkir).setOnClickListener { showPanel(webPanel) }
        view.findViewById<LinearLayout>(R.id.btnPending).setOnClickListener {
            showPanel(pendingPanel)
            loadPendingOrders(view)
        }
        view.findViewById<LinearLayout>(R.id.btnDashboard).setOnClickListener {
            val intent = android.content.Intent(this, com.samaqu.keyboard.ui.MainActivity::class.java).apply {
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                putExtra("tab", "dashboard")
            }
            startActivity(intent)
        }

        // Close buttons
        view.findViewById<TextView>(R.id.btnClosePanel).setOnClickListener { hideAllPanels() }
        view.findViewById<TextView>(R.id.btnCloseInvoice).setOnClickListener { hideAllPanels() }
        view.findViewById<TextView>(R.id.btnCloseWeb).setOnClickListener { hideAllPanels() }

        // Route keyboard input to focused invoice field
        val invoiceFields = listOf(
            view.findViewById<EditText>(R.id.invBuyer),
            view.findViewById<EditText>(R.id.invProduct),
            view.findViewById<EditText>(R.id.invQty),
            view.findViewById<EditText>(R.id.invPrice),
            view.findViewById<EditText>(R.id.invOngkir)
        )
        invoiceFields.forEach { field ->
            field.setOnTouchListener { _, event ->
                if (event.action == MotionEvent.ACTION_DOWN) {
                    focusedField = field
                    invoiceFields.forEach { it.setBackgroundResource(R.drawable.field_bg) }
                    field.setBackgroundResource(R.drawable.field_bg_active)
                }
                false
            }
        }

        // Invoice generate
        view.findViewById<TextView>(R.id.invBtnGenerate).setOnClickListener {
            val buyer    = view.findViewById<EditText>(R.id.invBuyer).text.toString().trim()
            val product  = view.findViewById<EditText>(R.id.invProduct).text.toString().trim()
            val qty      = view.findViewById<EditText>(R.id.invQty).text.toString().toIntOrNull() ?: 1
            val price    = view.findViewById<EditText>(R.id.invPrice).text.toString().toDoubleOrNull() ?: 0.0
            val ongkir   = view.findViewById<EditText>(R.id.invOngkir).text.toString().toDoubleOrNull() ?: 0.0
            val shipping = view.findViewById<Spinner>(R.id.invShipping).selectedItem?.toString() ?: ""
            val fmt = NumberFormat.getInstance(Locale("id", "ID"))
            val total = price * qty + ongkir
            val text = buildString {
                appendLine("🧾 *INVOICE SAMAQU*")
                appendLine("Pembeli  : $buyer")
                appendLine("Produk   : $product")
                appendLine("Qty      : $qty pcs")
                appendLine("Subtotal : Rp ${fmt.format(price * qty)}")
                if (shipping.isNotBlank()) appendLine("Kurir    : $shipping")
                appendLine("Ongkir   : Rp ${fmt.format(ongkir)}")
                append("*TOTAL    : Rp ${fmt.format(total)}*")
            }
            currentInputConnection?.commitText(text, 1)
            hideAllPanels()
        }

        loadCached()
        return view
    }

    override fun onStartInputView(info: android.view.inputmethod.EditorInfo, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        // Default huruf besar saat keyboard muncul
        caps = true
        qwerty?.isShifted = true
        keyboardView?.invalidateAllKeys()
    }

    private fun typeToField(code: Int) {
        val f = focusedField ?: return
        val txt = f.text
        val pos = f.selectionStart.coerceAtLeast(0)
        when (code) {
            Keyboard.KEYCODE_DELETE -> if (txt.isNotEmpty() && pos > 0) txt.delete(pos - 1, pos)
            else -> {
                var c = code
                if (caps && c in 'a'.code..'z'.code) c -= 32
                txt.insert(pos, c.toChar().toString())
            }
        }
    }

    private fun showPanel(panel: View?) {
        templatePanel?.visibility = View.GONE
        invoicePanel?.visibility  = View.GONE
        webPanel?.visibility      = View.GONE
        pendingPanel?.visibility  = View.GONE
        emojiPanel?.visibility    = View.GONE
        panel?.visibility = View.VISIBLE
        keyboardView?.visibility = View.VISIBLE
    }

    private fun loadPendingOrders(view: View) {
        val prefs = com.samaqu.keyboard.data.Prefs(this)
        val emptyTxt = view.findViewById<TextView>(R.id.pendingEmpty)
        if (prefs.apiKey.isBlank()) {
            emptyTxt.text = "JWT token belum diisi di Settings"
            emptyTxt.visibility = View.VISIBLE
            return
        }
        com.samaqu.keyboard.network.RetrofitClient.init(prefs.apiUrl)
        scope.launch {
            try {
                val orders = withContext(Dispatchers.IO) {
                    com.samaqu.keyboard.network.RetrofitClient.api
                        .getOrders("Bearer ${prefs.apiKey}")
                        .filter { it.status.lowercase() == "pending" }
                }
                if (orders.isEmpty()) {
                    emptyTxt.text = "Tidak ada order pending 🎉"
                    emptyTxt.visibility = View.VISIBLE
                } else {
                    emptyTxt.visibility = View.GONE
                    orderAdapter?.submitList(orders)
                }
            } catch (e: Exception) {
                emptyTxt.text = "Gagal memuat: ${e.message}"
                emptyTxt.visibility = View.VISIBLE
            }
        }
    }

    private fun hideAllPanels() {
        templatePanel?.visibility = View.GONE
        invoicePanel?.visibility  = View.GONE
        webPanel?.visibility      = View.GONE
        pendingPanel?.visibility  = View.GONE
        emojiPanel?.visibility    = View.GONE
        keyboardView?.visibility  = View.VISIBLE
        focusedField = null
    }

    private fun loadCached() {
        scope.launch {
            allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
            renderCategories()
        }
    }

    private fun doSync() {
        val status = rootView?.findViewById<TextView>(R.id.syncStatus)
        status?.setTextColor(0xFFEAB308.toInt())
        scope.launch {
            val ok = withContext(Dispatchers.IO) { repo.sync() }.isSuccess
            allCategories = withContext(Dispatchers.IO) { repo.getTemplates() }
            renderCategories()
            status?.setTextColor(if (ok) 0xFF22C55E.toInt() else 0xFFEF4444.toInt())
        }
    }

    private fun renderCategories() {
        val tabs = categoryTabs ?: return
        val adp  = templateAdapter ?: return
        tabs.removeAllViews()
        if (allCategories.isEmpty()) return
        selectCategory(allCategories.first(), adp)
        allCategories.forEach { cat ->
            val tab = TextView(this).apply {
                text = cat.category.name
                textSize = 12f
                setPadding(36, 8, 36, 8)
                setTextColor(0xFF1D4ED8.toInt())
                typeface = android.graphics.Typeface.SERIF
                background = getDrawable(R.drawable.tab_bg)
                setOnClickListener { selectCategory(cat, adp) }
            }
            tabs.addView(tab)
        }
    }

    private fun selectCategory(cat: CategoryWithTemplates, adp: TemplateAdapter) {
        adp.submitList(cat.templates)
    }

    override fun onKey(primaryCode: Int, keyCodes: IntArray?) {
        // If invoice field focused, route keys there
        if (focusedField != null) {
            when (primaryCode) {
                Keyboard.KEYCODE_SHIFT -> { caps = !caps; qwerty?.isShifted = caps; keyboardView?.invalidateAllKeys() }
                CODE_SYMBOLS -> { keyboardView?.keyboard = symbols; keyboardView?.invalidateAllKeys() }
                CODE_QWERTY  -> { keyboardView?.keyboard = qwerty;  keyboardView?.invalidateAllKeys() }
                -200 -> showPanel(emojiPanel)
                Keyboard.KEYCODE_DONE -> focusedField = null
                else -> {
                    typeToField(primaryCode)
                    if (caps) { caps = false; qwerty?.isShifted = false; keyboardView?.invalidateAllKeys() }
                }
            }
            return
        }

        val ic = currentInputConnection ?: return
        when (primaryCode) {
            Keyboard.KEYCODE_DELETE -> {
                ic.deleteSurroundingText(1, 0)
                // Kalau kolom sudah kosong, balik ke huruf besar
                val before = ic.getTextBeforeCursor(1, 0)
                if (before.isNullOrEmpty()) {
                    caps = true
                    qwerty?.isShifted = true
                    keyboardView?.invalidateAllKeys()
                }
            }
            Keyboard.KEYCODE_DONE  -> {
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP,   KeyEvent.KEYCODE_ENTER))
            }
            Keyboard.KEYCODE_SHIFT -> {
                caps = !caps
                qwerty?.isShifted = caps
                keyboardView?.invalidateAllKeys()
            }
            CODE_SYMBOLS -> { keyboardView?.keyboard = symbols; keyboardView?.invalidateAllKeys() }
            CODE_QWERTY  -> { keyboardView?.keyboard = qwerty;  keyboardView?.invalidateAllKeys() }
            -200 -> showPanel(emojiPanel)
            else -> {
                var code = primaryCode
                if (caps && code in 'a'.code..'z'.code) code -= 32
                ic.commitText(code.toChar().toString(), 1)
                if (caps) { caps = false; qwerty?.isShifted = false; keyboardView?.invalidateAllKeys() }
            }
        }
    }

    override fun onText(text: CharSequence?) {}
    override fun swipeLeft()  {}
    override fun swipeRight() {}
    override fun swipeDown()  {}
    override fun swipeUp()    {}
    override fun onPress(primaryCode: Int)   {}
    override fun onRelease(primaryCode: Int) {}

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
