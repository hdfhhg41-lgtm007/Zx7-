package com.zara.ai.assistant

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.Locale
import kotlin.concurrent.thread
import kotlin.math.sqrt

class ZaraWakeWordService : Service() {

    companion object {
        const val CHANNEL_ID = "zara_wake_word_channel"
        const val NOTIFICATION_ID = 1002
        const val PREFS_NAME = ZaraBridgeContract.PREFS_NAME
        const val KEY_WAKE_ENABLED = ZaraBridgeContract.KEY_WAKE_WORD_ENABLED
        const val KEY_WAKE_PHRASE = ZaraBridgeContract.KEY_WAKE_WORD_PHRASE
        const val ACTION_WAKE_WORD_DETECTED = ZaraBridgeContract.ACTION_WAKE_WORD_DETECTED
        const val ACTION_STOP_WAKE_WORD = "com.zara.ai.assistant.STOP_WAKE_WORD"
        const val ACTION_PAUSE_WAKE = "com.zara.ai.assistant.PAUSE_WAKE_WORD"
        const val ACTION_RESUME_WAKE = "com.zara.ai.assistant.RESUME_WAKE_WORD"

        @Volatile
        var isRunning: Boolean = false
            private set

        fun isWakeEnabled(context: Context): Boolean {
            return ZaraBridgeContract.prefs(context).getBoolean(KEY_WAKE_ENABLED, false)
        }

        fun getWakePhrase(context: Context): String {
            return ZaraBridgeContract.getWakePhrase(context)
        }
    }

