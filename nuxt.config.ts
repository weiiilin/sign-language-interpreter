export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2026-04-05',
  modules: ['@vite-pwa/nuxt', '@pinia/nuxt', '@nuxtjs/tailwindcss'],
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },
  runtimeConfig: {
    groqApiKey: process.env.GROQ_API_KEY || '',
  },
  routeRules: {
    '/SignRecognition': { ssr: false },
    '/signRecognition': { ssr: false },
  },
  css: ['~/public/assets/css/main.css'],
  vite: {
    server: {
      allowedHosts: true,
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'comlink',
        '@tensorflow/tfjs',
        '@mediapipe/hands',
      ]
    }
  },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || (process.env.NODE_ENV === 'production' ? '/sign-language-interpreter/' : '/'),
    head: {
      title: '手語辨識與學習平台',
      meta: [
        { name: 'description', content: '一個基於 Nuxt 4、TensorFlow.js 和 MediaPipe 的手語辨識與學習平台。' },
        { name: 'author', content: '黃暐淋、余俊霖' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: (process.env.NUXT_APP_BASE_URL || (process.env.NODE_ENV === 'production' ? '/sign-language-interpreter/' : '/')) + 'logo.ico' }
      ]
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '手語辨識與學習平台',
      short_name: '手語學習',
      theme_color: '#4f46e5',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,wasm,onnx,onnx.data}'],
      maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,

      runtimeCaching: [
        {
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'external-resources',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }
          }
        }
      ]
    }
  }
})
