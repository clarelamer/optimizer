/* ============================================================
   all.js — 自動調整學習速率互動簡報
   內容依據 optimizer_v4.pdf 與字幕整理
   ============================================================ */

'use strict';

/* ── 1. 投影片資料 ─────────────────────────────────────────── */
/* 每張投影片為一個物件，type 決定渲染方式：
   'hero'        → 封面
   'section'     → 章節標題頁
   'content'     → 一般說明頁
   'interactive' → 含 Canvas 互動圖解
   'quiz'        → 隨堂小考
*/
const SLIDES = [

  /* ── 封面 ── */
  {
    id: 0, type: 'hero',
    tag: null,
    title: '自動調整學習速率',
    subtitle: '理解 Adaptive Learning Rate、Adagrad、RMSProp、Adam\n與 Learning Rate Scheduling 的原理與直觀',
    note: '← → 鍵盤或箭頭按鈕換頁'
  },

  /* ════════════════════════════
     第一章：Critical Point
     ════════════════════════════ */
  {
    id: 1, type: 'section',
    sectionNum: '01', tag: 'Chapter 1',
    title: 'Critical Point：真的是訓練的終點嗎？',
  },
  {
    id: 2, type: 'content',
    tag: 'Chapter 1 — Critical Point',
    title: '什麼是 Critical Point？',
    body: `
      <p>訓練神經網路時，我們用 <strong>Gradient Descent</strong> 沿著 Loss 的梯度方向更新參數。</p>
      <p>當 gradient ＝ 0 的地方，稱為 <strong>Critical Point</strong>，包含：</p>
      <ul>
        <li><strong>Local Minima</strong>（區域最小值）：四周都比它高</li>
        <li><strong>Saddle Point</strong>（鞍點）：某方向是最小值、某方向是最大值</li>
        <li>Local Maxima（區域最大值，梯度下降不會到這裡）</li>
      </ul>
    `,
    callout: { type:'info', text:'💡 關鍵問題：訓練停止，一定是遇到 Critical Point 嗎？' }
  },
  {
    id: 3, type: 'interactive',
    tag: 'Chapter 1 — 互動圖解',
    title: 'Error Surface 3D 視覺化',
    hint: null,
    canvasId: 'errorSurface',
    is3D: true,
    layout: 'split3d',
    drawFn: null,
    interactFn: null,
    controls: []
  },
  {
    id: 4, type: 'content',
    tag: 'Chapter 1 — Critical Point',
    title: 'Loss 不再下降 ≠ 卡在 Critical Point',
    body: `
      <p>實驗觀察：訓練過程中，<strong>Loss 停止下降時，Gradient 的 norm 並沒有變得很小</strong>。</p>
      <p>真正發生的情況是：</p>
      <ul>
        <li>Loss 停止下降，可能只是 <strong>Learning Rate 設定不當</strong></li>
        <li>Gradient 仍很大，但更新步伐讓 Loss 在山谷兩邊來回震盪</li>
        <li>最終「卡在」某個平坦高原區，並非真正的 critical point</li>
      </ul>
    `,
    callout: { type:'warn', text:'⚠️ 不要馬上認為「卡在 Local Minima」，更常見的原因是 Learning Rate 問題。' }
  },
  {
    id: 5, type: 'content',
    tag: 'Chapter 1 — Saddle vs Local Minima',
    title: 'Saddle Point 比 Local Minima 更常見',
    body: `
      <p>高維空間中，要讓所有方向同時向上（Local Minima 的條件）<strong>機率極低</strong>。</p>
      <p>相對地，Saddle Point 非常普遍：某些方向往下，某些方向往上。</p>
      <p>判斷方法：計算 <strong>Hessian 矩陣的 Eigen Value</strong>：</p>
    `,
    formula: '所有 eigen value > 0  →  Local Minima\n所有 eigen value < 0  →  Local Maxima\n有正有負       →  Saddle Point',
    callout: { type:'ok', text:'✅ Saddle Point 在某個方向上仍可繼續更新，不一定是真正的「死路」。' }
  },
  {
    id: 6, type: 'quiz',
    tag: '隨堂小考 1',
    question: '訓練神經網路時，如果 Loss 停止下降，最可能的原因是？',
    options: [
      '參數已收斂到最佳的 Global Minimum',
      'Learning Rate 設定不當，導致更新步伐過大或過小',
      '神經網路結構太簡單，需要增加層數',
      '訓練資料不足，需要補充更多資料'
    ],
    answer: 1,
    explanation: '根據講座實驗，Loss 停止下降時 Gradient Norm 仍然很大，表示並非真正到達 Critical Point，而是 Learning Rate 問題導致更新無效。'
  },
  {
    id: 7, type: 'quiz',
    tag: '隨堂小考 2',
    question: '在高維參數空間中，下列哪種 Critical Point 最常出現？',
    options: [
      'Global Minimum（全域最小值）',
      'Local Maxima（區域最大值）',
      'Saddle Point（鞍點）',
      'Local Minima（區域最小值）'
    ],
    answer: 2,
    explanation: '在高維空間中，Hessian 矩陣的所有 Eigen Value 同號的機率極低。有正有負（即 Saddle Point）的情況最為普遍。'
  },

  /* ════════════════════════════
     第二章：Adaptive Learning Rate
     ════════════════════════════ */
  {
    id: 8, type: 'section',
    sectionNum: '02', tag: 'Chapter 2',
    title: 'Adaptive Learning Rate：讓每個參數有自己的學習率'
  },
  {
    id: 9, type: 'content',
    tag: 'Chapter 2 — 核心概念',
    title: '為什麼需要自適應學習率？',
    body: `
      <p>傳統 Gradient Descent 對所有參數使用<strong>同一個</strong> Learning Rate η。</p>
      <p>問題：不同參數的 Loss 曲面陡峭程度差異很大：</p>
      <ul>
        <li>某方向 <strong>gradient 很小</strong>（曲面平坦）→ 應該用<strong>大</strong>一點的步伐</li>
        <li>某方向 <strong>gradient 很大</strong>（曲面陡峭）→ 應該用<strong>小</strong>一點的步伐</li>
      </ul>
      <p>解決方案：讓每個參數 θᵢ 自動學習屬於自己的 Learning Rate。</p>
    `,
    callout: { type:'info', text:'💡 核心思想：用每個參數歷史梯度的大小，來自動調整其學習率。' }
  },
  {
    id: 10, type: 'content',
    tag: 'Chapter 2 — 公式推導',
    title: '自適應學習率的一般形式',
    body: `
      <p>原始 Gradient Descent 更新規則：</p>
    `,
    formula: 'θᵢ(t+1) = θᵢ(t)  −  η · gᵢ(t)',
    body2: `
      <p>加入自適應後：</p>
    `,
    formula2: '         η\nθᵢ(t+1) = θᵢ(t)  −  ──── · gᵢ(t)\n        σᵢ(t)',
    callout: { type:'info', text:'其中 σᵢ(t) 由參數 i 的歷史梯度計算而來。不同演算法對 σ 的計算方式不同，這正是 Adagrad、RMSProp、Adam 的關鍵差異。' }
  },

  /* ════════════════════════════
     第三章：Adagrad
     ════════════════════════════ */
  {
    id: 11, type: 'section',
    sectionNum: '03', tag: 'Chapter 3',
    title: 'Adagrad：累積所有過去梯度的平方'
  },
  {
    id: 12, type: 'content',
    tag: 'Chapter 3 — Adagrad',
    title: 'Adagrad 算法介紹',
    body: `
      <p><strong>Adagrad</strong>（Adaptive Gradient）的核心：用<strong>所有過去梯度的 Root Mean Square</strong> 當作 σ。</p>
      <p>步驟：</p>
    `,
    steps: [
      '計算當前梯度 gᵢ(t)',
      '累積歷史梯度平方：σᵢ(t) = √[ (g₁²+ g₂²+…+gₜ²) / t ]',
      '更新參數：θᵢ → θᵢ − (η / σᵢ(t)) · gᵢ(t)'
    ],
    callout: { type:'info', text:'💡 gradient 一直很大 → σ 大 → 有效 LR 小；gradient 一直很小 → σ 小 → 有效 LR 大。' }
  },
  {
    id: 13, type: 'content',
    tag: 'Chapter 3 — Adagrad 公式',
    title: 'Adagrad 完整公式',
    body: `<p>對參數 θᵢ，在第 t 次 iteration：</p>`,
    formula: '梯度累計：σᵢ(t) = √( (1/t) Σ[τ=1→t] gᵢ(τ)² )\n\n更新規則：θᵢ(t+1) = θᵢ(t) − η/σᵢ(t) · gᵢ(t)',
    body2: `
      <p>等價地，分子分母同時乘以 σ，可寫成：</p>
    `,
    formula2: 'step size = η · gᵢ(t) / σᵢ(t)\n\n若 gᵢ(t) 很大且 σᵢ(t) 也大 → step 不一定大\n若 gᵢ(t) 與 σᵢ(t) 大小相近 → step ≈ η'
  },
  {
    id: 14, type: 'interactive',
    tag: 'Chapter 3 — 互動圖解',
    title: 'Adagrad vs 固定 Learning Rate',
    hint: '點擊「開始動畫」，觀察兩個參數在 Adagrad 下如何自動調整步伐大小。',
    canvasId: 'adagradDemo',
    drawFn: 'drawAdagrad',
    interactFn: null,
    controls: [
      { type:'button', label:'▶ 開始', fn:'startAdagrad', cls:'btn-primary' },
      { type:'button', label:'↺ 重設', fn:'resetAdagrad', cls:'btn-secondary' }
    ]
  },
  {
    id: 15, type: 'content',
    tag: 'Chapter 3 — Adagrad 缺點',
    title: 'Adagrad 的問題：梯度累積只增不減',
    body: `
      <p>Adagrad 將<strong>所有歷史</strong>梯度都累加進 σ，導致一個問題：</p>
      <ul>
        <li>訓練越久，σ 越來越大</li>
        <li>有效學習率 η/σ <strong>單調遞減，趨近於零</strong></li>
        <li>在訓練後期，即使遇到可以大步前進的方向，也步伐過小</li>
      </ul>
    `,
    callout: { type:'warn', text:'⚠️ 在複雜的 Loss Landscape 中，某個方向需要先用小 LR，後來又需要用大 LR，Adagrad 無法做到。這正是 RMSProp 出現的動機。' }
  },
  {
    id: 16, type: 'quiz',
    tag: '隨堂小考 3',
    question: 'Adagrad 中，σᵢ(t) 代表什麼？',
    options: [
      '當前梯度的絕對值',
      '所有過去梯度的算術平均',
      '所有過去梯度平方的均方根（Root Mean Square）',
      '當前梯度與前一次梯度的差值'
    ],
    answer: 2,
    explanation: 'σᵢ(t) = √[ (1/t) Σ gᵢ(τ)² ]，即所有歷史梯度的均方根（Root Mean Square）。這讓 gradient 大的方向有效 LR 自動變小，gradient 小的方向有效 LR 自動變大。'
  },

  /* ════════════════════════════
     第四章：RMSProp
     ════════════════════════════ */
  {
    id: 17, type: 'section',
    sectionNum: '04', tag: 'Chapter 4',
    title: 'RMSProp：加入「遺忘機制」的 Adagrad'
  },
  {
    id: 18, type: 'content',
    tag: 'Chapter 4 — RMSProp',
    title: 'RMSProp 的改進：指數移動平均',
    body: `
      <p>RMSProp 由 Hinton 在 Coursera 課程中提出（無正式論文）。</p>
      <p>改進：用<strong>指數移動平均（Exponential Moving Average）</strong>計算 σ，讓較舊的梯度影響逐漸衰退：</p>
    `,
    formula: 'σᵢ(t) = √[ α · σᵢ(t-1)² + (1-α) · gᵢ(t)² ]',
    body2: `
      <p>其中 α（0~1）是超參數：</p>
      <ul>
        <li>α 接近 1 → 較重視<strong>過去</strong>的梯度</li>
        <li>α 接近 0 → 較重視<strong>當前</strong>的梯度</li>
      </ul>
    `,
    callout: { type:'ok', text:'✅ 這樣即使過了很久，σ 也不會無限增大，有效 LR 可以在訓練後期仍然適當。' }
  },
  {
    id: 19, type: 'interactive',
    tag: 'Chapter 4 — 互動圖解',
    title: 'RMSProp 指數移動平均示意',
    hint: '拖動 α 滑桿，觀察不同 α 值下，σ（粉色線）如何追蹤梯度（灰色線）的變化。',
    canvasId: 'rmspropDemo',
    drawFn: 'drawRMSProp',
    interactFn: null,
    controls: [
      { type:'slider', label:'α =', id:'alphaSlider', min:0.01, max:0.99, step:0.01, value:0.9, fn:'updateRMSProp' }
    ]
  },
  {
    id: 20, type: 'content',
    tag: 'Chapter 4 — RMSProp vs Adagrad',
    title: 'RMSProp vs Adagrad 比較',
    compare: [
      { title: 'Adagrad', desc: '累計所有歷史梯度²；σ 單調遞增；適合稀疏梯度；訓練後期 LR 趨近於零' },
      { title: 'RMSProp', desc: '指數移動平均；σ 可隨梯度大小動態調整；α 可自訂遺忘速率；更適合深層網路' }
    ]
  },
  {
    id: 21, type: 'quiz',
    tag: '隨堂小考 4',
    question: 'RMSProp 與 Adagrad 的最主要差異是什麼？',
    options: [
      'RMSProp 不需要計算梯度',
      'RMSProp 使用指數移動平均，讓較舊的梯度影響逐漸衰退',
      'RMSProp 只考慮當前梯度，完全忽略歷史',
      'RMSProp 使用二階導數（Hessian）來決定步伐'
    ],
    answer: 1,
    explanation: 'RMSProp 的 σᵢ(t) = √[ α·σᵢ(t-1)² + (1-α)·gᵢ(t)² ]，透過指數移動平均讓較舊梯度的影響指數衰退，避免 Adagrad σ 單調增大的問題。'
  },

  /* ════════════════════════════
     第五章：Adam
     ════════════════════════════ */
  {
    id: 22, type: 'section',
    sectionNum: '05', tag: 'Chapter 5',
    title: 'Adam：最廣泛使用的優化器'
  },
  {
    id: 23, type: 'content',
    tag: 'Chapter 5 — Adam',
    title: 'Adam = Momentum + RMSProp',
    body: `
      <p><strong>Adam</strong>（Adaptive Moment Estimation）結合兩種技術：</p>
      <ul>
        <li><strong>Momentum</strong>：考慮過去梯度的「方向」，避免震盪，加速收斂</li>
        <li><strong>RMSProp</strong>：考慮過去梯度的「大小」，自動調整每個參數的 LR</li>
      </ul>
    `,
    formula: '一階動量（方向）：mᵢ(t) = β₁·mᵢ(t-1) + (1-β₁)·gᵢ(t)\n二階動量（大小）：vᵢ(t) = β₂·vᵢ(t-1) + (1-β₂)·gᵢ(t)²\n\n偏差校正：m̂ = m/(1-β₁ᵗ),  v̂ = v/(1-β₂ᵗ)\n\n更新：θᵢ → θᵢ − η · m̂ᵢ / (√v̂ᵢ + ε)',
    callout: { type:'info', text:'📌 PyTorch 預設值：β₁=0.9, β₂=0.999, ε=1e-8, η=0.001，大多數情況直接使用預設即可。' }
  },
  {
    id: 24, type: 'content',
    tag: 'Chapter 5 — Momentum',
    title: 'Momentum 是什麼？',
    body: `
      <p>原始 Gradient Descent 只考慮「當前位置的梯度方向」。</p>
      <p>Momentum 的比喻：<strong>物理上的慣性</strong>。球滾下山坡時，會記住之前的速度：</p>
      <ul>
        <li>目前更新方向 ＝ 當前梯度 ＋ 過去所有梯度的加權移動平均</li>
        <li>過去累積的「動量」讓參數在一個方向上持續前進，不易被個別噪聲影響</li>
      </ul>
    `,
    callout: { type:'ok', text:'✅ Momentum 幫助跨越小的局部起伏，讓訓練更穩定。RMSProp 則負責讓步伐大小自動適應。兩者相輔相成。' }
  },
  {
    id: 25, type: 'quiz',
    tag: '隨堂小考 5',
    question: 'Adam 優化器結合了哪兩種技術？',
    options: [
      'Adagrad + Learning Rate Decay',
      'SGD + Warm Up',
      'Momentum + RMSProp',
      'Nesterov Momentum + Adagrad'
    ],
    answer: 2,
    explanation: 'Adam = Momentum（一階動量，追蹤梯度方向）+ RMSProp（二階動量，追蹤梯度大小），是目前深度學習中最廣泛使用的優化器。'
  },

  /* ════════════════════════════
     第六章：Learning Rate Scheduling
     ════════════════════════════ */
  {
    id: 26, type: 'section',
    sectionNum: '06', tag: 'Chapter 6',
    title: 'Learning Rate Scheduling：讓 LR 隨時間變化'
  },
  {
    id: 27, type: 'content',
    tag: 'Chapter 6 — LR Decay',
    title: 'Learning Rate Decay',
    body: `
      <p>即使有 Adaptive LR，我們仍可以讓<strong>全局學習率 η 隨訓練時間遞減</strong>。</p>
      <p>直觀理解：</p>
      <ul>
        <li>訓練初期：距離最佳點還很遠，應使用<strong>大</strong>步伐快速接近</li>
        <li>訓練後期：已靠近最佳點，應使用<strong>小</strong>步伐精確收斂</li>
      </ul>
      <p>常見 Decay 形式：</p>
    `,
    formula: 'Step Decay：每 k epoch 將 LR 乘以 γ（γ < 1）\n\n指數 Decay： η(t) = η₀ · exp(−λt)\n\n1/t Decay：  η(t) = η₀ / (1 + λt)',
    callout: { type:'ok', text:'✅ 搭配 Adaptive LR（如 Adam）使用 LR Decay，可進一步穩定訓練後期的收斂。' }
  },
  {
    id: 28, type: 'content',
    tag: 'Chapter 6 — Warm Up',
    title: 'Warm Up：先熱身，再衝刺',
    body: `
      <p><strong>Warm Up</strong>：訓練最開始時，先用<strong>很小</strong>的學習率，隨後逐漸增大，到達峰值後再衰減。</p>
      <p>為什麼需要 Warm Up？</p>
      <ul>
        <li>訓練初期，RMSProp 中的 σ（統計量）尚未穩定，估計不準確</li>
        <li>若一開始使用大 LR，步伐根據不準確的 σ 更新，容易震盪</li>
        <li>Warm Up 讓模型先「熱身」，等統計量穩定後再加速</li>
      </ul>
    `,
    callout: { type:'info', text:'📌 BERT、Transformer、Residual Network 訓練時均使用 Warm Up。這是大型模型訓練的標準技巧之一。' }
  },
  {
    id: 29, type: 'interactive',
    tag: 'Chapter 6 — 互動圖解',
    title: 'Learning Rate Scheduling 曲線',
    hint: '選擇不同的排程策略，觀察學習率隨 iteration 的變化曲線。',
    canvasId: 'lrScheduleDemo',
    drawFn: 'drawLRSchedule',
    interactFn: null,
    controls: [
      { type:'button', label:'LR Decay', fn:'setLRDecay', cls:'btn-secondary', data:'decay' },
      { type:'button', label:'Warm Up + Decay', fn:'setLRWarmup', cls:'btn-secondary', data:'warmup' },
      { type:'button', label:'Transformer LR', fn:'setLRTransformer', cls:'btn-secondary', data:'transformer' }
    ]
  },
  {
    id: 30, type: 'quiz',
    tag: '隨堂小考 6',
    question: '為什麼大型模型（如 BERT、Transformer）訓練需要 Warm Up？',
    options: [
      '因為大型模型的參數量多，需要更多時間初始化',
      '訓練初期梯度統計量（σ）尚未穩定，Warm Up 讓模型先穩定估計再加速',
      '為了讓 GPU 先預熱，避免硬體損壞',
      'Warm Up 可以讓模型學習到更多的特徵表示'
    ],
    answer: 1,
    explanation: '訓練剛開始時，RMSProp/Adam 中的 σ（梯度統計量）還沒有足夠的資料，估計值不準確。若使用大 LR，步伐會根據不準確的 σ 調整，容易震盪。Warm Up 讓模型在統計量穩定後再逐漸加速。'
  },
  {
    id: 31, type: 'quiz',
    tag: '隨堂小考 7',
    question: '下列關於 Learning Rate Scheduling 的敘述，何者正確？',
    options: [
      'Learning Rate Decay 只能與 SGD 搭配使用，Adam 不需要',
      'Warm Up 技術是先將 LR 調大，然後一直維持不變',
      'Learning Rate Scheduling 是讓 LR 隨訓練進度動態調整的技術，與 Adaptive LR 互補',
      'Learning Rate Decay 會讓模型在訓練後期更快跳出 Local Minima'
    ],
    answer: 2,
    explanation: 'LR Scheduling 讓全局學習率 η 隨時間變化（如 Decay、Warm Up），這與 Adaptive LR（讓各參數自動調整）是互補的兩個機制，兩者可以同時使用。'
  },

  /* ── 總結 ── */
  {
    id: 32, type: 'section',
    sectionNum: '07', tag: '總結',
    title: '知識地圖回顧'
  },
  {
    id: 33, type: 'content',
    tag: '總結',
    title: '優化器演化路徑',
    body: `
      <p>從最基礎到最常用的優化器演化：</p>
    `,
    steps: [
      'SGD：固定 LR，所有參數共用同一步伐',
      'SGD + Momentum：加入慣性，追蹤梯度方向的移動平均',
      'Adagrad：用歷史梯度 RMS 自動調整各參數 LR',
      'RMSProp：用指數移動平均改進 Adagrad，加入遺忘機制',
      'Adam：Momentum + RMSProp，目前最廣泛使用的優化器',
      '+ LR Scheduling（Decay / Warm Up）：進一步控制訓練節奏'
    ],
    callout: { type:'ok', text:'✅ 實務建議：從 Adam + LR Decay 開始；大型模型（Transformer 系列）再加 Warm Up。' }
  },
  {
    id: 34, type: 'content',
    tag: '總結',
    title: '各方法關鍵公式彙整',
    body: `<p>快速對照各方法的核心公式：</p>`,
    formula: 'SGD：         θ → θ − η·g\n\nMomentum：   m = β·m + (1-β)·g\n             θ → θ − η·m\n\nAdagrad：    σ = √[ (1/t)Σgτ² ]\n             θ → θ − (η/σ)·g\n\nRMSProp：    σ = √[ α·σ² + (1-α)·g² ]\n             θ → θ − (η/σ)·g\n\nAdam：       m̂ = m/(1-β₁ᵗ),  v̂ = v/(1-β₂ᵗ)\n             θ → θ − η·m̂/(√v̂+ε)',
    callout: { type:'info', text:'📖 延伸閱讀：RAdam（Rectified Adam）— 以理論方式解決 Warm Up 問題。' }
  }
];

