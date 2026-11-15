package com.zara.ai.assistant

import android.app.Activity
import android.content.Context
import android.content.Intent
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

/**
 * Google Play Billing Library v7 integration for Zara Pro Tier subscriptions:
 * - SKUs: zara_pro_monthly, zara_pro_yearly
 * - Handles product catalog query, Play Store purchase sheet launch, acknowledgement, and entitlement restoration.
 */
class ZaraPlayBillingManager(private val context: Context) : PurchasesUpdatedListener {

    private var billingClient: BillingClient? = null
    private val cachedProducts = mutableMapOf<String, ProductDetails>()

    @Volatile
    var isConnected: Boolean = false
        private set

    fun initialize() {
        if (billingClient != null) return
        val client = BillingClient.newBuilder(context.applicationContext)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().enablePrepaidPlans().build()
            )
            .build()
        billingClient = client
        connectAndRefresh()
    }

    fun connectAndRefresh() {
        val client = billingClient ?: return
        if (client.isReady) {
            querySubscriptionsCatalog()
            queryActivePurchases()
            return
        }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                isConnected = result.responseCode == BillingClient.BillingResponseCode.OK
                if (isConnected) {
                    querySubscriptionsCatalog()
                    queryActivePurchases()
                }
            }

            override fun onBillingServiceDisconnected() {
                isConnected = false
            }
        })
    }

    fun querySubscriptionsCatalog() {
        val client = billingClient ?: return
        if (!client.isReady) return

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(ZaraBridgeContract.SKU_PRO_MONTHLY)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(ZaraBridgeContract.SKU_PRO_YEARLY)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        client.queryProductDetailsAsync(params) { billingResult, detailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                for (pd in detailsList) {
                    cachedProducts[pd.productId] = pd
                }
            }
        }
    }

    fun getProductsJson(): String {
        val arr = JSONArray()
        for ((id, pd) in cachedProducts) {
            val offer = pd.subscriptionOfferDetails?.firstOrNull()
            val pricePhase = offer?.pricingPhases?.pricingPhaseList?.firstOrNull()
            arr.put(
                JSONObject().apply {
                    put("productId", id)
                    put("title", pd.title)
                    put("description", pd.description)
                    put("formattedPrice", pricePhase?.formattedPrice ?: "")
                    put("currencyCode", pricePhase?.priceCurrencyCode ?: "USD")
                }
            )
        }
        return JSONObject().apply {
            put("ready", isConnected)
            put("products", arr)
        }.toString()
    }

    fun getActiveEntitlementJson(): String {
        val prefs = ZaraBridgeContract.prefs(context)
        return JSONObject().apply {
            put("ready", isConnected)
            put("proActive", prefs.getBoolean(ZaraBridgeContract.KEY_PRO_TIER_ACTIVE, false))
            put("sku", prefs.getString(ZaraBridgeContract.KEY_PRO_TIER_SKU, ""))
            put("purchaseToken", prefs.getString(ZaraBridgeContract.KEY_PRO_PURCHASE_TOKEN, ""))
        }.toString()
    }

    fun queryActivePurchases() {
        val client = billingClient ?: return
        if (!client.isReady) return

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        client.queryPurchasesAsync(params) { billingResult, purchases ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                processPurchaseList(purchases)
            }
        }
    }

    fun launchPurchaseFlow(activity: Activity, productId: String): Boolean {
        val client = billingClient ?: return false
        if (!client.isReady) {
            connectAndRefresh()
            return false
        }
        val pd = cachedProducts[productId] ?: return false
        val offerToken = pd.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: return false

        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(pd)
            .setOfferToken(offerToken)
            .build()

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()

        val res = client.launchBillingFlow(activity, flowParams)
        return res.responseCode == BillingClient.BillingResponseCode.OK
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            processPurchaseList(purchases)
        } else {
            val payload = JSONObject().apply {
                put("status", "cancelled_or_error")
                put("responseCode", billingResult.responseCode)
                put("message", billingResult.debugMessage)
            }
            broadcastBillingUpdate(payload)
        }
    }

    private fun processPurchaseList(purchases: List<Purchase>) {
        var foundActive = false
        var activeSku = ""
        var activeToken = ""

        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                foundActive = true
                activeSku = purchase.products.firstOrNull() ?: ZaraBridgeContract.SKU_PRO_MONTHLY
                activeToken = purchase.purchaseToken

                if (!purchase.isAcknowledged) {
                    val ackParams = AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build()
                    billingClient?.acknowledgePurchase(ackParams) { }
                }
            }
        }

        ZaraBridgeContract.prefs(context).edit()
            .putBoolean(ZaraBridgeContract.KEY_PRO_TIER_ACTIVE, foundActive)
            .putString(ZaraBridgeContract.KEY_PRO_TIER_SKU, activeSku)
            .putString(ZaraBridgeContract.KEY_PRO_PURCHASE_TOKEN, activeToken)
            .apply()

        val payload = JSONObject().apply {
            put("status", if (foundActive) "purchased" else "inactive")
            put("proActive", foundActive)
            put("sku", activeSku)
            put("purchaseToken", activeToken)
        }
        broadcastBillingUpdate(payload)
    }

    private fun broadcastBillingUpdate(payload: JSONObject) {
        val intent = Intent(ZaraBridgeContract.ACTION_BILLING_UPDATE).apply {
            setPackage(context.packageName)
            putExtra(ZaraBridgeContract.EXTRA_BILLING_JSON, payload.toString())
        }
        context.sendBroadcast(intent)
    }

    fun destroy() {
        try {
            billingClient?.endConnection()
        } catch (_: Throwable) {
        }
        billingClient = null
        isConnected = false
    }
}
