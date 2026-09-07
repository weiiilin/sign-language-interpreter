<template>
  <main class="page max-w-2xl mx-auto flex flex-col justify-between min-h-screen pt-4 sm:pt-6 px-4 sm:px-6 pb-24">

    <AppHeader>
      <div class="relative flex-1">
        <input v-model="query" type="text" placeholder="搜尋手語單字、詞彙..." style=" position: relative;"
          class="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none rounded-full py-3 px-5 text-sm shadow-sm transition-all text-gray-700 placeholder-gray-400" />
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      </div>
    </AppHeader>

    <section
      class="video-container w-full aspect-video max-h-[260px] bg-gray-900 rounded-3xl flex flex-col justify-center items-center text-white relative overflow-hidden shadow-inner border border-gray-100 my-2">
      <video v-if="selectedSign?.video" :src="getAssetUrl(selectedSign.video)" controls playsinline class="w-full h-full object-contain bg-black" />

      <div v-else
        class="play bg-blue-600 text-white font-medium px-5 py-2.5 rounded-full shadow-md flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd"
            d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
            clip-rule="evenodd" />
        </svg>
        播放示範
      </div>
    </section>

    <section v-if="selectedSign"
      class="w-full bg-white border border-gray-100 p-5 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow mt-4 flex flex-col gap-1"
      @click="openDetail(selectedSign)">
      <p class="text-lg font-bold text-gray-800">
        目前詞彙：<span class="text-blue-600">{{ selectedSign.word }}</span>
      </p>
      <span class="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1">
        ⚙️ 點擊查看手語拆解
      </span>
      <p class="text-sm text-gray-500 leading-6 mt-2">{{ selectedSign.movement }}</p>
    </section>

    <div
      class="pill w-fit mx-auto my-4 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-medium text-sm sm:text-base border border-blue-100 shadow-sm">
      中文（繁體） → 台灣手語
    </div>

    <section class="w-full">
      <div class="flex items-center justify-between gap-3 mb-3 px-1">
        <p class="text-sm font-bold text-gray-600">詞彙清單</p>
        <p class="text-xs font-medium text-gray-400">
          {{ filteredSigns.length }} / {{ signs.length }} 筆
        </p>
      </div>

      <div class="grid gap-3">
        <button v-for="entry in paginatedSigns" :key="entry.dictionaryKey" type="button"
          class="w-full bg-white border p-5 rounded-2xl shadow-sm text-left transition-all flex items-center justify-between gap-4"
          :class="entry.dictionaryKey === selectedSign?.dictionaryKey ? 'border-gray-200 bg-gray-50' : 'border-gray-100 hover:shadow-md'"
          @click="selectSign(entry.dictionaryKey)">
          <div class="min-w-0">
            <p class="text-xl font-bold text-gray-800 tracking-wide truncate">{{ entry.word }}</p>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ entry.movement }}</p>
          </div>
          <span class="w-9 h-9 flex-shrink-0 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>

      <p v-if="filteredSigns.length === 0" class="text-center text-sm text-gray-400 py-8">
        沒有符合的詞彙
      </p>

      <div v-else class="mt-4 flex items-center justify-between gap-3">
        <button type="button"
          class="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)">
          上一頁
        </button>

        <div class="flex items-center gap-2">
          <button v-for="page in visiblePageNumbers" :key="page" type="button"
            class="w-9 h-9 rounded-full text-sm font-bold border"
            :class="page === currentPage ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-500'"
            @click="goToPage(page)">
            {{ page }}
          </button>
        </div>

        <button type="button"
          class="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)">
          下一頁
        </button>
      </div>

      <p v-if="filteredSigns.length > 0" class="text-center text-xs text-gray-400 mt-3">
        第 {{ currentPage }} / {{ totalPages }} 頁，顯示 {{ firstVisibleItem }}-{{ lastVisibleItem }} 筆
      </p>
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { signDictionary } from '@/data/signDictionary'
import { useSignStore } from '@/stores/signStore'
import AppHeader from '@/components/header.vue'

type SignEntry = {
  dictionaryKey: string
  word: string
  movement?: string
  video?: string
}

const signStore = useSignStore()
const runtimeConfig = useRuntimeConfig()
const getAssetUrl = (url?: string) => {
  if (!url) return ''
  if (typeof url !== 'string') return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const base = runtimeConfig.app.baseURL || '/'
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

const signs = Object.entries(signDictionary as Record<string, Omit<SignEntry, 'dictionaryKey'>>).map(([dictionaryKey, entry]) => ({
  dictionaryKey,
  ...entry
}))
const query = ref('')
const selectedKey = ref(signs[0]?.dictionaryKey || '')
const pageSize = computed(() => signStore.dictionaryPageSize)
const currentPage = ref(1)

const filteredSigns = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return signs

  return signs.filter((entry) => {
    return `${entry.word} ${entry.movement || ''}`.toLowerCase().includes(keyword)
  })
})

const selectedSign = computed(() => {
  return signs.find((entry) => entry.dictionaryKey === selectedKey.value) || filteredSigns.value[0] || signs[0]
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredSigns.value.length / pageSize.value))
})

const paginatedSigns = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSigns.value.slice(start, start + pageSize.value)
})

const visiblePageNumbers = computed(() => {
  const maxVisible = 5
  if (totalPages.value <= maxVisible) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  }

  let start = Math.max(1, currentPage.value - 2)
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const firstVisibleItem = computed(() => {
  if (filteredSigns.value.length === 0) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})

const lastVisibleItem = computed(() => {
  return Math.min(currentPage.value * pageSize.value, filteredSigns.value.length)
})

watch([query, pageSize], () => {
  currentPage.value = 1
})

onMounted(() => {
  signStore.loadDictionaryPageSize()
})

const selectSign = (dictionaryKey: string) => {
  selectedKey.value = dictionaryKey
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const goToPage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}

const openDetail = (entry: SignEntry) => {
  signStore.openDetail({ word: entry.word, dictionaryKey: entry.dictionaryKey })
}
</script>