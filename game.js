const LEGACY_STORAGE_KEY = "data-empire-idle-save-v1";
const SLOT_PREFIX = "data-empire-idle-save-slot-";
const SLOT_COUNT = 3;
const VERSION = 4;

const BUILDINGS = [
  {
    id: "sensor",
    name: "数据探针",
    desc: "持续采集原始数据，并提供基础数据授权收入",
    baseCost: 50,
    costMult: 1.16,
    baseOut: 1.2,
    outLabel: "数据/秒",
  },
  {
    id: "gpu",
    name: "算力机架",
    desc: "提供训练与推理算力，并可进行算力租赁变现",
    baseCost: 135,
    costMult: 1.17,
    baseOut: 0.9,
    outLabel: "算力/秒",
  },
  {
    id: "studio",
    name: "产品工坊",
    desc: "把数据与算力加工为产品收益",
    baseCost: 320,
    costMult: 1.18,
    baseOut: 2.3,
    outLabel: "转化容量/秒",
  },
  {
    id: "media",
    name: "媒体中心",
    desc: "放大品牌与用户价值",
    baseCost: 900,
    costMult: 1.19,
    baseOut: 0.25,
    outLabel: "影响力基准/秒",
  },
];

const ECONOMY = {
  sensorLicenseRate: 0.11,
  gpuLeaseRate: 0.14,
};

const UPGRADE_DEFS = [
  {
    id: "pipeline",
    name: "压缩采集链路",
    desc: "数据探针产出 +50%",
    costFunds: 2600,
    costInfluence: 0,
  },
  {
    id: "autoscale",
    name: "弹性算力调度",
    desc: "算力机架产出 +90%",
    costFunds: 5800,
    costInfluence: 20,
  },
  {
    id: "smartops",
    name: "自动化产品运营",
    desc: "产品工坊转化效率 +45%",
    costFunds: 9800,
    costInfluence: 40,
  },
  {
    id: "growthloop",
    name: "病毒传播回路",
    desc: "用户增长 +60%",
    costFunds: 16000,
    costInfluence: 80,
  },
  {
    id: "branding",
    name: "品牌护城河",
    desc: "影响力产出 +80%，整体收益 +15%",
    costFunds: 26000,
    costInfluence: 130,
  },
];

const EVENT_POOL = [
  {
    name: "广告旺季",
    desc: "商业投放需求暴涨，营收显著提升。",
    type: "good",
    duration: [26, 42],
    mods: { revenueMult: 1.35 },
  },
  {
    name: "云服务折扣",
    desc: "算力采购成本下降，算力效率提升。",
    type: "good",
    duration: [24, 36],
    mods: { computeMult: 1.5 },
  },
  {
    name: "合规风控检查",
    desc: "产品上线流程变慢，转化效率降低。",
    type: "bad",
    duration: [20, 34],
    mods: { prodCapMult: 0.74 },
  },
  {
    name: "隐私争议",
    desc: "用户扩张受挫，增长速度下滑。",
    type: "bad",
    duration: [22, 30],
    mods: { userGrowthMult: 0.64 },
  },
  {
    name: "热点话题引爆",
    desc: "品牌强曝光，影响力和用户共同上扬。",
    type: "good",
    duration: [16, 26],
    mods: { influenceMult: 1.5, userGrowthMult: 1.2 },
  },
];

let state = null;
let currentSlot = null;
let chartCtx = null;
let els = {};
let tickHandle = null;
let autosaveHandle = null;

function defaultState() {
  return {
    version: VERSION,
    funds: 240,
    data: 0,
    compute: 0,
    users: 0,
    influence: 0,
    legacyPoints: 0,
    allTimeFunds: 240,
    buildings: {
      sensor: 0,
      gpu: 0,
      studio: 0,
      media: 0,
    },
    upgrades: {},
    event: null,
    eventCooldown: randomInt(18, 30),
    history: [240],
    logs: [
      { t: Date.now(), text: "系统启动完成，欢迎来到数据帝国。", type: "good" },
    ],
    questTier: 0,
    quest: null,
    avgFundsPerSec: 0,
    lastTickAt: Date.now(),
  };
}

