<template>
  <main class="page max-w-2xl mx-auto flex flex-col justify-between min-h-screen pt-4 sm:pt-6 px-4 sm:px-6 pb-24">
    <AppHeader>
      <div class="logo text-center font-bold text-gray-800 flex-1">
        即時手語辨識系統
      </div>
      <div class="w-12 h-12 flex-shrink-0"></div>
    </AppHeader>

    <section
      class="camera-container w-full aspect-video bg-gray-900 rounded-3xl relative overflow-hidden shadow-lg border border-gray-200">
      <video ref="videoRef" autoplay playsinline muted class="camera-media"></video>
      <canvas ref="canvasRef" class="camera-media"></canvas>
    </section>

    <button
      class="start-btn w-full max-w-sm mx-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-2xl shadow-md transition-all active:scale-[0.98] mt-4"
      :disabled="isStarting" @click="startSystem">
      {{ isStarting ? '系統啟動中...' : '重新啟動系統' }}
    </button>

    <div
      class="pill my-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium text-sm sm:text-base border border-blue-100 shadow-sm">
      台灣手語 → 中文（繁體）
    </div>

    <div v-if="inferenceLogs.length > 0"
      class="w-full max-w-md mx-auto bg-white/80 backdrop-blur p-4 rounded-2xl border border-gray-100 shadow-sm my-3">
      <h3 class="text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        實時 analysis (Confidence)
      </h3>
      <div v-for="(item, idx) in inferenceLogs" :key="idx" class="flex items-center gap-3 mb-2 last:mb-0 text-sm">
        <span class="w-16 font-semibold text-gray-600 truncate">{{ item.label }}:</span>
        <div class="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div class="bg-blue-600 h-full rounded-full transition-all duration-100 ease-out"
            :style="{ width: (item.score * 100) + '%' }"></div>
        </div>
        <span class="w-12 text-right font-mono text-gray-500 text-xs">{{ (item.score * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <section
      class="w-full bg-white border border-gray-100 p-5 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow mt-4 flex flex-col gap-1"
      @click="signStore.openDetail()">
      <p class="text-lg font-bold text-gray-800">
        辨識結果：<span class="text-blue-600">{{ signStore.currentSign || '尚未辨識' }}</span>
      </p>
      <span class="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1">
        ⚙️ {{ systemStatus }}
      </span>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSignStore } from '@/stores/signStore'
import * as Comlink from 'comlink'
import type { AIWorkerType } from '@/workers/inference.worker'
import AppHeader from '@/components/header.vue'

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const signStore = useSignStore()
const inferenceLogs = ref<{ label: string, score: number }[]>([]);

const framesBuffer = ref<number[][]>([])
let workerProxy: Comlink.Remote<AIWorkerType> | null = null
let workerInstance: Worker | null = null
let handLandmarker: any = null
let animationFrameId: number | null = null

const systemStatus = ref('等待啟動...')
const isStarting = ref(false)
let isPredicting = false

const requestCameraAccess = async () => {
  try {
    systemStatus.value = '請求鏡頭權限中...'
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await new Promise((r) => videoRef.value!.onloadedmetadata = r)
      if (canvasRef.value) {
        canvasRef.value.width = videoRef.value.videoWidth
        canvasRef.value.height = videoRef.value.videoHeight
      }
    }
  } catch (err) {
    throw new Error('無法存取相機，請檢查權限設定。')
  }
}

const initSystem = async () => {
  try {
    systemStatus.value = '載入推論引擎中...'
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
    if (!success) throw new Error('模型載入失敗')
    signStore.setModelLoaded(true)

    systemStatus.value = '載入手部偵測模型...'
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    )
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    })

    systemStatus.value = '系統就緒，請開始比手語！'
    return true
  } catch (error: any) {
    console.error(error)
    signStore.setError(error.message)
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

        const coords = results.landmarks[i].flatMap((lm: any) => [
          lm.x,
          lm.y,
          lm.z
        ]);

        if (label === 'Left' || label === 'left') {
          coords.forEach((val: number, idx: number) => leftHand[idx] = val)
        } else if (label === 'Right' || label === 'right') {
          coords.forEach((val: number, idx: number) => rightHand[idx] = val)
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
            signStore.updateSign(res.prediction)
            systemStatus.value = `偵測到：${res.prediction} (${(res.confidence * 100).toFixed(0)}%)`
          }
        })
      }
    }

    if (!isPredicting && workerProxy) {
      isPredicting = true

      workerProxy.predict(currentFrameData).then((res: any) => {
        if (res && typeof res === 'object') {
          inferenceLogs.value = res.allProbabilities.slice(0, 3);

          if (res.prediction !== '辨識中...') {
            signStore.updateSign(res.prediction);
            systemStatus.value = `偵測到：${res.prediction} (${(res.confidence * 100).toFixed(0)}%)`;
          } else {
            systemStatus.value = '動作分析中...';
          }
        }
        isPredicting = false;
      }).catch((err) => {
        console.error("預測失敗:", err)
        isPredicting = false
      });
    }

    if (results.landmarks) {
      ctx!.fillStyle = '#00FF00'
      for (const handLandmarks of results.landmarks) {
        for (const landmark of handLandmarks) {
          ctx!.beginPath()
          ctx!.arc(landmark.x * canvasRef.value.width, landmark.y * canvasRef.value.height, 3, 0, 2 * Math.PI)
          ctx!.fill()
        }
      }
    }

    animationFrameId = requestAnimationFrame(renderLoop)
  }

  renderLoop()
}

const startSystem = async () => {
  if (isStarting.value) return
  isStarting.value = true
  try {
    await requestCameraAccess()
    const ready = await initSystem()
    if (ready) {
      detectFrame()
    }
  } catch (e: any) {
    signStore.setError(e.message)
  } finally {
    isStarting.value = false
  }
}

onMounted(() => {
  startSystem()
})

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  workerInstance?.terminate()
  if (videoRef.value?.srcObject) {
    (videoRef.value.srcObject as MediaStream).getTracks().forEach(t => t.stop())
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
</style>