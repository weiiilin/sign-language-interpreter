<template>
    <ClientOnly>
        <main class="page max-w-2xl mx-auto flex flex-col justify-between min-h-screen pt-4 sm:pt-6 px-4 sm:px-6 pb-24">
            <!-- 頂部 Header -->
            <AppHeader>
                <div class="logo text-center font-bold text-gray-800 flex-1">
                    AI 即時手語辨識與翻譯
                </div>
                <div class="w-12 h-12 flex-shrink-0"></div>
            </AppHeader>

            <!-- 相機與 Canvas 畫面區塊 -->
            <section
                class="camera-container w-full aspect-video bg-gray-900 rounded-3xl relative overflow-hidden shadow-lg border border-gray-200 my-2">
                <video ref="videoRef" autoplay playsinline muted class="camera-media"></video>
                <canvas ref="canvasRef" class="camera-media"></canvas>

                <!-- 畫面上的狀態標籤 -->
                <div
                    class="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium z-10">
                    <span class="w-2 h-2 rounded-full"
                        :class="isSystemReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'"></span>
                    {{ systemStatus }}
                </div>
            </section>

            <!-- 重啟按鈕 -->
            <button
                class="start-btn w-full max-w-sm mx-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-2xl shadow-md transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                :disabled="isStarting" @click="startSystem">
                <svg v-if="isStarting" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                </svg>
                {{ isStarting ? '系統啟動中...' : '重新啟動系統' }}
            </button>

            <!-- 方向標籤 -->
            <div
                class="pill my-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium text-sm sm:text-base border border-blue-100 shadow-sm self-center">
                台灣手語 <span class="mx-1">→</span> 中文（繁體）
            </div>

            <!-- 實時機率分析區塊 (Logs) -->
            <div v-if="inferenceLogs.length > 0"
                class="w-full bg-white/80 backdrop-blur p-4 rounded-2xl border border-gray-100 shadow-sm my-2">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    實時機率分析 (Confidence)
                </h3>
                <div v-for="(item, idx) in inferenceLogs" :key="idx"
                    class="flex items-center gap-3 mb-2 last:mb-0 text-sm">
                    <span class="w-20 font-semibold text-gray-700 truncate">{{ item.label }}</span>
                    <div class="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div class="bg-blue-600 h-full rounded-full transition-all duration-100 ease-out"
                            :style="{ width: (item.score * 100) + '%' }">
                        </div>
                    </div>
                    <span class="w-12 text-right font-mono text-gray-500 text-xs">{{ (item.score * 100).toFixed(1)
                    }}%</span>
                </div>
            </div>

            <!-- 收集到的手語單字積木 (認出的單字會自動累積到這裡) -->
            <div
                class="w-full bg-gray-50 border border-gray-200/60 p-3 rounded-2xl my-2 flex flex-wrap gap-2 items-center min-h-[52px]">
                <span class="text-xs text-gray-400 font-medium ml-1"
                    v-if="recognizedWords.length === 0">已擷取單字：(請比手語進行辨識)</span>
                <span v-for="(word, index) in recognizedWords" :key="index"
                    class="bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-1.5 animate-fade-in">
                    🖐️ {{ word }}
                    <button @click="removeWord(index)" class="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </span>
                <button v-if="recognizedWords.length > 0" @click="recognizedWords = []"
                    class="text-xs text-gray-400 hover:text-gray-600 ml-auto px-2 py-1">
                    清空
                </button>
            </div>

            <!-- 辨識與修飾詞句卡片 -->
            <section
                class="w-full bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer relative mt-2 group"
                @click="openDetailSheet">

                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold text-blue-600 tracking-wider uppercase">最終翻譯結果</span>

                    <button @click.stop="translateSentence" :disabled="isTranslating || recognizedWords.length === 0"
                        class="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white text-xs font-medium rounded-full shadow-sm transition-all flex items-center gap-1">
                        <svg v-if="isTranslating" class="animate-spin h-3.5 w-3.5 text-white"
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        <span>{{ cooldownTimer ? '冷卻中...' : '✨ 點我修飾' }}</span>
                    </button>
                </div>

                <!-- 呈現翻譯好的句子 或 目前正在辨識的手語單字 -->
                <p class="text-2xl font-bold text-gray-800 my-1">
                    {{ translatedSentence || signStore.currentSign || '尚未辨識' }}
                </p>

                <div class="flex items-center justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                    <span>點擊卡片查看詳細分析與拆解</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5"
                        stroke="currentColor"
                        class="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </div>
            </section>
        </main>
    </ClientOnly>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSignStore } from '@/stores/signStore'
