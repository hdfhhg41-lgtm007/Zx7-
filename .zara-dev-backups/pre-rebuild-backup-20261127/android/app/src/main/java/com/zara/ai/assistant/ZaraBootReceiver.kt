package com.zara.ai.assistant

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

class ZaraBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) {
            return
        }

        val hasMic = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        if (!hasMic) return

        val prefs = ZaraBridgeContract.prefs(context)
        val wakeEnabled = prefs.getBoolean(ZaraBridgeContract.KEY_WAKE_WORD_ENABLED, false)
        val fgVoiceEnabled = prefs.getBoolean(ZaraBridgeContract.KEY_FOREGROUND_VOICE_ENABLED, false) ||
            prefs.getBoolean(ZaraBridgeContract.KEY_LEGACY_FOREGROUND_VOICE_ENABLED, false)

        try {
            if (wakeEnabled) {
                ContextCompat.startForegroundService(
                    context,
                    Intent(context, ZaraWakeWordService::class.java)
                )
            } else if (fgVoiceEnabled) {
                ContextCompat.startForegroundService(
                    context,
                    Intent(context, ZaraForegroundVoiceService::class.java)
                )
            }
        } catch (_: Exception) {
            // Android 12–15 restricts FGS microphone start from BOOT_COMPLETED unless Battery/AutoStart is exempt
        }
    }
}