/* ── 2. 狀態管理 ────────────────────────────────────────────── */
let currentIndex  = 0;
let lrScheduleMode = 'decay';       // 目前 LR 排程模式
let adagradAnim   = null;           // Adagrad 動畫 handle
let adagradStep   = 0;
let rmspropAlpha  = 0.9;            // RMSProp 的 α 值

/* ── 3. 工具函式 ────────────────────────────────────────────── */
/** 在 Canvas 上清除並設定背景 */
function clearCanvas(ctx, w, h, bg = '#0a0f1e') {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

/** 畫文字（抗鋸齒對齊） */
function drawText(ctx, text, x, y, opts = {}) {
  ctx.font       = opts.font  || '13px "Segoe UI", sans-serif';
  ctx.fillStyle  = opts.color || '#94a3b8';
  ctx.textAlign  = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  ctx.fillText(text, x, y);
}

/** 畫帶箭頭的線段 */
function drawArrow(ctx, x1, y1, x2, y2, color = '#6366f1', width = 1.5) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len   = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len*Math.cos(angle-Math.PI/6), y2 - len*Math.sin(angle-Math.PI/6));
  ctx.lineTo(x2 - len*Math.cos(angle+Math.PI/6), y2 - len*Math.sin(angle+Math.PI/6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/* ── 4. Canvas 繪圖函式 ─────────────────────────────────────── */

/* ── 4a. Error Surface 視覺化 ── */
let errorSurfacePath = [];      // 使用者點擊產生的路徑

function drawErrorSurface(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx, W, H);

  /* 用 imageData 畫 Loss 熱力圖（二維高斯混合） */
  const imgData = ctx.createImageData(W, H);
  function loss(x, y) {
    /* 幾個山谷、一個鞍點的混合曲面 */
    const x0 = (x/W)*4 - 2, y0 = (y/H)*4 - 2;
    const v1 =  2.0 * Math.exp(-(x0*x0*1.5 + y0*y0*1.5));          // 全域最小（中心偏右）
    const v2 =  1.2 * Math.exp(-((x0+1.2)**2*2 + (y0-1.1)**2*2));   // local minima
    const v3 = -0.8 * Math.exp(-((x0-1.3)**2*3 + (y0+1.2)**2*3));   // 鞍點附近的峰
    const hill = 0.5 * Math.sin(x0*1.5) * Math.cos(y0*1.2);
    return (v1 + v2 + v3 + hill + 2.5) / 5.0;                        // 0~1 歸一化
  }
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const v = Math.max(0, Math.min(1, loss(px, py)));
      const idx = (py*W + px)*4;
      /* 藍(低) → 紫 → 紅(高) 色票 */
      imgData.data[idx+0] = v < 0.5 ? v*2*130 : 130 + (v-0.5)*2*125;
      imgData.data[idx+1] = v < 0.5 ? v*2*30  : Math.max(0, 30 - (v-0.5)*60);
      imgData.data[idx+2] = Math.max(0, 200 - v*200);
      imgData.data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  /* 等高線（簡化版，畫幾個橢圓） */
  ctx.globalAlpha = 0.25;
  [[W*.55,H*.45,60,50],[W*.55,H*.45,100,85],[W*.3,H*.35,40,35],[W*.3,H*.35,70,60]].forEach(([cx,cy,rx,ry])=>{
    ctx.beginPath();
    ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    ctx.strokeStyle='#fff';
    ctx.lineWidth=1;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  /* 標記鞍點與 Local Minima */
  function dot(px,py,color,label){
    ctx.beginPath();
    ctx.arc(px,py,7,0,Math.PI*2);
    ctx.fillStyle=color;
    ctx.fill();
    ctx.strokeStyle='#fff';
    ctx.lineWidth=1.5;
    ctx.stroke();
    drawText(ctx, label, px+14, py-10, { color:'#fff', align:'left', font:'bold 12px sans-serif' });
  }
  dot(W*0.55, H*0.45, '#22c55e', 'Local Min');
  dot(W*0.30, H*0.35, '#22c55e', 'Local Min');
  dot(W*0.70, H*0.60, '#f59e0b', 'Saddle Pt');
  dot(W*0.18, H*0.72, '#ef4444', 'Start here →');

  /* 畫使用者的路徑 */
  if (errorSurfacePath.length > 1) {
    ctx.beginPath();
    ctx.moveTo(errorSurfacePath[0].x, errorSurfacePath[0].y);
    for (let i=1; i<errorSurfacePath.length; i++) {
      ctx.lineTo(errorSurfacePath[i].x, errorSurfacePath[i].y);
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4,3]);
    ctx.stroke();
    ctx.setLineDash([]);
    /* 目前位置 */
    const last = errorSurfacePath[errorSurfacePath.length-1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 5, 0, Math.PI*2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
  }

  /* 提示文字 */
  drawText(ctx, '點擊任意位置模擬梯度下降出發點', W/2, H-16, { color:'rgba(255,255,255,.5)', font:'12px sans-serif' });
}

/* 點擊互動：模擬梯度下降路徑 */
function clickErrorSurface(canvas, ex, ey) {
  const rect = canvas.getBoundingClientRect();
  const x = (ex - rect.left) * (canvas.width  / rect.width);
  const y = (ey - rect.top)  * (canvas.height / rect.height);
  errorSurfacePath = [{ x, y }];
  /* 簡易梯度下降模擬（有限差分） */
  const W = canvas.width, H = canvas.height;
  function loss(px,py){
    const x0=(px/W)*4-2, y0=(py/H)*4-2;
    return 2.0*Math.exp(-(x0*x0*1.5+y0*y0*1.5))
         + 1.2*Math.exp(-((x0+1.2)**2*2+(y0-1.1)**2*2))
         - 0.8*Math.exp(-((x0-1.3)**2*3+(y0+1.2)**2*3))
         + 0.5*Math.sin(x0*1.5)*Math.cos(y0*1.2);
  }
  let cx=x, cy=y;
  const lr=4, steps=60, eps=1;
  for (let i=0; i<steps; i++) {
    const gx = (loss(cx+eps,cy)-loss(cx-eps,cy))/(2*eps);
    const gy = (loss(cx,cy+eps)-loss(cx,cy-eps))/(2*eps);
    cx = Math.max(5, Math.min(W-5, cx + lr*gx));   /* Loss 是 -ve 曲面，所以加 */
    cy = Math.max(5, Math.min(H-5, cy + lr*gy));
    errorSurfacePath.push({ x:cx, y:cy });
  }
  drawErrorSurface(canvas);
}

function resetErrorSurface() {
  errorSurfacePath = [];
  const c = document.getElementById('canvas-errorSurface');
  if (c) drawErrorSurface(c);
}

/* ── 4a-3D. 3D Error Surface（Three.js）─────────────────────── */

/* 統一管理所有 Three.js 物件 */
const _three = {
  scene: null, camera: null, renderer: null,
  controls: null, animId: null, mesh: null,
  ball: null,   /* 金色參數球 */
  arrow: null   /* 紅色梯度箭頭（ArrowHelper） */
};

/**
 * Loss 高度函式 — 設計特點：
 *   Saddle    ≈ (0, 0)   高度 ≈ 4.0（x²-z² 項使此處具真實鞍點特性）
 *   Global Min ≈ (5,-5)  高度 ≈ 0.5（最深的谷底）
 *   Local Min  ≈ (-5, 5) 高度 ≈ 2.1（較淺的谷底）
 *   Hilltop    ≈ (5, 5)  高度 ≈ 5.1（高峰）
 */
function loss3D(x, z) {
  const saddle  =  0.08 * (x*x - z*z);                              /* 鞍點 (0,0) */
  const gMin    = -3.5  * Math.exp(-0.40*((x-5)**2 + (z+5)**2));   /* 全域最小 */
  const lMin    = -2.0  * Math.exp(-0.40*((x+5)**2 + (z-5)**2));   /* 局部最小 */
  const hill    =  1.2  * Math.exp(-0.30*((x-5)**2 + (z-5)**2));   /* 山頂 */
  const wave    =  0.30 * Math.sin(x*0.4) * Math.cos(z*0.35);
  return Math.max(0.05, saddle + gMin + lMin + hill + wave + 4.0);
}

/* 四個預設位置（世界座標） */
const BALL_PRESETS = {
  saddle:    { x:  0, z:  0 },
  localMin:  { x: -5, z:  5 },
  globalMin: { x:  5, z: -5 },
  hill:      { x:  5, z:  5 }
};

/** 建立並啟動 3D Error Surface 場景 */
function init3DErrorSurface(container) {
  cleanup3D();
  const W = container.clientWidth  || 340;
  const H = container.clientHeight || 260;

  /* 場景 */
  _three.scene = new THREE.Scene();
  _three.scene.background = new THREE.Color(0x0a0f1e);
  _three.scene.fog = new THREE.FogExp2(0x0a0f1e, 0.018);

  /* 相機（角度較低，靠近 Error Surface 視角） */
  _three.camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
  _three.camera.position.set(2, 14, 18);
  _three.camera.lookAt(0, 2, 0);

  /* WebGL 渲染器 */
  _three.renderer = new THREE.WebGLRenderer({ antialias: true });
  _three.renderer.setSize(W, H);
  _three.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  _three.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  container.appendChild(_three.renderer.domElement);

  /* OrbitControls */
  _three.controls = new THREE.OrbitControls(_three.camera, _three.renderer.domElement);
  _three.controls.enableDamping = true;
  _three.controls.dampingFactor = 0.07;
  _three.controls.minDistance   = 5;
  _three.controls.maxDistance   = 50;
  _three.controls.maxPolarAngle = Math.PI * 0.46;
  _three.controls.target.set(0, 2, 0);

  /* ── 地形網格 ── */
  const RES = 90, SPAN = 22;
  const geom = new THREE.PlaneGeometry(SPAN, SPAN, RES, RES);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colArr = new Float32Array(pos.count * 3);
  let minH = Infinity, maxH = -Infinity;
  /* 先算高度範圍，用來做顏色正規化 */
  for (let i = 0; i < pos.count; i++) {
    const h = loss3D(pos.getX(i), pos.getZ(i));
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }
  const rangeH = maxH - minH;

  for (let i = 0; i < pos.count; i++) {
    const h = loss3D(pos.getX(i), pos.getZ(i));
    pos.setY(i, h);
    const t = (h - minH) / rangeH;   /* 0=低谷(藍) → 1=山峰(紅) */
    /* 藍(低) → 靛 → 紅(高) */
    colArr[i*3]   = t < 0.5 ? t*2*0.40         : 0.40 + (t-0.5)*2*0.60;  /* R */
    colArr[i*3+1] = t < 0.5 ? t*2*0.12         : Math.max(0, 0.12-(t-0.5)*0.24); /* G */
    colArr[i*3+2] = t < 0.5 ? 0.80-(t*2)*0.50  : Math.max(0.05, 0.30-(t-0.5)*0.60); /* B */
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  geom.computeVertexNormals();

  /* 實體面（Phong 材質，有頂點色） */
  _three.mesh = new THREE.Mesh(
    geom,
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 40 })
  );
  _three.scene.add(_three.mesh);

  /* 線框疊加（明顯一點的白色網格線） */
  _three.scene.add(new THREE.Mesh(
    geom.clone(),
    new THREE.MeshBasicMaterial({ color: 0xaabbcc, wireframe: true, transparent: true, opacity: 0.07 })
  ));

  /* ── 燈光 ── */
  _three.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.85);
  d1.position.set(6, 14, 8);   _three.scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x6699ff, 0.30);
  d2.position.set(-8, 4, -8);  _three.scene.add(d2);

  /* ── 星形標記（★ = global min） ── */
  function addPin(x, z, color, r = 0.28) {
    const y = loss3D(x, z) + 0.4;
    const sg = new THREE.SphereGeometry(r, 18, 18);
    const sm = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const sp = new THREE.Mesh(sg, sm); sp.position.set(x, y, z);
    _three.scene.add(sp);
  }
  addPin( 5, -5, 0x22c55e, 0.32);   /* global min（綠大球） */
  addPin(-5,  5, 0x22c55e, 0.26);   /* local min（綠小球） */
  addPin( 0,  0, 0xf59e0b, 0.24);   /* saddle（黃球） */

  /* ── 金色參數球（可移動） ── */
  _three.ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 24),
    new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.45, shininess: 80 })
  );
  _three.scene.add(_three.ball);
  /* 預設放在鞍點 */
  updateBallPosition(BALL_PRESETS.saddle.x, BALL_PRESETS.saddle.z);

  /* ── Raycaster：點擊地形 → 移動金球 ── */
  const raycaster = new THREE.Raycaster();
  const mouse2    = new THREE.Vector2();
  _three.renderer.domElement.addEventListener('click', (e) => {
    const rect = _three.renderer.domElement.getBoundingClientRect();
    mouse2.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse2.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse2, _three.camera);
    const hits = raycaster.intersectObject(_three.mesh);
    if (hits.length) updateBallPosition(hits[0].point.x, hits[0].point.z);
  });

  /* ── 渲染迴圈 ── */
  (function loop() {
    _three.animId = requestAnimationFrame(loop);
    if (!_three.renderer || !_three.scene || !_three.camera) return;
    if (_three.controls) _three.controls.update();
    _three.renderer.render(_three.scene, _three.camera);
  })();
}