function mergeSave(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const merged = {
    ...base,
    ...raw,
    buildings: { ...base.buildings, ...(raw.buildings || {}) },
    upgrades: { ...(raw.upgrades || {}) },
    logs: Array.isArray(raw.logs) ? raw.logs.slice(0, 80) : base.logs,
    history: Array.isArray(raw.history) && raw.history.length > 0 ? raw.history.slice(-140) : base.history,
  };

  if (!merged.quest) {
    merged.quest = generateQuest(merged.questTier || 0);
  }

  return merged;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function formatNum(v) {
  if (!isFinite(v)) return "0";
  const abs = Math.abs(v);
  if (abs < 1000) return v.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
  const units = ["K", "M", "B", "T", "Qa", "Qi"];
  let value = abs;
  let u = -1;
  while (value >= 1000 && u < units.length - 1) {
    value /= 1000;
    u += 1;
  }
  const signed = v < 0 ? -value : value;
  return `${signed.toFixed(value >= 100 ? 1 : value >= 10 ? 2 : 3)}${units[u]}`;
}

function formatDateTime(ts) {
  if (!ts) return "--";
  try {
    return new Date(ts).toLocaleString("zh-CN");
  } catch (err) {
    return "--";
  }
}

function getSlotStorageKey(slot) {
  return `${SLOT_PREFIX}${slot}`;
}

function normalizeSlot(slot) {
  const n = Number.parseInt(slot, 10);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > SLOT_COUNT) return null;
  return n;
}

