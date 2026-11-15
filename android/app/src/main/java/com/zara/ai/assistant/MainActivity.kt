package com.zara.ai.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * Zara AI Native Android Wrapper Activity.
 * - Hosts full-screen HTTPS WebView synced with runtime Android permissions (Mic, Camera, GPS, Files)
 * - Exposes window.ZaraAndroidBridge (@JavascriptInterface) for Accessibility, Wake-Word, Calls, Apps, Torch, Biometrics & Play Billing
 * - Bridges Native Android broadcasts (Incoming Notifications, Wake-Word, Accessibility State, Play Billing) back into JS
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var billingManager: ZaraPlayBillingManager

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var torchActive: Boolean = false
    private var bridgeReceiverRegistered: Boolean = false

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK) {
            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        } else {
            null
        }
        fileUploadCallback?.onReceiveValue(uris)
        fileUploadCallback = null
    }

    private val permissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val req = pendingWebPermissionRequest
        pendingWebPermissionRequest = null
        if (req != null) {
            val hasMic = results[Manifest.permission.RECORD_AUDIO] ?: hasPermission(Manifest.permission.RECORD_AUDIO)
            val hasCam = results[Manifest.permission.CAMERA] ?: hasPermission(Manifest.permission.CAMERA)
            val granted = mutableListOf<String>()
            for (res in req.resources) {
                if (res == PermissionRequest.RESOURCE_AUDIO_CAPTURE && hasMic) granted.add(res)
                if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE && hasCam) granted.add(res)
            }
            if (granted.isNotEmpty()) {
                req.grant(granted.toTypedArray())
            } else {
                req.deny()
            }
        }

        val json = JSONObject()
        results.forEach { (k, v) -> json.put(k, v) }
        dispatchJs("window.onZaraAndroidPermissionsResult && window.onZaraAndroidPermissionsResult($json);")
    }

    private val nativeBridgeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent == null) return
            when (intent.action) {
                ZaraBridgeContract.ACTION_WAKE_WORD_DETECTED -> {
                    val payload = JSONObject().apply {
                        put("phrase", intent.getStringExtra(ZaraBridgeContract.EXTRA_PHRASE) ?: ZaraBridgeContract.getWakePhrase(this@MainActivity))
                        put("heard", intent.getStringExtra(ZaraBridgeContract.EXTRA_HEARD) ?: "")
                        put("source", intent.getStringExtra(ZaraBridgeContract.EXTRA_SOURCE) ?: "native_wake_service")
                    }
                    dispatchJs("window.onZaraWakeWordDetected && window.onZaraWakeWordDetected($payload);")
                }
                ZaraBridgeContract.ACTION_INCOMING_NOTIFICATION -> {
                    val payload = JSONObject().apply {
                        put("type", intent.getStringExtra(ZaraBridgeContract.EXTRA_NOTIF_TYPE) ?: "message")
                        put("appName", intent.getStringExtra(ZaraBridgeContract.EXTRA_NOTIF_APP) ?: "")
                        put("sender", intent.getStringExtra(ZaraBridgeContract.EXTRA_NOTIF_SENDER) ?: "")
                        put("body", intent.getStringExtra(ZaraBridgeContract.EXTRA_NOTIF_BODY) ?: "")
                    }
                    dispatchJs("window.onZaraIncomingNotification && window.onZaraIncomingNotification($payload);")
                }
                ZaraBridgeContract.ACTION_ACCESSIBILITY_STATE -> {
                    val connected = intent.getBooleanExtra(ZaraBridgeContract.EXTRA_CONNECTED, false)
                    dispatchJs("window.onZaraAccessibilityState && window.onZaraAccessibilityState($connected);")
                }
                ZaraBridgeContract.ACTION_BILLING_UPDATE -> {
                    val raw = intent.getStringExtra(ZaraBridgeContract.EXTRA_BILLING_JSON) ?: "{}"
                    dispatchJs("window.onZaraPlayBillingUpdate && window.onZaraPlayBillingUpdate($raw);")
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        billingManager = ZaraPlayBillingManager(this).also { it.initialize() }

        webView = WebView(this).apply {
            setBackgroundColor(0xFF070313.toInt())
        }
        setContentView(webView)

        configureWebView()
        registerBridgeReceiver()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })

        val targetUrl = intent?.dataString?.takeIf { it.startsWith("https://") }
            ?: ZaraBridgeContract.DEFAULT_ZARA_URL
        webView.loadUrl(targetUrl)

        handleWakeIntentExtras(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleWakeIntentExtras(intent)
    }

    private fun handleWakeIntentExtras(intent: Intent?) {
        val phrase = intent?.getStringExtra(ZaraBridgeContract.EXTRA_PHRASE) ?: return
        val heard = intent.getStringExtra(ZaraBridgeContract.EXTRA_HEARD) ?: phrase
        val payload = JSONObject().apply {
            put("phrase", phrase)
            put("heard", heard)
            put("source", "native_wake_intent")
        }
        webView.postDelayed({
            dispatchJs("window.onZaraWakeWordDetected && window.onZaraWakeWordDetected($payload);")
        }, 450L)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "$userAgentString ZaraAndroidWrapper/10.3.0"
        }

        webView.addJavascriptInterface(ZaraAndroidBridge(), "ZaraAndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val scheme = uri.scheme?.lowercase() ?: ""
                if (scheme == "http" || scheme == "https") {
                    val host = uri.host?.lowercase() ?: ""
                    if (host.contains("asia-southeast1.run.app") ||
                        host.contains("accounts.google.com") ||
                        host.contains("firebaseapp.com")
                    ) {
                        return false
                    }
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: Throwable) {
                    false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val accConnected = ZaraAccessibilityService.isConnected()
                dispatchJs("window.onZaraAccessibilityState && window.onZaraAccessibilityState($accConnected);")
                val billingState = billingManager.getActiveEntitlementJson()
                dispatchJs("window.onZaraPlayBillingUpdate && window.onZaraPlayBillingUpdate($billingState);")
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                runOnUiThread {
                    val needMic = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    val needCam = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                    val missing = mutableListOf<String>()
                    if (needMic && !hasPermission(Manifest.permission.RECORD_AUDIO)) {
                        missing.add(Manifest.permission.RECORD_AUDIO)
                    }
                    if (needCam && !hasPermission(Manifest.permission.CAMERA)) {
                        missing.add(Manifest.permission.CAMERA)
                    }
                    if (missing.isEmpty()) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermissionRequest = request
                        permissionsLauncher.launch(missing.toTypedArray())
                    }
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                val granted = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) ||
                    hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
                callback?.invoke(origin, granted, false)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                return try {
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: Throwable) {
                    fileUploadCallback = null
                    false
                }
            }
        }
    }

    private fun registerBridgeReceiver() {
        if (bridgeReceiverRegistered) return
        val filter = IntentFilter().apply {
            addAction(ZaraBridgeContract.ACTION_WAKE_WORD_DETECTED)
            addAction(ZaraBridgeContract.ACTION_INCOMING_NOTIFICATION)
            addAction(ZaraBridgeContract.ACTION_ACCESSIBILITY_STATE)
            addAction(ZaraBridgeContract.ACTION_BILLING_UPDATE)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(nativeBridgeReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(nativeBridgeReceiver, filter)
        }
        bridgeReceiverRegistered = true
    }

    private fun dispatchJs(script: String) {
        if (!::webView.isInitialized) return
        runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            webView.onResume()
        }
        if (::billingManager.isInitialized) {
            billingManager.connectAndRefresh()
        }
    }

    override fun onDestroy() {
        if (bridgeReceiverRegistered) {
            try {
                unregisterReceiver(nativeBridgeReceiver)
            } catch (_: Throwable) {
            }
            bridgeReceiverRegistered = false
        }
        if (::billingManager.isInitialized) {
            billingManager.destroy()
        }
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }

    /**
     * JavaScript Bridge mapped directly to window.ZaraAndroidBridge in React/TypeScript.
     */
    inner class ZaraAndroidBridge {

        @JavascriptInterface
        fun setForegroundVoiceListening(enabled: Boolean): Boolean {
            ZaraBridgeContract.prefs(this@MainActivity).edit()
                .putBoolean(ZaraBridgeContract.KEY_FOREGROUND_VOICE_ENABLED, enabled)
                .apply()
            return try {
                val intent = Intent(this@MainActivity, ZaraForegroundVoiceService::class.java)
                if (enabled) {
                    if (!hasPermission(Manifest.permission.RECORD_AUDIO)) return false
                    ContextCompat.startForegroundService(this@MainActivity, intent)
                } else {
                    stopService(intent)
                }
                true
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun isForegroundVoiceRunning(): Boolean = ZaraForegroundVoiceService.isRunning

        @JavascriptInterface
        fun placeConfirmedPhoneCall(phone: String): Boolean {
            val clean = phone.trim()
            if (clean.isEmpty()) return false
            val uri = Uri.parse("tel:$clean")
            val directAllowed = hasPermission(Manifest.permission.CALL_PHONE)
            val intent = Intent(if (directAllowed) Intent.ACTION_CALL else Intent.ACTION_DIAL, uri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            return try {
                startActivity(intent)
                true
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun sendConfirmedSms(phone: String, body: String): Boolean {
            val cleanPhone = phone.trim()
            val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:$cleanPhone")).apply {
                putExtra("sms_body", body)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            return try {
                startActivity(intent)
                true
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun sendConfirmedAppMessage(pkg: String, phone: String, body: String): Boolean {
            val cleanPkg = pkg.trim()
            val cleanDigits = phone.replace(Regex("[^0-9]"), "")
            val encodedText = Uri.encode(body)
            return try {
                if (cleanPkg.contains("whatsapp")) {
                    val uri = if (cleanDigits.isNotEmpty()) {
                        Uri.parse("https://api.whatsapp.com/send?phone=$cleanDigits&text=$encodedText")
                    } else {
                        Uri.parse("whatsapp://send?text=$encodedText")
                    }
                    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                        if (cleanPkg.isNotEmpty()) setPackage(cleanPkg)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                    ZaraAccessibilityService.armConfirmedSend(cleanPkg)
                    true
                } else {
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_TEXT, body)
                        if (cleanPkg.isNotEmpty()) setPackage(cleanPkg)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(shareIntent)
                    true
                }
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun launchPackage(packageName: String): Boolean {
            val pkg = packageName.trim()
            if (pkg.isEmpty()) return false
            return try {
                val launch = packageManager.getLaunchIntentForPackage(pkg)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                } ?: return false
                startActivity(launch)
                true
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun closeAppPackage(packageName: String): Boolean {
            // Android does not let non-system apps force-stop other apps directly; navigate Home safely via Accessibility or Intent
            if (ZaraAccessibilityService.isConnected()) {
                return ZaraAccessibilityService.performZaraGlobalAction("home")
            }
            return try {
                val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(homeIntent)
                false
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun openAppDetailsSettings(packageName: String): Boolean {
            val pkg = packageName.trim().ifEmpty { this@MainActivity.packageName }
            return try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", pkg, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                true
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun getDeviceStatusJson(): String {
            val bm = getSystemService(BATTERY_SERVICE) as? BatteryManager
            val batteryPct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
            val charging = bm?.isCharging ?: false

            val cm = getSystemService(CONNECTIVITY_SERVICE) as? ConnectivityManager
            val net = cm?.activeNetwork
            val caps = cm?.getNetworkCapabilities(net)
            val networkType = when {
                caps == null -> "offline"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                else -> "online"
            }

            val pm = getSystemService(POWER_SERVICE) as? PowerManager
            val batteryUnrestricted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pm?.isIgnoringBatteryOptimizations(packageName) ?: false
            } else {
                true
            }

            return JSONObject().apply {
                put("wrapperVersion", "10.3.0")
                put("packageId", packageName)
                put("batteryPercent", batteryPct)
                put("charging", charging)
                put("networkType", networkType)
                put("batteryUnrestricted", batteryUnrestricted)
                put("micGranted", hasPermission(Manifest.permission.RECORD_AUDIO))
                put("cameraGranted", hasPermission(Manifest.permission.CAMERA))
                put("locationGranted", hasPermission(Manifest.permission.ACCESS_FINE_LOCATION))
                put("accessibilityGranted", ZaraAccessibilityService.isConnected())
                put("notificationAccessGranted", isNotificationAccessGranted())
                put("foregroundVoiceRunning", ZaraForegroundVoiceService.isRunning)
                put("wakeWordRunning", ZaraWakeWordService.isRunning)
                put("wakePhrase", ZaraBridgeContract.getWakePhrase(this@MainActivity))
                put("torchActive", torchActive)
                put("playBillingReady", billingManager.isConnected)
            }.toString()
        }

        @JavascriptInterface
        fun isNotificationAccessGranted(): Boolean {
            val enabled = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
            return enabled.contains(packageName)
        }

        @JavascriptInterface
        fun isAccessibilityGranted(): Boolean = ZaraAccessibilityService.isConnected()

        @JavascriptInterface
        fun openNotificationAccessSettings() {
            try {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            } catch (_: Throwable) {
            }
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            try {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            } catch (_: Throwable) {
            }
        }

        @JavascriptInterface
        fun requestAllAndroidPermissions(): Boolean {
            val toRequest = mutableListOf(
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.CALL_PHONE
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                toRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
            runOnUiThread {
                permissionsLauncher.launch(toRequest.toTypedArray())
            }
            return true
        }

        @JavascriptInterface
        fun openAppPermissionsSettings() {
            openAppDetailsSettings(packageName)
        }

        @JavascriptInterface
        fun openBatteryOptimizationSettings() {
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
            } catch (_: Throwable) {
            }
        }

        @JavascriptInterface
        fun authenticateWithBiometrics() {
            runOnUiThread {
                val manager = BiometricManager.from(this@MainActivity)
                val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL
                if (manager.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
                    dispatchJs("window.onZaraBiometricResult && window.onZaraBiometricResult(false);")
                    return@runOnUiThread
                }

                val executor = ContextCompat.getMainExecutor(this@MainActivity)
                val prompt = BiometricPrompt(
                    this@MainActivity,
                    executor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            dispatchJs("window.onZaraBiometricResult && window.onZaraBiometricResult(true);")
                        }

                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            dispatchJs("window.onZaraBiometricResult && window.onZaraBiometricResult(false);")
                        }

                        override fun onAuthenticationFailed() {
                            dispatchJs("window.onZaraBiometricResult && window.onZaraBiometricResult(false);")
                        }
                    }
                )

                val info = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Zara AI Owner Security")
                    .setSubtitle("Verify your identity to unlock Zara Vault controls")
                    .setAllowedAuthenticators(authenticators)
                    .build()
                prompt.authenticate(info)
            }
        }

        @JavascriptInterface
        fun performGlobalAction(action: String): Boolean {
            return ZaraAccessibilityService.performZaraGlobalAction(action)
        }

        @JavascriptInterface
        fun scrollScreen(direction: String): Boolean {
            return ZaraAccessibilityService.performDirectionalScroll(direction)
        }

        @JavascriptInterface
        fun clickElementByText(label: String): Boolean {
            return ZaraAccessibilityService.clickNodeByText(label)
        }

        @JavascriptInterface
        fun armConfirmedSend(pkg: String): Boolean {
            return ZaraAccessibilityService.armConfirmedSend(pkg)
        }

        @JavascriptInterface
        fun setLowPowerWakeWordEnabled(enabled: Boolean): Boolean {
            ZaraBridgeContract.prefs(this@MainActivity).edit()
                .putBoolean(ZaraBridgeContract.KEY_WAKE_WORD_ENABLED, enabled)
                .apply()
            return try {
                val svcIntent = Intent(this@MainActivity, ZaraWakeWordService::class.java)
                if (enabled) {
                    if (!hasPermission(Manifest.permission.RECORD_AUDIO)) return false
                    ContextCompat.startForegroundService(this@MainActivity, svcIntent)
                } else {
                    stopService(svcIntent)
                }
                true
            } catch (_: Throwable) {
                false
            }
        }

        @JavascriptInterface
        fun setCustomWakeWord(phrase: String): Boolean {
            val clean = phrase.trim().lowercase().ifEmpty { ZaraBridgeContract.DEFAULT_WAKE_PHRASE }
            ZaraBridgeContract.prefs(this@MainActivity).edit()
                .putString(ZaraBridgeContract.KEY_WAKE_WORD_PHRASE, clean)
                .apply()
            if (ZaraWakeWordService.isRunning) {
                try {
                    val updIntent = Intent(this@MainActivity, ZaraWakeWordService::class.java).apply {
                        action = ZaraWakeWordService.ACTION_UPDATE_PHRASE
                    }
                    startService(updIntent)
                } catch (_: Throwable) {
                }
            }
            return true
        }

        @JavascriptInterface
        fun getWakeWordStatus(): String {
            return JSONObject().apply {
                put("enabled", ZaraWakeWordService.isRunning)
                put("phrase", ZaraBridgeContract.getWakePhrase(this@MainActivity))
                put("accessibilityConnected", ZaraAccessibilityService.isConnected())
                put("foregroundVoiceRunning", ZaraForegroundVoiceService.isRunning)
            }.toString()
        }

        @JavascriptInterface
        fun setFlashlight(enabled: Boolean): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false
            return try {
                val camMgr = getSystemService(CAMERA_SERVICE) as? CameraManager ?: return false
                val camId = camMgr.cameraIdList.firstOrNull() ?: return false
                camMgr.setTorchMode(camId, enabled)
                torchActive = enabled
                true
            } catch (_: Throwable) {
                false
            }
        }

        // === Google Play Billing v7 Pro Tier Bridge ===
        @JavascriptInterface
        fun isPlayBillingAvailable(): Boolean = billingManager.isConnected

        @JavascriptInterface
        fun queryPlayBillingProducts(): String {
            billingManager.connectAndRefresh()
            return billingManager.getProductsJson()
        }

        @JavascriptInterface
        fun launchPlayBillingPurchase(productId: String): Boolean {
            var ok = false
            runOnUiThread {
                ok = billingManager.launchPurchaseFlow(this@MainActivity, productId)
            }
            return true
        }

        @JavascriptInterface
        fun queryPlayPurchases(): String {
            billingManager.queryActivePurchases()
            return billingManager.getActiveEntitlementJson()
        }
    }
}