/**
 * 移動金球到 (x, z)，同時更新梯度箭頭方向
 * （箭頭指向 -gradient，即最速下降方向）
 */
function updateBallPosition(x, z) {
  if (!_three.ball || !_three.scene) return;
  const y = loss3D(x, z);
  _three.ball.position.set(x, y + 0.40, z);

  /* 移除舊箭頭 */
  if (_three.arrow) { _three.scene.remove(_three.arrow); _three.arrow = null; }

  /* 有限差分計算梯度 */
  const eps = 0.2;
  const gx  = (loss3D(x+eps, z) - loss3D(x-eps, z)) / (2*eps);
  const gz  = (loss3D(x, z+eps) - loss3D(x, z-eps)) / (2*eps);
  const mag = Math.sqrt(gx*gx + gz*gz);

  /* 梯度很小時（接近 critical point）不顯示箭頭 */
  if (mag < 0.04) return;

  /* 箭頭沿地形法線方向傾斜（視覺效果） */
  const nx = -gx / mag, nz = -gz / mag;   /* 歸一化下坡方向 */
  const dir = new THREE.Vector3(nx, 0, nz).normalize();
  const len = Math.min(3.5, mag * 1.8);
  _three.arrow = new THREE.ArrowHelper(dir, _three.ball.position.clone(), len, 0xef4444, 0.6, 0.35);
  _three.scene.add(_three.arrow);
}