function getRawSlotSave(slot) {
  const key = getSlotStorageKey(slot);
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function getSlotSummary(slot) {
  const parsed = getRawSlotSave(slot);
  if (!parsed) {
    return {
      hasSave: false,
      funds: 0,
      legacyPoints: 0,
      allTimeFunds: 0,
      lastPlayed: 0,
    };
  }

  const merged = mergeSave(parsed);
  return {
    hasSave: true,
    funds: merged.funds || 0,
    legacyPoints: merged.legacyPoints || 0,
    allTimeFunds: merged.allTimeFunds || 0,
    lastPlayed: merged.lastTickAt || 0,
  };
}

function migrateLegacySaveIfNeeded() {
  const hasSlotOne = !!localStorage.getItem(getSlotStorageKey(1));
  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!hasSlotOne && legacyRaw) {
    localStorage.setItem(getSlotStorageKey(1), legacyRaw);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

function addLog(text, type = "neutral") {
  if (!state) return;
  state.logs.unshift({ t: Date.now(), text, type });
  state.logs = state.logs.slice(0, 80);
}

function addFunds(amount) {
  if (!state || !isFinite(amount) || amount <= 0) return;
  state.funds += amount;
  state.allTimeFunds += amount;
}

function getLegacyMultiplier() {
  return 1 + state.legacyPoints * 0.05;
}

function getUpgradeMods() {
  return {
    dataMult: state.upgrades.pipeline ? 1.5 : 1,
    computeMult: state.upgrades.autoscale ? 1.9 : 1,
    prodCapMult: state.upgrades.smartops ? 1.45 : 1,
    userGrowthMult: state.upgrades.growthloop ? 1.6 : 1,
    influenceMult: state.upgrades.branding ? 1.8 : 1,
    revenueMult: state.upgrades.branding ? 1.15 : 1,
  };
}

function getEventMods() {
  return state.event?.mods || {};
}

function getCombinedMods() {
  const legacy = getLegacyMultiplier();
  const upgrade = getUpgradeMods();
  const eventMods = getEventMods();
  const influenceBoost = 1 + Math.log10(1 + Math.max(0, state.influence)) / 12;

  const mods = {
    dataMult: legacy * influenceBoost * upgrade.dataMult,
    computeMult: legacy * influenceBoost * upgrade.computeMult,
    prodCapMult: legacy * influenceBoost * upgrade.prodCapMult,
    userGrowthMult: legacy * influenceBoost * upgrade.userGrowthMult,
    influenceMult: legacy * influenceBoost * upgrade.influenceMult,
    revenueMult: legacy * influenceBoost * upgrade.revenueMult,
  };

  for (const [k, v] of Object.entries(eventMods)) {
    mods[k] = (mods[k] || 1) * v;
  }

  return mods;
}

function getBuildingDef(id) {
  return BUILDINGS.find((b) => b.id === id);
}

function getSensorLicenseFundsPerSecond(sensorCount, mods) {
  if (sensorCount <= 0) return 0;
  const sensor = getBuildingDef("sensor");
  const dataPerSec = sensorCount * sensor.baseOut * mods.dataMult;
  return dataPerSec * ECONOMY.sensorLicenseRate * mods.revenueMult;
}

function getGpuLeaseFundsPerSecond(gpuCount, mods) {
  if (gpuCount <= 0) return 0;
  const gpu = getBuildingDef("gpu");
  const computePerSec = gpuCount * gpu.baseOut * mods.computeMult;
  return computePerSec * ECONOMY.gpuLeaseRate * mods.revenueMult;
}

function getMediaFundsPerSecond(mediaCount, users, mods) {
  if (mediaCount <= 0) return 0;
  return mediaCount * (0.14 + users * 0.0012) * mods.revenueMult;
}

function getNextBuildingCost(def, owned) {
  return def.baseCost * Math.pow(def.costMult, owned);
}

function getBatchCost(def, owned, qty) {
  if (qty <= 0) return 0;
  const r = def.costMult;
  const start = def.baseCost * Math.pow(r, owned);
  if (Math.abs(r - 1) < 1e-6) return start * qty;
  return start * (Math.pow(r, qty) - 1) / (r - 1);
}

function getMaxAffordableCount(def, owned, funds) {
  if (funds <= 0) return { count: 0, cost: 0 };
  let count = 0;
  let totalCost = 0;

  for (let i = 0; i < 4000; i++) {
    const next = getNextBuildingCost(def, owned + i);
    if (totalCost + next > funds) break;
    totalCost += next;
    count += 1;
  }

  return { count, cost: totalCost };
}

function buyBuilding(id) {
  if (!state) return;

  const def = getBuildingDef(id);
  if (!def) return;

  const owned = state.buildings[id] || 0;
  const mode = els.buyMode.value;

  let buyCount = 1;
  let cost = getNextBuildingCost(def, owned);

  if (mode === "10") {
    buyCount = 10;
    cost = getBatchCost(def, owned, buyCount);
  } else if (mode === "max") {
    const afford = getMaxAffordableCount(def, owned, state.funds);
    buyCount = afford.count;
    cost = afford.cost;
  }

  if (buyCount <= 0 || cost <= 0 || state.funds < cost) return;

  state.funds -= cost;
  state.buildings[id] = owned + buyCount;
  addLog(`购入 ${def.name} x${buyCount}`, "good");
  renderAll();
}

function buyUpgrade(id) {
  if (!state) return;

  const up = UPGRADE_DEFS.find((u) => u.id === id);
  if (!up || state.upgrades[id]) return;
  if (state.funds < up.costFunds || state.influence < up.costInfluence) return;

  state.funds -= up.costFunds;
  state.influence -= up.costInfluence;
  state.upgrades[id] = true;
  addLog(`策略升级完成：${up.name}`, "good");
  renderAll();
}

function randomEventFromPool() {
  return EVENT_POOL[randomInt(0, EVENT_POOL.length - 1)];
}

function maybeUpdateEvent() {
  if (state.event && state.event.remaining > 0) {
    state.event.remaining -= 1;
    if (state.event.remaining <= 0) {
      addLog(`市场事件结束：${state.event.name}`, state.event.type === "bad" ? "bad" : "good");
      state.event = null;
      state.eventCooldown = randomInt(18, 30);
    }
    return;
  }

  state.eventCooldown -= 1;
  if (state.eventCooldown > 0) return;

  const chance = Math.random();
  state.eventCooldown = randomInt(14, 26);
  if (chance > 0.48) return;

  const picked = randomEventFromPool();
  state.event = {
    ...picked,
    remaining: randomInt(picked.duration[0], picked.duration[1]),
  };
  addLog(`市场事件：${picked.name} - ${picked.desc}`, picked.type === "bad" ? "bad" : "good");
}

function generateQuest(tier) {
  const pool = ["funds", "users", "influence"];
  const kind = pool[randomInt(0, pool.length - 1)];

  if (kind === "funds") {
    const target = Math.floor(12000 * Math.pow(1.78, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(target * 0.45),
      rewardInfluence: Math.floor(20 * Math.pow(1.4, tier)),
      done: false,
      claimed: false,
      title: "现金流冲刺",
      desc: "资金总量达到目标值。",
    };
  }

  if (kind === "users") {
    const target = Math.floor(900 * Math.pow(1.72, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(9000 * Math.pow(1.6, tier)),
      rewardInfluence: Math.floor(26 * Math.pow(1.45, tier)),
      done: false,
      claimed: false,
      title: "用户增长计划",
      desc: "累计用户规模达到目标值。",
    };
  }

  const target = Math.floor(160 * Math.pow(1.76, tier));
  return {
    tier,
    kind,
    target,
    rewardFunds: Math.floor(10000 * Math.pow(1.64, tier)),
    rewardInfluence: Math.floor(18 * Math.pow(1.4, tier)),
    done: false,
    claimed: false,
    title: "品牌影响力扩散",
    desc: "影响力指数达到目标值。",
  };
}

function getQuestProgress(quest) {
  if (!quest) return 0;
  if (quest.kind === "funds") return state.funds;
  if (quest.kind === "users") return state.users;
  return state.influence;
}

function checkQuest() {
  if (!state.quest) {
    state.quest = generateQuest(state.questTier || 0);
    return;
  }

  if (state.quest.claimed) return;

  const progress = getQuestProgress(state.quest);
  if (!state.quest.done && progress >= state.quest.target) {
    state.quest.done = true;
    addLog(`阶段任务完成：${state.quest.title}`, "good");
  }
}

function claimQuest() {
  if (!state || !state.quest || !state.quest.done || state.quest.claimed) return;

  addFunds(state.quest.rewardFunds);
  state.influence += state.quest.rewardInfluence;
  state.quest.claimed = true;
  addLog(`领取任务奖励：+${formatNum(state.quest.rewardFunds)} 资金，+${formatNum(state.quest.rewardInfluence)} 影响力`, "good");
  state.questTier += 1;
  state.quest = generateQuest(state.questTier);
  renderAll();
}

function updateEconomyOneSecond() {
  if (!state) return;

  maybeUpdateEvent();

  const mods = getCombinedMods();
  const b = state.buildings;

  const dataGain = b.sensor * getBuildingDef("sensor").baseOut * mods.dataMult;
  const computeGain = b.gpu * getBuildingDef("gpu").baseOut * mods.computeMult;

  state.data += dataGain;
  state.compute += computeGain;

  let fundsThisTick = 0;

  // Anti-softlock baseline monetization: early generators always yield a small cashflow.
  const sensorLicenseFunds = getSensorLicenseFundsPerSecond(b.sensor, mods);
  const gpuLeaseFunds = getGpuLeaseFundsPerSecond(b.gpu, mods);
  const baselineFunds = sensorLicenseFunds + gpuLeaseFunds;
  if (baselineFunds > 0) {
    addFunds(baselineFunds);
    fundsThisTick += baselineFunds;
  }

  const capacity = b.studio * getBuildingDef("studio").baseOut * mods.prodCapMult;
  if (capacity > 0 && state.data > 0 && state.compute > 0) {
    const byData = state.data;
    const byCompute = state.compute / 0.85;
    const throughput = Math.max(0, Math.min(capacity, byData, byCompute));

    if (throughput > 0) {
      state.data -= throughput;
      state.compute -= throughput * 0.85;

      const usersGain = throughput * 0.44 * mods.userGrowthMult;
      const productFunds = throughput * 1.12 * mods.revenueMult;
      state.users += usersGain;
      addFunds(productFunds);
      fundsThisTick += productFunds;
    }
  }

  if (b.media > 0) {
    const mediaFunds = getMediaFundsPerSecond(b.media, state.users, mods);
    const mediaInfluence = b.media * (0.25 + state.users * 0.000045) * mods.influenceMult;

    addFunds(mediaFunds);
    state.influence += mediaInfluence;
    fundsThisTick += mediaFunds;
  }

  const userDecayRate = clamp(0.0008 / mods.userGrowthMult, 0.00015, 0.0012);
  const userLoss = state.users * userDecayRate;
  state.users = Math.max(0, state.users - userLoss);

  state.avgFundsPerSec = state.avgFundsPerSec * 0.86 + fundsThisTick * 0.14;
  state.history.push(state.funds);
  state.history = state.history.slice(-120);

  state.data = Math.max(0, state.data);
  state.compute = Math.max(0, state.compute);
  state.influence = Math.max(0, state.influence);

  checkQuest();
}

function simulateOffline(seconds) {
  if (!state) return;

  const clamped = Math.floor(clamp(seconds, 0, 8 * 60 * 60));
  if (clamped <= 0) return;

  for (let i = 0; i < clamped; i++) {
    updateEconomyOneSecond();
  }

  addLog(`离线补算完成：${clamped} 秒`, "good");
}

function calcPotentialLegacyGain() {
  if (!state) return 0;
  const total = Math.max(0, state.allTimeFunds);
  const absolute = Math.floor(Math.sqrt(total / 250000));
  return Math.max(0, absolute - state.legacyPoints);
}

function rebootEra() {
  if (!state) return;

  const gain = calcPotentialLegacyGain();
  if (gain <= 0) {
    alert("当前总收益还不足以获得新的遗产点。继续扩张后再重构。");
    return;
  }

  const ok = confirm(`本次重构可获得 ${gain} 遗产点，是否继续？\n将重置资金、建筑、升级与即时资源。`);
  if (!ok) return;

  const oldLegacy = state.legacyPoints;
  const oldAllTime = state.allTimeFunds;
  const oldTier = state.questTier;

  state = defaultState();
  state.legacyPoints = oldLegacy + gain;
  state.allTimeFunds = oldAllTime;
  state.questTier = Math.max(0, Math.floor(oldTier * 0.6));
  state.quest = generateQuest(state.questTier);
  addLog(`时代重构完成，新增遗产点 ${gain}。`, "good");

  saveState(true);
  renderAll();
}

function saveState(silent = true) {
  if (!state || !currentSlot) return;

  if (!silent) addLog("已手动存档", "neutral");
  state.lastTickAt = Date.now();
  localStorage.setItem(getSlotStorageKey(currentSlot), JSON.stringify(state));
}

function exportSave() {
  if (!state || !currentSlot) {
    alert("请先选择存档栏位。");
    return;
  }

  try {
    const copy = { ...state, lastTickAt: Date.now(), exportedFromSlot: currentSlot };
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(copy))));
    prompt("复制以下存档字符串：", payload);
  } catch (err) {
    alert("导出失败，请重试。");
  }
}

function importSave() {
  if (!currentSlot) {
    alert("请先选择存档栏位。");
    return;
  }

  const raw = prompt("粘贴导出的存档字符串：");
  if (!raw) return;

  try {
    const text = decodeURIComponent(escape(atob(raw.trim())));
    const parsed = JSON.parse(text);
    state = mergeSave(parsed);
    addLog(`导入存档成功（栏位 ${currentSlot}）`, "good");
    saveState(true);
    renderAll();
    renderSlotPanel();
  } catch (err) {
    alert("导入失败，存档字符串无效。");
  }
}

function loadStateFromSlot(slot, forceNew = false) {
  const safeSlot = normalizeSlot(slot);
  if (!safeSlot) return;

  if (forceNew) {
    state = defaultState();
    state.quest = generateQuest(0);
    addLog(`已在栏位 ${safeSlot} 创建新存档。`, "good");
    return;
  }

  try {
    const raw = localStorage.getItem(getSlotStorageKey(safeSlot));
    if (!raw) {
      state = defaultState();
      state.quest = generateQuest(0);
      addLog(`栏位 ${safeSlot} 为空，已创建新存档。`, "good");
      return;
    }

    const parsed = JSON.parse(raw);
    state = mergeSave(parsed);

    const deltaSec = Math.floor((Date.now() - (state.lastTickAt || Date.now())) / 1000);
    if (deltaSec > 2) simulateOffline(deltaSec);
  } catch (err) {
    state = defaultState();
    state.quest = generateQuest(0);
    addLog("存档读取失败，已创建新档。", "bad");
  }
}

function setCoreButtonsEnabled(enabled) {
  const buttons = [els.saveBtn, els.exportBtn, els.importBtn, els.rebootBtn];
  for (const btn of buttons) {
    if (!btn) continue;
    btn.disabled = !enabled;
  }
}

function renderNoSlotState() {
  if (!els.funds) return;

  els.funds.textContent = "0";
  els.data.textContent = "0";
  els.compute.textContent = "0";
  els.users.textContent = "0";
  els.influence.textContent = "0";
  els.legacy.textContent = "0";

  els.eventBanner.textContent = "请先选择一个存档栏位";
  els.pps.textContent = "每秒产出：0 资金";

  els.rebootBtn.textContent = "重构时代";
  els.buildingList.innerHTML = '<div class="item-meta">选择存档后可开始游戏。</div>';
  els.upgradeList.innerHTML = '<div class="item-meta">选择存档后可开始游戏。</div>';
  els.questBox.innerHTML = "请选择存档栏位";
  els.logBox.innerHTML = '<div class="log-entry">等待选择存档...</div>';

  if (chartCtx && els.fundChart) {
    chartCtx.clearRect(0, 0, els.fundChart.width, els.fundChart.height);
  }

  setCoreButtonsEnabled(false);
}

function updateSlotButtonLabel() {
  if (!els.slotBtn) return;
  if (currentSlot) {
    els.slotBtn.textContent = `存档栏位 #${currentSlot}`;
  } else {
    els.slotBtn.textContent = "存档栏位";
  }
}

function renderSlotPanel() {
  if (!els.slotList) return;

  let html = "";
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const summary = getSlotSummary(slot);
    const active = currentSlot === slot;

    const stateText = active ? "使用中" : summary.hasSave ? "已创建" : "空栏位";
    const meta = summary.hasSave
      ? `
        最后游玩：${formatDateTime(summary.lastPlayed)}<br>
        当前资金：${formatNum(summary.funds)}<br>
        遗产点：${formatNum(summary.legacyPoints)}
      `
      : "未创建存档。点击“新游戏”开始。";

    const actions = summary.hasSave
      ? `
        <button class="btn small" data-action="slot-load" data-slot="${slot}">继续</button>
        <button class="btn small ghost" data-action="slot-new" data-slot="${slot}">新游戏</button>
        <button class="btn small danger" data-action="slot-delete" data-slot="${slot}">删除</button>
      `
      : `
        <button class="btn small" data-action="slot-new" data-slot="${slot}">新游戏</button>
      `;

    html += `
      <article class="slot-card ${active ? "active-slot" : ""}">
        <div class="slot-head">
          <strong>栏位 ${slot}</strong>
          <span class="slot-state">${stateText}</span>
        </div>
        <div class="slot-meta">${meta}</div>
        <div class="slot-actions">${actions}</div>
      </article>
    `;
  }

  els.slotList.innerHTML = html;
  els.closeSlotOverlayBtn.style.display = currentSlot ? "inline-block" : "none";
}

