package com.zara.ai.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.os.Build
import android.util.DisplayMetrics
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.lang.ref.WeakReference

/**
 * User-consented Zara Android Bridge Accessibility Service.
 * - Executes hands-free global navigation actions (Back, Home, Recents, Notifications, Quick Settings, Lock Screen, Screenshot)
 * - Performs directional scroll/swipe gestures via GestureDescription
 * - Taps explicit user-requested buttons or armed confirmed Send buttons inside messaging apps
 * - Strictly skips all password & sensitive credential input nodes
 */
class ZaraAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile
        private var activeRef: WeakReference<ZaraAccessibilityService>? = null

        @Volatile
        private var armedSendPackage: String? = null

        @Volatile
        private var armedSendExpiresAt: Long = 0L

        fun isConnected(): Boolean = activeRef?.get() != null

        fun armConfirmedSend(packageName: String): Boolean {
            val cleanPkg = packageName.trim()
            if (cleanPkg.isEmpty()) return false
            armedSendPackage = cleanPkg
            armedSendExpiresAt = System.currentTimeMillis() + 12_000L
            return isConnected()
        }

        fun performZaraGlobalAction(actionName: String): Boolean {
            val svc = activeRef?.get() ?: return false
            val actionCode = when (actionName.trim().lowercase()) {
                "back" -> GLOBAL_ACTION_BACK
                "home" -> GLOBAL_ACTION_HOME
                "recents" -> GLOBAL_ACTION_RECENTS
                "notifications" -> GLOBAL_ACTION_NOTIFICATIONS
                "quick_settings" -> GLOBAL_ACTION_QUICK_SETTINGS
                "lock_screen" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) GLOBAL_ACTION_LOCK_SCREEN
                    else return false
                }
                "screenshot" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) GLOBAL_ACTION_TAKE_SCREENSHOT
                    else return false
                }
                else -> return false
            }
            return try {
                svc.performGlobalAction(actionCode)
            } catch (_: Throwable) {
                false
            }
        }

        fun performDirectionalScroll(direction: String): Boolean {
            val svc = activeRef?.get() ?: return false
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false

            val metrics = DisplayMetrics()
            val wm = svc.getSystemService(WINDOW_SERVICE) as? WindowManager
            @Suppress("DEPRECATION")
            wm?.defaultDisplay?.getRealMetrics(metrics)
            val width = (if (metrics.widthPixels > 0) metrics.widthPixels else 1080).toFloat()
            val height = (if (metrics.heightPixels > 0) metrics.heightPixels else 2200).toFloat()

            val cx = width * 0.5f
            val cy = height * 0.5f
            val path = Path()

            when (direction.trim().lowercase()) {
                "scroll_down" -> {
                    path.moveTo(cx, height * 0.72f)
                    path.lineTo(cx, height * 0.28f)
                }
                "scroll_up" -> {
                    path.moveTo(cx, height * 0.28f)
                    path.lineTo(cx, height * 0.72f)
                }
                "swipe_left" -> {
                    path.moveTo(width * 0.82f, cy)
                    path.lineTo(width * 0.18f, cy)
                }
                "swipe_right" -> {
                    path.moveTo(width * 0.18f, cy)
                    path.lineTo(width * 0.82f, cy)
                }
                else -> return false
            }

            return try {
                val stroke = GestureDescription.StrokeDescription(path, 0L, 300L)
                val gesture = GestureDescription.Builder().addStroke(stroke).build()
                svc.dispatchGesture(gesture, null, null)
            } catch (_: Throwable) {
                false
            }
        }

        fun clickNodeByText(label: String): Boolean {
            val svc = activeRef?.get() ?: return false
            val target = label.trim()
            if (target.isEmpty()) return false
            val root = svc.rootInActiveWindow ?: return false
            return try {
                val matches = root.findAccessibilityNodeInfosByText(target)
                for (node in matches) {
                    if (isSensitivePasswordNode(node)) continue
                    val targetClickable = findClickableAncestorOrSelf(node)
                    if (targetClickable != null && !isSensitivePasswordNode(targetClickable)) {
                        if (targetClickable.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                            return true
                        }
                    }
                }
                false
            } catch (_: Throwable) {
                false
            } finally {
                @Suppress("DEPRECATION")
                root.recycle()
            }
        }

        private fun isSensitivePasswordNode(node: AccessibilityNodeInfo?): Boolean {
            if (node == null) return true
            if (node.isPassword) return true
            val hint = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                node.hintText?.toString()?.lowercase() ?: ""
            } else {
                ""
            }
            val viewId = node.viewIdResourceName?.lowercase() ?: ""
            return hint.contains("password") || hint.contains("pin") || viewId.contains("password")
        }

        private fun findClickableAncestorOrSelf(start: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
            var current: AccessibilityNodeInfo? = start
            var depth = 0
            while (current != null && depth < 6) {
                if (current.isClickable && current.isEnabled) return current
                current = current.parent
                depth++
            }
            return null
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        activeRef = WeakReference(this)
        broadcastState(true)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val pkg = armedSendPackage ?: return
        if (System.currentTimeMillis() > armedSendExpiresAt) {
            armedSendPackage = null
            armedSendExpiresAt = 0L
            return
        }

        val eventPkg = event.packageName?.toString() ?: return
        if (eventPkg != pkg) return

        val root = rootInActiveWindow ?: return
        try {
            val sendViewIds = listOf(
                "$pkg:id/send",
                "$pkg:id/conversation_send_button",
                "$pkg:id/send_button"
            )
            for (viewId in sendViewIds) {
                val nodes = root.findAccessibilityNodeInfosByViewId(viewId)
                for (node in nodes) {
                    if (node.isEnabled && node.isClickable && !node.isPassword) {
                        if (node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                            armedSendPackage = null
                            armedSendExpiresAt = 0L
                            return
                        }
                    }
                }
            }
        } catch (_: Throwable) {
            // Safe ignore if transient window updated
        } finally {
            @Suppress("DEPRECATION")
            root.recycle()
        }
    }

    override fun onInterrupt() {
        // Required AccessibilityService override
    }

    override fun onUnbind(intent: Intent?): Boolean {
        activeRef = null
        broadcastState(false)
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        activeRef = null
        broadcastState(false)
        super.onDestroy()
    }

    private fun broadcastState(connected: Boolean) {
        val intent = Intent(ZaraBridgeContract.ACTION_ACCESSIBILITY_STATE).apply {
            setPackage(packageName)
            putExtra(ZaraBridgeContract.EXTRA_CONNECTED, connected)
        }
        sendBroadcast(intent)
    }
}
