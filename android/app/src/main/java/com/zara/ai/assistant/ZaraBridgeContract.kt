package com.zara.ai.assistant

import android.content.Context
import android.content.SharedPreferences

object ZaraBridgeContract {
    const val PREFS_NAME = "zara_native_prefs"

    const val KEY_WAKE_WORD_ENABLED = "wake_word_enabled"
    const val KEY_WAKE_WORD_PHRASE = "wake_word_phrase"
    const val KEY_FOREGROUND_VOICE_ENABLED = "foreground_voice_enabled"
    const val KEY_PRO_TIER_ACTIVE = "pro_tier_active"
    const val KEY_PRO_TIER_SKU = "pro_tier_sku"
    const val KEY_PRO_PURCHASE_TOKEN = "pro_purchase_token"

    const val DEFAULT_WAKE_PHRASE = "hey zara"
    const val DEFAULT_ZARA_URL = "https://ais-pre-qfebbx4373mpl6gv6xf3bh-147569699588.asia-southeast1.run.app"

    const val SKU_PRO_MONTHLY = "zara_pro_monthly"
    const val SKU_PRO_YEARLY = "zara_pro_yearly"

    const val ACTION_WAKE_WORD_DETECTED = "com.zara.ai.assistant.ACTION_WAKE_WORD_DETECTED"
    const val ACTION_INCOMING_NOTIFICATION = "com.zara.ai.assistant.ACTION_INCOMING_NOTIFICATION"
    const val ACTION_ACCESSIBILITY_STATE = "com.zara.ai.assistant.ACTION_ACCESSIBILITY_STATE"
    const val ACTION_BILLING_UPDATE = "com.zara.ai.assistant.ACTION_BILLING_UPDATE"

    const val EXTRA_PHRASE = "phrase"
    const val EXTRA_HEARD = "heard"
    const val EXTRA_SOURCE = "source"
    const val EXTRA_NOTIF_TYPE = "notif_type"
    const val EXTRA_NOTIF_APP = "notif_app"
    const val EXTRA_NOTIF_SENDER = "notif_sender"
    const val EXTRA_NOTIF_BODY = "notif_body"
    const val EXTRA_CONNECTED = "connected"
    const val EXTRA_BILLING_JSON = "billing_json"

    fun prefs(context: Context): SharedPreferences {
        return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getWakePhrase(context: Context): String {
        val raw = prefs(context).getString(KEY_WAKE_WORD_PHRASE, DEFAULT_WAKE_PHRASE)
        return raw?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: DEFAULT_WAKE_PHRASE
    }
}