function openSlotOverlay() {
  saveState(true);
  stopGameLoop();
  renderSlotPanel();
  els.slotOverlay.classList.add("active");
}

function closeSlotOverlay() {
  if (!currentSlot) return;
  els.slotOverlay.classList.remove("active");
  startGameLoop();
}

function selectSlot(slot, forceNew = false) {
  const safeSlot = normalizeSlot(slot);
  if (!safeSlot) return;

  saveState(true);
  stopGameLoop();

  currentSlot = safeSlot;
  loadStateFromSlot(safeSlot, forceNew);

  updateSlotButtonLabel();
  renderAll();
  saveState(true);

  renderSlotPanel();
  els.slotOverlay.classList.remove("active");
  startGameLoop();
}

function deleteSlot(slot) {
  const safeSlot = normalizeSlot(slot);
  if (!safeSlot) return;

  const summary = getSlotSummary(safeSlot);
  if (!summary.hasSave) return;

  const ok = confirm(`确定彻底删除栏位 ${safeSlot} 的存档吗？\n该操作不可恢复。`);
  if (!ok) return;

  localStorage.removeItem(getSlotStorageKey(safeSlot));

  if (currentSlot === safeSlot) {
    stopGameLoop();
    currentSlot = null;
    state = null;
    updateSlotButtonLabel();
    renderNoSlotState();
    els.slotOverlay.classList.add("active");
  }

  renderSlotPanel();
}