    @Volatile
    private var keepListening = false
    @Volatile
    private var isPausedForCall = false
    @Volatile
    private var vadThread: Thread? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    @Volatile
    private var recognizerBusy = false
    private var lastTriggerMs = 0L

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_WAKE_WORD) {
            ZaraBridgeContract.prefs(this).edit()
                .putBoolean(KEY_WAKE_ENABLED, false)
                .apply()
            isPausedForCall = false
            keepListening = false
            isRunning = false
            try {
                vadThread?.interrupt()
            } catch (_: Exception) {
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == ACTION_PAUSE_WAKE) {
            isPausedForCall = true
            keepListening = false
            try {
                vadThread?.interrupt()
            } catch (_: Exception) {
            }
            mainHandler.post {
                try {
                    recognizer?.cancel()
                    recognizer?.destroy()
                    recognizer = null
                } catch (_: Exception) {
                }
                recognizerBusy = false
            }
            return START_STICKY
        }

        if (intent?.action == ACTION_RESUME_WAKE) {
            isPausedForCall = false
            if (isRunning && !recognizerBusy && isWakeEnabled(this)) {
                startAdaptiveVadLoop()
            }
            return START_STICKY
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            isRunning = false
            stopSelf()
            return START_NOT_STICKY
        }

        if (!startWakeForeground()) {
            isRunning = false
            stopSelf()
            return START_NOT_STICKY
        }

        isRunning = true
        if (!recognizerBusy && !isPausedForCall) {
            startAdaptiveVadLoop()
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.wake_word_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Low-power 16kHz Voice Activity Detection waiting for your Zara wake phrase."
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun startWakeForeground(): Boolean {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("zara_wake_trigger", true)
        }
        val pendingOpen = PendingIntent.getActivity(
            this,
            102,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = Intent(this, ZaraWakeWordService::class.java).apply {
            action = ACTION_STOP_WAKE_WORD
        }
        val stopPending = PendingIntent.getService(
            this,
            103,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val phrase = getWakePhrase(this)
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zara Wake-Word Active (\"$phrase\")")
            .setContentText("Background mic guard active. Say \"$phrase\" or tap Stop.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pendingOpen)
            .addAction(0, "Turn OFF", stopPending)
            .build()

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun startAdaptiveVadLoop() {
        if (keepListening || recognizerBusy) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        keepListening = true

        vadThread = thread(name = "ZaraWakeVadThread", isDaemon = true) {
            val sampleRate = 16000
            val minBuf = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(3200)

            var audioRecord: AudioRecord? = null
            var shouldTriggerSpeechCheck = false
            try {
                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minBuf * 2
                )
                if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
                    return@thread
                }
                audioRecord.startRecording()
                val buffer = ShortArray(1600) // 100ms frames
                var noiseFloor = 180.0
                var speechFrames = 0

                while (keepListening && !Thread.currentThread().isInterrupted) {
                    val readCount = audioRecord.read(buffer, 0, buffer.size)
                    if (readCount <= 0) {
                        Thread.sleep(80)
                        continue
                    }
                    var sumSq = 0.0
                    for (i in 0 until readCount) {
                        val v = buffer[i].toDouble()
                        sumSq += v * v
                    }
                    val rms = sqrt(sumSq / readCount)
                    if (rms < noiseFloor * 1.45) {
                        noiseFloor = (noiseFloor * 0.92 + rms * 0.08).coerceIn(90.0, 950.0)
                    }
                    val threshold = (noiseFloor * 2.15).coerceAtLeast(340.0)
                    if (rms > threshold) {
                        speechFrames++
                    } else {
                        speechFrames = (speechFrames - 1).coerceAtLeast(0)
                    }

                    if (speechFrames >= 3) {
                        speechFrames = 0
                        val now = System.currentTimeMillis()
                        if (now - lastTriggerMs > 4500L) {
                            lastTriggerMs = now
                            shouldTriggerSpeechCheck = true
                            keepListening = false
                            break
                        }
                    }
                }
            } catch (_: SecurityException) {
            } catch (_: InterruptedException) {
            } catch (_: Exception) {
            } finally {
                // Release hardware AudioRecord cleanly BEFORE launching SpeechRecognizer so mic never collides!
                try {
                    audioRecord?.stop()
                } catch (_: Exception) {
                }
                try {
                    audioRecord?.release()
                } catch (_: Exception) {
                }
                vadThread = null
            }

            if (shouldTriggerSpeechCheck && isRunning) {
                triggerSpeechWakeCheck()
            }
        }
    }

    private fun finishSpeechWakeCheck() {
        recognizerBusy = false
        try {
            recognizer?.destroy()
        } catch (_: Exception) {
        }
        recognizer = null
        if (isRunning && !isPausedForCall && isWakeEnabled(this)) {
            mainHandler.postDelayed({
                if (isRunning && !isPausedForCall && !recognizerBusy) {
                    startAdaptiveVadLoop()
                }
            }, 250L)
        }
    }

    private fun triggerSpeechWakeCheck() {
        mainHandler.post {
            if (!isRunning || recognizerBusy) return@post
            if (!SpeechRecognizer.isRecognitionAvailable(this)) {
                dispatchWakeDetected(getWakePhrase(this), "vad_energy")
                startAdaptiveVadLoop()
                return@post
            }
            recognizerBusy = true
            try {
                recognizer?.destroy()
                val localeTag = ZaraBridgeContract.toSpeechLocaleTag(ZaraBridgeContract.getAssistantLanguage(this))
                recognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                    setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) {}
                        override fun onBeginningOfSpeech() {}
                        override fun onRmsChanged(rmsdB: Float) {}
                        override fun onBufferReceived(buffer: ByteArray?) {}
                        override fun onEndOfSpeech() {}
                        override fun onPartialResults(partialResults: Bundle?) {
                            checkResults(partialResults)
                        }
                        override fun onResults(results: Bundle?) {
                            checkResults(results)
                            finishSpeechWakeCheck()
                        }
                        override fun onError(error: Int) {
                            finishSpeechWakeCheck()
                        }
                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })
                }
                val recIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                }
                recognizer?.startListening(recIntent)
                mainHandler.postDelayed({
                    if (recognizerBusy) {
                        try {
                            recognizer?.stopListening()
                        } catch (_: Exception) {
                        }
                        finishSpeechWakeCheck()
                    }
                }, 4200L)
            } catch (_: Exception) {
                finishSpeechWakeCheck()
            }
        }
    }

    private fun checkResults(bundle: Bundle?) {
        val matches = bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return
        val phrase = getWakePhrase(this)
        val phraseTokens = phrase.split(Regex("\\s+")).filter { it.length >= 2 }
        for (heardRaw in matches) {
            val heard = heardRaw.lowercase(Locale.getDefault())
            val matched = heard.contains(phrase) ||
                heard.contains("zara") ||
                heard.contains("zaraa") ||
                heard.contains("سارا") ||
                heard.contains("زارا") ||
                heard.contains("ज़ारा") ||
                (phraseTokens.isNotEmpty() && phraseTokens.all { heard.contains(it) })
            if (matched) {
                try {
                    recognizer?.cancel()
                } catch (_: Exception) {
                }
                dispatchWakeDetected(heardRaw, "speech_recognizer")
                finishSpeechWakeCheck()
                return
            }
        }
    }

    private fun dispatchWakeDetected(heard: String, source: String) {
        val phrase = getWakePhrase(this)
        val broadcast = Intent(ACTION_WAKE_WORD_DETECTED).apply {
            setPackage(packageName)
            putExtra(ZaraBridgeContract.EXTRA_PHRASE, phrase)
            putExtra(ZaraBridgeContract.EXTRA_HEARD, heard)
            putExtra(ZaraBridgeContract.EXTRA_SOURCE, source)
        }
        sendBroadcast(broadcast)

        try {
            val wakeActivity = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("zara_wake_trigger", true)
                putExtra("zara_wake_heard", heard)
            }
            startActivity(wakeActivity)
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {
        isRunning = false
        keepListening = false
        recognizerBusy = false
        try {
            vadThread?.interrupt()
        } catch (_: Exception) {
        }
        mainHandler.post {
            try {
                recognizer?.destroy()
                recognizer = null
            } catch (_: Exception) {
            }
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
