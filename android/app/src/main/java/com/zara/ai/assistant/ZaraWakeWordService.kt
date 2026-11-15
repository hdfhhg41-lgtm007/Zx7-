package com.zara.ai.assistant

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
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
import kotlin.math.sqrt

/**
 * Low-Power Custom Wake-Word Foreground Service.
 * - Continuously samples 16kHz mono PCM via AudioRecord with an adaptive RMS noise floor gate
 * - Only spins up SpeechRecognizer when vocal energy crosses adaptive speech threshold (saves battery)
 * - Matches configurable wake phrases (e.g., "hey zara", "zara", "sun zara") and wakes MainActivity + WebView
 */
class ZaraWakeWordService : Service() {

    companion object {
        private const val CHANNEL_ID = "zara_wake_word_channel"
        private const val NOTIFICATION_ID = 4102
        const val ACTION_STOP_WAKE = "com.zara.ai.assistant.ACTION_STOP_WAKE"
        const val ACTION_UPDATE_PHRASE = "com.zara.ai.assistant.ACTION_UPDATE_PHRASE"

        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var vadThread: Thread? = null

    @Volatile
    private var keepMonitoring = false

    @Volatile
    private var speechWindowActive = false

    @Volatile
    private var lastTriggerMs = 0L

    private var speechRecognizer: SpeechRecognizer? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_WAKE) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == ACTION_UPDATE_PHRASE) {
            if (isRunning) {
                updateForegroundNotification()
            }
            return START_STICKY
        }

        val hasMic = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasMic) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification())
        isRunning = true

        if (vadThread == null || vadThread?.isAlive == false) {
            startLowPowerAudioGate()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        keepMonitoring = false
        isRunning = false
        mainHandler.post { destroySpeechRecognizer() }
        try {
            vadThread?.interrupt()
        } catch (_: Throwable) {
        }
        vadThread = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startLowPowerAudioGate() {
        keepMonitoring = true
        vadThread = Thread {
            val sampleRate = 16000
            val minBuf = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            val bufferSize = maxOf(minBuf, sampleRate / 2)
            var recorder: AudioRecord? = null
            try {
                recorder = AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize
                )
                if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                    keepMonitoring = false
                    return@Thread
                }
                recorder.startRecording()

                val frame = ShortArray(1024)
                var noiseFloor = 260.0
                var voicedFrames = 0

                while (keepMonitoring && !Thread.currentThread().isInterrupted) {
                    val read = recorder.read(frame, 0, frame.size)
                    if (read <= 0) {
                        Thread.sleep(60)
                        continue
                    }
                    if (speechWindowActive) {
                        Thread.sleep(120)
                        continue
                    }

                    var sumSq = 0.0
                    for (i in 0 until read) {
                        val s = frame[i].toDouble()
                        sumSq += s * s
                    }
                    val rms = sqrt(sumSq / read)

                    if (rms < noiseFloor * 1.6) {
                        noiseFloor = (noiseFloor * 0.94 + rms * 0.06).coerceIn(140.0, 950.0)
                    }

                    val threshold = maxOf(420.0, noiseFloor * 2.15)
                    if (rms >= threshold) {
                        voicedFrames++
                        val now = System.currentTimeMillis()
                        if (voicedFrames >= 2 && now - lastTriggerMs > 2800L) {
                            voicedFrames = 0
                            mainHandler.post { triggerSpeechRecognizerCheck() }
                        }
                    } else {
                        voicedFrames = maxOf(0, voicedFrames - 1)
                    }
                }
            } catch (_: SecurityException) {
                keepMonitoring = false
            } catch (_: InterruptedException) {
                keepMonitoring = false
            } catch (_: Throwable) {
                keepMonitoring = false
            } finally {
                try {
                    recorder?.stop()
                } catch (_: Throwable) {
                }
                try {
                    recorder?.release()
                } catch (_: Throwable) {
                }
            }
        }.apply {
            name = "ZaraWakeVadThread"
            isDaemon = true
            start()
        }
    }

    private fun triggerSpeechRecognizerCheck() {
        if (!keepMonitoring || speechWindowActive) return
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return

        speechWindowActive = true
        destroySpeechRecognizer()

        try {
            val recognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer = recognizer

            recognizer.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}

                override fun onError(error: Int) {
                    speechWindowActive = false
                    destroySpeechRecognizer()
                }

                override fun onResults(results: Bundle?) {
                    handleRecognizerCandidates(results)
                    speechWindowActive = false
                    destroySpeechRecognizer()
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    if (handleRecognizerCandidates(partialResults)) {
                        speechWindowActive = false
                        destroySpeechRecognizer()
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            val recogIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 4)
            }
            recognizer.startListening(recogIntent)

            mainHandler.postDelayed({
                if (speechWindowActive) {
                    speechWindowActive = false
                    destroySpeechRecognizer()
                }
            }, 4200L)
        } catch (_: Throwable) {
            speechWindowActive = false
            destroySpeechRecognizer()
        }
    }

    private fun handleRecognizerCandidates(bundle: Bundle?): Boolean {
        val candidates = bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return false
        val configuredPhrase = ZaraBridgeContract.getWakePhrase(this)
        val normalizedTargets = buildSet {
            add(configuredPhrase)
            configuredPhrase.split(",", "|").map { it.trim().lowercase() }.filter { it.isNotEmpty() }.forEach { add(it) }
            add("hey zara")
            add("zara")
            add("sun zara")
            add("suno zara")
        }

        for (candidate in candidates) {
            val heard = candidate.trim().lowercase()
            if (heard.isEmpty()) continue
            val matched = normalizedTargets.firstOrNull { target ->
                heard == target || heard.contains(target)
            }
            if (matched != null) {
                lastTriggerMs = System.currentTimeMillis()
                notifyWakeDetected(configuredPhrase, candidate)
                return true
            }
        }
        return false
    }

    private fun notifyWakeDetected(configuredPhrase: String, heardText: String) {
        val wakeBroadcast = Intent(ZaraBridgeContract.ACTION_WAKE_WORD_DETECTED).apply {
            setPackage(packageName)
            putExtra(ZaraBridgeContract.EXTRA_PHRASE, configuredPhrase)
            putExtra(ZaraBridgeContract.EXTRA_HEARD, heardText)
            putExtra(ZaraBridgeContract.EXTRA_SOURCE, "native_wake_service")
        }
        sendBroadcast(wakeBroadcast)

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra(ZaraBridgeContract.EXTRA_PHRASE, configuredPhrase)
            putExtra(ZaraBridgeContract.EXTRA_HEARD, heardText)
        }
        try {
            startActivity(launchIntent)
        } catch (_: Throwable) {
            // If OS restricts background activity launch, MainActivity will still receive wakeBroadcast if alive
        }
    }

    private fun destroySpeechRecognizer() {
        try {
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
        } catch (_: Throwable) {
        }
        speechRecognizer = null
    }

    private fun updateForegroundNotification() {
        val mgr = getSystemService(NotificationManager::class.java)
        mgr?.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val phrase = ZaraBridgeContract.getWakePhrase(this)
        val openIntent = Intent(this, MainActivity::class.java)
        val openPending = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val stopIntent = Intent(this, ZaraWakeWordService::class.java).apply {
            action = ACTION_STOP_WAKE
        }
        val stopPending = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zara Wake-Word Engine Active")
            .setContentText("Say \"$phrase\" hands-free anytime (low-power VAD)")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(openPending)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Pause", stopPending)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val mgr = getSystemService(NotificationManager::class.java)
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.wake_word_channel_name),
                NotificationManager.IMPORTANCE_LOW
            )
            channel.setSound(null, null)
            mgr?.createNotificationChannel(channel)
        }
    }
}