/** 將金球移到預設位置（供按鈕呼叫） */
function place3DBall(preset) {
  const p = BALL_PRESETS[preset];
  if (p) updateBallPosition(p.x, p.z);
}

/** 清理所有 Three.js 資源（切換投影片時呼叫） */
function cleanup3D() {
  if (_three.animId)   { cancelAnimationFrame(_three.animId); }
  if (_three.renderer) { _three.renderer.dispose(); }
  Object.keys(_three).forEach(k => { _three[k] = null; });
}

/** 重設相機視角到預設位置 */
function reset3DView() {
  if (!_three.camera || !_three.controls) return;
  _three.camera.position.set(2, 14, 18);
  _three.controls.target.set(0, 2, 0);
  _three.controls.reset();
}

/* 視窗縮放時同步更新 Three.js 畫布尺寸 */
window.addEventListener('resize', () => {
  if (!_three.renderer || !_three.camera) return;
  const cont = _three.renderer.domElement.parentElement;
  if (!cont) return;
  const W = cont.clientWidth, H = cont.clientHeight || 260;
  _three.camera.aspect = W / H;
  _three.camera.updateProjectionMatrix();
  _three.renderer.setSize(W, H);
});

/* ── 4b. Adagrad 示意動畫 ── */
let adagradCanvas = null;
const PARAM_A = { name:'θ₁（曲面陡峭方向）', color:'#6366f1', grads:[], sigmas:[], pos:0 };
const PARAM_B = { name:'θ₂（曲面平坦方向）', color:'#22d3ee', grads:[], sigmas:[], pos:0 };

