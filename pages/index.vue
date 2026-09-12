<template>
  <main class="page max-w-2xl mx-auto flex flex-col justify-between min-h-screen pt-4 sm:pt-6 px-4 sm:px-6 pb-24">

    <!-- 頂部搜尋欄 -->
    <AppHeader>
      <div class="relative flex-1">
        <input
          v-model="query"
          type="text"
          placeholder="搜尋中正大學台灣手語辭典..."
          class="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none rounded-full py-3 px-5 text-sm shadow-sm transition-all text-gray-700 placeholder-gray-400"
          @input="onSearchInput"
        />
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          <span v-if="isSearching" class="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <span v-else>🔍</span>
        </span>
      </div>
    </AppHeader>

    <!-- 頂部影片展示區 -->
    <section
      class="video-container w-full aspect-video max-h-[260px] bg-gray-900 rounded-3xl flex flex-col justify-center items-center text-white relative overflow-hidden shadow-inner border border-gray-100 my-2"
    >
      <video
        v-if="selectedSignDetail?.videoUrl"
        :key="selectedSignDetail.videoUrl"
        :src="getAssetUrl(selectedSignDetail.videoUrl)"
        controls
        playsinline
        autoplay
        class="w-full h-full object-contain bg-black"
      />
      <div
        v-else-if="isLoadingDetail"
        class="flex flex-col items-center gap-2 text-gray-400 text-sm"
      >
        <div class="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <span>載入示範影片中...</span>
      </div>
      <div
        v-else
        class="play bg-blue-600 text-white font-medium px-5 py-2.5 rounded-full shadow-md flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd"
            d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
            clip-rule="evenodd" />
        </svg>
        選取下方詞彙播放
      </div>
    </section>

    <!-- 目前選定詞彙資訊卡片 -->
    <section
      v-if="selectedSign"
      class="w-full bg-white border border-gray-100 p-5 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow mt-2 flex flex-col gap-1"
      @click="openDetail(selectedSign)"
    >
      <div class="flex items-center justify-between">
        <p class="text-lg font-bold text-gray-800">
          目前詞彙：<span class="text-blue-600">{{ selectedSign.name }}</span>
        </p>
        <span class="text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
          ⚙️ 查看手語拆解
        </span>
      </div>
      <p class="text-sm text-gray-500 leading-6 mt-1">
        {{ selectedSignDetail?.description || selectedSign.movement || '點擊卡片查看手型與位置分解' }}
      </p>
    </section>

    <!-- 語系標籤 -->
    <div class="pill w-fit mx-auto my-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium text-xs sm:text-sm border border-blue-100 shadow-sm flex items-center gap-1.5">
      <span>🇹🇼</span> 台灣手語線上辭典 (CCU TSL) 串接模式
    </div>

    <!-- 詞彙清單 -->
    <section class="w-full">
      <div class="flex items-center justify-between gap-3 mb-3 px-1">
        <p class="text-sm font-bold text-gray-600">詞彙清單</p>
        <p class="text-xs font-medium text-gray-400">
          共 {{ totalRecords }} 筆手語詞條
        </p>
      </div>

      <!-- 載入中骨架 -->
      <div v-if="isSearching" class="grid gap-3">
        <div v-for="i in 4" :key="i" class="h-16 bg-gray-100 animate-pulse rounded-2xl"></div>
      </div>

      <!-- 詞彙列表 -->
      <div v-else-if="signs.length > 0" class="grid gap-2.5">
        <button
          v-for="entry in signs"
          :key="entry.id || entry.name"
          type="button"
          class="w-full bg-white border p-4 rounded-2xl shadow-sm text-left transition-all flex items-center justify-between gap-4"
          :class="entry.name === selectedSign?.name ? 'border-blue-300 bg-blue-50/40 ring-2 ring-blue-100' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'"
          @click="selectSign(entry)"
        >
          <div class="min-w-0">
            <p class="text-lg font-bold text-gray-800 tracking-wide truncate">{{ entry.name }}</p>
            <p v-if="entry.movement" class="text-xs text-gray-400 mt-0.5 truncate">{{ entry.movement }}</p>
          </div>
          <span class="w-8 h-8 flex-shrink-0 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>

      <p v-else class="text-center text-sm text-gray-400 py-12">
        查無符合「{{ query }}」的手語詞彙
      </p>

      <!-- 分頁控制項 -->
      <div v-if="signs.length > 0 && totalPages > 1" class="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          class="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="currentPage === 1 || isSearching"
          @click="goToPage(currentPage - 1)"
        >
          上一頁
        </button>

        <div class="flex items-center gap-1.5 overflow-x-auto max-w-[180px] sm:max-w-none">
          <button
            v-for="page in visiblePageNumbers"
            :key="page"
            type="button"
            class="w-8 h-8 rounded-full text-xs sm:text-sm font-bold border transition-colors"
            :class="page === currentPage ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600'"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
        </div>

        <button
          type="button"
          class="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="currentPage === totalPages || isSearching"
          @click="goToPage(currentPage + 1)"
        >
          下一頁
        </button>
      </div>

      <p v-if="signs.length > 0" class="text-center text-xs text-gray-400 mt-3">
        第 {{ currentPage }} / {{ totalPages }} 頁
      </p>
    </section>

  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { searchCCUSigns, getCCUSignDetail, type CCUSignSummary, type CCUSignDetail } from '@/services/ccuDictionary'
