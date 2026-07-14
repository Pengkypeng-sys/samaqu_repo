package com.samaqu.keyboard.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.R
import com.samaqu.keyboard.data.CachedTemplate

class TemplateAdapter(
    private val onInsert: (String) -> Unit
) : ListAdapter<CachedTemplate, TemplateAdapter.VH>(DIFF) {

    inner class VH(val root: android.view.View) : RecyclerView.ViewHolder(root) {
        val text: TextView = root.findViewById(R.id.templateContent)
        init { root.setOnClickListener { onInsert(currentList[adapterPosition].content) } }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_template, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.text.text = currentList[position].content
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<CachedTemplate>() {
            override fun areItemsTheSame(a: CachedTemplate, b: CachedTemplate) = a.id == b.id
            override fun areContentsTheSame(a: CachedTemplate, b: CachedTemplate) = a == b
        }
    }
}
