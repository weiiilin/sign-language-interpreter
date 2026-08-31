export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const body = await readBody(event)
    const words = body?.words || []

    if (!words || words.length === 0) {
        return { success: false, text: '請先比出手語單字' }
    }

    const prompt = `你是一個專業的手語翻譯員。請將以下台灣手語單字序列組合並潤色成一句通順的繁體中文句子。只需要直接輸出翻譯後的句子，不要有任何解釋或標點符號外的贅字。手語單字：${words.join('、')}`


    const groqApiKey = config.groqApiKey || process.env.GROQ_API_KEY
    if (groqApiKey) {
        try {
            const groqResponse = await $fetch<any>('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    model: 'openai/gpt-oss-120b',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2
                }
            })

            const text = groqResponse?.choices?.[0]?.message?.content?.trim()
            if (text) {
                return { success: true, text, provider: 'Groq (Fallback)' }
            }
        } catch (groqError: any) {
            console.error('❌ Groq API 備援也失敗:', groqError?.data || groqError?.message)
        }
    }

    return {
        success: false,
        text: words.join(' '),
        error: '翻譯服務暫時不可用，已顯示原始單字'
    }
})