function startGameLoop() {
  if (!currentSlot || !state) return;

  if (tickHandle) clearInterval(tickHandle);
  if (autosaveHandle) clearInterval(autosaveHandle);

  tickHandle = setInterval(gameTick, 1000);
  autosaveHandle = setInterval(() => saveState(true), 10000);
}

function stopGameLoop() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }

  if (autosaveHandle) {
    clearInterval(autosaveHandle);
    autosaveHandle = null;
  }
}

function renderResources() {
  if (!state) return;

  els.funds.textContent = formatNum(state.funds);
  els.data.textContent = formatNum(state.data);
  els.compute.textContent = formatNum(state.compute);
  els.users.textContent = formatNum(state.users);
  els.influence.textContent = formatNum(state.influence);
  els.legacy.textContent = formatNum(state.legacyPoints);

  const gain = calcPotentialLegacyGain();
  els.rebootBtn.disabled = gain <= 0;
  els.rebootBtn.textContent = gain > 0 ? `重构时代 (+${gain})` : "重构时代";

  if (state.event) {
    const cls = state.event.type === "bad" ? "bad" : "good";
    els.eventBanner.innerHTML = `<span class="${cls}">[${state.event.name}]</span> ${state.event.desc}（剩余 ${state.event.remaining}s）`;
  } else {
    els.eventBanner.textContent = "市场平稳运行中";
  }

  els.pps.textContent = `每秒产出：${formatNum(state.avgFundsPerSec)} 资金`;
}

