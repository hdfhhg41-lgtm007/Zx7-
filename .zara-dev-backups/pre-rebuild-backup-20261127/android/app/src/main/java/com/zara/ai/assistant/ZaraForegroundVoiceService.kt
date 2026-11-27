package com.zara.ai.assistant

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class ZaraForegroundVoiceService : Service() {

    companion object {
        const val CHANNEL_ID = "zara_voice_fg_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_STOP_FOREGROUND_VOICE = "com.zara.ai.assistant.STOP_FOREGROUND_VOICE"

        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_FOREGROUND_VOICE) {
            ZaraBridgeContract.prefs(this).edit()
                .putBoolean(ZaraBridgeContract.KEY_FOREGROUND_VOICE_ENABLED, false)
                .putBoolean(ZaraBridgeContract.KEY_LEGACY_FOREGROUND_VOICE_ENABLED, false)
                .apply()
            isRunning = false
            broadcastState(false)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            return START_NOT_STICKY
        }

        // Android 14+ (API 34+) strictly requires RECORD_AUDIO runtime permission before starting FGS with microphone type
        if (!hasPerm(Manifest.permission.RECORD_AUDIO)) {
            isRunning = false
            broadcastState(false)
            stopSelf()
            return START_NOT_STICKY
        }

        if (!startForegroundSafely()) {
            isRunning = false
            broadcastState(false)
            stopSelf()
            return START_NOT_STICKY
        }

        acquireWakeLockSafely()
        isRunning = true
        broadcastState(true)
        return START_STICKY
    }

    private fun acquireWakeLockSafely() {
        try {
            if (wakeLock?.isHeld == true) return
            val pm = getSystemService(POWER_SERVICE) as? PowerManager
            wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ZaraAI::ForegroundVoiceLock")?.apply {
                setReferenceCounted(false)
                acquire(6 * 60 * 60 * 1000L)
            }
        } catch (_: Exception) {
        }
    }

    private fun broadcastState(running: Boolean) {
        try {
            val stateIntent = Intent(ZaraBridgeContract.ACTION_FOREGROUND_VOICE_STATE).apply {
                setPackage(packageName)
                putExtra(ZaraBridgeContract.EXTRA_RUNNING, running)
            }
            sendBroadcast(stateIntent)
        } catch (_: Exception) {
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.voice_service_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Zara Voice Assistant active in background when switching between WhatsApp, YouTube, or Chrome."
                setShowBadge(false)
            }
            manager?.createNotificationChannel(channel)
        }
    }

    private fun startForegroundSafely(): Boolean {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openPending = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = Intent(this, ZaraForegroundVoiceService::class.java).apply {
            action = ACTION_STOP_FOREGROUND_VOICE
        }
        val stopPending = PendingIntent.getService(
            this,
            101,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zara AI Voice Listening Active")
            .setContentText("Background microphone active across apps. Tap Open or Turn OFF.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(openPending)
            .addAction(0, "Open Zara", openPending)
            .addAction(0, "Turn OFF", stopPending)
            .build()

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                var types = 0
                if (hasPerm(Manifest.permission.RECORD_AUDIO)) {
                    types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                }
                if (hasPerm(Manifest.permission.CAMERA)) {
                    types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
                }
                if (hasPerm(Manifest.permission.ACCESS_FINE_LOCATION) || hasPerm(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                }
                if (types == 0) return false
                startForeground(NOTIFICATION_ID, notification, types)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (!hasPerm(Manifest.permission.RECORD_AUDIO)) return false
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun hasPerm(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }

    override fun onDestroy() {
        isRunning = false
        broadcastState(false)
        try {
            wakeLock?.let { if (it.isHeld) it.release() }
        } catch (_: Exception) {
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
