/**
 * 中正大學台灣手語線上辭典 (CCU TSL) 服務模組
 * 官網: https://twtsl.ccu.edu.tw/
 */

import { signDictionary } from '@/data/signDictionary'

export interface CCUSignSummary {
  id: number
  name: string
  movement?: string
  video?: string
  isLocal?: boolean
}

export interface CCUSignDetail {
  id: number
  name: string
  description?: string
  clip?: string
  videoUrl?: string
  stroke?: number
  handshapes: { code: string; imageUrl: string; name?: string }[]
  locations: { code: string; imageUrl: string; name?: string }[]
  isLocal?: boolean
}

const CCU_BASE_URL = 'https://twtsl.ccu.edu.tw'

// 本地快取避免重複發送相同請求
const detailCache = new Map<number | string, CCUSignDetail>()

/**
 * 取得影片完整直連網址
 */
export function getCCUVideoUrl(clip?: string): string {
  if (!clip) return ''
  if (clip.startsWith('http://') || clip.startsWith('https://') || clip.startsWith('blob:')) return clip
  const cleanClip = clip.replace(/^\//, '').replace(/\.mp4$/, '')
  return `${CCU_BASE_URL}/${cleanClip}.mp4`
}

/**
 * 取得手型圖片網址
 */
export function getCCUHandshapeUrl(hsCode?: string): string {
  if (!hsCode) return ''
  if (hsCode.startsWith('http://') || hsCode.startsWith('https://')) return hsCode
  const cleanCode = hsCode.replace(/^\//, '').replace(/\.jpg$/, '')
  return `${CCU_BASE_URL}/img/handshapeList/${cleanCode}.jpg`
}

/**
 * 取得位置圖片網址
 */
export function getCCULocationUrl(locCode?: string): string {
  if (!locCode) return ''
  if (locCode.startsWith('http://') || locCode.startsWith('https://')) return locCode
  const cleanCode = locCode.replace(/^\//, '').replace(/\.jpg$/, '')
  return `${CCU_BASE_URL}/img/locationList/${cleanCode}.jpg`
}

/**
 * 關鍵字搜尋手語詞彙
 */
export async function searchCCUSigns(
  keyword: string = '',
  page: number = 1,
  pageSize: number = 20
): Promise<{ records: CCUSignSummary[]; total: number }> {
  const trimmed = keyword.trim()

  // 若無關鍵字，預設透過筆劃查詢常用詞彙或展示常用庫
  if (!trimmed) {
    try {
      // 筆劃 4 劃為高頻詞庫群 (如 吃、你、我、日 等)
      const res = await fetch(
        `${CCU_BASE_URL}/api/pinSearch?field=stroke&value=4&lang=zh&page=${page}&pageSize=${pageSize}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.Record)) {
          return {
            records: data.Record.map((r: any) => ({
              id: r.id,
              name: r.name
            })),
            total: data.Total || data.Record.length
          }
        }
      }
    } catch (err) {
      console.warn('[CCU Dictionary] 預設筆劃查詢失敗，使用本機字典保底:', err)
    }

    // 本機保底
    const localEntries = Object.entries(signDictionary).map(([key, item], index) => ({
      id: 90000 + index,
      name: item.word || key,
      movement: item.movement,
      video: item.video,
      isLocal: true
    }))
    return { records: localEntries, total: localEntries.length }
  }

  // 有關鍵字時使用 manualSearch
  try {
    const res = await fetch(
      `${CCU_BASE_URL}/api/manualSearch?name=${encodeURIComponent(trimmed)}&lang=zh&page=${page}&pageSize=${pageSize}`
    )
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.Record)) {
        return {
          records: data.Record.map((r: any) => ({
            id: r.id,
            name: r.name
          })),
          total: data.Total || data.Record.length
        }
      }
    }
  } catch (err) {
    console.warn('[CCU Dictionary] manualSearch 失敗:', err)
  }

  // 本機關鍵字過濾保底
  const localFiltered = Object.entries(signDictionary)
    .filter(([key, item]) => `${item.word} ${key} ${item.movement || ''}`.includes(trimmed))
    .map(([key, item], index) => ({
      id: 90000 + index,
      name: item.word || key,
      movement: item.movement,
      video: item.video,
      isLocal: true
    }))

  return { records: localFiltered, total: localFiltered.length }
}

/**
 * 依詞彙 ID 或名稱查詢中正大學辭典手語詳細資訊 (手型、位置、動作說明、示範影片)
 */
export async function getCCUSignDetail(
  idOrWord: number | string
): Promise<CCUSignDetail | null> {
  if (!idOrWord) return null

  // 1. 檢查快取
  if (detailCache.has(idOrWord)) {
    return detailCache.get(idOrWord)!
  }

  let targetId: number | null = typeof idOrWord === 'number' ? idOrWord : null

  // 2. 如果傳入的是中文詞彙名稱（例如 "吃"），先透過 search 找出 ID
  if (typeof idOrWord === 'string' && targetId === null) {
    // 先檢查本機字典
    const localMatch = (signDictionary as Record<string, any>)[idOrWord]
    if (localMatch) {
      const localDetail: CCUSignDetail = {
        id: 99999,
        name: localMatch.word || idOrWord,
        description: localMatch.movement || '',
        videoUrl: localMatch.video || '',
        handshapes: (localMatch.ＨandshapeImage || []).map((img: string) => ({
          code: img,
          imageUrl: img.startsWith('http') ? img : img
        })),
        locations: (localMatch.positionImage || []).map((img: string) => ({
          code: img,
          imageUrl: img.startsWith('http') ? img : img
        })),
        isLocal: true
      }
      detailCache.set(idOrWord, localDetail)
    }

    try {
      const searchRes = await fetch(
        `${CCU_BASE_URL}/api/manualSearch?name=${encodeURIComponent(idOrWord)}&lang=zh&page=1&pageSize=5`
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData && Array.isArray(searchData.Record) && searchData.Record.length > 0) {
          // 精準比對名稱或取第一筆
          const exact = searchData.Record.find((r: any) => r.name === idOrWord) || searchData.Record[0]
          targetId = exact.id
        }
      }
    } catch (e) {
      console.warn('[CCU Dictionary] 搜尋詞彙 ID 失敗:', e)
    }
  }

  // 3. 呼叫 querySearch 獲取完整細節
  if (targetId !== null) {
    try {
      const res = await fetch(`${CCU_BASE_URL}/api/querySearch?id=${targetId}&lang=zh`)
      if (res.ok) {
        const data = await res.json()
        const record = data?.Record?.[0]
        if (record) {
          const handshapes: { code: string; imageUrl: string }[] = []
          const locations: { code: string; imageUrl: string }[] = []

          // 收集手型 (lo1_hs1, lo2_hs1, ...)
          for (let i = 1; i <= 5; i++) {
            const hs = record[`lo${i}_hs1`]
            if (hs) {
              handshapes.push({
                code: hs,
                imageUrl: getCCUHandshapeUrl(hs)
              })
            }
          }

          // 收集位置 (location1, location2, ...)
          for (let i = 1; i <= 5; i++) {
            const loc = record[`location${i}`]
            if (loc) {
              locations.push({
                code: loc,
                imageUrl: getCCULocationUrl(loc)
              })
            }
          }

          const detail: CCUSignDetail = {
            id: record.id,
            name: record.name,
            description: record.description || '無動作說明',
            clip: record.clip,
            videoUrl: getCCUVideoUrl(record.clip),
            stroke: record.stroke,
            handshapes,
            locations,
            isLocal: false
          }

          detailCache.set(targetId, detail)
          if (typeof idOrWord === 'string') {
            detailCache.set(idOrWord, detail)
          }
          return detail
        }
      }
    } catch (err) {
      console.error('[CCU Dictionary] querySearch 失敗:', err)
    }
  }

  // 4. 若線上 API 失敗且有本機快取則回傳本機
  if (detailCache.has(idOrWord)) {
    return detailCache.get(idOrWord)!
  }

  return null
}
