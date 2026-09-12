export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const body = await readBody(event)
    const words = body?.words || []

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

    const groqApiKey = config.groqApiKey || config.public?.groqApiKey || process.env.GROQ_API_KEY
    if (groqApiKey) {
        const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'groq/compound-mini']
        for (const model of models) {
            try {
                const groqResponse = await $fetch<any>('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: {
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1
                    }
                })

                let text = groqResponse?.choices?.[0]?.message?.content?.trim()
                if (text) {
                    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
                    text = text.replace(/^["「『]|["」』]$/g, '').trim()
                    if (text) {
                        return { success: true, text, provider: `Groq (${model})` }
                    }
                }
            } catch (groqError: any) {
                console.warn(`❌ Groq API (${model}) 失敗:`, groqError?.data || groqError?.message)
            }
        }
    }

    return {
        success: false,
        text: words.join(' '),
        error: '翻譯服務暫時不可用，已顯示原始單字'
    }
})
