# Preserve WebView JavascriptInterface, Zara Native Bridge & Play Billing
-keepattributes JavascriptInterface
-keepclassmembers class com.zara.ai.assistant.MainActivity$ZaraAndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.zara.ai.assistant.** { *; }
-keep class com.android.billingclient.api.** { *; }
-dontwarn com.android.billingclient.api.**
