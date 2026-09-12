// stores/signStore.ts
import { defineStore } from 'pinia'

export const useSignStore = defineStore('sign', {
  state: () => ({
    // --- 原有的 AI 狀態 ---
    currentSign: '等待辨識中...' as string,
    isModelLoaded: false as boolean,
    fps: 0 as number,
    errorMsg: '' as string,

    // --- 📥 新增的全域 UI 控制狀態 ---
    showSetting: false as boolean,
    showDetail: false as boolean,
    dictionaryPageSize: 20 as number,

    // 詳情彈窗專用的資料緩衝區
    detailData: {
      id: null as number | string | null,
      dictionaryKey: '' as string,
      word: '尚未辨識' as string,
      breakdown: '依辨識結果顯示拆解' as string,
      detail: '手型：待補<br />位置：待補<br />動作：待補' as string
    }
  }),
  actions: {
    // --- 原有的 AI Actions (一字不差保留) ---
    updateSign(this: any, sign: string) {
      this.currentSign = sign
    },
    setModelLoaded(this: any, status: boolean) {
      this.isModelLoaded = status
    },
    setError(this: any, msg: string) {
      this.errorMsg = msg
    },

    // --- 📥 新增的全域 UI Actions ---
    openSetting(this: any) {
      this.showSetting = true
    },
    closeSetting(this: any) {
      this.showSetting = false
    },
    setDictionaryPageSize(this: any, size: number) {
      this.dictionaryPageSize = size
      if (import.meta.client) {
        localStorage.setItem('dictionaryPageSize', String(size))
      }
    },
    loadDictionaryPageSize(this: any) {
      if (!import.meta.client) return

      const savedSize = Number(localStorage.getItem('dictionaryPageSize'))
      if ([5, 10, 20, 50].includes(savedSize)) {
        this.dictionaryPageSize = savedSize
      }
    },
    openDetail(this: any, payload?: { id?: number | string; word: string; dictionaryKey?: string; breakdown?: string; detail?: string }) {
      if (payload) {
        this.detailData.id = payload.id || null
        this.detailData.dictionaryKey = payload.dictionaryKey || payload.word
        this.detailData.word = payload.word
        if (payload.breakdown) this.detailData.breakdown = payload.breakdown
        if (payload.detail) this.detailData.detail = payload.detail
      } else {
        // 如果沒傳參數，預設抓取目前最新的 AI 辨識結果
        this.detailData.id = null
        this.detailData.dictionaryKey = this.currentSign || '尚未辨識'
        this.detailData.word = this.currentSign || '尚未辨識'
        this.detailData.breakdown = '依辨識結果顯示拆解'
        this.detailData.detail = '手型：待補<br />位置：待補<br />動作：待補'
      }
      this.showDetail = true
    },
    closeDetail(this: any) {
      this.showDetail = false
    }
  }
})