import AppHeader from '@/components/header.vue'
import * as Comlink from 'comlink'
import type { AIWorkerType } from '@/workers/inference.worker'
import { translateSignWords } from '@/utils/translator'

const signStore = useSignStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const isStarting = ref(false)
const isSystemReady = ref(false)
const isTranslating = ref(false)
const systemStatus = ref('等待啟動...')

const inferenceLogs = ref<{ label: string; score: number }[]>([])
const recognizedWords = ref<string[]>([])
const translatedSentence = ref('')

const framesBuffer = ref<number[][]>([])
let workerProxy: Comlink.Remote<AIWorkerType> | null = null
let workerInstance: Worker | null = null
let handLandmarker: any = null
let animationFrameId: number | null = null
let isPredicting = false
let lastAddedSign = ''
const cooldownTimer = ref(false)

const requestCameraAccess = async () => {
    systemStatus.value = '請求鏡頭權限中...'
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
    })
    if (videoRef.value) {
        videoRef.value.srcObject = stream
        await new Promise((r) => (videoRef.value!.onloadedmetadata = r))
        if (canvasRef.value) {
            canvasRef.value.width = videoRef.value.videoWidth
            canvasRef.value.height = videoRef.value.videoHeight
        }
    }
}

const initSystem = async () => {
    try {
        systemStatus.value = '載入推論引擎與手語模型...'
        if (!workerInstance) {
            workerInstance = new Worker(
                new URL('@/workers/inference.worker.ts', import.meta.url),
                { type: 'module' }
            )
            workerProxy = Comlink.wrap<AIWorkerType>(workerInstance)
        }

        const runtimeConfig = useRuntimeConfig()
        const baseUrl = runtimeConfig.app.baseURL || '/'
        const modelUrl = `${baseUrl.replace(/\/$/, '')}/model.onnx`
        const labelsUrl = `${baseUrl.replace(/\/$/, '')}/labels.json`

        const success = await workerProxy!.loadModel(modelUrl, labelsUrl)
        if (!success) throw new Error('手語辨識模型載入失敗')
        signStore.setModelLoaded?.(true)

        systemStatus.value = '載入手部姿態偵測模型...'
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2
        })

        isSystemReady.value = true
        systemStatus.value = '系統就緒，請開始比手語！'
        return true
    } catch (error: any) {
        console.error(error)
        systemStatus.value = '初始化失敗'
        signStore.setError?.(error.message)
        return false
    }
}

