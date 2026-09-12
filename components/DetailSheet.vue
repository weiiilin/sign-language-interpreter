<template>
  <div class="overlay" @click.self="$emit('close')">
    <section class="sheet max-h-[85vh] overflow-y-auto">
      <div class="handle"></div>

      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">
            {{ currentDetail?.name || props.word }}
          </h2>
          <p v-if="currentDetail?.stroke" class="text-xs text-gray-400 mt-0.5">
            筆劃：{{ currentDetail.stroke }} 劃 | 來源：中正大學台灣手語辭典
          </p>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>正在載入中正大學手語拆解資料...</span>
      </div>

      <div v-else class="space-y-4">
        <!-- 動作說明 -->
        <div class="bg-blue-50/60 border border-blue-100/80 rounded-2xl p-4">
          <p class="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1">
            <span>🖐️</span> 動作分解說明
          </p>
          <p class="text-sm text-gray-700 leading-relaxed font-medium">
            {{ currentDetail?.description || '尚無動作描述' }}
          </p>
        </div>

        <!-- 手型與位置圖解 -->
        <div class="grid grid-cols-2 gap-3">
          <!-- 手型 -->
          <div class="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/50 flex flex-col items-center text-center">
            <p class="text-xs font-bold text-gray-500 mb-2">手型圖解</p>
            <div v-if="currentDetail?.handshapes && currentDetail.handshapes.length > 0" class="flex flex-wrap gap-2 justify-center">
              <div
                v-for="(hs, idx) in currentDetail.handshapes"
                :key="idx"
                class="flex flex-col items-center"
              >
                <img
                  :src="getAssetUrl(hs.imageUrl)"
                  :alt="hs.code"
                  class="w-16 h-16 object-contain rounded-xl bg-white border border-gray-100 shadow-sm"
                  @error="onImageError"
                />
                <span class="text-[11px] text-gray-400 mt-1 font-mono truncate max-w-[70px]">{{ hs.code }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400 py-4">無手型圖檔</p>
          </div>

          <!-- 位置 -->
          <div class="border border-gray-100 rounded-2xl p-3.5 bg-gray-50/50 flex flex-col items-center text-center">
            <p class="text-xs font-bold text-gray-500 mb-2">部位圖解</p>
            <div v-if="currentDetail?.locations && currentDetail.locations.length > 0" class="flex flex-wrap gap-2 justify-center">
              <div
                v-for="(loc, idx) in currentDetail.locations"
                :key="idx"
                class="flex flex-col items-center"
              >
                <img
                  :src="getAssetUrl(loc.imageUrl)"
                  :alt="loc.code"
                  class="w-16 h-16 object-contain rounded-xl bg-white border border-gray-100 shadow-sm"
                  @error="onImageError"
                />
                <span class="text-[11px] text-gray-400 mt-1 font-mono truncate max-w-[70px]">{{ loc.code }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400 py-4">無位置圖檔</p>
          </div>
        </div>

        <!-- 示範影片 -->
        <div v-if="currentDetail?.videoUrl" class="mt-2">
          <p class="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
            <span>🎬</span> 手語示範影片
          </p>
          <div class="rounded-2xl overflow-hidden bg-black aspect-video max-h-[220px] shadow-inner border border-gray-100">
            <video
              :src="getAssetUrl(currentDetail.videoUrl)"
              controls
              playsinline
              class="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getCCUSignDetail, type CCUSignDetail } from '@/services/ccuDictionary'
import { signDictionary } from '@/data/signDictionary'

const props = defineProps({
  word: {
    type: String,
    default: ''
  },
  dictionaryKey: {
    type: String,
    default: ''
  },
  id: {
    type: [Number, String],
    default: null
  }
})

const isLoading = ref(true)
const currentDetail = ref<CCUSignDetail | null>(null)
const runtimeConfig = useRuntimeConfig()

const getAssetUrl = (url?: string) => {
  if (!url) return ''
  if (typeof url !== 'string') return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const base = runtimeConfig.app.baseURL || '/'
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement
  if (target) {
    target.style.display = 'none'
  }
}

const loadDetailData = async () => {
  isLoading.value = true
  const queryTarget = props.id || props.dictionaryKey || props.word
  if (!queryTarget) {
    isLoading.value = false
    return
  }

  try {
    const detail = await getCCUSignDetail(queryTarget)
    if (detail) {
      currentDetail.value = detail
    } else {
      // 本機保底
      const local = (signDictionary as Record<string, any>)[props.dictionaryKey || props.word]
      if (local) {
        currentDetail.value = {
          id: 0,
          name: local.word || props.word,
          description: local.movement || '無動作說明',
          videoUrl: local.video,
          handshapes: (local.ＨandshapeImage || []).map((img: string) => ({
            code: img,
            imageUrl: img
          })),
          locations: (local.positionImage || []).map((img: string) => ({
            code: img,
            imageUrl: img
          })),
          isLocal: true
        }
      }
    }
  } catch (err) {
    console.error('載入詳情失敗:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDetailData()
})

watch(() => [props.id, props.dictionaryKey, props.word], () => {
  loadDetailData()
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}
.sheet {
  width: 100%;
  background: white;
  border-radius: 28px 28px 0 0;
  padding: 24px;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.15);
}
.handle {
  width: 48px;
  height: 5px;
  background: #e2e8f0;
  border-radius: 999px;
  margin: 0 auto 18px;
}
</style>