function drawAdagrad(canvas) {
  adagradCanvas = canvas;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx, W, H);

  const cols = [W*0.08, W*0.52];  /* 兩參數的 X 起點 */
  const colW  = W*0.42;

  [PARAM_A, PARAM_B].forEach((p, ci) => {
    const x0 = cols[ci];
    /* 標題 */
    drawText(ctx, p.name, x0+colW/2, 22, { color:p.color, font:'bold 12px sans-serif', align:'center' });

    /* 畫格線 */
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1;
    for (let row=0; row<5; row++) {
      const y = 45 + row*48;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0+colW, y); ctx.stroke();
    }

    /* 柱狀圖：gradient 大小 */
    const maxG = ci===0 ? 12 : 3;    /* θ₁ gradient 大，θ₂ gradient 小 */
    p.grads.slice(-8).forEach((g,i) => {
      const bx = x0 + 10 + i*(colW/8 - 2);
      const by = 220;
      const bh = (Math.abs(g)/maxG) * 100;
      ctx.fillStyle = p.color + '88';
      ctx.fillRect(bx, by-bh, colW/8-4, bh);
    });
    drawText(ctx, 'gradient 歷史', x0+colW/2, 240, { color:'rgba(255,255,255,.4)', font:'11px sans-serif', align:'center' });

    /* 顯示當前有效 LR */
    const sigma = p.sigmas[p.sigmas.length-1] || 1;
    const effectiveLR = (1.0 / (sigma+1e-6)).toFixed(3);
    drawText(ctx, `有效 LR ≈ η / σ = ${effectiveLR}`, x0+colW/2, 270, { color:'#fff', font:'bold 13px sans-serif', align:'center' });

    /* 參數更新進度條 */
    const pct = Math.min(1, p.pos / 100);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x0, 295, colW, 14);
    ctx.fillStyle = p.color;
    ctx.fillRect(x0, 295, colW*pct, 14);
    drawText(ctx, `θ 更新距離：${(p.pos).toFixed(1)}`, x0+colW/2, 318, { color:p.color, font:'12px sans-serif', align:'center' });
  });

  drawText(ctx, `Step ${adagradStep}`, W/2, H-14, { color:'rgba(255,255,255,.4)', font:'12px sans-serif', align:'center' });
}

