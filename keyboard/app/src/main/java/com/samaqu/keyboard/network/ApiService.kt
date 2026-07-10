package com.samaqu.keyboard.network

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class CategoryWithTemplates(
    val id: Int,
    val name: String,
    val templates: List<RemoteTemplate>
)

data class RemoteTemplate(
    val id: Int,
    val content: String
)

data class Product(
    val id: Int,
    val name: String,
    val series: String?,
    @SerializedName("stock_qty") val stockQty: Int,
    val price: Double,
    @SerializedName("size_variants") val sizeVariants: Map<String, Int>?
)

interface ApiService {
    @GET("templates")
    suspend fun getTemplates(@Header("Authorization") auth: String): List<CategoryWithTemplates>

    @GET("products")
    suspend fun getProducts(@Header("Authorization") auth: String): List<Product>
}
