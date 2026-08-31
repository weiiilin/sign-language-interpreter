<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>設定</h2>
      <p>翻譯設定</p>
      <hr />
      <div class="setting-row">
        <p>文字大小：{{ fontSize }}px</p>
        <input
          v-model="fontSize"
          type="range"
          min="12"
          max="24"
        />
      </div>

      <div class="setting-row">
        <p>Groq API 金鑰：</p>
        <input
          v-model="groqApiKey"
          type="password"
          placeholder="gsk_..."
          class="api-input"
        />
        <p class="hint">用於 AI 句子潤色翻譯 (選填)</p>
      </div>

      <h3>關於</h3>
      <hr />
      <p class="small">
        台灣手語翻譯系統
        <br />
        Version 1.0
        <br />
        製作人：余俊霖、黃暐淋
        <br />
      </p>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const fontSize = ref(16)
const groqApiKey = ref('')

onMounted(() => {
  const savedSize = localStorage.getItem('fontSize')
  if (savedSize) {
    fontSize.value = Number(savedSize)
    document.documentElement.style.setProperty(
      '--app-font-size',
      `${fontSize.value}px`
    )
  }

  const savedKey = localStorage.getItem('groq_api_key')
  if (savedKey) {
    groqApiKey.value = savedKey
  }
})

watch(fontSize, (newSize) => {
  document.documentElement.style.setProperty(
    '--app-font-size',
    `${newSize}px`
  )
  localStorage.setItem('fontSize', String(newSize))
})

watch(groqApiKey, (newKey) => {
  if (newKey) {
    localStorage.setItem('groq_api_key', newKey.trim())
  } else {
    localStorage.removeItem('groq_api_key')
  }
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal {
  width: 280px;
  background: white;
  border-radius: 24px;
  padding: 20px;
}

.small {
  font-size: 12px;
}

.hint {
  font-size: 10px;
  color: #888;
  margin-top: 4px;
}

.api-input {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
}

.setting-row {
  margin: 16px 0;
}

.setting-row input {
  width: 100%;
}

button {
  margin-top: 12px;
}
</style>