function startAdagrad() {
  if (adagradAnim) clearInterval(adagradAnim);
  PARAM_A.grads=[]; PARAM_A.sigmas=[]; PARAM_A.pos=0;
  PARAM_B.grads=[]; PARAM_B.sigmas=[]; PARAM_B.pos=0;
  adagradStep = 0;
  adagradAnim = setInterval(() => {
    adagradStep++;
    /* θ₁：梯度大（陡峭方向） */
    const gA = 8 + (Math.random()-0.5)*4;
    PARAM_A.grads.push(gA);
    const varA = PARAM_A.grads.reduce((a,v)=>a+v*v,0)/PARAM_A.grads.length;
    const sigA = Math.sqrt(varA);
    PARAM_A.sigmas.push(sigA);
    PARAM_A.pos += gA/(sigA+1e-6);   /* 實際更新量 */

    /* θ₂：梯度小（平坦方向） */
    const gB = 1 + (Math.random()-0.5)*0.5;
    PARAM_B.grads.push(gB);
    const varB = PARAM_B.grads.reduce((a,v)=>a+v*v,0)/PARAM_B.grads.length;
    const sigB = Math.sqrt(varB);
    PARAM_B.sigmas.push(sigB);
    PARAM_B.pos += gB/(sigB+1e-6);

    if (adagradCanvas) drawAdagrad(adagradCanvas);
    if (adagradStep >= 60) clearInterval(adagradAnim);
  }, 120);
}

function resetAdagrad() {
  if (adagradAnim) clearInterval(adagradAnim);
  adagradStep = 0;
  PARAM_A.grads=[]; PARAM_A.sigmas=[]; PARAM_A.pos=0;
  PARAM_B.grads=[]; PARAM_B.sigmas=[]; PARAM_B.pos=0;
  if (adagradCanvas) drawAdagrad(adagradCanvas);
}

/* ── 4c. RMSProp 指數移動平均示意 ── */
let rmspropCanvas = null;
/* 產生模擬的 gradient 序列（包含突然增大的段落） */
const GRAD_SEQ = (() => {
  const seq = [];
  for (let i=0; i<100; i++) {
    let g;
    if (i < 30)       g = 1 + Math.random()*0.5;       /* 平穩小梯度 */
    else if (i < 50)  g = 4 + Math.random()*2;          /* 突然增大 */
    else if (i < 70)  g = 1.5 + Math.random()*0.5;     /* 回穩 */
    else               g = 0.5 + Math.random()*0.3;      /* 更小 */
    seq.push(g);
  }
  return seq;
})();

function drawRMSProp(canvas, alpha) {
  rmspropCanvas = canvas;
  const a = (alpha !== undefined) ? alpha : rmspropAlpha;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx, W, H);

  const padL=50, padR=20, padT=30, padB=50;
  const cW=W-padL-padR, cH=H-padT-padB;
  const N=GRAD_SEQ.length;
  const maxG=6, scaleX=cW/N;

  /* 計算 sigma 序列 */
  const sigmas=[];
  let sigma2=GRAD_SEQ[0]**2;
  for (let i=0; i<N; i++){
    sigma2 = a*sigma2 + (1-a)*(GRAD_SEQ[i]**2);
    sigmas.push(Math.sqrt(sigma2));
  }

  /* 畫座標軸 */
  ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(padL,padT+cH); ctx.lineTo(padL+cW,padT+cH); ctx.stroke();

  /* Y 軸刻度 */
  for (let v=0; v<=maxG; v+=2){
    const y=padT+cH - (v/maxG)*cH;
    ctx.beginPath(); ctx.moveTo(padL-4,y); ctx.lineTo(padL,y); ctx.stroke();
    drawText(ctx, v, padL-8, y, { color:'rgba(255,255,255,.4)', font:'11px sans-serif', align:'right', baseline:'middle' });
  }

  /* 畫 gradient 折線（灰） */
  function plotLine(data, color, label, yOff=padT+cH-20) {
    ctx.beginPath();
    data.forEach((v,i) => {
      const px = padL + i*scaleX;
      const py = padT+cH - (Math.min(v,maxG)/maxG)*cH;
      i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
    });
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
    drawText(ctx, label, W-padR-10, yOff, { color, font:'bold 11px sans-serif', align:'right', baseline:'middle' });
  }

  plotLine(GRAD_SEQ, 'rgba(148,163,184,.5)', '|g|（梯度大小）', padT+cH-8);
  plotLine(sigmas, '#f472b6', `σ（RMSProp，α=${a.toFixed(2)})`, padT+18);

  /* 有效 LR = 1/sigma 折線（青） */
  const effectiveLRs = sigmas.map(s => Math.min(maxG, 1/(s+0.01)));
  plotLine(effectiveLRs, '#22d3ee', '有效 LR（η/σ）', padT+cH-28);

  /* 圖例框 */
  drawText(ctx, `α = ${a.toFixed(2)}  |  α 大 → σ 追蹤歷史；α 小 → σ 追蹤當前`, W/2, H-16,
    { color:'rgba(255,255,255,.4)', font:'11px sans-serif', align:'center' });
}

function updateRMSProp() {
  const slider = document.getElementById('alphaSlider');
  if (slider) {
    rmspropAlpha = parseFloat(slider.value);
    const lbl = slider.parentElement.querySelector('.slider-val');
    if (lbl) lbl.textContent = rmspropAlpha.toFixed(2);
    if (rmspropCanvas) drawRMSProp(rmspropCanvas, rmspropAlpha);
  }
}

/* ── 4d. LR Scheduling 曲線 ── */
let lrCanvas = null;

