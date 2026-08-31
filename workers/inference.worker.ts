import * as Comlink from 'comlink'
import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

let session: ort.InferenceSession | null = null

// ['me', 'you', 'eat', 'yon', 'complete', 'notyet']
let labels: string[] = [];
const LABELS_URL = '/labels.json';

async function loadLabels(customLabelsUrl?: string): Promise<void> {
  try {
    const targetUrl = customLabelsUrl || LABELS_URL;
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`labels fetch failed: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.display_names)
      ? data.display_names
      : Array.isArray(data?.classes)
        ? data.classes
        : [];
    if (list.length > 0) {
      labels = list;
      console.log('[Worker] labels loaded:', labels);
    }
  } catch (e) {
    console.warn('[Worker] labels load failed:', e);
  }
}
// let labels: string[] = ['吃', '我', '你'];
// '有沒有', '完成', '還沒'

// --- 新增：滑動視窗緩衝區 ---
let framesBuffer: number[][] = [];
const SEQ_LENGTH = 30;   // 收集 30 幀
const FEATURE_DIM = 126; // 雙手特徵 (21點 * 3座標 * 2手)

const AIWorker = {
  async loadModel(modelUrl: string, labelsUrl?: string) {
    try {
      console.log("[Worker] 開始載入模型:", modelUrl);
      if (session) return true;

      const response = await fetch(modelUrl);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const buffer = await response.arrayBuffer();

      ort.env.wasm.numThreads = 1;

      session = await ort.InferenceSession.create(buffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      console.log('[Worker] 模型載入成功');
      const targetLabelsUrl = labelsUrl || (modelUrl.includes('/') ? modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1) + 'labels.json' : LABELS_URL);
      await loadLabels(targetLabelsUrl);
      return true;
    } catch (e) {
      console.error('[Worker] 初始化失敗', e);
      return false;
    }
  },

  // 參數改為 singleFrameLandmarks，代表「當下這一幀的 126 個座標點」
  async predict(singleFrameLandmarks: number[]) {
    if (!session) return '模型未載入'

    try {
      const inputName = session.inputNames[0]
      const outputName = session.outputNames[0]
      if (!inputName || !outputName) return '模型輸入輸出名稱異常'

      // 1. 檢查進來的「單幀」資料長度是否正確 (應為 126)
      if (singleFrameLandmarks.length !== FEATURE_DIM) {
        return `資料長度異常: 收到 ${singleFrameLandmarks.length}，預期 ${FEATURE_DIM}`;
      }

      // 2. 將最新一幀加入緩衝區
      framesBuffer.push(singleFrameLandmarks);

      // 3. 如果超過 30 幀，就把最舊的那一幀踢掉，維持動態更新
      if (framesBuffer.length > SEQ_LENGTH) {
        framesBuffer.shift();
      }

      // 4. 如果還沒收集滿 30 幀 (剛開啟鏡頭的前一秒)，先不進行推論
      if (framesBuffer.length < SEQ_LENGTH) {
        return '收集動作中...';
      }

      // 5. 將收集滿的 30 幀二維陣列攤平成 Float32Array 供 ONNX 使用
      const flatData = new Float32Array(framesBuffer.flat());

      // 6. 關鍵修復：明確告訴 ONNX 這是一個 3D Tensor [1, 30, 126]
      const inputTensor = new ort.Tensor('float32', flatData, [1, SEQ_LENGTH, FEATURE_DIM]);

      const feeds: Record<string, ort.Tensor> = {}
      feeds[inputName] = inputTensor

      const results = await session.run(feeds)
      const outputTensor = results[outputName]
      if (!outputTensor) return '模型輸出異常'

      const output = outputTensor.data as Float32Array
      
      if (output.length === 0) return '模型輸出為空'
      const safeLabels =
  labels.length === output.length
    ? labels
    : Array.from({ length: output.length }, (_, i) => `Class ${i}`);
      // 取得模型輸出的原始分數 (Logits)

      // 1. Softmax 轉換：將原始分數轉換為 0~1 (0%~100%) 的真實機率
      const maxLogit = Math.max(...output);
      const exps = output.map(x => Math.exp(x - maxLogit));
      const sumExps = exps.reduce((a, b) => a + b, 0);
      const probabilities = exps.map(x => x / sumExps);

      const probMap = safeLabels.map((label, i) => ({
        label,
        score: probabilities[i] ?? 0
      })).sort((a, b) => b.score - a.score);

      // 2. 找出機率最高的那一個
      let maxIndex = 0;
      let maxScore: number = -Infinity;
      for (let i = 0; i < probabilities.length; i++) {
        // 透過 nullish coalescing 確保 score 為數字，避免 undefined 比較
        const score = probabilities[i] ?? -Infinity;
        if (score > maxScore) {
          maxScore = score;
          maxIndex = i;
        }
      }

      // 3. 設定信心度門檻 (例如 0.7 代表 70% 的把握)
      // 如果最高機率小於 0.7，代表模型在瞎猜，我們就不輸出結果
      if (maxScore < 0.5) {
        return '辨識中...';
      }

      const prediction = safeLabels[maxIndex] ?? '未知類別';

      // 測試階段可以把機率印出來看，方便你抓感覺
      console.log(`預測結果: ${prediction}, 信心度: ${(maxScore * 100).toFixed(1)}%`);

      return {
        prediction,
        confidence: maxScore,
        allProbabilities: probMap // 包含排序後的清單
      };
      
    } catch (e) {
      console.error('[Worker] 推論異常:', e);
      return `辨識錯誤，${e instanceof Error ? e.message : String(e)}`;
    }
  }
}

Comlink.expose(AIWorker)
export type AIWorkerType = typeof AIWorker
