/**
 * 台灣手語句子 AI 潤色與翻譯模組
 * 專為台灣手語 (TSL) 語法結構設計：
 * 支援「體貌標記 (完成/還沒有)」、「疑問標記 (有沒有)」等手語語序至自然繁體中文之轉換。
 */

export interface TranslationResult {
  success: boolean
  text: string
  provider?: string
  error?: string
}

// 台灣手語專業規則引擎 (離線 / 免 API 保底)
function ruleBasedTSLTranslate(words: string[]): string | null {
  if (!words || words.length === 0) return null

  const joined = words.join('')

  const exactRules: Record<string, string> = {
    '你吃飯完成': '你吃完飯了。',
    '你吃完成': '你吃完飯了。',
    '你吃飯完成有沒有': '你吃完飯了嗎？',
    '你吃完成有沒有': '你吃飽了沒有？',
    '你吃飯你有沒有': '你吃完飯了沒有？',
    '你吃你有沒有': '你吃飽了沒有？',
    '你吃飯有沒有': '你吃飯了嗎？',
    '你吃有沒有': '你吃了沒有？',
    '我吃飯完成': '我吃完飯了。',
    '我吃完成': '我吃飽了。',
    '我吃飯還沒有': '我還沒吃飯。',
    '我吃還沒有': '我還沒吃。',
    '我完成': '我已經做好了。',
    '我還沒有': '我還沒。',
    '你完成有沒有': '你做好了沒有？',
    '你有沒有': '你有沒有？',
    '你吃飯': '你吃飯。',
    '我吃飯': '我吃飯。',
    '你吃': '你吃飯。',
    '我吃': '我吃飯。',
    '完成': '已經做完了。',
    '還沒有': '還沒有。',
    '有沒有': '有沒有？',
    '吃飯': '吃飯。',
    '吃': '吃飯。',
    '我': '我。',
    '你': '你。'
  }

  if (exactRules[joined]) {
    return exactRules[joined]
  }

  // 語意組合規則判定
  const hasYou = words.includes('你')
  const hasMe = words.includes('我')
  const hasEat = words.includes('吃') || words.includes('吃飯')
  const hasDone = words.includes('完成') || words.includes('好了')
  const hasNotYet = words.includes('還沒有') || words.includes('尚未') || words.includes('沒')
  const hasQuestion = words.includes('有沒有') || words.includes('嗎')

  if (hasYou && hasEat && hasDone && hasQuestion) {
    return '你吃完飯了嗎？'
  }
  if (hasYou && hasEat && hasDone) {
    return '你吃完飯了。'
  }
  if (hasYou && hasEat && hasQuestion) {
    return '你吃飯了嗎？'
  }
  if (hasMe && hasEat && hasDone) {
    return '我吃完飯了。'
  }
  if (hasMe && hasEat && hasNotYet) {
    return '我還沒吃飯。'
  }
  if (hasDone && hasQuestion) {
    return '做好了沒有？'
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

  const prompt = `你是一位專業的台灣手語（TSL）翻譯專家。
台灣手語有其獨特的語序與體貌標記（Aspect Marker）：
- 「完成」置於動詞後表示動作已完成（例如：[你, 吃飯, 完成] 應翻譯為「你吃完飯了。」或「你吃飽了。」；[作業, 寫, 完成] 應翻譯為「作業寫完了。」）
- 「完成 + 有沒有」置於句末表示疑問句（例如：[你, 吃飯, 完成, 有沒有] 應翻譯為「你吃完飯了嗎？」或「你吃飽了沒有？」）
- 「還沒有」置於動詞後表示尚未進行（例如：[我, 吃飯, 還沒有] 應翻譯為「我還沒吃飯。」）
- 台灣手語常有語序倒裝，請務必轉換並潤色為自然、流暢、符合台灣口語習慣的繁體中文句子。

待翻譯手語單字：${words.join('、')}

請直接輸出翻譯後的一句繁體中文句子，絕對不要包含任何解釋、說明、問候語或引號。`

  // 1. 優先嘗試呼叫後端 API（若伺服器存在）
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
    // 靜態部署環境降級至前端
  }

  // 2. 獲取 API 金鑰
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

  // 3. 前端直接呼叫 Groq API (支援 CORS)
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
            temperature: 0.1
          })
        })

        if (response.ok) {
          const data = await response.json()
          let text = data?.choices?.[0]?.message?.content?.trim()
          if (text) {
            text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
            text = text.replace(/^["「『]|["」』]$/g, '').trim()
            if (text) {
              return { success: true, text, provider: `Groq (${model})` }
            }
          }
        }
      } catch (err) {
        console.warn(`[Translator] Groq (${model}) 失敗:`, err)
      }
    }
  }

  // 4. 專業 TSL 規則引擎備援
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
