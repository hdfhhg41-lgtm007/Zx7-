package com.zara.ai.assistant

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Forwards incoming messaging and call notifications to Zara WebView bridge
 * with built-in OTP/banking code masking for user privacy.
 */
class ZaraNotificationListener : NotificationListenerService() {

    private val otpRegex = Regex("\\b\\d{4,8}\\b")
    private val sensitiveKeywords = Regex("(otp|verification\\s*code|passcode|pin|bank|cvv|transaction)", RegexOption.IGNORE_CASE)

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (pkg == packageName) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val rawBody = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString()?.trim() ?: ""

        if (title.isEmpty() && rawBody.isEmpty()) return

        val appLabel = when {
            pkg.contains("whatsapp.w4b") -> "WhatsApp Business"
            pkg.contains("whatsapp") -> "WhatsApp"
            pkg.contains("telegram") -> "Telegram"
            pkg.contains("orca") -> "Messenger"
            pkg.contains("dialer") || pkg.contains("telecom") -> "Phone Call"
            pkg.contains("messaging") || pkg.contains("mms") -> "SMS"
            else -> return
        }

        val notifType = if (appLabel == "Phone Call" ||
            sbn.notification.category == Notification.CATEGORY_CALL
        ) {
            "incoming_call"
        } else {
            "message"
        }

        val maskedBody = if (sensitiveKeywords.containsMatchIn(rawBody) || sensitiveKeywords.containsMatchIn(title)) {
            otpRegex.replace(rawBody, "••••")
        } else {
            rawBody
        }

        val broadcast = Intent(ZaraBridgeContract.ACTION_INCOMING_NOTIFICATION).apply {
            setPackage(packageName)
            putExtra(ZaraBridgeContract.EXTRA_NOTIF_TYPE, notifType)
            putExtra(ZaraBridgeContract.EXTRA_NOTIF_APP, appLabel)
            putExtra(ZaraBridgeContract.EXTRA_NOTIF_SENDER, title.ifEmpty { appLabel })
            putExtra(ZaraBridgeContract.EXTRA_NOTIF_BODY, maskedBody.take(280))
        }
        sendBroadcast(broadcast)
    }
}
