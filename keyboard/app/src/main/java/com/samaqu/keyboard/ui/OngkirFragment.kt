package com.samaqu.keyboard.ui

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.*
import android.widget.*
import androidx.fragment.app.Fragment
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.Prefs
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.Executors

data class CityArea(val id: String, val name: String, val city: String, val postal: String)
data class CourierRate(val name: String, val service: String, val price: Long, val eta: String)

class OngkirFragment : Fragment() {

    private val exec = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val fmt  = NumberFormat.getInstance(Locale("id", "ID"))

    private var originId = ""
    private var destId   = ""
    private val cityCache = mutableMapOf<String, List<CityArea>>()
    private var debounceOrigin: Runnable? = null
    private var debounceDestination: Runnable? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_ongkir, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val prefs       = Prefs(requireContext())
        val etOrigin    = view.findViewById<EditText>(R.id.etOrigin)
        val etDest      = view.findViewById<EditText>(R.id.etDest)
        val etWeight    = view.findViewById<EditText>(R.id.etWeight)
        val lvOrigin    = view.findViewById<ListView>(R.id.lvOriginSuggest)
        val lvDest      = view.findViewById<ListView>(R.id.lvDestSuggest)
        val btnCek      = view.findViewById<TextView>(R.id.btnCekOngkir)
        val tvStatus    = view.findViewById<TextView>(R.id.tvOngkirStatus)
        val llResults   = view.findViewById<LinearLayout>(R.id.llResults)

        fun setupSearch(et: EditText, lv: ListView, onSelect: (CityArea) -> Unit) {
            et.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
                override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    val q = s?.toString()?.trim() ?: return
                    if (q.length < 2) { lv.visibility = View.GONE; return }
                    val key = prefs.biteshipKey
                    if (key.isEmpty()) { lv.visibility = View.GONE; return }

                    val r = Runnable {
                        cityCache[q]?.let { main.post { renderSuggest(lv, it, onSelect) }; return@Runnable }
                        try {
                            val url = URL("https://api.biteship.com/v1/maps/areas?countries=ID&input=${java.net.URLEncoder.encode(q,"UTF-8")}&type=single")
                            val conn = url.openConnection() as HttpURLConnection
                            conn.setRequestProperty("Authorization", key)
                            val resp = conn.inputStream.bufferedReader().readText()
                            val arr  = JSONObject(resp).optJSONArray("areas") ?: return@Runnable
                            val list = (0 until arr.length()).map { i ->
                                val o = arr.getJSONObject(i)
                                CityArea(
                                    o.optString("id"),
                                    o.optString("name"),
                                    o.optString("administrative_division_level_2_name",""),
                                    o.optString("postal_code","")
                                )
                            }
                            cityCache[q] = list
                            main.post { renderSuggest(lv, list, onSelect) }
                        } catch (_: Exception) {}
                    }
                    if (et === etOrigin) { debounceOrigin?.let { main.removeCallbacks(it) }; debounceOrigin = r }
                    else { debounceDestination?.let { main.removeCallbacks(it) }; debounceDestination = r }
                    main.postDelayed(r, 400)
                }
            })
        }

        setupSearch(etOrigin, lvOrigin) { area ->
            originId = area.id
            etOrigin.setText("${area.name}, ${area.city} (${area.postal})")
            etOrigin.setSelection(etOrigin.text.length)
            lvOrigin.visibility = View.GONE
        }
        setupSearch(etDest, lvDest) { area ->
            destId = area.id
            etDest.setText("${area.name}, ${area.city} (${area.postal})")
            etDest.setSelection(etDest.text.length)
            lvDest.visibility = View.GONE
        }

        btnCek.setOnClickListener {
            if (originId.isEmpty() || destId.isEmpty()) {
                Toast.makeText(requireContext(), "Pilih kota dari saran", Toast.LENGTH_SHORT).show(); return@setOnClickListener
            }
            val key    = prefs.biteshipKey
            if (key.isEmpty()) {
                Toast.makeText(requireContext(), "Isi Biteship API Key di Pengaturan", Toast.LENGTH_LONG).show(); return@setOnClickListener
            }
            val weight = etWeight.text.toString().toIntOrNull() ?: 1000
            tvStatus.text = "⏳ Mengecek ongkir..."; tvStatus.visibility = View.VISIBLE
            llResults.removeAllViews()
            exec.execute {
                try {
                    val body = """{"origin_area_id":"$originId","destination_area_id":"$destId","couriers":"jne,jnt,sicepat,anteraja,gosend,grab_express,wahana,lion","items":[{"name":"Paket","value":10000,"weight":$weight,"quantity":1}]}"""
                    val url  = URL("https://api.biteship.com/v1/rates/couriers")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Authorization", key)
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true
                    OutputStreamWriter(conn.outputStream).use { it.write(body) }
                    val resp = conn.inputStream.bufferedReader().readText()
                    val pricing = JSONObject(resp).optJSONArray("pricing")
                    if (pricing == null || pricing.length() == 0) {
                        main.post { tvStatus.text = "Tidak ada layanan tersedia" }; return@execute
                    }
                    val rates = (0 until pricing.length()).map { i ->
                        val p = pricing.getJSONObject(i)
                        CourierRate(p.optString("courier_name"), p.optString("courier_service_name"),
                            p.optLong("price"), p.optString("shipment_duration_range","?"))
                    }.sortedBy { it.price }
                    main.post {
                        tvStatus.visibility = View.GONE
                        llResults.removeAllViews()
                        val inf = layoutInflater
                        rates.forEach { rate ->
                            val card = inf.inflate(R.layout.item_ongkir_result, llResults, false)
                            card.findViewById<TextView>(R.id.tvCourier).text = rate.name
                            card.findViewById<TextView>(R.id.tvService).text = rate.service
                            card.findViewById<TextView>(R.id.tvPrice).text   = "Rp ${fmt.format(rate.price)}"
                            card.findViewById<TextView>(R.id.tvEta).text     = "${rate.eta} hari"
                            card.findViewById<TextView>(R.id.btnKirim).setOnClickListener {
                                val msg = "🚚 Cek Ongkir\nKurir    : ${rate.name} (${rate.service})\nOngkir   : Rp ${fmt.format(rate.price)}\nEstimasi : ${rate.eta} hari"
                                val cm = requireContext().getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                cm.setPrimaryClip(android.content.ClipData.newPlainText("ongkir", msg))
                                Toast.makeText(requireContext(), "Disalin!", Toast.LENGTH_SHORT).show()
                            }
                            llResults.addView(card)
                        }
                    }
                } catch (e: Exception) {
                    main.post { tvStatus.text = "❌ ${e.message}" }
                }
            }
        }
    }

    private fun renderSuggest(lv: ListView, areas: List<CityArea>, onSelect: (CityArea) -> Unit) {
        if (areas.isEmpty()) { lv.visibility = View.GONE; return }
        val labels = areas.take(6).map { "${it.name}, ${it.city} (${it.postal})" }
        lv.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, labels)
        lv.visibility = View.VISIBLE
        lv.setOnItemClickListener { _, _, pos, _ -> onSelect(areas[pos]) }
    }
}
