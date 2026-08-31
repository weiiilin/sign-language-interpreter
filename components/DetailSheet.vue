<template>
  <div class="overlay" @click.self="$emit('close')">
    <section class="sheet">
      <div class="handle"></div>

      <p class="blue">查詢：{{ props.word }}</p>
      <p>
        拆解：
      </p>

      <p class="blue">手語分解動作</p>
      <div class="detail-grid">
        <div class="detail-item">
      <p>
        手型：{{ detail?.handshape?.join(', ') }}
      </p>
      <img
        v-for="img in detail?.ＨandshapeImage"
        :key="img"
        :src="getAssetUrl(img)"
        class="image"
      />
        </div>
        <div class="detail-item">
      <p>
        位置：{{ detail?.location?.join(', ') }}
      </p>
      <img
        v-for="img in detail?.positionImage"
        :key="img"
        :src="getAssetUrl(img)"
        class="image"
      />
        </div>
      </div>
      <p>
        動作：{{ detail?.movement }}
      </p>
      <video
        v-if="detail?.video"
        :src="getAssetUrl(detail.video)"
        controls
        class="video"
      />
      

    </section>
  </div>
</template>

<script setup>
import { signDictionary } from '@/data/signDictionary'

const props = defineProps({
  word: {
    type: String,
    default: ''
  }
})
const detail = computed(() => {
  return signDictionary[props.word] || null
})

const runtimeConfig = useRuntimeConfig()
const getAssetUrl = (url) => {
  if (!url) return ''
  if (typeof url !== 'string') return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url
  const base = runtimeConfig.app.baseURL || '/'
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.25);
  display: flex;
  align-items: flex-end;
  z-index: 50;
}
.sheet {
  width: 100%;
  min-height: 380px;
  background: white;
  border-radius: 28px 28px 0 0;
  padding: 24px;
}
.handle {
  width: 48px;
  height: 5px;
  background: #ccc;
  border-radius: 999px;
  margin: 0 auto 20px;
}
.blue {
  color: #1e8cff;
}
.video {
  width: 100%;
  max-height: 220px;

  border-radius: 16px;

  object-fit: cover;

  margin-top: 12px;
}

.image {
  width: 70px;
  height: 70px;


  border-radius: 12px;

  object-fit: contain;

  margin-top: 10px;
}
.image-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: center;
  margin-top: 20px;
}

.detail-item h3 {
  font-size: 18px;
  margin-bottom: 12px;
}

</style>