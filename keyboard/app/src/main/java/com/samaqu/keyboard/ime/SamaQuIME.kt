package com.samaqu.keyboard.ime

import android.annotation.SuppressLint
import android.inputmethodservice.InputMethodService
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
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
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.Executors

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
    private var pendingPanel: View? = null
    private var emojiPanel: View? = null
    private var categoryTabs: LinearLayout? = null
    private var templateAdapter: TemplateAdapter? = null
    private var orderAdapter: com.samaqu.keyboard.ui.OrderAdapter? = null
    private var rootView: View? = null
    private var focusedField: EditText? = null
    private var selectedBank: String = ""
    private val numericFields = mutableSetOf<EditText>()

    // Ongkir state
    private val uiHandler = Handler(Looper.getMainLooper())
    private val executor  = Executors.newSingleThreadExecutor()
    private val cityCache = mutableMapOf<String, List<Pair<String,String>>>()
    private var originAreaId = ""
    private var destAreaId   = ""
    private var oqDebounce: Runnable? = null


    override fun onCreate() {
        super.onCreate()
        repo = TemplateRepository(this)
    }

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_main, null)
        rootView = view

        val prefs0 = com.samaqu.keyboard.data.Prefs(this)
        val large = prefs0.keySize == "large"
        val dark  = prefs0.darkTheme
        view.setBackgroundColor(if (dark) 0xFF1A1F2E.toInt() else 0xFFE8ECF0.toInt())

        qwerty  = Keyboard(this, if (large) R.xml.qwerty_large  else R.xml.qwerty)
        symbols = Keyboard(this, if (large) R.xml.symbols_large else R.xml.symbols)

        keyboardView = view.findViewById<SamaQuKeyboardView>(R.id.keyboardView).also {
            it.keyboard = qwerty
            it.setOnKeyboardActionListener(this)
            it.isPreviewEnabled = false
            it.applyTheme(dark)
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
                text = label.split(" ").first()
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

        setupBankButtons(view)
        setupOngkirPanel(view)

        // Route keyboard input to focused invoice field
        val invoiceFields = listOf(
            view.findViewById<EditText>(R.id.invBuyer),
            view.findViewById<EditText>(R.id.invProduct),
            view.findViewById<EditText>(R.id.invQty),
            view.findViewById<EditText>(R.id.invPrice),
            view.findViewById<EditText>(R.id.invOngkir),
            view.findViewById<EditText>(R.id.imbNo),
            view.findViewById<EditText>(R.id.imbHolder)
        )
        // Fields that should trigger numeric keyboard
        numericFields.clear()
        numericFields.addAll(listOf(
            view.findViewById(R.id.invQty),
            view.findViewById(R.id.invPrice),
            view.findViewById(R.id.invOngkir),
            view.findViewById(R.id.imbNo)
        ))
        invoiceFields.forEach { field ->
            field.setOnTouchListener { _, event ->
                if (event.action == MotionEvent.ACTION_DOWN) {
                    focusedField = field
                    invoiceFields.forEach { it.setBackgroundResource(R.drawable.field_bg) }
                    field.setBackgroundResource(R.drawable.field_bg_active)
                    // Switch keyboard layout based on field type
                    if (field in numericFields) {
                        keyboardView?.keyboard = symbols
                    } else {
                        keyboardView?.keyboard = qwerty
                        qwerty?.isShifted = caps
                    }
                    keyboardView?.invalidateAllKeys()
                }
                false
            }
        }

        // Invoice generate
        val btnGenerate = view.findViewById<TextView>(R.id.invBtnGenerate)
        btnGenerate.setOnClickListener {
            btnGenerate.isClickable = false
            val buyer    = view.findViewById<EditText>(R.id.invBuyer).text.toString().trim()
            val product  = view.findViewById<EditText>(R.id.invProduct).text.toString().trim()
            val qty      = view.findViewById<EditText>(R.id.invQty).text.toString().toIntOrNull() ?: 1
            val price    = view.findViewById<EditText>(R.id.invPrice).text.toString().replace(".", "").toDoubleOrNull() ?: 0.0
            val ongkir   = view.findViewById<EditText>(R.id.invOngkir).text.toString().replace(".", "").toDoubleOrNull() ?: 0.0
            val shipping = view.findViewById<Spinner>(R.id.invShipping).selectedItem?.toString() ?: ""
            val bankNo   = view.findViewById<EditText>(R.id.imbNo).text.toString().trim()
            val bankName = view.findViewById<EditText>(R.id.imbHolder).text.toString().trim()
            val fmt = NumberFormat.getInstance(Locale("id", "ID"))
            val subtotal = price * qty
            val total    = subtotal + ongkir
            val prefs2 = com.samaqu.keyboard.data.Prefs(this)
            val sep       = prefs2.invoiceSeparator
            val storeName = prefs2.storeName.ifBlank { "SAMAQU" }
            val footer    = prefs2.invoiceFooter
            val rawHeader = prefs2.invoiceHeader.ifBlank { "🧾 *INVOICE {store_name}*" }
            val header    = rawHeader.replace("{store_name}", storeName)
            val showPricePer = prefs2.invoiceShowPricePer
            val showSubtotal = prefs2.invoiceShowSubtotal
            val text = buildString {
                appendLine(header)
                if (sep.isNotBlank()) appendLine(sep)
                appendLine("Pembeli  : *$buyer*")
                appendLine("Produk   : $product ($qty pcs)")
                if (showPricePer) appendLine("Harga    : Rp ${fmt.format(price)}/pcs")
                if (sep.isNotBlank()) appendLine(sep)
                if (showSubtotal) appendLine("Subtotal : Rp ${fmt.format(subtotal)}")
                if (shipping.isNotBlank()) appendLine("Kurir    : $shipping")
                if (ongkir > 0) appendLine("Ongkir   : Rp ${fmt.format(ongkir)}")
                if (sep.isNotBlank()) appendLine(sep)
                appendLine("*TOTAL   : Rp ${fmt.format(total)}*")
                if (selectedBank.isNotBlank()) {
                    if (sep.isNotBlank()) appendLine(sep)
                    appendLine("💳 *Transfer via $selectedBank*")
                    if (bankNo.isNotBlank())   appendLine("No. Rek  : $bankNo")
                    if (bankName.isNotBlank()) appendLine("A/N      : $bankName")
                }
                if (footer.isNotBlank()) {
                    if (sep.isNotBlank()) appendLine(sep)
                    append(footer)
                }
            }
            currentInputConnection?.commitText(text.trimEnd(), 1)
            hideAllPanels()
            btnGenerate.isClickable = true
        }

        attachCurrencyWatcher(view.findViewById(R.id.invPrice))
        attachCurrencyWatcher(view.findViewById(R.id.invOngkir))

        loadCached()
        return view
    }

    override fun onStartInputView(info: android.view.inputmethod.EditorInfo, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        val inputClass = info.inputType and android.text.InputType.TYPE_MASK_CLASS
        val isNumeric = inputClass == android.text.InputType.TYPE_CLASS_NUMBER ||
                        inputClass == android.text.InputType.TYPE_CLASS_PHONE
        if (isNumeric) {
            keyboardView?.keyboard = symbols
        } else {
            caps = true
            qwerty?.isShifted = true
        }
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
        // Balik ke QWERTY saat panel ditutup
        keyboardView?.keyboard = qwerty
        qwerty?.isShifted = caps
        keyboardView?.invalidateAllKeys()
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
            if (ok) checkForUpdate()
        }
    }

    private fun checkForUpdate() {
        scope.launch {
            try {
                val prefs = com.samaqu.keyboard.data.Prefs(this@SamaQuIME)
                val info = withContext(Dispatchers.IO) {
                    com.samaqu.keyboard.network.RetrofitClient.api.getLatestVersion()
                }
                val serverVer = info["version"] ?: return@launch
                val apkUrl   = info["apk_url"] ?: ""
                val changelog = info["changelog"] ?: ""
                val currentVer = packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0"
                if (serverVer != currentVer && apkUrl.isNotBlank()) {
                    // Show toast-style update banner
                    val ctx = applicationContext
                    android.widget.Toast.makeText(
                        ctx,
                        "📦 Update tersedia v$serverVer! Buka app SAMAQU untuk download.",
                        android.widget.Toast.LENGTH_LONG
                    ).show()
                }
            } catch (_: Exception) {}
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

    @android.annotation.SuppressLint("ClickableViewAccessibility")
    private fun setupOngkirPanel(view: View) {
        val etOrigin   = view.findViewById<EditText>(R.id.oqOrigin)
        val etDest     = view.findViewById<EditText>(R.id.oqDest)
        val etWeight   = view.findViewById<EditText>(R.id.oqWeight)
        val btnCek     = view.findViewById<TextView>(R.id.btnOqCek)
        val statusTv   = view.findViewById<TextView>(R.id.oqStatus)
        val resultsBox = view.findViewById<LinearLayout>(R.id.oqResults)
        val originList = view.findViewById<ListView>(R.id.oqOriginList)
        val destList   = view.findViewById<ListView>(R.id.oqDestList)

        fun showStatus(msg: String, visible: Boolean = true) {
            statusTv.text = msg
            statusTv.visibility = if (visible) View.VISIBLE else View.GONE
        }

        fun searchCity(query: String, list: ListView, onPick: (String, String) -> Unit) {
            if (query.length < 3) { list.visibility = View.GONE; return }
            cityCache[query]?.let { cached ->
                val adp = ArrayAdapter(this, android.R.layout.simple_list_item_1, cached.map { it.first })
                list.adapter = adp; list.visibility = View.VISIBLE
                list.setOnItemClickListener { _, _, pos, _ -> onPick(cached[pos].first, cached[pos].second); list.visibility = View.GONE }
                return
            }
            executor.execute {
                try {
                    val conn = URL("https://api.biteship.com/v1/maps/areas?countries=ID&input=${java.net.URLEncoder.encode(query,"UTF-8")}&type=single")
                        .openConnection() as HttpURLConnection
                    conn.setRequestProperty("Authorization", com.samaqu.keyboard.data.Prefs(this).biteshipKey)
                    conn.connectTimeout = 5000; conn.readTimeout = 8000
                    val resp = conn.inputStream.bufferedReader().readText(); conn.disconnect()
                    val areas = JSONObject(resp).optJSONArray("areas") ?: JSONArray()
                    val items = (0 until areas.length()).map { i ->
                        val a = areas.getJSONObject(i)
                        Pair("${a.optString("name")}, ${a.optString("administrative_division_level_2_name")}, ${a.optString("administrative_division_level_1_name")}", a.optString("id"))
                    }
                    cityCache[query] = items
                    uiHandler.post {
                        val adp = ArrayAdapter(this, android.R.layout.simple_list_item_1, items.map { it.first })
                        list.adapter = adp; list.visibility = if (items.isEmpty()) View.GONE else View.VISIBLE
                        list.setOnItemClickListener { _, _, pos, _ -> onPick(items[pos].first, items[pos].second); list.visibility = View.GONE }
                    }
                } catch (_: Exception) { uiHandler.post { list.visibility = View.GONE } }
            }
        }

        fun debounce(field: EditText, list: ListView, onPick: (String, String) -> Unit) {
            field.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
                override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    oqDebounce?.let { uiHandler.removeCallbacks(it) }
                    val q = s?.toString()?.trim() ?: return
                    val r = Runnable { searchCity(q, list, onPick) }
                    oqDebounce = r; uiHandler.postDelayed(r, 400)
                }
            })
        }

        debounce(etOrigin, originList) { label, id -> etOrigin.setText(label); originAreaId = id }
        debounce(etDest,   destList)   { label, id -> etDest.setText(label);   destAreaId   = id }

        btnCek.setOnClickListener {
            if (originAreaId.isBlank() || destAreaId.isBlank()) { showStatus("Pilih kota dari saran"); return@setOnClickListener }
            val weightGram = etWeight.text.toString().toIntOrNull() ?: 1000
            showStatus("Mengecek tarif..."); resultsBox.removeAllViews()
            val key = com.samaqu.keyboard.data.Prefs(this).biteshipKey
            executor.execute {
                try {
                    val body = JSONObject().apply {
                        put("origin_area_id", originAreaId); put("destination_area_id", destAreaId)
                        put("couriers", "jne,j&t,sicepat,anteraja,shopee,gojek,grab,lalamove")
                        put("items", JSONArray().put(JSONObject().apply { put("name","Barang"); put("value",10000); put("weight",weightGram) }))
                    }.toString().toByteArray()
                    val conn = URL("https://api.biteship.com/v1/rates/couriers").openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"; conn.setRequestProperty("Authorization", key)
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true; conn.connectTimeout = 8000; conn.readTimeout = 10000
                    conn.outputStream.write(body)
                    val pricing = JSONObject(conn.inputStream.bufferedReader().readText()).optJSONArray("pricing") ?: JSONArray()
                    conn.disconnect()
                    val fmt = NumberFormat.getInstance(Locale("id","ID"))
                    uiHandler.post {
                        showStatus("", false)
                        if (pricing.length() == 0) { showStatus("Tidak ada hasil"); return@post }
                        resultsBox.removeAllViews()
                        for (i in 0 until pricing.length()) {
                            val p = pricing.getJSONObject(i)
                            val courier = p.optString("courier_name"); val service = p.optString("courier_service_name")
                            val price = p.optInt("price"); val eta = p.optString("duration")
                            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(10,8,10,8); setBackgroundColor(0xFFFFFFFF.toInt()) }
                            row.addView(TextView(this).apply {
                                text = "$courier $service\nRp ${fmt.format(price)} • $eta"; textSize = 11f; setTextColor(0xFF111111.toInt())
                                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                            })
                            row.addView(TextView(this).apply {
                                text = "Kirim"; textSize = 11f; setTextColor(0xFF1D4ED8.toInt()); setPadding(12,4,4,4)
                                setOnClickListener { currentInputConnection?.commitText("$courier $service: Rp ${fmt.format(price)} ($eta)", 1); hideAllPanels() }
                            })
                            val div = View(this).apply { layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1); setBackgroundColor(0xFFE2E8F0.toInt()) }
                            resultsBox.addView(row); resultsBox.addView(div)
                        }
                    }
                } catch (e: Exception) { uiHandler.post { showStatus("Gagal: ${e.message}") } }
            }
        }
    }

    private fun attachCurrencyWatcher(field: EditText) {
        var editing = false
        field.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                if (editing || s == null) return
                val digits = s.toString().replace(".", "")
                if (digits.isEmpty()) return
                val num = digits.toLongOrNull() ?: return
                val formatted = String.format("%,d", num).replace(',', '.')
                if (formatted != s.toString()) {
                    editing = true
                    s.replace(0, s.length, formatted)
                    editing = false
                }
            }
        })
    }

    private fun setupBankButtons(view: View) {
        val bankBtns = mapOf(
            R.id.imbBca     to "BCA",
            R.id.imbBri     to "BRI",
            R.id.imbBni     to "BNI",
            R.id.imbMandiri to "Mandiri",
            R.id.imbBsi     to "BSI",
            R.id.imbDana    to "DANA",
            R.id.imbOvo     to "OVO"
        )
        val bankDrawable = mapOf(
            "BCA"     to R.drawable.btn_bank_bca,
            "BRI"     to R.drawable.btn_bank_bri,
            "BNI"     to R.drawable.btn_bank_bni,
            "Mandiri" to R.drawable.btn_bank_mandiri,
            "BSI"     to R.drawable.btn_bank_bsi,
            "DANA"    to R.drawable.btn_bank_dana,
            "OVO"     to R.drawable.btn_bank_ovo
        )
        val bankFields  = view.findViewById<LinearLayout>(R.id.imbFields)
        val etNo        = view.findViewById<EditText>(R.id.imbNo)
        val etHolder    = view.findViewById<EditText>(R.id.imbHolder)

        fun loadBankInfo(bankName: String): Pair<String, String>? {
            val prefs = com.samaqu.keyboard.data.Prefs(this)
            return try {
                val arr = org.json.JSONArray(prefs.bankAccountsJson)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    if (obj.optString("bank_name").equals(bankName, ignoreCase = true)) {
                        return Pair(obj.optString("account_number"), obj.optString("account_holder"))
                    }
                }
                null
            } catch (_: Exception) { null }
        }

        bankBtns.forEach { (id, name) ->
            view.findViewById<TextView>(id).setOnClickListener { btn ->
                if (selectedBank == name) {
                    selectedBank = ""
                    btn.setBackgroundResource(bankDrawable[name]!!)
                    bankFields.visibility = View.GONE
                    etNo.setText(""); etHolder.setText("")
                } else {
                    bankBtns.forEach { (otherId, otherName) ->
                        view.findViewById<TextView>(otherId).setBackgroundResource(bankDrawable[otherName]!!)
                    }
                    selectedBank = name
                    btn.setBackgroundResource(R.drawable.btn_bank_sel)
                    bankFields.visibility = View.VISIBLE
                    // Auto-fill dari data yang sudah disync
                    val saved = loadBankInfo(name)
                    if (saved != null) {
                        etNo.setText(saved.first)
                        etHolder.setText(saved.second)
                    } else {
                        etNo.setText(""); etHolder.setText("")
                    }
                }
            }
        }
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
