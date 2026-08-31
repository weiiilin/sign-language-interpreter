/**
 * 台灣手語句子 AI 潤色與翻譯模組
 * 支援：
 * 1. 後端 Nitro API (/api/translate)（本機 / Node 伺服器部署）
 * 2. 瀏覽器端直接呼叫 Groq API (Qwen 3.8 / GPT-OSS)（GitHub Pages 靜態部署）
 * 3. 離線 / 斷網 台灣手語規則語法強化引擎 (TSL Rule-Based Grammar Fallback)
 */

export interface TranslationResult {
  success: boolean
  text: string
  provider?: string
  error?: string
}

// 台灣手語常見句型規則引擎 (離線 / 免 API 備援)
function ruleBasedTSLTranslate(words: string[]): string | null {
  if (!words || words.length === 0) return null

  const joined = words.join('')

  const ruleMap: Record<string, string> = {
    '你吃完成有沒有': '你吃飽了沒有？',
    '你吃你有沒有': '你吃飽了沒有？',
    '你吃有沒有': '你吃了沒有？',
    '我吃完成': '我吃飽了。',
    '我吃還沒有': '我還沒吃飯。',
    '我完成': '我已經做好了。',
    '我還沒有': '我還沒。',
    '你完成有沒有': '你做好了沒有？',
    '你有沒有': '你有沒有？',
    '你吃': '你吃飯。',
    '我吃': '我吃飯。',
    '完成': '已經完成了。',
    '還沒有': '還沒有。',
    '有沒有': '有沒有？',
    '吃': '吃飯。',
    '我': '我。',
    '你': '你。'
  }

  if (ruleMap[joined]) {
    return ruleMap[joined]
  }

  // 模糊規則比對
  if (words.includes('你') && words.includes('吃') && (words.includes('有沒有') || words.includes('完成'))) {
    return '你吃飽了沒有？'
  }
  if (words.includes('我') && words.includes('吃') && words.includes('完成')) {
    return '我吃完了。'
  }
  if (words.includes('我') && words.includes('吃') && words.includes('還沒有')) {
    return '我還沒有吃飯。'
  }

  return null
}

export async function translateSignWords(
  words: string[],
  customApiKey?: string
): Promise<TranslationResult> {
  if (!words || words.length === 0) {
    return { success: false, text: '請先比出手語單字' }
  }

  const prompt = `你是一個專業的手語翻譯員。請將以下台灣手語單字序列組合並潤色成一句通順的繁體中文句子。只需要直接輸出翻譯後的句子，不要有任何解釋或標點符號外的贅字。手語單字：${words.join('、')}`

  // 1. 優先嘗試呼叫同源後端 API（適用於本機開發或具備後端伺服器的環境）
  try {
    const res = await $fetch<any>('/api/translate', {
      method: 'POST',
      body: { words },
      timeout: 3000
    })
    if (res && res.success && res.text) {
      return res
    }
  } catch (backendError) {
    // 後端不可用（如 GitHub Pages 純靜態環境 404），自動進入純前端處理
    console.info('[Translator] 後端 API 不可用 (純靜態環境)，切換至前端 AI 翻譯引擎...')
  }

  // 2. 獲取 API 金鑰 (支援傳入、Nuxt public runtimeConfig、localStorage)
  let groqApiKey = customApiKey
  if (!groqApiKey && typeof window !== 'undefined') {
    groqApiKey = localStorage.getItem('groq_api_key') || ''
  }
  if (!groqApiKey) {
    try {
      const config = useRuntimeConfig()
      groqApiKey = (config?.public?.groqApiKey as string) || ''
    } catch (_) {}
  }

  // 3. 前端直接呼叫 Groq API (支援瀏覽器端 CORS)
  if (groqApiKey) {
    const groqModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'groq/compound-mini']
    for (const model of groqModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
          })
        })

        if (response.ok) {
          const data = await response.json()
          let text = data?.choices?.[0]?.message?.content?.trim()
          if (text) {
            // 清理可能出現的 <think>...</think> 標籤
            text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
            if (text) {
              return { success: true, text, provider: `Groq (${model})` }
            }
          }
        }
      } catch (err) {
        console.warn(`[Translator] Groq (${model}) 失敗，嘗試下一個備援...`, err)
      }
    }
  }

  // 4. 規則引擎備援 (Rule-Based TSL)
  const ruleResult = ruleBasedTSLTranslate(words)
  if (ruleResult) {
    return { success: true, text: ruleResult, provider: 'TSL Rule Engine' }
  }

  // 5. 保底原始單字串接
  return {
    success: false,
    text: words.join(' '),
    error: '已顯示原始手語單字'
  }
}
