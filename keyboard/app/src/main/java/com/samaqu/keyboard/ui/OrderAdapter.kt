package com.samaqu.keyboard.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.network.OrderItem

class OrderAdapter(private val onClick: (OrderItem) -> Unit) :
    RecyclerView.Adapter<OrderAdapter.VH>() {

    private var items: List<OrderItem> = emptyList()

    fun submitList(list: List<OrderItem>) {
        items = list
        notifyDataSetChanged()
    }

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val txtBuyer: TextView = v.findViewById(R.id.txtBuyer)
        val txtOrderId: TextView = v.findViewById(R.id.txtOrderId)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_order, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.txtBuyer.text = item.buyerName?.ifBlank { "Pembeli #${item.id}" } ?: "Pembeli #${item.id}"
        holder.txtOrderId.text = "Order #${item.id} • ${item.createdAt?.take(10) ?: "-"}"
        holder.itemView.setOnClickListener { onClick(item) }
    }
}
