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

data class OrderItem(
    val id: Int,
    val status: String,
    @SerializedName("buyer_name") val buyerName: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class BankAccountRemote(
    val id: Int,
    @SerializedName("bank_name") val bankName: String,
    @SerializedName("account_number") val accountNumber: String,
    @SerializedName("account_holder") val accountHolder: String,
    @SerializedName("is_active") val isActive: Boolean
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
    suspend fun getTemplates(): List<CategoryWithTemplates>

    @GET("bank-accounts")
    suspend fun getBankAccounts(): List<BankAccountRemote>

    @GET("config")
    suspend fun getConfig(): Map<String, String>

    @GET("products")
    suspend fun getProducts(@Header("Authorization") auth: String): List<Product>

    @GET("orders")
    suspend fun getOrders(@Header("Authorization") auth: String): List<OrderItem>

}