function drawLRSchedule(canvas, mode) {
  lrCanvas = canvas;
  const m = mode || lrScheduleMode;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  clearCanvas(ctx, W, H);

  const padL=50, padR=20, padT=30, padB=50;
  const cW=W-padL-padR, cH=H-padT-padB;
  const N=200, maxLR=0.12;

  /* 計算 LR 序列 */
  function getLRSeq(type) {
    const seq=[];
    for (let i=0; i<N; i++) {
      const t = i/N;
      let lr;
      switch(type){
        case 'decay':
          lr = 0.1 * Math.pow(0.01, t);         /* 指數 decay */
          break;
        case 'warmup':
          if (t < 0.15) lr = (t/0.15)*0.1;      /* 線性 warm up */
          else          lr = 0.1 * Math.pow(0.02, (t-0.15)/0.85); /* 之後 decay */
          break;
        case 'transformer':
          /* d_model=512, warmup_steps=4000 簡化版 */
          const step = i+1;
          const d = 512, ws = 30;
          lr = (1/Math.sqrt(d)) * Math.min(1/Math.sqrt(step), step*(ws**-1.5)) * 1000;
          lr = Math.min(lr, maxLR);
          break;
        default:
          lr = 0.05;
      }
      seq.push(lr);
    }
    return seq;
  }

  const seq = getLRSeq(m);

  /* 座標軸 */
  ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padL,padT); ctx.lineTo(padL,padT+cH); ctx.lineTo(padL+cW,padT+cH); ctx.stroke();

  /* X 軸刻度 */
  [0,0.25,0.5,0.75,1.0].forEach(t=>{
    const px=padL+t*cW;
    ctx.beginPath(); ctx.moveTo(px,padT+cH); ctx.lineTo(px,padT+cH+4); ctx.stroke();
    drawText(ctx, Math.round(t*N), px, padT+cH+14, { color:'rgba(255,255,255,.4)', font:'11px sans-serif', align:'center' });
  });
  drawText(ctx, 'Iteration', padL+cW/2, H-8, { color:'rgba(255,255,255,.4)', font:'11px sans-serif' });

  /* Y 軸刻度 */
  [0,0.05,0.10].forEach(v=>{
    const py=padT+cH-(v/maxLR)*cH;
    drawText(ctx, v.toFixed(2), padL-6, py, { color:'rgba(255,255,255,.4)', font:'11px sans-serif', align:'right' });
  });
  drawText(ctx, 'Learning Rate', 12, padT+cH/2, { color:'rgba(255,255,255,.4)', font:'11px sans-serif', align:'center' });

  /* 畫 LR 折線 */
  const colors = { decay:'#6366f1', warmup:'#22d3ee', transformer:'#f59e0b' };
  const labels = { decay:'指數 Decay', warmup:'Warm Up + Decay', transformer:'Transformer LR Schedule' };
  ctx.beginPath();
  seq.forEach((v,i)=>{
    const px=padL+i*(cW/N);
    const py=padT+cH-(Math.min(v,maxLR)/maxLR)*cH;
    i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
  });
  ctx.strokeStyle = colors[m] || '#6366f1';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  /* 標題 */
  drawText(ctx, labels[m] || '', W/2, padT+14, { color: colors[m]||'#6366f1', font:'bold 13px sans-serif', align:'center' });
}

function setLRDecay()        { lrScheduleMode='decay';       if(lrCanvas) drawLRSchedule(lrCanvas,'decay'); }
function setLRWarmup()       { lrScheduleMode='warmup';      if(lrCanvas) drawLRSchedule(lrCanvas,'warmup'); }
function setLRTransformer()  { lrScheduleMode='transformer'; if(lrCanvas) drawLRSchedule(lrCanvas,'transformer'); }

/* ── 5. 渲染引擎 ────────────────────────────────────────────── */

/** 根據 slide 物件生成 HTML 字串 */
function renderSlide(slide) {
  switch (slide.type) {
    case 'hero':    return renderHero(slide);
    case 'section': return renderSection(slide);
    case 'content': return renderContent(slide);
    case 'interactive': return renderInteractive(slide);
    case 'quiz':    return renderQuiz(slide);
    default: return `<p>Unknown slide type: ${slide.type}</p>`;
  }
}

/* ── 封面頁 ── */
function renderHero(s) {
  return `
    <div class="slide-hero">
      <div class="hero-number">01</div>
      <div class="slide-section-tag">深度學習 · Optimizer</div>
      <h1 class="slide-title"><span class="highlight">${s.title}</span></h1>
      <p class="hero-subtitle">${s.subtitle.replace(/\n/g,'<br>')}</p>
      <p style="font-size:.8rem;color:var(--clr-muted);margin-top:8px">${s.note}</p>
    </div>`;
}

/* ── 章節頁 ── */
function renderSection(s) {
  return `
    <div class="section-hero">
      <div class="slide-section-tag">${s.tag}</div>
      <div class="section-number-big">${s.sectionNum}</div>
      <h1 class="slide-title">${s.title}</h1>
    </div>`;
}

/* ── 一般內容頁 ── */
function renderContent(s) {
  let html = '';
  if (s.tag)   html += `<div class="slide-section-tag">${s.tag}</div>`;
  if (s.title) html += `<h2 class="slide-title">${s.title}</h2>`;
  if (s.body)  html += `<div class="slide-body">${s.body}</div>`;
  if (s.formula)  html += `<div class="formula-box">${escHtml(s.formula)}</div>`;
  if (s.body2)    html += `<div class="slide-body">${s.body2}</div>`;
  if (s.formula2) html += `<div class="formula-box">${escHtml(s.formula2)}</div>`;
  if (s.steps) {
    html += '<div class="step-list">';
    s.steps.forEach((st,i) => {
      html += `<div class="step-item"><span class="step-num">${i+1}</span><span class="step-text">${st}</span></div>`;
    });
    html += '</div>';
  }
  if (s.compare) {
    html += '<div class="compare-grid">';
    s.compare.forEach(c => {
      html += `<div class="compare-card"><div class="cc-title">${c.title}</div><p>${c.desc}</p></div>`;
    });
    html += '</div>';
  }
  if (s.callout) {
    const cls = s.callout.type==='warn'?'warn': s.callout.type==='ok'?'ok':'';
    html += `<div class="callout ${cls}">${s.callout.text}</div>`;
  }
  return html;
}