function renderBuildings() {
  if (!state) return;

  const mode = els.buyMode.value;
  const mods = getCombinedMods();

  let html = "";
  for (const def of BUILDINGS) {
    const owned = state.buildings[def.id] || 0;
    const nextCost = getNextBuildingCost(def, owned);

    let buyCount = 1;
    let cost = nextCost;

    if (mode === "10") {
      buyCount = 10;
      cost = getBatchCost(def, owned, 10);
    } else if (mode === "max") {
      const max = getMaxAffordableCount(def, owned, state.funds);
      buyCount = max.count;
      cost = max.cost;
    }

    const disabled = cost > state.funds || buyCount <= 0;
    const outputPerSec = def.baseOut * owned;
    let passiveFunds = 0;

    if (def.id === "sensor") {
      passiveFunds = getSensorLicenseFundsPerSecond(owned, mods);
    } else if (def.id === "gpu") {
      passiveFunds = getGpuLeaseFundsPerSecond(owned, mods);
    } else if (def.id === "media") {
      passiveFunds = getMediaFundsPerSecond(owned, state.users, mods);
    }

    const passiveLine = passiveFunds > 0
      ? `<div class="item-meta">基础现金流：${formatNum(passiveFunds)} 资金/秒</div>`
      : def.id === "studio"
        ? `<div class="item-meta">高效变现：消耗数据+算力，换取资金与用户</div>`
        : "";

    html += `
      <div class="item-card">
        <div class="item-title">
          <strong>${def.name}</strong>
          <span class="small">持有 ${formatNum(owned)}</span>
        </div>
        <div class="item-meta">${def.desc}</div>
        <div class="item-meta">当前产能：${formatNum(outputPerSec)} ${def.outLabel}</div>
        ${passiveLine}
        <div class="item-actions">
          <span class="small">成本 ${formatNum(cost)} 资金</span>
          <button class="btn small" data-action="buy-building" data-id="${def.id}" ${disabled ? "disabled" : ""}>购买 x${buyCount}</button>
        </div>
      </div>
    `;
  }

  els.buildingList.innerHTML = html;
}

