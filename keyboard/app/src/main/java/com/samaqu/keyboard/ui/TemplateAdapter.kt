package com.samaqu.keyboard.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.samaqu.keyboard.data.CachedTemplate
import com.samaqu.keyboard.databinding.ItemTemplateBinding

class TemplateAdapter(
    private val onInsert: (String) -> Unit
) : ListAdapter<CachedTemplate, TemplateAdapter.VH>(DIFF) {

    inner class VH(val binding: ItemTemplateBinding) : RecyclerView.ViewHolder(binding.root) {
        init { binding.root.setOnClickListener { onInsert(currentList[adapterPosition].content) } }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemTemplateBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.binding.templateContent.text = currentList[position].content
    }

    companion object {
        val DIFF = object : DiffUtil.ItemCallback<CachedTemplate>() {
            override fun areItemsTheSame(a: CachedTemplate, b: CachedTemplate) = a.id == b.id
            override fun areContentsTheSame(a: CachedTemplate, b: CachedTemplate) = a == b
        }
    }
}