/* ── 互動 Canvas 頁 ── */
function renderInteractive(s) {

  /* ── 特殊：Error Surface 3D 左右分割布局 ── */
  if (s.layout === 'split3d') {
    return `
      <div class="err3d-layout">

        <!-- 左欄：文字說明 -->
        <div class="err3d-left">
          <h2 class="slide-title">Error Surface <span class="highlight">怎麼看？</span></h2>

          <div class="err3d-step-card">
            <span class="err3d-step-title">Step 1：每組參數算一個 Loss</span>
            <p>想像 model 有兩個參數 w₁ 和 w₂。每一組 (w₁, w₂) 的組合，都算出一個 Loss 值（預測有多差）。</p>
          </div>

          <div class="err3d-step-card">
            <span class="err3d-step-title">Step 2：畫成 3D 地形圖</span>
            <p>w₁ 當 X 軸、w₂ 當 Y 軸、Loss 當高度（Z 軸），就畫出一個 3D 地形圖 — 這就是 <strong class="highlight-orange">Error Surface</strong>。</p>
          </div>

          <div class="err3d-step-card">
            <span class="err3d-step-title">Step 3：看圖上的元素</span>
            <div class="err3d-legend-list">
              <div class="err3d-legend-item blue-dot">藍色 = loss 低的地方（山谷）</div>
              <div class="err3d-legend-item red-dot">紅色 = loss 高的地方（山頂）</div>
              <div class="err3d-legend-item gold-dot">金色球 = 目前參數 (w₁, w₂) 的位置</div>
              <div class="err3d-legend-item arr-dot">紅色箭頭 = gradient 方向（下降最快）</div>
            </div>
          </div>

          <div class="callout warn">
            球順著箭頭往下滾 = <strong>gradient descent</strong><br><br>
            這堂課的問題：球滾到一半<strong class="highlight-orange">停下來了</strong>（gradient ≈ 0），
            到底是卡在真正的谷底（local minima），還是卡在馬鞍上（saddle point）？
          </div>
        </div>

        <!-- 右欄：3D Canvas + 按鈕 -->
        <div class="err3d-right">
          <div class="err3d-canvas-wrap">
            <div id="canvas3d-${s.canvasId}" class="canvas3d-container"></div>
            <div class="err3d-overlay-loss">Loss ↑</div>
            <div class="err3d-overlay-legend">
              <span><span class="err3d-sq" style="background:#1e3a8a"></span>低 loss</span>
              <span><span class="err3d-sq" style="background:#dc2626"></span>高 loss</span>
            </div>
          </div>
          <div class="err3d-preset-btns">
            <button class="btn-saddle"    onclick="place3DBall('saddle')">放在 saddle</button>
            <button class="btn-localmin"  onclick="place3DBall('localMin')">放在 local min</button>
            <button class="btn-globalmin" onclick="place3DBall('globalMin')">放在 global min</button>
            <button class="btn-hill"      onclick="place3DBall('hill')">放在山頂</button>
          </div>
          <p class="canvas-hint">或點擊曲面任意位置放球 · 拖曳旋轉</p>
        </div>

      </div>`;
  }

  /* ── 一般互動頁 ── */
  let html = '';
  if (s.tag)   html += `<div class="slide-section-tag">${s.tag}</div>`;
  if (s.title) html += `<h2 class="slide-title">${s.title}</h2>`;
  html += `<div class="inline-canvas-wrap">`;
  if (s.is3D) {
    html += `<div id="canvas3d-${s.canvasId}" style="width:100%;height:300px;border-radius:10px;overflow:hidden;background:#0a0f1e;cursor:crosshair;"></div>`;
    html += `<p class="canvas-hint">🖱️ 拖曳旋轉視角 &nbsp;·&nbsp; 滾輪縮放 &nbsp;·&nbsp; 點擊地形觀察梯度下降路徑</p>`;
  } else {
    html += `<canvas id="canvas-${s.canvasId}" width="860" height="340"></canvas>`;
    if (s.hint) html += `<p class="canvas-hint">💡 ${s.hint}</p>`;
  }
  /* 控制項 */
  if (s.controls && s.controls.length) {
    html += `<div class="ctrl-row">`;
    s.controls.forEach(ctrl => {
      if (ctrl.type === 'button') {
        html += `<button class="btn ${ctrl.cls}" onclick="${ctrl.fn}()">${ctrl.label}</button>`;
      } else if (ctrl.type === 'slider') {
        html += `<div class="slider-wrap">
          <label>${ctrl.label} <span class="slider-val">${ctrl.value}</span></label>
          <input type="range" id="${ctrl.id}" min="${ctrl.min}" max="${ctrl.max}"
            step="${ctrl.step}" value="${ctrl.value}" oninput="${ctrl.fn}()">
        </div>`;
      }
    });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

/* ── 隨堂小考頁 ── */
function renderQuiz(s) {
  const labels = ['A','B','C','D'];
  let optsHtml = s.options.map((opt, i) => `
    <button class="quiz-option" data-idx="${i}" onclick="handleQuizAnswer(this, ${s.answer}, '${escAttr(s.explanation)}')" >
      <span class="opt-label">${labels[i]}</span>
      <span>${opt}</span>
    </button>`).join('');

  return `
    <div class="quiz-title-tag">📝 隨堂小考</div>
    <div class="quiz-wrap">
      <p class="quiz-question">${s.question}</p>
      <div class="quiz-options">${optsHtml}</div>
      <div class="quiz-feedback" id="quiz-feedback-${s.id}"></div>
    </div>`;
}

/* ── HTML 逸出工具 ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(str) {
  return String(str).replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

/* ── 6. 隨堂小考作答處理 ────────────────────────────────────── */
function handleQuizAnswer(btn, correctIdx, explanation) {
  /* 找到此題的所有選項按鈕 */
  const optWrap = btn.closest('.quiz-options');
  const allOpts = optWrap.querySelectorAll('.quiz-option');

  /* 防止重複作答 */
  if (optWrap.dataset.answered) return;
  optWrap.dataset.answered = '1';

  const chosen = parseInt(btn.dataset.idx, 10);
  allOpts.forEach(b => {
    b.disabled = true;
    const idx = parseInt(b.dataset.idx, 10);
    if (idx === correctIdx) b.classList.add('correct');
    else if (idx === chosen && chosen !== correctIdx) b.classList.add('wrong');
  });

  /* 找到回饋區域（同層 .quiz-feedback） */
  const feedbackEl = optWrap.closest('.quiz-wrap').querySelector('.quiz-feedback');
  if (feedbackEl) {
    if (chosen === correctIdx) {
      feedbackEl.className = 'quiz-feedback show correct-fb';
      feedbackEl.innerHTML = `✅ 正確！${explanation}`;
    } else {
      feedbackEl.className = 'quiz-feedback show wrong-fb';
      feedbackEl.innerHTML = `❌ 不對喔，正確答案是 <strong>${['A','B','C','D'][correctIdx]}</strong>。${explanation}`;
    }
  }
}

/* ── 7. 導覽邏輯 ────────────────────────────────────────────── */
const viewport  = document.getElementById('slideViewport');
const prevBtn   = document.getElementById('prevBtn');
const nextBtn   = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const slideCounter= document.getElementById('slideCounter');
const dotNav    = document.getElementById('dotNav');

let activeCard = null;   /* 目前顯示的 DOM 卡片 */

/** 建立所有導覽點 */
function buildDotNav() {
  dotNav.innerHTML = '';
  SLIDES.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot-nav-btn' + (s.type==='section'?' section-start':'');
    btn.title     = s.title || `第 ${i+1} 頁`;
    btn.setAttribute('aria-label', `跳到第 ${i+1} 頁`);
    btn.addEventListener('click', () => goTo(i));
    dotNav.appendChild(btn);
  });
}

/** 更新 UI 狀態（進度條、計數、按鈕、導覽點） */
function updateUI() {
  const total = SLIDES.length;
  progressBar.style.width = `${((currentIndex+1)/total*100).toFixed(1)}%`;
  slideCounter.textContent = `${currentIndex+1} / ${total}`;
  prevBtn.disabled = (currentIndex === 0);
  nextBtn.disabled = (currentIndex === total-1);
  /* 導覽點高亮 */
  dotNav.querySelectorAll('.dot-nav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === currentIndex);
  });
}

/** 渲染並切換到指定投影片 */
function goTo(targetIdx, direction = 'next') {
  if (targetIdx < 0 || targetIdx >= SLIDES.length) return;
  /* 離開 3D 頁面時清理 WebGL 資源，避免記憶體洩漏 */
  if (SLIDES[currentIndex] && SLIDES[currentIndex].is3D) cleanup3D();

  const slide = SLIDES[targetIdx];

  /* 建立新卡片 */
  const card = document.createElement('div');
  card.className = 'slide-card';
  card.innerHTML = renderSlide(slide);
  viewport.appendChild(card);

  /* 移出舊卡片 */
  if (activeCard) {
    const outCard = activeCard;
    outCard.classList.add('exit-left');
    setTimeout(() => outCard.remove(), 420);
  }

  /* 進場動畫（下一幀觸發） */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => card.classList.add('active'));
  });

  activeCard = card;
  currentIndex = targetIdx;
  updateUI();

  /* 初始化 Canvas（若該頁有） */
  if (slide.type === 'interactive') {
    setTimeout(() => initInteractive(slide), 50);
  }
}

/** 初始化互動 Canvas（或 3D 容器） */
function initInteractive(slide) {
  /* 3D 投影片：交由 Three.js 處理，不走 2D Canvas 流程 */
  if (slide.is3D) {
    const container = document.getElementById(`canvas3d-${slide.canvasId}`);
    if (container && typeof THREE !== 'undefined') init3DErrorSurface(container);
    return;
  }
  const canvas = document.getElementById(`canvas-${slide.canvasId}`);
  if (!canvas) return;
  /* 呼叫對應的繪圖函式 */
  if (slide.drawFn && window[slide.drawFn]) {
    window[slide.drawFn](canvas);
  }
  /* 綁定點擊互動 */
  if (slide.interactFn && window[slide.interactFn]) {
    canvas.addEventListener('click', e => window[slide.interactFn](canvas, e.clientX, e.clientY));
  }
  /* 初始化 RMSProp 的滑桿 */
  if (slide.canvasId === 'rmspropDemo') {
    const slider = document.getElementById('alphaSlider');
    if (slider) {
      slider.addEventListener('input', updateRMSProp);
      /* 第一次繪製 */
      drawRMSProp(canvas, rmspropAlpha);
    }
  }
}

/* 箭頭按鈕事件 */
prevBtn.addEventListener('click', () => { if (currentIndex > 0) goTo(currentIndex-1,'prev'); });
nextBtn.addEventListener('click', () => { if (currentIndex < SLIDES.length-1) goTo(currentIndex+1,'next'); });

/* 鍵盤導覽 */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'PageDown') nextBtn.click();
  if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   prevBtn.click();
});

/* 觸控滑動（手機） */
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive:true });
document.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) dx < 0 ? nextBtn.click() : prevBtn.click();
}, { passive:true });

/* ── 8. 初始化 ──────────────────────────────────────────────── */
buildDotNav();
goTo(0);   /* 顯示第一張投影片 */