import { useSignStore } from '@/stores/signStore'
import AppHeader from '@/components/header.vue'

const signStore = useSignStore()
const runtimeConfig = useRuntimeConfig()

const query = ref('')
const signs = ref<CCUSignSummary[]>([])
const totalRecords = ref(0)
const currentPage = ref(1)
const isSearching = ref(false)
const isLoadingDetail = ref(false)

const selectedSign = ref<CCUSignSummary | null>(null)
const selectedSignDetail = ref<CCUSignDetail | null>(null)

const pageSize = computed(() => signStore.dictionaryPageSize || 20)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / pageSize.value)))

const getAssetUrl = (url?: string) => {
  if (!url) return ''
  if (typeof url !== 'string') return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const base = runtimeConfig.app.baseURL || '/'
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const visiblePageNumbers = computed(() => {
  const maxVisible = 5
  if (totalPages.value <= maxVisible) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1)
  }

  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

let debounceTimer: any = null
const onSearchInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchSigns()
  }, 350)
}

const fetchSigns = async () => {
  isSearching.value = true
  try {
    const res = await searchCCUSigns(query.value, currentPage.value, pageSize.value)
    signs.value = res.records
    totalRecords.value = res.total

    if (signs.value.length > 0) {
      // 若當前沒有選中或選中的不在清單內，選取第一筆
      const exists = signs.value.find(s => s.id === selectedSign.value?.id)
      if (!exists) {
        selectSign(signs.value[0], false)
      }
    } else {
      selectedSign.value = null
      selectedSignDetail.value = null
    }
  } catch (err) {
    console.error('查詢手語詞彙失敗:', err)
  } finally {
    isSearching.value = false
  }
}

const selectSign = async (entry: CCUSignSummary, scrollToTop: boolean = true) => {
  selectedSign.value = entry
  isLoadingDetail.value = true
  if (scrollToTop && typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  try {
    const detail = await getCCUSignDetail(entry.id || entry.name)
    if (detail) {
      selectedSignDetail.value = detail
    }
  } catch (e) {
    console.warn('載入詞彙細節失敗:', e)
  } finally {
    isLoadingDetail.value = false
  }
}

const goToPage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  fetchSigns()
}

const openDetail = (entry: CCUSignSummary) => {
  signStore.openDetail({
    id: entry.id,
    word: entry.name,
    dictionaryKey: entry.name,
    detail: selectedSignDetail.value?.description
  })
}

watch(pageSize, () => {
  currentPage.value = 1
  fetchSigns()
})

onMounted(() => {
  signStore.loadDictionaryPageSize()
  fetchSigns()
})
</script>