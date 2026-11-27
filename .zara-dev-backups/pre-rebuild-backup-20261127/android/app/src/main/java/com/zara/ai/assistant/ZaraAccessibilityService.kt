package com.zara.ai.assistant

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class ZaraAccessibilityService : AccessibilityService() {

    companion object {
        const val ACTION_ACCESSIBILITY_STATE = "com.zara.ACCESSIBILITY_STATE"
        const val ACTION_SCREEN_CHANGED = "com.zara.SCREEN_CHANGED"

        @Volatile
        var instance: ZaraAccessibilityService? = null
            private set

        @Volatile
        var pendingConfirmedSendForPkg: String? = null

        @Volatile
        var pendingConfirmedSendArmedAtMs: Long = 0L

        fun isConnected(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        broadcastAccessibilityState(true)
    }

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        broadcastAccessibilityState(false)
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        instance = null
        broadcastAccessibilityState(false)
        super.onDestroy()
    }

    override fun onInterrupt() {
        // Required override; service remains resilient
    }

    private fun broadcastAccessibilityState(connected: Boolean) {
        try {
            val intent = Intent(ACTION_ACCESSIBILITY_STATE).apply {
                setPackage(packageName)
                putExtra("connected", connected)
            }
            sendBroadcast(intent)
        } catch (_: Exception) {
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Execute user-confirmed WhatsApp / Messaging send within a strict 12-second safety window
        val targetPkg = pendingConfirmedSendForPkg
        if (!targetPkg.isNullOrBlank()) {
            val ageMs = System.currentTimeMillis() - pendingConfirmedSendArmedAtMs
            if (ageMs > 12_000L) {
                pendingConfirmedSendForPkg = null
            } else if (event.packageName?.toString() == targetPkg) {
                val root = rootInActiveWindow
                if (root != null) {
                    val sendNodes = root.findAccessibilityNodeInfosByViewId("$targetPkg:id/send")
                    if (!sendNodes.isNullOrEmpty()) {
                        pendingConfirmedSendForPkg = null
                        sendNodes[0].performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    } else if (clickMatchingNodeInTree(root, "send") || clickMatchingNodeInTree(root, "بھیجیں")) {
                        pendingConfirmedSendForPkg = null
                    }
                }
            }
        }
    }

    fun readScreenSnapshotJson(): String {
        val result = JSONObject()
        val roots = collectActiveRoots()
        if (roots.isEmpty()) {
            result.put("ok", false)
            result.put("error", "No active window accessible right now.")
            result.put("visibleTexts", JSONArray())
            result.put("clickableButtons", JSONArray())
            return result.toString()
        }

        val primaryRoot = rootInActiveWindow ?: roots.first()
        val activePkg = primaryRoot.packageName?.toString() ?: "unknown"
        val visibleTexts = JSONArray()
        val clickableButtons = JSONArray()
        val editableFields = JSONArray()
        val seenTexts = LinkedHashSet<String>()
        val seenButtons = LinkedHashSet<String>()
        var scrollableCount = 0

        fun traverse(node: AccessibilityNodeInfo?, depth: Int) {
            if (node == null || depth > 28) return
            try {
                if (node.isScrollable) scrollableCount++

                val isSensitivePassword = node.isPassword
                val textStr = if (isSensitivePassword) {
                    "[PASSWORD REDACTED]"
                } else {
                    node.text?.toString()?.trim().orEmpty()
                }
                val descStr = if (isSensitivePassword) {
                    ""
                } else {
                    node.contentDescription?.toString()?.trim().orEmpty()
                }
                val viewId = node.viewIdResourceName?.substringAfter(":id/")?.trim().orEmpty()

                if (textStr.isNotEmpty() && seenTexts.size < 90 && seenTexts.add(textStr)) {
                    visibleTexts.put(textStr.take(240))
                } else if (descStr.isNotEmpty() && seenTexts.size < 90 && seenTexts.add(descStr)) {
                    visibleTexts.put(descStr.take(240))
                }

                if ((node.isClickable || node.isCheckable) && !isSensitivePassword && seenButtons.size < 45) {
                    val label = when {
                        textStr.isNotEmpty() -> textStr
                        descStr.isNotEmpty() -> descStr
                        viewId.isNotEmpty() -> viewId
                        else -> ""
                    }
                    if (label.isNotEmpty() && seenButtons.add(label)) {
                        val rect = Rect()
                        node.getBoundsInScreen(rect)
                        val btnObj = JSONObject().apply {
                            put("label", label.take(100))
                            put("checked", node.isChecked)
                            put("enabled", node.isEnabled)
                            put("bounds", "${rect.left},${rect.top},${rect.right},${rect.bottom}")
                        }
                        clickableButtons.put(btnObj)
                    }
                }

                if (node.isEditable && !isSensitivePassword && editableFields.length() < 12) {
                    val hint = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        node.hintText?.toString()?.trim().orEmpty()
                    } else {
                        ""
                    }
                    editableFields.put(
                        JSONObject().apply {
                            put("label", descStr.ifEmpty { hint.ifEmpty { viewId.ifEmpty { "Text Input" } } })
                            put("focused", node.isFocused)
                            put("value", textStr.take(120))
                        }
                    )
                }

                val count = node.childCount
                for (i in 0 until count) {
                    traverse(node.getChild(i), depth + 1)
                }
            } catch (_: Exception) {
            }
        }

        for (root in roots) {
            traverse(root, 0)
        }

        val summaryLines = ArrayList<String>()
        for (i in 0 until minOf(visibleTexts.length(), 28)) {
            summaryLines.add(visibleTexts.getString(i))
        }

        result.put("ok", true)
        result.put("packageName", activePkg)
        result.put("visibleCount", visibleTexts.length())
        result.put("clickableCount", clickableButtons.length())
        result.put("scrollableCount", scrollableCount)
        result.put("visibleTexts", visibleTexts)
        result.put("clickableButtons", clickableButtons)
        result.put("editableFields", editableFields)
        result.put("screenSummary", summaryLines.joinToString(" | "))
        return result.toString()
    }

    fun clickElementByText(query: String): Boolean {
        val clean = query.trim()
        if (clean.isEmpty()) return false
        val roots = collectActiveRoots()
        for (root in roots) {
            if (clickMatchingNodeInTree(root, clean)) {
                return true
            }
        }
        return false
    }

    private fun clickMatchingNodeInTree(root: AccessibilityNodeInfo, query: String): Boolean {
        val targetLower = query.lowercase(Locale.getDefault())
        var bestNode: AccessibilityNodeInfo? = null
        var bestScore = -1

        fun scan(node: AccessibilityNodeInfo?, depth: Int) {
            if (node == null || depth > 28) return
            try {
                if (!node.isPassword && node.isVisibleToUser) {
                    val text = node.text?.toString()?.trim().orEmpty()
                    val desc = node.contentDescription?.toString()?.trim().orEmpty()
                    val viewId = node.viewIdResourceName?.substringAfter(":id/")?.trim().orEmpty()

                    val score = when {
                        text.equals(cleanQuery(targetLower), ignoreCase = true) ||
                            desc.equals(cleanQuery(targetLower), ignoreCase = true) -> 100
                        text.lowercase(Locale.getDefault()).contains(targetLower) ||
                            desc.lowercase(Locale.getDefault()).contains(targetLower) -> 70
                        viewId.lowercase(Locale.getDefault()).contains(targetLower) -> 45
                        else -> -1
                    }
                    if (score > bestScore) {
                        bestScore = score
                        bestNode = node
                    }
                }
                for (i in 0 until node.childCount) {
                    scan(node.getChild(i), depth + 1)
                }
            } catch (_: Exception) {
            }
        }

        scan(root, 0)
        val matched = bestNode ?: return false

        var clickable: AccessibilityNodeInfo? = matched
        var hops = 0
        while (clickable != null && !clickable.isClickable && hops < 6) {
            clickable = clickable.parent
            hops++
        }
        if (clickable != null && clickable.isClickable) {
            if (clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                return true
            }
        }

        val rect = Rect()
        matched.getBoundsInScreen(rect)
        if (!rect.isEmpty) {
            return dispatchTapAt(rect.centerX().toFloat(), rect.centerY().toFloat())
        }
        return false
    }

    private fun cleanQuery(q: String): String = q.trim()

    fun scrollScreen(direction: String): Boolean {
        val dirLower = direction.lowercase(Locale.getDefault())
        val roots = collectActiveRoots()
        val isForward = dirLower.contains("down") || dirLower.contains("right")

        for (root in roots) {
            val scrollable = findFirstScrollable(root, 0)
            if (scrollable != null) {
                val action = if (isForward) {
                    AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
                } else {
                    AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
                }
                if (scrollable.performAction(action)) {
                    return true
                }
            }
        }

        return dispatchSwipeGesture(dirLower)
    }

    private fun findFirstScrollable(node: AccessibilityNodeInfo?, depth: Int): AccessibilityNodeInfo? {
        if (node == null || depth > 24) return null
        if (node.isScrollable && node.isVisibleToUser) return node
        for (i in 0 until node.childCount) {
            val found = findFirstScrollable(node.getChild(i), depth + 1)
            if (found != null) return found
        }
        return null
    }

    fun performNamedGlobalAction(actionName: String): Boolean {
        return when (actionName.lowercase(Locale.getDefault())) {
            "back" -> performGlobalAction(GLOBAL_ACTION_BACK)
            "home" -> performGlobalAction(GLOBAL_ACTION_HOME)
            "recents" -> performGlobalAction(GLOBAL_ACTION_RECENTS)
            "notifications" -> performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
            "quick_settings" -> performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
            "power_dialog" -> performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)
            "lock_screen" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
                } else {
                    false
                }
            }
            "screenshot" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    performGlobalAction(GLOBAL_ACTION_TAKE_SCREENSHOT)
                } else {
                    false
                }
            }
            "scroll_down", "scroll_up", "swipe_left", "swipe_right" -> scrollScreen(actionName)
            else -> false
        }
    }

    fun inputTextInFocusedField(text: String): Boolean {
        val roots = collectActiveRoots()
        for (root in roots) {
            val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                ?: findFirstEditableNode(root, 0)
            if (focused != null && !focused.isPassword && focused.isEditable) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                if (focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) {
                    return true
                }
            }
        }
        return false
    }

    private fun findFirstEditableNode(node: AccessibilityNodeInfo?, depth: Int): AccessibilityNodeInfo? {
        if (node == null || depth > 24) return null
        if (node.isEditable && node.isVisibleToUser && !node.isPassword) return node
        for (i in 0 until node.childCount) {
            val found = findFirstEditableNode(node.getChild(i), depth + 1)
            if (found != null) return found
        }
        return null
    }

    private fun collectActiveRoots(): List<AccessibilityNodeInfo> {
        val list = ArrayList<AccessibilityNodeInfo>()
        try {
            val winList = windows
            if (!winList.isNullOrEmpty()) {
                for (w in winList) {
                    w.root?.let { list.add(it) }
                }
            }
        } catch (_: Exception) {
        }
        if (list.isEmpty()) {
            rootInActiveWindow?.let { list.add(it) }
        }
        return list
    }

    private fun dispatchTapAt(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0L, 65L)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }

    private fun dispatchSwipeGesture(direction: String): Boolean {
        val dm = resources.displayMetrics
        val w = dm.widthPixels.toFloat().coerceAtLeast(360f)
        val h = dm.heightPixels.toFloat().coerceAtLeast(640f)
        val path = Path()
        when {
            direction.contains("down") -> {
                path.moveTo(w * 0.5f, h * 0.72f)
                path.lineTo(w * 0.5f, h * 0.25f)
            }
            direction.contains("up") -> {
                path.moveTo(w * 0.5f, h * 0.28f)
                path.lineTo(w * 0.5f, h * 0.75f)
            }
            direction.contains("left") -> {
                path.moveTo(w * 0.82f, h * 0.5f)
                path.lineTo(w * 0.18f, h * 0.5f)
            }
            direction.contains("right") -> {
                path.moveTo(w * 0.18f, h * 0.5f)
                path.lineTo(w * 0.82f, h * 0.5f)
            }
            else -> return false
        }
        val stroke = GestureDescription.StrokeDescription(path, 0L, 280L)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        return dispatchGesture(gesture, null, null)
    }
}
