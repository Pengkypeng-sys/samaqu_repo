package com.samaqu.keyboard.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.samaqu.keyboard.data.Prefs
import com.samaqu.keyboard.network.RetrofitClient
import java.util.concurrent.TimeUnit

class OrderPoller(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val prefs = Prefs(applicationContext)
        val token = prefs.apiKey.ifBlank { return Result.success() }
        val url   = prefs.apiUrl.ifBlank { return Result.success() }

        return try {
            RetrofitClient.init(url)
            val orders = RetrofitClient.api.getOrders("Bearer $token")
            val pending = orders.filter { it.status == "pending" }
            val lastCount = prefs.lastPendingCount

            if (pending.size > lastCount) {
                val newCount = pending.size - lastCount
                showNotification(newCount)
            }
            prefs.lastPendingCount = pending.size
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun showNotification(count: Int) {
        val mgr = applicationContext.getSystemService(NotificationManager::class.java)
        mgr.createNotificationChannel(
            NotificationChannel("samaqu_orders", "Order Baru", NotificationManager.IMPORTANCE_HIGH)
        )
        val notif = NotificationCompat.Builder(applicationContext, "samaqu_orders")
            .setContentTitle("$count order baru masuk!")
            .setContentText("Buka dashboard untuk lihat detail")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .build()
        mgr.notify(2, notif)
    }

    companion object {
        fun schedule(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<OrderPoller>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                "order_poll", ExistingPeriodicWorkPolicy.KEEP, req
            )
        }

        fun cancel(ctx: Context) {
            WorkManager.getInstance(ctx).cancelUniqueWork("order_poll")
        }
    }
}