function renderUpgrades() {
  if (!state) return;

  let html = "";

  for (const up of UPGRADE_DEFS) {
    const owned = !!state.upgrades[up.id];
    const disabled = owned || state.funds < up.costFunds || state.influence < up.costInfluence;

    html += `
      <div class="item-card">
        <div class="item-title">
          <strong>${up.name}</strong>
          <span class="small">${owned ? "已升级" : "可升级"}</span>
        </div>
        <div class="item-meta">${up.desc}</div>
        <div class="item-actions">
          <span class="small">${formatNum(up.costFunds)} 资金 / ${formatNum(up.costInfluence)} 影响力</span>
          <button class="btn small" data-action="buy-upgrade" data-id="${up.id}" ${disabled ? "disabled" : ""}>${owned ? "完成" : "升级"}</button>
        </div>
      </div>
    `;
  }

  els.upgradeList.innerHTML = html;
}

function renderQuest() {
  if (!state) return;

  const q = state.quest;
  if (!q) {
    els.questBox.innerHTML = "任务生成中...";
    return;
  }

  const progress = getQuestProgress(q);
  const pct = clamp((progress / q.target) * 100, 0, 100);

  els.questBox.innerHTML = `
    <div><strong>Lv.${q.tier + 1} ${q.title}</strong></div>
    <div class="subtle">${q.desc}</div>
    <div class="subtle">目标：${formatNum(q.target)}</div>
    <div class="subtle">进度：${formatNum(progress)} / ${formatNum(q.target)} (${pct.toFixed(1)}%)</div>
    <div class="subtle">奖励：${formatNum(q.rewardFunds)} 资金 + ${formatNum(q.rewardInfluence)} 影响力</div>
    <div style="margin-top:8px;">
      <button class="btn" data-action="claim-quest" ${q.done && !q.claimed ? "" : "disabled"}>领取奖励</button>
    </div>
  `;
}

function renderLogs() {
  if (!state) return;

  els.logBox.innerHTML = state.logs
    .slice(0, 40)
    .map((entry) => {
      const time = new Date(entry.t).toLocaleTimeString();
      const cls = entry.type === "good" ? "good" : entry.type === "bad" ? "bad" : "";
      return `<div class="log-entry ${cls}">[${time}] ${entry.text}</div>`;
    })
    .join("");
}

