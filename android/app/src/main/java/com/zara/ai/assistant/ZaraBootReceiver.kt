package com.zara.ai.assistant

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

/**
 * Restores Zara Low-Power Wake-Word Service after device reboot or app update
 * when the user opted in and microphone permission is granted.
 */
class ZaraBootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        val ctx = context ?: return
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) {
            return
        }

        val wakeEnabled = ZaraBridgeContract.prefs(ctx).getBoolean(
            ZaraBridgeContract.KEY_WAKE_WORD_ENABLED,
            false
        )
        if (!wakeEnabled) return

        val hasMic = ContextCompat.checkSelfPermission(
            ctx,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        if (!hasMic) return

        try {
            val svcIntent = Intent(ctx, ZaraWakeWordService::class.java)
            ContextCompat.startForegroundService(ctx, svcIntent)
        } catch (_: Throwable) {
            // Android 14+ may restrict background microphone FGS start until user opens MainActivity
        }
    }
}
