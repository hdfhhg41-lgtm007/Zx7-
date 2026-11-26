package com.zara.ai.assistant

import android.app.Activity
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject

class ZaraPlayBillingManager(
    private val activity: Activity,
    private val onBillingEvent: (JSONObject) -> Unit
) : PurchasesUpdatedListener {

    companion object {
        val SUBSCRIPTION_IDS = listOf(
            "zara_pro_monthly",
            "zara_pro_yearly"
        )
    }

    private var billingClient: BillingClient? = null
    @Volatile
    private var connected = false
    private val cachedProducts = LinkedHashMap<String, ProductDetails>()
    private val activeTokens = JSONArray()

    fun startConnection() {
        if (billingClient != null && connected) return
        try {
            val client = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder().enableOneTimeProducts().enablePrepaidPlans().build()
                )
                .build()
            billingClient = client
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    connected = result.responseCode == BillingClient.BillingResponseCode.OK
                    if (connected) {
                        refreshCatalogAndPurchases()
                    }
                }

                override fun onBillingServiceDisconnected() {
                    connected = false
                }
            })
        } catch (_: Exception) {
            connected = false
        }
    }

    fun isAvailable(): Boolean = connected

    fun refreshCatalogAndPurchases() {
        val client = billingClient ?: return
        if (!connected) return

        val subParams = SUBSCRIPTION_IDS.map { id ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        }
        val queryParams = QueryProductDetailsParams.newBuilder()
            .setProductList(subParams)
            .build()

        client.queryProductDetailsAsync(queryParams) { result, detailsList ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                synchronized(cachedProducts) {
                    cachedProducts.clear()
                    detailsList.forEach { cachedProducts[it.productId] = it }
                }
            }
        }

        queryActiveSubscriptions()
    }

    fun queryActiveSubscriptions(): String {
        val client = billingClient ?: return "[]"
        if (!connected) return activeTokens.toString()

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                handlePurchases(purchases)
            }
        }
        return activeTokens.toString()
    }

    fun getProductsJson(): String {
        val arr = JSONArray()
        synchronized(cachedProducts) {
            cachedProducts.values.forEach { pd ->
                arr.put(
                    JSONObject().apply {
                        put("productId", pd.productId)
                        put("title", pd.title)
                        put("description", pd.description)
                    }
                )
            }
        }
        return arr.toString()
    }

    fun launchPurchase(productId: String): Boolean {
        val client = billingClient ?: return false
        if (!connected) {
            startConnection()
            return false
        }
        val details = synchronized(cachedProducts) { cachedProducts[productId] } ?: return false
        val offerToken = details.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: return false

        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .setOfferToken(offerToken)
            .build()

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()

        val result = client.launchBillingFlow(activity, flowParams)
        return result.responseCode == BillingClient.BillingResponseCode.OK
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                if (!purchases.isNullOrEmpty()) {
                    handlePurchases(purchases)
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                onBillingEvent(
                    JSONObject().apply {
                        put("status", "cancelled")
                        put("proActive", false)
                        put("message", "Purchase cancelled.")
                    }
                )
            }
            else -> {
                onBillingEvent(
                    JSONObject().apply {
                        put("status", "error")
                        put("proActive", false)
                        put("message", result.debugMessage)
                    }
                )
            }
        }
    }

    private fun handlePurchases(purchases: List<Purchase>) {
        val client = billingClient ?: return
        var anyPro = false
        synchronized(activeTokens) {
            while (activeTokens.length() > 0) {
                activeTokens.remove(0)
            }
        }
        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                anyPro = true
                if (!purchase.isAcknowledged) {
                    val ack = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build()
                    client.acknowledgePurchase(ack) { }
                }
                val sku = purchase.products.firstOrNull() ?: "zara_pro_monthly"
                synchronized(activeTokens) {
                    activeTokens.put(
                        JSONObject().apply {
                            put("sku", sku)
                            put("purchaseToken", purchase.purchaseToken)
                            put("acknowledged", purchase.isAcknowledged)
                        }
                    )
                }
                onBillingEvent(
                    JSONObject().apply {
                        put("status", "purchased")
                        put("proActive", true)
                        put("sku", sku)
                        put("purchaseToken", purchase.purchaseToken)
                        put("message", "Zara Pro subscription active.")
                    }
                )
            }
        }
        if (!anyPro && purchases.isEmpty()) {
            onBillingEvent(
                JSONObject().apply {
                    put("status", "none")
                    put("proActive", false)
                }
            )
        }
    }

    fun destroy() {
        try {
            billingClient?.endConnection()
        } catch (_: Exception) {
        }
        connected = false
    }
}