function drawChart() {
  if (!chartCtx || !state) return;

  const canvas = els.fundChart;
  const ctx = chartCtx;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const data = state.history;
  if (!data || data.length < 2) return;

  let min = Infinity;
  let max = -Infinity;
  for (const v of data) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }

  if (Math.abs(max - min) < 1e-9) {
    max += 1;
    min -= 1;
  }

  const pad = 22;
  const step = (w - pad * 2) / (data.length - 1);

  ctx.strokeStyle = "rgba(118, 188, 255, 0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = pad + ((h - pad * 2) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad, y);
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = pad + i * step;
    const norm = (data[i] - min) / (max - min);
    const y = h - pad - norm * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.strokeStyle = "#4bd3ff";
  ctx.lineWidth = 2.4;
  ctx.shadowColor = "rgba(75, 211, 255, 0.35)";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fillStyle = "rgba(58, 191, 255, 0.18)";
  ctx.fill();

  ctx.fillStyle = "rgba(220, 240, 255, 0.88)";
  ctx.font = '12px "Noto Sans SC"';
  ctx.fillText(`低点 ${formatNum(min)}`, pad, h - 5);
  const maxLabel = `高点 ${formatNum(max)}`;
  const width = ctx.measureText(maxLabel).width;
  ctx.fillText(maxLabel, w - pad - width, 14);
}

function renderAll() {
  if (!state || !currentSlot) {
    renderNoSlotState();
    return;
  }

  setCoreButtonsEnabled(true);
  renderResources();
  renderBuildings();
  renderUpgrades();
  renderQuest();
  renderLogs();
  drawChart();
}

function gameTick() {
  if (!state || !currentSlot) return;
  updateEconomyOneSecond();
  renderAll();
}

function bindEvents() {
  document.body.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const action = t.dataset.action;
    if (!action) return;

    if (action === "slot-load") {
      selectSlot(t.dataset.slot, false);
      return;
    }

    if (action === "slot-new") {
      const slot = normalizeSlot(t.dataset.slot);
      if (!slot) return;

      const summary = getSlotSummary(slot);
      if (summary.hasSave) {
        const ok = confirm(`栏位 ${slot} 已有存档，是否覆盖并开始新游戏？`);
        if (!ok) return;
      }
      selectSlot(slot, true);
      return;
    }

    if (action === "slot-delete") {
      deleteSlot(t.dataset.slot);
      return;
    }

    if (!state) return;

    if (action === "buy-building") {
      buyBuilding(t.dataset.id);
      return;
    }

    if (action === "buy-upgrade") {
      buyUpgrade(t.dataset.id);
      return;
    }

    if (action === "claim-quest") {
      claimQuest();
    }
  });

  els.buyMode.addEventListener("change", () => {
    if (state) renderBuildings();
  });

  els.slotBtn.addEventListener("click", openSlotOverlay);
  els.closeSlotOverlayBtn.addEventListener("click", closeSlotOverlay);

  els.saveBtn.addEventListener("click", () => {
    if (!state) return;
    saveState(false);
    renderLogs();
    renderSlotPanel();
  });
  els.exportBtn.addEventListener("click", exportSave);
  els.importBtn.addEventListener("click", importSave);
  els.rebootBtn.addEventListener("click", rebootEra);

  window.addEventListener("beforeunload", () => saveState(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState(true);
  });
}

function cacheDom() {
  els = {
    funds: document.getElementById("funds"),
    data: document.getElementById("data"),
    compute: document.getElementById("compute"),
    users: document.getElementById("users"),
    influence: document.getElementById("influence"),
    legacy: document.getElementById("legacy"),
    buildingList: document.getElementById("buildingList"),
    upgradeList: document.getElementById("upgradeList"),
    questBox: document.getElementById("questBox"),
    logBox: document.getElementById("logBox"),
    buyMode: document.getElementById("buyMode"),
    slotBtn: document.getElementById("slotBtn"),
    saveBtn: document.getElementById("saveBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    rebootBtn: document.getElementById("rebootBtn"),
    closeSlotOverlayBtn: document.getElementById("closeSlotOverlayBtn"),
    slotOverlay: document.getElementById("slotOverlay"),
    slotList: document.getElementById("slotList"),
    eventBanner: document.getElementById("eventBanner"),
    fundChart: document.getElementById("fundChart"),
    pps: document.getElementById("pps"),
  };

  chartCtx = els.fundChart.getContext("2d");
}

function start() {
  cacheDom();
  migrateLegacySaveIfNeeded();
  bindEvents();
  updateSlotButtonLabel();
  renderNoSlotState();
  openSlotOverlay();
}

start();
