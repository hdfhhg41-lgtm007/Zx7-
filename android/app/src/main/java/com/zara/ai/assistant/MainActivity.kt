package com.zara.ai.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import android.telephony.SmsManager
import android.view.KeyEvent
import android.view.View
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Locale

class MainActivity : AppCompatActivity() {

    companion object {
        private const val ZARA_WEB_URL =
            "https://ais-pre-qfebbx4373mpl6gv6xf3bh-147569699588.asia-southeast1.run.app"
        private const val KEY_CUSTOM_SERVER_URL = "custom_server_url"
    }

    private lateinit var webView: WebView
    private var billingManager: ZaraPlayBillingManager? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var torchEnabled = false
    @Volatile private var lastBatteryTempC: Double = -1.0
    @Volatile private var lastBatteryCharging: Boolean = false
    @Volatile private var lastBatteryPct: Int = -1

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = filePathCallback ?: return@registerForActivityResult
        filePathCallback = null
        if (result.resultCode == Activity.RESULT_OK) {
            val dataUri = result.data?.data
            val clip = result.data?.clipData
            when {
                clip != null && clip.itemCount > 0 -> {
                    val uris = Array(clip.itemCount) { idx -> clip.getItemAt(idx).uri }
                    callback.onReceiveValue(uris)
                }
                dataUri != null -> callback.onReceiveValue(arrayOf(dataUri))
                else -> callback.onReceiveValue(null)
            }
        } else {
            callback.onReceiveValue(null)
        }
    }

    private val permissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val json = JSONObject()
        results.forEach { (perm, granted) -> json.put(perm, granted) }
        val pendingReq = pendingWebPermissionRequest
        pendingWebPermissionRequest = null
        if (pendingReq != null) {
            val grantedResources = mutableListOf<String>()
            if (pendingReq.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) &&
                hasPermission(Manifest.permission.RECORD_AUDIO)
            ) {
                grantedResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
            }
            if (pendingReq.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) &&
                hasPermission(Manifest.permission.CAMERA)
            ) {
                grantedResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
            }
            if (grantedResources.isNotEmpty()) {
                pendingReq.grant(grantedResources.toTypedArray())
            } else {
                pendingReq.deny()
            }
        }
        dispatchJsCallback("window.onZaraAndroidPermissionsResult && window.onZaraAndroidPermissionsResult($json);")
    }

    private val nativeEventReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action ?: return
            when (action) {
                ZaraNotificationListener.ACTION_NOTIFICATION_EVENT -> {
                    val payload = JSONObject().apply {
                        put("type", intent.getStringExtra("type") ?: "message")
                        put("packageName", intent.getStringExtra("packageName") ?: "")
                        put("appName", intent.getStringExtra("appName") ?: "Android")
                        put("sender", intent.getStringExtra("sender") ?: "")
                        put("body", intent.getStringExtra("body") ?: "")
                        put("timestampMs", intent.getLongExtra("timestampMs", System.currentTimeMillis()))
                        put("conversationTitle", intent.getStringExtra("conversationTitle") ?: "")
                        put("isGroup", intent.getBooleanExtra("isGroup", false))
                    }
                    dispatchJsCallback("window.onZaraIncomingNotification && window.onZaraIncomingNotification($payload);")
                }
                Intent.ACTION_BATTERY_CHANGED -> {
                    val tempTenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1)
                    val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
                    val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
                    if (tempTenths > 0) {
                        lastBatteryTempC = tempTenths / 10.0
                    }
                    lastBatteryCharging = plugged != 0
                    if (level >= 0) {
                        lastBatteryPct = (level * 100) / scale
                    }
                    val batPayload = JSONObject().apply {
                        put("batteryPct", lastBatteryPct)
                        put("batteryTempC", lastBatteryTempC)
                        put("isCharging", lastBatteryCharging)
                    }
                    dispatchJsCallback("window.onZaraBatteryStatus && window.onZaraBatteryStatus($batPayload);")
                }
                ZaraWakeWordService.ACTION_WAKE_WORD_DETECTED -> {
                    val payload = JSONObject().apply {
                        put("phrase", intent.getStringExtra("phrase") ?: "hey zara")
                        put("heard", intent.getStringExtra("heard") ?: "")
                        put("source", intent.getStringExtra("source") ?: "native_wake")
                    }
                    dispatchJsCallback("window.onZaraWakeWordDetected && window.onZaraWakeWordDetected($payload);")
                }
                ZaraAccessibilityService.ACTION_ACCESSIBILITY_STATE -> {
                    val connected = intent.getBooleanExtra("connected", false)
                    dispatchJsCallback("window.onZaraAccessibilityState && window.onZaraAccessibilityState($connected);")
                }
                ZaraBridgeContract.ACTION_FOREGROUND_VOICE_STATE -> {
                    val running = intent.getBooleanExtra(ZaraBridgeContract.EXTRA_RUNNING, false)
                    dispatchJsCallback("window.onZaraForegroundVoiceStateChange && window.onZaraForegroundVoiceStateChange($running);")
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Allow Zara assistant UI to appear cleanly on lock screen when triggered by wake-word
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView = WebView(this)
        webView.setBackgroundColor(0xFF070313.toInt())
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        setContentView(webView)

        configureWebView()
        registerNativeReceivers()
        setupBilling()
        setupBackNavigation()

        val savedUrl = getSharedPreferences(ZaraWakeWordService.PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_CUSTOM_SERVER_URL, null)
            ?.takeIf { it.startsWith("https://") }
        val startUrl = intent?.data?.toString()?.takeIf { it.startsWith("https://") }
            ?: savedUrl
            ?: ZARA_WEB_URL
        webView.loadUrl(startUrl)
        handleWakeIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleWakeIntent(intent)
    }

    private fun handleWakeIntent(intent: Intent?) {
        if (intent?.getBooleanExtra("zara_wake_trigger", false) == true) {
            val heard = intent.getStringExtra("zara_wake_heard") ?: ""
            val payload = JSONObject().apply {
                put("phrase", ZaraWakeWordService.getWakePhrase(this@MainActivity))
                put("heard", heard)
                put("source", "wake_activity")
            }
            webView.postDelayed({
                dispatchJsCallback("window.onZaraWakeWordDetected && window.onZaraWakeWordDetected($payload);")
            }, 650L)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportMultipleWindows(false)
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                runOnUiThread {
                    val requested = mutableListOf<String>()
                    var needsRuntimePrompt = false
                    if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        if (hasPermission(Manifest.permission.RECORD_AUDIO)) {
                            requested.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                        } else {
                            needsRuntimePrompt = true
                        }
                    }
                    if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        if (hasPermission(Manifest.permission.CAMERA)) {
                            requested.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                        } else {
                            needsRuntimePrompt = true
                        }
                    }
                    if (needsRuntimePrompt) {
                        pendingWebPermissionRequest?.deny()
                        pendingWebPermissionRequest = request
                        requestAllRuntimePermissionsInternal()
                    } else if (requested.isNotEmpty()) {
                        request.grant(requested.toTypedArray())
                    } else {
                        request.grant(request.resources)
                    }
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, hasPermission(Manifest.permission.ACCESS_FINE_LOCATION), false)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                return try {
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback = null
                    false
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("intent:") || url.startsWith("tel:") ||
                    url.startsWith("smsto:") || url.startsWith("whatsapp:") ||
                    url.startsWith("tg:") || url.startsWith("mailto:")
                ) {
                    return openExternalUriSafely(url)
                }
                val host = request.url?.host.orEmpty()
                val stayInWebView = host.endsWith(".run.app") ||
                    host.contains("accounts.google.com") ||
                    host.contains("accounts.youtube.com") ||
                    host.contains("gstatic.com") ||
                    host.contains("firebaseapp.com") ||
                    host.contains("googleapis.com")
                if (!stayInWebView && (url.startsWith("https://") || url.startsWith("http://"))) {
                    return openExternalUriSafely(url)
                }
                return false
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame != true) return
                val targetUrl = request.url?.toString() ?: ZARA_WEB_URL
                val safeTarget = targetUrl.replace("'", "")
                val html = """
                    <!doctype html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width,initial-scale=1"/>
                      <style>
                        body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070313;color:#f8fafc;font-family:sans-serif;text-align:center;padding:24px;}
                        .card{max-width:340px;background:#0f172a;border:1px solid rgba(244,63,94,0.35);border-radius:22px;padding:24px;}
                        .badge{width:56px;height:56px;margin:0 auto 12px;border-radius:999px;background:rgba(244,63,94,0.18);border:2px solid #f43f5e;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fda4af;}
                        h2{margin:0 0 8px;font-size:18px;}
                        p{margin:0 0 18px;font-size:13px;color:#94a3b8;line-height:1.5;}
                        button{width:100%;min-height:46px;border:none;border-radius:14px;background:#e11d48;color:#fff;font-size:14px;font-weight:700;}
                      </style>
                    </head>
                    <body>
                      <div class="card">
                        <div class="badge">ZARA</div>
                        <h2>Zara Studio Connecting...</h2>
                        <p>Check your internet connection or tap Retry while the server wakes up.</p>
                        <button onclick="window.location.replace('$safeTarget')">Retry Zara Studio</button>
                      </div>
                    </body>
                    </html>
                """.trimIndent()
                view?.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
            }
        }

        webView.addJavascriptInterface(ZaraAndroidBridge(), "ZaraAndroidBridge")
    }

    private fun openExternalUriSafely(uriStr: String): Boolean {
        return try {
            val intent = if (uriStr.startsWith("intent:")) {
                Intent.parseUri(uriStr, Intent.URI_INTENT_SCHEME)
            } else {
                Intent(Intent.ACTION_VIEW, Uri.parse(uriStr))
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun registerNativeReceivers() {
        val filter = IntentFilter().apply {
            addAction(ZaraNotificationListener.ACTION_NOTIFICATION_EVENT)
            addAction(ZaraWakeWordService.ACTION_WAKE_WORD_DETECTED)
            addAction(ZaraAccessibilityService.ACTION_ACCESSIBILITY_STATE)
            addAction(ZaraBridgeContract.ACTION_FOREGROUND_VOICE_STATE)
            addAction(Intent.ACTION_BATTERY_CHANGED)
        }
        ContextCompat.registerReceiver(
            this,
            nativeEventReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    private fun setupBilling() {
        billingManager = ZaraPlayBillingManager(this) { payload ->
            dispatchJsCallback("window.onZaraPlayBillingUpdate && window.onZaraPlayBillingUpdate($payload);")
        }.also { it.startConnection() }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun dispatchJsCallback(script: String) {
        if (!::webView.isInitialized) return
        webView.post {
            webView.evaluateJavascript(script, null)
        }
    }

    private fun hasPermission(perm: String): Boolean {
        return ContextCompat.checkSelfPermission(this, perm) == PackageManager.PERMISSION_GRANTED
    }

    private fun requestAllRuntimePermissionsInternal(): Boolean {
        val wanted = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_CONTACTS,
            Manifest.permission.SEND_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            wanted.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val missing = wanted.filter { !hasPermission(it) }
        return if (missing.isNotEmpty()) {
            permissionsLauncher.launch(missing.toTypedArray())
            true
        } else {
            false
        }
    }

    inner class ZaraAndroidBridge {

        @JavascriptInterface
        fun requestAllAndroidPermissions(): Boolean {
            runOnUiThread { requestAllRuntimePermissionsInternal() }
            return true
        }

        @JavascriptInterface
        fun setForegroundVoiceListening(enabled: Boolean): Boolean {
            ZaraBridgeContract.prefs(this@MainActivity)
                .edit()
                .putBoolean(ZaraBridgeContract.KEY_FOREGROUND_VOICE_ENABLED, enabled)
                .putBoolean(ZaraBridgeContract.KEY_LEGACY_FOREGROUND_VOICE_ENABLED, enabled)
                .apply()
            val svc = Intent(this@MainActivity, ZaraForegroundVoiceService::class.java)
            return try {
                if (enabled) {
                    if (!hasPermission(Manifest.permission.RECORD_AUDIO)) {
                        runOnUiThread { requestAllRuntimePermissionsInternal() }
                        return false
                    }
                    ContextCompat.startForegroundService(this@MainActivity, svc)
                } else {
                    stopService(svc)
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun isForegroundVoiceRunning(): Boolean = ZaraForegroundVoiceService.isRunning

        @JavascriptInterface
        fun setAssistantLanguage(lang: String): Boolean {
            val clean = lang.trim().lowercase(Locale.getDefault()).ifEmpty { "auto" }
            ZaraBridgeContract.prefs(this@MainActivity)
                .edit()
                .putString(ZaraBridgeContract.KEY_ASSISTANT_LANGUAGE, clean)
                .apply()
            return true
        }

        @JavascriptInterface
        fun setLowPowerWakeWordEnabled(enabled: Boolean): Boolean {
            ZaraBridgeContract.prefs(this@MainActivity)
                .edit()
                .putBoolean(ZaraWakeWordService.KEY_WAKE_ENABLED, enabled)
                .apply()
            val svc = Intent(this@MainActivity, ZaraWakeWordService::class.java)
            return try {
                if (enabled) {
                    if (!hasPermission(Manifest.permission.RECORD_AUDIO)) {
                        runOnUiThread { requestAllRuntimePermissionsInternal() }
                        return false
                    }
                    ContextCompat.startForegroundService(this@MainActivity, svc)
                } else {
                    stopService(svc)
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun setCustomWakeWord(phrase: String): Boolean {
            val clean = phrase.trim().lowercase(Locale.getDefault()).ifEmpty { "hey zara" }
            ZaraBridgeContract.prefs(this@MainActivity)
                .edit()
                .putString(ZaraWakeWordService.KEY_WAKE_PHRASE, clean)
                .apply()
            return true
        }

        @JavascriptInterface
        fun getWakeWordStatus(): String {
            return JSONObject().apply {
                put("enabled", ZaraWakeWordService.isRunning || ZaraWakeWordService.isWakeEnabled(this@MainActivity))
                put("phrase", ZaraWakeWordService.getWakePhrase(this@MainActivity))
                put("accessibilityConnected", isAccessibilityGranted())
                put("notificationAccessGranted", isNotificationAccessGranted())
                put("foregroundVoiceRunning", ZaraForegroundVoiceService.isRunning)
            }.toString()
        }

        @JavascriptInterface
        fun isAccessibilityGranted(): Boolean {
            if (ZaraAccessibilityService.isConnected()) return true
            val enabledServices = Settings.Secure.getString(
                contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ).orEmpty()
            return enabledServices.contains(packageName)
        }

        @JavascriptInterface
        fun isNotificationAccessGranted(): Boolean {
            return NotificationManagerCompat.getEnabledListenerPackages(this@MainActivity)
                .contains(packageName) || ZaraNotificationListener.instance != null
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        }

        @JavascriptInterface
        fun openNotificationAccessSettings() {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
                    putExtra(
                        Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                        ComponentName(this@MainActivity, ZaraNotificationListener::class.java).flattenToString()
                    )
                }
            } else {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                startActivity(intent)
            } catch (_: Exception) {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            }
        }

        @JavascriptInterface
        fun openBatteryOptimizationSettings() {
            val packageUri = Uri.parse("package:$packageName")
            val direct = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, packageUri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                startActivity(direct)
            } catch (_: Exception) {
                try {
                    startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                } catch (_: Exception) {
                    openAppPermissionsSettings()
                }
            }
        }

        @JavascriptInterface
        fun openAppPermissionsSettings() {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        }

        @JavascriptInterface
        fun openOverlaySettings() {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            try {
                startActivity(intent)
            } catch (_: Exception) {
                openAppPermissionsSettings()
            }
        }

        @JavascriptInterface
        fun openDeviceSetting(settingId: String): Boolean {
            val id = settingId.trim().lowercase(Locale.getDefault())
            val action = when {
                id.contains("wifi") -> Settings.ACTION_WIFI_SETTINGS
                id.contains("bluetooth") -> Settings.ACTION_BLUETOOTH_SETTINGS
                id.contains("display") || id.contains("brightness") -> Settings.ACTION_DISPLAY_SETTINGS
                id.contains("sound") || id.contains("volume") -> Settings.ACTION_SOUND_SETTINGS
                id.contains("location") || id.contains("gps") -> Settings.ACTION_LOCATION_SOURCE_SETTINGS
                id.contains("battery") -> Settings.ACTION_BATTERY_SAVER_SETTINGS
                id.contains("security") || id.contains("lock") -> Settings.ACTION_SECURITY_SETTINGS
                id.contains("accessibility") -> Settings.ACTION_ACCESSIBILITY_SETTINGS
                id.contains("notif") -> Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
                id.contains("storage") -> Settings.ACTION_INTERNAL_STORAGE_SETTINGS
                id.contains("hotspot") || id.contains("data") -> Settings.ACTION_WIRELESS_SETTINGS
                else -> Settings.ACTION_SETTINGS
            }
            return try {
                startActivity(Intent(action).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) })
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun readScreenContentJson(): String {
            val acc = ZaraAccessibilityService.instance
                ?: return JSONObject().apply {
                    put("ok", false)
                    put("accessibilityRequired", true)
                    put("error", "Accessibility Service is not enabled yet. Please turn on 'Zara AI Hands-Free Control' in Android Accessibility Settings.")
                }.toString()
            return acc.readScreenSnapshotJson()
        }

        @JavascriptInterface
        fun performGlobalAction(action: String): Boolean {
            return ZaraAccessibilityService.instance?.performNamedGlobalAction(action) ?: false
        }

        @JavascriptInterface
        fun scrollScreen(direction: String): Boolean {
            return ZaraAccessibilityService.instance?.scrollScreen(direction) ?: false
        }

        @JavascriptInterface
        fun clickElementByText(label: String): Boolean {
            return ZaraAccessibilityService.instance?.clickElementByText(label) ?: false
        }

        @JavascriptInterface
        fun inputTextInScreen(text: String): Boolean {
            return ZaraAccessibilityService.instance?.inputTextInFocusedField(text) ?: false
        }

        @JavascriptInterface
        fun armConfirmedSend(pkg: String): Boolean {
            if (!ZaraAccessibilityService.isConnected()) return false
            ZaraAccessibilityService.pendingConfirmedSendForPkg = pkg
            ZaraAccessibilityService.pendingConfirmedSendArmedAtMs = System.currentTimeMillis()
            return true
        }

        @JavascriptInterface
        fun getRecentNotificationsJson(): String {
            return ZaraNotificationListener.getRecentNotificationsJson(20, true)
        }

        @JavascriptInterface
        fun launchPackage(pkg: String): Boolean {
            return try {
                val launchIntent = packageManager.getLaunchIntentForPackage(pkg) ?: return false
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun openAppByName(appNameQuery: String): Boolean {
            val clean = appNameQuery.trim().lowercase(Locale.getDefault())
            if (clean.isEmpty()) return false
            return try {
                val mainIntent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
                val resolveList = packageManager.queryIntentActivities(mainIntent, 0)
                val match = resolveList.firstOrNull { ri ->
                    val label = ri.loadLabel(packageManager).toString().lowercase(Locale.getDefault())
                    label == clean || label.contains(clean) || clean.contains(label)
                } ?: return false
                val targetPkg = match.activityInfo.packageName
                launchPackage(targetPkg)
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun closeAppPackage(packageNameToClose: String): Boolean {
            // Safely return Home via Accessibility instead of forbidden third-party kill
            return ZaraAccessibilityService.instance?.performNamedGlobalAction("home") ?: false
        }

        @JavascriptInterface
        fun openAppDetailsSettings(targetPkg: String): Boolean {
            return try {
                startActivity(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:$targetPkg")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                )
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun placeConfirmedPhoneCall(phone: String): Boolean {
            val clean = phone.trim()
            if (clean.isEmpty()) return false
            return try {
                if (hasPermission(Manifest.permission.CALL_PHONE)) {
                    startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:$clean")).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                } else {
                    startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$clean")).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun sendConfirmedSms(phone: String, body: String): Boolean {
            val clean = phone.trim()
            if (clean.isEmpty()) return false
            return try {
                if (hasPermission(Manifest.permission.SEND_SMS)) {
                    val sms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        getSystemService(SmsManager::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getDefault()
                    }
                    sms.sendTextMessage(clean, null, body, null, null)
                } else {
                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:$clean")).apply {
                        putExtra("sms_body", body)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun sendConfirmedAppMessage(pkg: String, phone: String, body: String): Boolean {
            val cleanPhone = phone.replace(Regex("[^0-9]"), "")
            val encodedText = URLEncoder.encode(body, "UTF-8")
            return try {
                if (pkg == "com.whatsapp" || pkg == "com.whatsapp.w4b") {
                    if (isAccessibilityGranted()) {
                        ZaraAccessibilityService.pendingConfirmedSendForPkg = pkg
                        ZaraAccessibilityService.pendingConfirmedSendArmedAtMs = System.currentTimeMillis()
                    }
                    val url = "https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedText"
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                        setPackage(pkg)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                    true
                } else {
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, body)
                        setPackage(pkg)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                    true
                }
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun setFlashlight(enabled: Boolean): Boolean {
            return try {
                val cm = getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return false
                val backId = cm.cameraIdList.firstOrNull() ?: return false
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    cm.setTorchMode(backId, enabled)
                    torchEnabled = enabled
                    true
                } else {
                    false
                }
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun authenticateWithBiometrics() {
            runOnUiThread {
                try {
                    val executor = ContextCompat.getMainExecutor(this@MainActivity)
                    val prompt = BiometricPrompt(
                        this@MainActivity,
                        executor,
                        object : BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                                dispatchJsCallback("window.onZaraBiometricResult && window.onZaraBiometricResult(true);")
                            }

                            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                                dispatchJsCallback("window.onZaraBiometricResult && window.onZaraBiometricResult(false);")
                            }

                            override fun onAuthenticationFailed() {
                                dispatchJsCallback("window.onZaraBiometricResult && window.onZaraBiometricResult(false);")
                            }
                        }
                    )
                    val info = BiometricPrompt.PromptInfo.Builder()
                        .setTitle("Zara Owner Verification")
                        .setSubtitle("Verify fingerprint or face to unlock protected Zara actions")
                        .setNegativeButtonText("Use PIN")
                        .build()
                    prompt.authenticate(info)
                } catch (_: Exception) {
                    dispatchJsCallback("window.onZaraBiometricResult && window.onZaraBiometricResult(false);")
                }
            }
        }

        @JavascriptInterface
        fun getDeviceStatusJson(): String {
            val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            val batteryPct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: lastBatteryPct
            val batStatusIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val liveTempTenths = batStatusIntent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1) ?: -1
            val batteryTempC = if (liveTempTenths > 0) liveTempTenths / 10.0 else lastBatteryTempC
            val plugged = batStatusIntent?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0
            val batteryCharging = if (batStatusIntent != null) plugged != 0 else lastBatteryCharging
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
            val batteryOptIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pm?.isIgnoringBatteryOptimizations(packageName) ?: false
            } else {
                true
            }
            val overlayGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(this@MainActivity)
            } else {
                true
            }
            val mediaGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                hasPermission(Manifest.permission.READ_MEDIA_IMAGES) && hasPermission(Manifest.permission.READ_MEDIA_AUDIO)
            } else {
                hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            return JSONObject().apply {
                put("manufacturer", Build.MANUFACTURER)
                put("brand", Build.BRAND)
                put("model", Build.MODEL)
                put("device", Build.DEVICE)
                put("androidVersion", Build.VERSION.RELEASE)
                put("sdkInt", Build.VERSION.SDK_INT)
                put("batteryPct", batteryPct)
                put("batteryTempC", batteryTempC)
                put("batteryCharging", batteryCharging)
                put("accessibilityConnected", isAccessibilityGranted())
                put("notificationAccessGranted", isNotificationAccessGranted())
                put("foregroundVoiceRunning", ZaraForegroundVoiceService.isRunning)
                put("wakeWordRunning", ZaraWakeWordService.isRunning)
                put("micGranted", hasPermission(Manifest.permission.RECORD_AUDIO))
                put("cameraGranted", hasPermission(Manifest.permission.CAMERA))
                put("locationGranted", hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) || hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION))
                put("callGranted", hasPermission(Manifest.permission.CALL_PHONE))
                put("contactsGranted", hasPermission(Manifest.permission.READ_CONTACTS))
                put("smsGranted", hasPermission(Manifest.permission.SEND_SMS))
                put("mediaGranted", mediaGranted)
                put("overlayGranted", overlayGranted)
                put("batteryOptimizationIgnored", batteryOptIgnored)
                put("notificationsGranted", if (Build.VERSION.SDK_INT >= 33) hasPermission(Manifest.permission.POST_NOTIFICATIONS) else true)
            }.toString()
        }

        @JavascriptInterface
        fun isPlayBillingAvailable(): Boolean = billingManager?.isAvailable() ?: false

        @JavascriptInterface
        fun queryPlayBillingProducts(): String = billingManager?.getProductsJson() ?: "[]"

        @JavascriptInterface
        fun launchPlayBillingPurchase(productId: String): Boolean {
            return billingManager?.launchPurchase(productId) ?: false
        }

        @JavascriptInterface
        fun queryPlayPurchases(): String = billingManager?.queryActiveSubscriptions() ?: "[]"

        @JavascriptInterface
        fun setCustomServerUrl(url: String): Boolean {
            val clean = url.trim()
            if (!clean.startsWith("https://")) return false
            getSharedPreferences(ZaraWakeWordService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_CUSTOM_SERVER_URL, clean)
                .apply()
            return true
        }

        @JavascriptInterface
        fun getServerUrl(): String {
            return getSharedPreferences(ZaraWakeWordService.PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_CUSTOM_SERVER_URL, ZARA_WEB_URL) ?: ZARA_WEB_URL
        }

        @JavascriptInterface
        fun controlMedia(action: String): Boolean {
            return try {
                val audioMgr = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
                when (action.lowercase(Locale.ROOT)) {
                    "volume_up" -> {
                        audioMgr.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                        true
                    }
                    "volume_down" -> {
                        audioMgr.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
                        true
                    }
                    "mute" -> {
                        audioMgr.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_TOGGLE_MUTE, AudioManager.FLAG_SHOW_UI)
                        true
                    }
                    "pause" -> dispatchMediaKey(audioMgr, KeyEvent.KEYCODE_MEDIA_PAUSE)
                    "resume", "play" -> dispatchMediaKey(audioMgr, KeyEvent.KEYCODE_MEDIA_PLAY)
                    "next" -> dispatchMediaKey(audioMgr, KeyEvent.KEYCODE_MEDIA_NEXT)
                    "previous" -> dispatchMediaKey(audioMgr, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                    else -> false
                }
            } catch (_: Exception) {
                false
            }
        }

        private fun dispatchMediaKey(audioMgr: AudioManager, keyCode: Int): Boolean {
            val eventTime = SystemClock.uptimeMillis()
            val downEvent = KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN, keyCode, 0)
            val upEvent = KeyEvent(eventTime, eventTime, KeyEvent.ACTION_UP, keyCode, 0)
            audioMgr.dispatchMediaKeyEvent(downEvent)
            audioMgr.dispatchMediaKeyEvent(upEvent)
            return true
        }
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(nativeEventReceiver)
        } catch (_: Exception) {
        }
        billingManager?.destroy()
        super.onDestroy()
    }
}