const detectFrame = () => {
    if (!videoRef.value || !canvasRef.value || !handLandmarker) return
    const ctx = canvasRef.value.getContext('2d')

    const renderLoop = async () => {
        if (!videoRef.value || !canvasRef.value) return

        const startTimeMs = performance.now()
        const results = handLandmarker.detectForVideo(videoRef.value, startTimeMs)

        ctx?.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

        const leftHand = new Array(63).fill(0)
        const rightHand = new Array(63).fill(0)

        if (results.landmarks && results.landmarks.length > 0) {
            for (let i = 0; i < results.landmarks.length; i++) {
                const handInfo = results.handedness[i]?.[0]
                const label = handInfo?.categoryName || handInfo?.label

                const coords = results.landmarks[i].flatMap((lm: any) => [lm.x, lm.y, lm.z])

                if (label === 'Left' || label === 'left') {
                    coords.forEach((val: number, idx: number) => (leftHand[idx] = val))
                } else if (label === 'Right' || label === 'right') {
                    coords.forEach((val: number, idx: number) => (rightHand[idx] = val))
                }
            }
        }

        const currentFrameData = [...leftHand, ...rightHand]

        if (framesBuffer.value.length >= 30) {
            const frames = [...framesBuffer.value]
            framesBuffer.value = []

            if (workerProxy) {
                // @ts-ignore
                workerProxy.predict(frames).then((res: any) => {
                    if (res && typeof res === 'object') {
                        inferenceLogs.value = res.allProbabilities.slice(0, 3)
                        handlePredictionResult(res.prediction, res.confidence)
                    }
                })
            }
        }

        if (!isPredicting && workerProxy) {
            isPredicting = true

            workerProxy
                .predict(currentFrameData)
                .then((res: any) => {
                    if (res && typeof res === 'object') {
                        inferenceLogs.value = res.allProbabilities.slice(0, 3)

                        if (res.prediction !== '辨識中...') {
                            handlePredictionResult(res.prediction, res.confidence)
                            systemStatus.value = `偵測到：${res.prediction} (${(res.confidence * 100).toFixed(0)}%)`
                        } else {
                            systemStatus.value = '動作分析中...'
                        }
                    }
                    isPredicting = false
                })
                .catch((err) => {
                    console.error('推論失敗:', err)
                    isPredicting = false
                })
        }

        if (results.landmarks) {
            ctx!.fillStyle = '#00FF00'
            for (const handLandmarks of results.landmarks) {
                for (const landmark of handLandmarks) {
                    ctx!.beginPath()
                    ctx!.arc(
                        landmark.x * canvasRef.value.width,
                        landmark.y * canvasRef.value.height,
                        3,
                        0,
                        2 * Math.PI
                    )
                    ctx!.fill()
                }
            }
        }

        animationFrameId = requestAnimationFrame(renderLoop)
    }

    renderLoop()
}

const handlePredictionResult = (prediction: string, confidence: number) => {
    signStore.updateSign?.(prediction)

    if (confidence > 0.75 && prediction && prediction !== '辨識中...' && prediction !== lastAddedSign) {
        recognizedWords.value.push(prediction)
        lastAddedSign = prediction
    }
}

const startSystem = async () => {
    if (isStarting.value) return
    isStarting.value = true
    try {
        await requestCameraAccess()
        const ready = await initSystem()
        if (ready) detectFrame()
    } catch (e: any) {
        signStore.setError?.(e.message)
    } finally {
        isStarting.value = false
    }
}

const removeWord = (index: number) => {
    recognizedWords.value.splice(index, 1)
    if (recognizedWords.value.length === 0) lastAddedSign = ''
}

const translateSentence = async () => {
    if (recognizedWords.value.length === 0 || isTranslating.value || cooldownTimer.value) {
        return
    }

    isTranslating.value = true
    cooldownTimer.value = true
    systemStatus.value = 'AI 潤色中...'

    try {
        const res = await translateSignWords(recognizedWords.value)

        if (res && res.text) {
            translatedSentence.value = res.text
            systemStatus.value = res.error ? '已顯示單字' : `翻譯完成！(${res.provider || 'AI'})`
        }
    } catch (e) {
        console.error('點擊翻譯失敗:', e)
        translatedSentence.value = recognizedWords.value.join(' ')
        systemStatus.value = '顯示原始單字'
    } finally {
        isTranslating.value = false

        setTimeout(() => {
            cooldownTimer.value = false
        }, 2000)
    }
}

const openDetailSheet = () => {
    signStore.openDetail?.({
        word: translatedSentence.value || signStore.currentSign || '尚未辨識',
        breakdown: `捕捉單字：${recognizedWords.value.join(' + ') || '無'}`,
        detail: '由自訓練模型 (model.onnx) 進行特徵識別，並透過 AI 生成語意自然之句子。'
    })
}

onMounted(() => {
    startSystem()
})

onUnmounted(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    workerInstance?.terminate()
    if (videoRef.value?.srcObject) {
        ; (videoRef.value.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
    }
})
</script>

<style scoped>
.camera-media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-fade-in {
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
