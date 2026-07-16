package com.samaqu.keyboard.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import com.samaqu.keyboard.R
import java.text.NumberFormat
import java.util.Locale

class InvoiceFragment : Fragment() {

    private var selectedBank = ""
    private val bankIds = mapOf(
        "BCA"     to R.id.btnBCA,
        "BRI"     to R.id.btnBRI,
        "BNI"     to R.id.btnBNI,
        "Mandiri" to R.id.btnMandiri,
        "BSI"     to R.id.btnBSI,
        "DANA"    to R.id.btnDANA,
        "OVO"     to R.id.btnOVO,
    )
    private val bankBg = mapOf(
        "BCA"     to R.drawable.btn_bank_bca,
        "BRI"     to R.drawable.btn_bank_bri,
        "BNI"     to R.drawable.btn_bank_bni,
        "Mandiri" to R.drawable.btn_bank_mandiri,
        "BSI"     to R.drawable.btn_bank_bsi,
        "DANA"    to R.drawable.btn_bank_dana,
        "OVO"     to R.drawable.btn_bank_ovo,
    )

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_invoice, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val etBuyer      = view.findViewById<EditText>(R.id.etBuyer)
        val etProduct    = view.findViewById<EditText>(R.id.etProduct)
        val etQty        = view.findViewById<EditText>(R.id.etQty)
        val etPrice      = view.findViewById<EditText>(R.id.etPrice)
        val etOngkir     = view.findViewById<EditText>(R.id.etOngkir)
        val spShipping   = view.findViewById<Spinner>(R.id.spShipping)
        val bankFields   = view.findViewById<View>(R.id.bankFields)
        val etBankNo     = view.findViewById<EditText>(R.id.etBankNo)
        val etBankHolder = view.findViewById<EditText>(R.id.etBankHolder)
        val tvBankNoLbl  = view.findViewById<TextView>(R.id.tvBankNoLabel)
        val etResult     = view.findViewById<EditText>(R.id.etResult)
        val resultCard   = view.findViewById<View>(R.id.resultCard)
        val btnCopy      = view.findViewById<View>(R.id.btnCopy)
        val fmt          = NumberFormat.getInstance(Locale("id", "ID"))

        // Shipping spinner
        val couriers = listOf("Gojek Instant","J&T Express","Lalamove","SiCepat","JNE","Anteraja","Shopee Express","Wahana","Lion Parcel")
        spShipping.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, couriers)
            .also { it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }

        // Bank toggle
        bankIds.forEach { (bank, viewId) ->
            view.findViewById<TextView>(viewId).setOnClickListener {
                if (selectedBank == bank) {
                    selectedBank = ""
                    bankFields.visibility = View.GONE
                    resetBankBg(view)
                } else {
                    selectedBank = bank
                    resetBankBg(view)
                    it.setBackgroundResource(R.drawable.btn_bank_sel)
                    bankFields.visibility = View.VISIBLE
                    val isEwallet = bank == "DANA" || bank == "OVO"
                    tvBankNoLbl.text = if (isEwallet) "No. HP" else "No. Rekening"
                    etBankNo.hint = if (isEwallet) "No. HP terdaftar" else "No. rekening"
                }
            }
        }

        view.findViewById<View>(R.id.btnGenerate).setOnClickListener {
            val buyer    = etBuyer.text.toString().trim()
            val product  = etProduct.text.toString().trim()
            val qty      = etQty.text.toString().toIntOrNull() ?: 1
            val price    = etPrice.text.toString().toDoubleOrNull() ?: 0.0
            val ongkir   = etOngkir.text.toString().toDoubleOrNull() ?: 0.0
            val courier  = spShipping.selectedItem?.toString() ?: ""
            val subtotal = price * qty
            val total    = subtotal + ongkir

            val invoice = buildString {
                appendLine("━━━━━━━━━━━━━━━━━━━━")
                appendLine("🧾 INVOICE SAMAQU")
                appendLine("━━━━━━━━━━━━━━━━━━━━")
                appendLine("Pembeli  : $buyer")
                appendLine("Produk   : $product")
                appendLine("Qty      : $qty pcs")
                appendLine("Harga    : Rp ${fmt.format(price)}/pcs")
                appendLine("Subtotal : Rp ${fmt.format(subtotal)}")
                if (courier.isNotBlank()) appendLine("Kurir    : $courier")
                appendLine("Ongkir   : Rp ${fmt.format(ongkir)}")
                appendLine("━━━━━━━━━━━━━━━━━━━━")
                appendLine("TOTAL    : Rp ${fmt.format(total)}")
                if (selectedBank.isNotBlank()) {
                    val bankNo = etBankNo.text.toString().trim()
                    val holder = etBankHolder.text.toString().trim()
                    if (bankNo.isNotBlank()) {
                        appendLine("━━━━━━━━━━━━━━━━━━━━")
                        appendLine("💳 Transfer via $selectedBank")
                        appendLine("No.      : $bankNo")
                        if (holder.isNotBlank()) append("A/N      : $holder")
                    }
                }
            }

            etResult.setText(invoice)
            resultCard.visibility = View.VISIBLE
        }

        btnCopy.setOnClickListener {
            val cm = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("invoice", etResult.text.toString()))
            Toast.makeText(requireContext(), "Invoice disalin!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun resetBankBg(view: View) {
        bankIds.forEach { (bank, viewId) ->
            view.findViewById<TextView>(viewId).setBackgroundResource(bankBg[bank]!!)
        }
    }
}
