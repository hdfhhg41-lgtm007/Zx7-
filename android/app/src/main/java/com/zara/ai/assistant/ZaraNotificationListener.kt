package com.zara.ai.assistant

import android.app.Notification
import android.content.Intent
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

class ZaraNotificationListener : NotificationListenerService() {

    data class CapturedNotification(
        val id: String,
        val packageName: String,
        val appName: String,
        val sender: String,
        val body: String,
        val type: String,
        val timestampMs: Long,
        val conversationTitle: String = "",
        val isGroup: Boolean = false
    )

    companion object {
        const val ACTION_NOTIFICATION_EVENT = "com.zara.NOTIFICATION_EVENT"

        @Volatile
        var instance: ZaraNotificationListener? = null
            private set

        private val recentBuffer = CopyOnWriteArrayList<CapturedNotification>()
        private val otpRegex = Regex("""\b\d{4,8}\b""")
        private val sensitiveKeywords = Regex("""(otp|verification\s*code|pin|cvv|password|passcode|bank\s*code)""", RegexOption.IGNORE_CASE)

        fun maskSensitiveBody(body: String): String {
            return if (sensitiveKeywords.containsMatchIn(body)) {
                otpRegex.replace(body, "****")
            } else {
                body
            }
        }

        fun getRecentNotificationsJson(limit: Int = 20, maskSensitive: Boolean = true): String {
            val arr = JSONArray()
            val liveList = ArrayList<CapturedNotification>(recentBuffer)
            val svc = instance
            if (svc != null) {
                try {
                    val active = svc.activeNotifications
                    if (active != null) {
                        for (sbn in active) {
                            val parsed = svc.parseStatusBarNotification(sbn) ?: continue
                            if (liveList.none { it.id == parsed.id }) {
                                liveList.add(0, parsed)
                            }
                        }
                    }
                } catch (_: SecurityException) {
                } catch (_: Exception) {
                }
            }

            liveList
                .sortedByDescending { it.timestampMs }
                .take(limit.coerceIn(1, 30))
                .forEach { item ->
                    val safeBody = if (maskSensitive) maskSensitiveBody(item.body) else item.body
                    arr.put(
                        JSONObject().apply {
                            put("id", item.id)
                            put("packageName", item.packageName)
                            put("appName", item.appName)
                            put("sender", item.sender)
                            put("body", safeBody)
                            put("type", item.type)
                            put("timestampMs", item.timestampMs)
                            put("conversationTitle", item.conversationTitle)
                            put("isGroup", item.isGroup)
                        }
                    )
                }
            return arr.toString()
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        // Warm recent buffer with any already-present notifications (WhatsApp, SMS, Missed Calls, etc.)
        try {
            activeNotifications?.forEach { sbn ->
                parseStatusBarNotification(sbn)?.let { recordIntoBuffer(it) }
            }
        } catch (_: Exception) {
        }
    }

    override fun onListenerDisconnected() {
        instance = null
        super.onListenerDisconnected()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val item = parseStatusBarNotification(sbn) ?: return
        recordIntoBuffer(item)

        val broadcast = Intent(ACTION_NOTIFICATION_EVENT).apply {
            setPackage(packageName)
            putExtra("id", item.id)
            putExtra("type", item.type)
            putExtra("packageName", item.packageName)
            putExtra("appName", item.appName)
            putExtra("sender", item.sender)
            putExtra("body", maskSensitiveBody(item.body))
            putExtra("timestampMs", item.timestampMs)
            putExtra("conversationTitle", item.conversationTitle)
            putExtra("isGroup", item.isGroup)
        }
        sendBroadcast(broadcast)
    }

    private fun recordIntoBuffer(item: CapturedNotification) {
        recentBuffer.removeAll { it.id == item.id }
        recentBuffer.add(0, item)
        while (recentBuffer.size > 30) {
            recentBuffer.removeAt(recentBuffer.size - 1)
        }
    }

    internal fun parseStatusBarNotification(sbn: StatusBarNotification): CapturedNotification? {
        val pkg = sbn.packageName ?: return null
        if (pkg == packageName || pkg == "android" || pkg == "com.android.systemui") return null

        val notification = sbn.notification ?: return null
        val isCall = notification.category == Notification.CATEGORY_CALL
        val isOngoing = (notification.flags and Notification.FLAG_ONGOING_EVENT) != 0
        if (isOngoing && !isCall) return null

        val extras = notification.extras ?: return null
        val convTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim().orEmpty()
        val rawTitle = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val title = convTitle.ifEmpty { rawTitle }
        val isGroupFlag = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false)
        } else {
            false
        }
        val isGroup = isGroupFlag || (convTitle.isNotEmpty() && rawTitle.isNotEmpty() && convTitle != rawTitle) || rawTitle.contains(":")

        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim().orEmpty()
        val bodyText = bigText.ifEmpty {
            extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
        }

        if (title.isEmpty() && bodyText.isEmpty()) return null

        val friendlyApp = resolveAppDisplayName(pkg)
        val key = "${pkg}:${sbn.id}:${sbn.postTime}"
        return CapturedNotification(
            id = key,
            packageName = pkg,
            appName = friendlyApp,
            sender = title.ifEmpty { friendlyApp },
            body = bodyText,
            type = if (isCall) "incoming_call" else "message",
            timestampMs = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis(),
            conversationTitle = convTitle,
            isGroup = isGroup
        )
    }

    private fun resolveAppDisplayName(pkg: String): String {
        return when (pkg) {
            "com.whatsapp" -> "WhatsApp"
            "com.whatsapp.w4b" -> "WhatsApp Business"
            "org.telegram.messenger" -> "Telegram"
            "com.facebook.orca" -> "Messenger"
            "com.instagram.android" -> "Instagram"
            "com.google.android.apps.messaging", "com.android.mms" -> "Messages"
            "com.google.android.dialer", "com.android.dialer", "com.transsion.dialer" -> "Phone"
            "com.google.android.gm" -> "Gmail"
            else -> try {
                val ai = packageManager.getApplicationInfo(pkg, 0)
                packageManager.getApplicationLabel(ai).toString()
            } catch (_: PackageManager.NameNotFoundException) {
                pkg
            }
        }
    }
}
