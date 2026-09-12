<template>
  <div>
    <NuxtPage />
    <BottomNav />
    <SettingModal v-if="signStore.showSetting" @close="signStore.closeSetting()" />
    <DetailSheet v-if="signStore.showDetail" @close="signStore.closeDetail()" :id="signStore.detailData.id"
      :word="signStore.detailData.word" :dictionary-key="signStore.detailData.dictionaryKey"
      :breakdown="signStore.detailData.breakdown" :detail="signStore.detailData.detail" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import SettingModal from '@/components/SettingModal.vue'
import DetailSheet from '@/components/DetailSheet.vue'
import { useSignStore } from '@/stores/signStore'

const signStore = useSignStore()

onMounted(() => {
  if (import.meta.client) {
    const savedSize = localStorage.getItem('fontSize')
    if (savedSize) {
      document.documentElement.style.fontSize = `${savedSize}px`
      document.documentElement.style.setProperty('--app-font-size', `${savedSize}px`)
    }
  }
})
</script>