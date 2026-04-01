const LEGACY_STORAGE_KEY = "data-empire-idle-save-v1";
const SLOT_PREFIX = "data-empire-idle-save-slot-";
const SLOT_COUNT = 3;
const VERSION = 5;

const BUILDINGS = [
  {
    id: "sensor",
    name: "数据探针",
    desc: "持续采集原始数据，并提供稳定的数据授权收入",
    baseCost: 48,
    costMult: 1.145,
    baseOut: 1.3,
    outLabel: "数据/秒",
  },
  {
    id: "gpu",
    name: "算力机架",
    desc: "提供训练与推理算力，并可做算力租赁",
    baseCost: 128,
    costMult: 1.15,
    baseOut: 1,
    outLabel: "算力/秒",
  },
  {
    id: "studio",
    name: "产品工坊",
    desc: "消耗数据与算力，生产产品并沉淀用户",
    baseCost: 360,
    costMult: 1.162,
    baseOut: 2.1,
    outLabel: "转化容量/秒",
  },
  {
    id: "media",
    name: "媒体中心",
    desc: "放大品牌与用户价值，稳定增加影响力",
    baseCost: 960,
    costMult: 1.173,
    baseOut: 0.25,
    outLabel: "影响力基准/秒",
  },
  {
    id: "lab",
    name: "算法实验室",
    desc: "高强度消耗数据与算力，产出洞察和研究红利",
    baseCost: 2380,
    costMult: 1.182,
    baseOut: 0.34,
    outLabel: "研究容量/秒",
  },
  {
    id: "exchange",
    name: "商业化部门",
    desc: "将洞察与用户转化为大额合同收入",
    baseCost: 5600,
    costMult: 1.188,
    baseOut: 0.85,
    outLabel: "交易容量/秒",
  },
];

const ECONOMY = {
  sensorLicenseRate: 0.1,
  gpuLeaseRate: 0.125,
  studioDataUsePerUnit: 1,
  studioComputeUsePerUnit: 0.86,
  studioFundsPerUnit: 1.15,
  studioUsersPerUnit: 0.42,
  labDataUsePerUnit: 1.35,
  labComputeUsePerUnit: 1.15,
  labInsightPerUnit: 0.82,
  labInfluencePerUnit: 0.14,
  exchangeInsightUsePerUnit: 0.38,
  exchangeUsersUsePerUnit: 8,
  exchangeFundsPerUnit: 30,
  exchangeInfluencePerUnit: 0.22,
  baseOfflineCapSeconds: 6 * 60 * 60,
};

const UPGRADE_DEFS = [
  {
    id: "pipeline",
    name: "压缩采集链路",
    desc: "数据探针产出 +45%",
    costFunds: 2600,
    costInfluence: 0,
    effects: { dataMultPct: 0.45 },
    require: { sensor: 6 },
  },
  {
    id: "autoscale",
    name: "弹性算力调度",
    desc: "算力机架产出 +50%",
    costFunds: 6200,
    costInfluence: 18,
    effects: { computeMultPct: 0.5 },
    require: { gpu: 6 },
  },
  {
    id: "smartops",
    name: "自动化产品运营",
    desc: "产品工坊转化容量 +42%",
    costFunds: 10800,
    costInfluence: 42,
    effects: { prodCapMultPct: 0.42 },
    require: { studio: 4 },
  },
  {
    id: "growthloop",
    name: "病毒传播回路",
    desc: "用户增长 +55%",
    costFunds: 17600,
    costInfluence: 78,
    effects: { userGrowthMultPct: 0.55 },
    require: { media: 3 },
  },
  {
    id: "branding",
    name: "品牌护城河",
    desc: "影响力产出 +65%，总体营收 +8%",
    costFunds: 28600,
    costInfluence: 130,
    effects: { influenceMultPct: 0.65, revenueMultPct: 0.08 },
    requireUpgrade: "growthloop",
  },
  {
    id: "edgecache",
    name: "边缘分发网络",
    desc: "数据授权收入 +75%，数据产出额外 +12%",
    costFunds: 42000,
    costInfluence: 190,
    effects: { sensorLicensePct: 0.75, dataMultPct: 0.12 },
    requireUpgrade: "pipeline",
  },
  {
    id: "rentalmesh",
    name: "跨区算力租赁网",
    desc: "算力租赁收入 +80%，算力产出额外 +15%",
    costFunds: 56000,
    costInfluence: 250,
    effects: { gpuLeasePct: 0.8, computeMultPct: 0.15 },
    requireUpgrade: "autoscale",
  },
  {
    id: "promptfactory",
    name: "高并发产品流水线",
    desc: "产品变现 +33%，用户增长额外 +18%",
    costFunds: 76000,
    costInfluence: 320,
    effects: { studioFundsPct: 0.33, userGrowthMultPct: 0.18 },
    requireUpgrade: "smartops",
  },
  {
    id: "cognition",
    name: "认知蒸馏协议",
    desc: "实验室效率 +50%，洞察产出更平滑",
    costFunds: 98000,
    costInfluence: 420,
    costInsight: 38,
    effects: { labMultPct: 0.5 },
    require: { lab: 4 },
  },
  {
    id: "datamarket",
    name: "数据资产交易所",
    desc: "商业化部门效率 +48%，营收 +12%",
    costFunds: 138000,
    costInfluence: 560,
    costInsight: 78,
    effects: { exchangeMultPct: 0.48, revenueMultPct: 0.12 },
    require: { exchange: 3 },
  },
  {
    id: "compliance",
    name: "合规护城体系",
    desc: "负面事件惩罚降低 26%，影响力 +20%",
    costFunds: 196000,
    costInfluence: 760,
    costInsight: 110,
    effects: { negativeEventResistPct: 0.26, influenceMultPct: 0.2 },
    requireUpgrade: "branding",
  },
  {
    id: "ecosystem",
    name: "平台生态联盟",
    desc: "所有产出 +10%，任务奖励 +35%",
    costFunds: 290000,
    costInfluence: 1200,
    costInsight: 180,
    effects: { allMultPct: 0.1, questRewardMultPct: 0.35 },
    requireUpgrade: "datamarket",
  },
];

const EVENT_POOL = [
  {
    name: "广告旺季",
    desc: "品牌客户预算上涨，营收显著提升。",
    type: "good",
    duration: [35, 52],
    mods: { revenueMult: 1.32 },
  },
  {
    name: "云服务折扣",
    desc: "算力采购成本下降，算力效率提升。",
    type: "good",
    duration: [28, 42],
    mods: { computeMult: 1.34 },
  },
  {
    name: "隐式推荐爆发",
    desc: "用户增长与商业化效率同步提升。",
    type: "good",
    duration: [24, 38],
    mods: { userGrowthMult: 1.24, exchangeMult: 1.22 },
  },
  {
    name: "研究论文中标",
    desc: "实验室产出洞察效率提升。",
    type: "good",
    duration: [22, 34],
    mods: { labMult: 1.3, influenceMult: 1.12 },
  },
  {
    name: "合规风控检查",
    desc: "产品上线流程变慢，转化效率降低。",
    type: "bad",
    duration: [24, 38],
    mods: { prodCapMult: 0.76, exchangeMult: 0.85 },
  },
  {
    name: "隐私争议",
    desc: "用户扩张受挫，增长速度下滑。",
    type: "bad",
    duration: [26, 36],
    mods: { userGrowthMult: 0.67, influenceMult: 0.82 },
  },
  {
    name: "价格战爆发",
    desc: "市场竞争加剧，营收和租赁收益承压。",
    type: "bad",
    duration: [20, 30],
    mods: { revenueMult: 0.74, sensorLicenseMult: 0.88, gpuLeaseMult: 0.85 },
  },
  {
    name: "热点话题引爆",
    desc: "品牌强曝光，影响力和用户共同上扬。",
    type: "good",
    duration: [20, 32],
    mods: { influenceMult: 1.42, userGrowthMult: 1.2 },
  },
];

const LEGACY_UPGRADE_DEFS = [
  {
    id: "seedCapital",
    name: "家族启动金",
    desc: "每级让新周目开局资金 +150。",
    baseCost: 1,
    costScale: 1.65,
    maxLevel: 20,
    effects: { startFundsFlat: 150 },
  },
  {
    id: "veteranOps",
    name: "世代运营经验",
    desc: "每级全产业产出 +4%。",
    baseCost: 1,
    costScale: 1.75,
    maxLevel: 15,
    effects: { allMultPct: 0.04 },
  },
  {
    id: "timeVault",
    name: "离线托管合约",
    desc: "每级离线补算上限 +1 小时。",
    baseCost: 2,
    costScale: 1.8,
    maxLevel: 8,
    effects: { offlineCapHours: 1 },
  },
  {
    id: "founderNetwork",
    name: "创始人关系网",
    desc: "每级用户增长 +5%，影响力 +6%。",
    baseCost: 2,
    costScale: 1.85,
    maxLevel: 12,
    effects: { userGrowthMultPct: 0.05, influenceMultPct: 0.06 },
  },
  {
    id: "heritageAlgorithm",
    name: "遗产收益算法",
    desc: "每级重构可得遗产点 +8%。",
    baseCost: 3,
    costScale: 1.9,
    maxLevel: 10,
    effects: { legacyGainMultPct: 0.08 },
  },
  {
    id: "questOffice",
    name: "家族任务办公室",
    desc: "每级任务奖励 +12%。",
    baseCost: 2,
    costScale: 1.82,
    maxLevel: 12,
    effects: { questRewardMultPct: 0.12 },
  },
];

const ACHIEVEMENT_DEFS = [
  { id: "funds_1k", title: "第一桶金", desc: "总收益达到 1K", check: (s) => s.allTimeFunds >= 1_000 },
  { id: "funds_1m", title: "产业成型", desc: "总收益达到 1M", check: (s) => s.allTimeFunds >= 1_000_000 },
  { id: "funds_1b", title: "帝国雏形", desc: "总收益达到 1B", check: (s) => s.allTimeFunds >= 1_000_000_000 },
  { id: "users_10k", title: "万级用户池", desc: "用户达到 10K", check: (s) => s.maxUsers >= 10_000 },
  { id: "influence_1k", title: "公共议题制造者", desc: "影响力达到 1K", check: (s) => s.maxInfluence >= 1_000 },
  { id: "insight_500", title: "知识资产积累", desc: "洞察达到 500", check: (s) => s.maxInsight >= 500 },
  { id: "legacy_5", title: "第一次传承", desc: "累计获得 5 遗产点", check: (s) => (s.legacy?.totalEarned || 0) >= 5 },
  { id: "legacy_30", title: "百年世家", desc: "累计获得 30 遗产点", check: (s) => (s.legacy?.totalEarned || 0) >= 30 },
  { id: "build_200", title: "工业化铺设", desc: "建筑总量达到 200", check: (s) => Object.values(s.buildings || {}).reduce((a, b) => a + b, 0) >= 200 },
  { id: "quest_20", title: "任务机器", desc: "完成 20 个阶段任务", check: (s) => (s.completedQuests || 0) >= 20 },
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
    funds: 260,
    data: 0,
    compute: 0,
    users: 0,
    influence: 0,
    insight: 0,
    legacy: {
      points: 0,
      totalEarned: 0,
      spent: 0,
      upgrades: {},
    },
    allTimeFunds: 260,
    maxUsers: 0,
    maxInfluence: 0,
    maxInsight: 0,
    buildings: {
      sensor: 0,
      gpu: 0,
      studio: 0,
      media: 0,
      lab: 0,
      exchange: 0,
    },
    upgrades: {},
    achievementUnlocked: {},
    event: null,
    eventCooldown: randomInt(22, 34),
    history: [260],
    logs: [
      { t: Date.now(), text: "系统启动完成，欢迎来到数据帝国。", type: "good" },
    ],
    questTier: 0,
    quest: null,
    completedQuests: 0,
    eras: 0,
    avgFundsPerSec: 0,
    playedSeconds: 0,
    lastTickAt: Date.now(),
  };
}

function mergeSave(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const legacyPointsFromOldField = Math.max(0, Math.floor(raw.legacyPoints || 0));
  const rawLegacy = raw.legacy && typeof raw.legacy === "object"
    ? raw.legacy
    : {
      points: legacyPointsFromOldField,
      totalEarned: legacyPointsFromOldField,
      spent: 0,
      upgrades: {},
    };

  const merged = {
    ...base,
    ...raw,
    buildings: { ...base.buildings, ...(raw.buildings || {}) },
    upgrades: { ...(raw.upgrades || {}) },
    legacy: {
      ...base.legacy,
      ...rawLegacy,
      upgrades: { ...base.legacy.upgrades, ...((rawLegacy && rawLegacy.upgrades) || {}) },
    },
    achievementUnlocked: { ...(raw.achievementUnlocked || {}) },
    logs: Array.isArray(raw.logs) ? raw.logs.slice(0, 80) : base.logs,
    history: Array.isArray(raw.history) && raw.history.length > 0 ? raw.history.slice(-140) : base.history,
  };

  merged.version = VERSION;
  merged.funds = Math.max(0, Number(merged.funds) || 0);
  merged.data = Math.max(0, Number(merged.data) || 0);
  merged.compute = Math.max(0, Number(merged.compute) || 0);
  merged.users = Math.max(0, Number(merged.users) || 0);
  merged.influence = Math.max(0, Number(merged.influence) || 0);
  merged.insight = Math.max(0, Number(merged.insight) || 0);
  merged.allTimeFunds = Math.max(merged.funds, Number(merged.allTimeFunds) || 0);
  merged.maxUsers = Math.max(Number(merged.maxUsers) || 0, merged.users);
  merged.maxInfluence = Math.max(Number(merged.maxInfluence) || 0, merged.influence);
  merged.maxInsight = Math.max(Number(merged.maxInsight) || 0, merged.insight);
  merged.completedQuests = Math.max(0, Math.floor(Number(merged.completedQuests) || 0));
  merged.eras = Math.max(0, Math.floor(Number(merged.eras) || 0));
  merged.playedSeconds = Math.max(0, Math.floor(Number(merged.playedSeconds) || 0));
  merged.avgFundsPerSec = Math.max(0, Number(merged.avgFundsPerSec) || 0);

  merged.legacy.points = Math.max(0, Math.floor(Number(merged.legacy.points) || 0));
  merged.legacy.totalEarned = Math.max(
    merged.legacy.points,
    Math.floor(Number(merged.legacy.totalEarned) || legacyPointsFromOldField)
  );
  merged.legacy.spent = Math.max(
    0,
    Math.floor(Number(merged.legacy.spent) || (merged.legacy.totalEarned - merged.legacy.points))
  );

  if (merged.legacy.totalEarned < merged.legacy.points + merged.legacy.spent) {
    merged.legacy.totalEarned = merged.legacy.points + merged.legacy.spent;
  }

  for (const def of LEGACY_UPGRADE_DEFS) {
    const lvl = Math.floor(Number(merged.legacy.upgrades[def.id]) || 0);
    merged.legacy.upgrades[def.id] = clamp(lvl, 0, def.maxLevel);
  }

  // Clean stale legacy upgrades from older experiments.
  for (const key of Object.keys(merged.legacy.upgrades)) {
    if (!LEGACY_UPGRADE_DEFS.some((d) => d.id === key)) {
      delete merged.legacy.upgrades[key];
    }
  }

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
      eras: 0,
      lastPlayed: 0,
    };
  }

  const merged = mergeSave(parsed);
  return {
    hasSave: true,
    funds: merged.funds || 0,
    legacyPoints: merged.legacy?.points || 0,
    allTimeFunds: merged.allTimeFunds || 0,
    eras: merged.eras || 0,
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

function addInsight(amount) {
  if (!state || !isFinite(amount) || amount <= 0) return;
  state.insight += amount;
}

function getLegacyLevel(id, legacyObj = state?.legacy) {
  if (!legacyObj || !legacyObj.upgrades) return 0;
  return Math.max(0, Math.floor(Number(legacyObj.upgrades[id]) || 0));
}

function createEmptyMods() {
  return {
    dataMult: 1,
    computeMult: 1,
    prodCapMult: 1,
    userGrowthMult: 1,
    influenceMult: 1,
    revenueMult: 1,
    sensorLicenseMult: 1,
    gpuLeaseMult: 1,
    studioFundsMult: 1,
    labMult: 1,
    exchangeMult: 1,
    questRewardMult: 1,
    legacyGainMult: 1,
    startFundsFlat: 0,
    offlineCapSeconds: ECONOMY.baseOfflineCapSeconds,
    negativeEventResist: 0,
  };
}

function applyPctMultiplier(mods, key, pct, stacks = 1) {
  if (!pct || stacks <= 0) return;
  mods[key] = (mods[key] || 1) * Math.pow(1 + pct, stacks);
}

function applyEffectsToMods(mods, effects, stacks = 1) {
  if (!effects || stacks <= 0) return;

  if (effects.allMultPct) {
    const m = Math.pow(1 + effects.allMultPct, stacks);
    for (const key of [
      "dataMult",
      "computeMult",
      "prodCapMult",
      "userGrowthMult",
      "influenceMult",
      "revenueMult",
      "studioFundsMult",
      "labMult",
      "exchangeMult",
    ]) {
      mods[key] *= m;
    }
  }

  applyPctMultiplier(mods, "dataMult", effects.dataMultPct, stacks);
  applyPctMultiplier(mods, "computeMult", effects.computeMultPct, stacks);
  applyPctMultiplier(mods, "prodCapMult", effects.prodCapMultPct, stacks);
  applyPctMultiplier(mods, "userGrowthMult", effects.userGrowthMultPct, stacks);
  applyPctMultiplier(mods, "influenceMult", effects.influenceMultPct, stacks);
  applyPctMultiplier(mods, "revenueMult", effects.revenueMultPct, stacks);
  applyPctMultiplier(mods, "sensorLicenseMult", effects.sensorLicensePct, stacks);
  applyPctMultiplier(mods, "gpuLeaseMult", effects.gpuLeasePct, stacks);
  applyPctMultiplier(mods, "studioFundsMult", effects.studioFundsPct, stacks);
  applyPctMultiplier(mods, "labMult", effects.labMultPct, stacks);
  applyPctMultiplier(mods, "exchangeMult", effects.exchangeMultPct, stacks);
  applyPctMultiplier(mods, "questRewardMult", effects.questRewardMultPct, stacks);
  applyPctMultiplier(mods, "legacyGainMult", effects.legacyGainMultPct, stacks);

  if (effects.startFundsFlat) {
    mods.startFundsFlat += effects.startFundsFlat * stacks;
  }
  if (effects.offlineCapHours) {
    mods.offlineCapSeconds += effects.offlineCapHours * 3600 * stacks;
  }
  if (effects.negativeEventResistPct) {
    mods.negativeEventResist += effects.negativeEventResistPct * stacks;
  }
}

function getLegacyMods() {
  const mods = createEmptyMods();
  if (!state?.legacy) return mods;

  for (const def of LEGACY_UPGRADE_DEFS) {
    const level = getLegacyLevel(def.id);
    applyEffectsToMods(mods, def.effects, level);
  }
  mods.negativeEventResist = clamp(mods.negativeEventResist, 0, 0.8);
  return mods;
}

function getRunUpgradeMods() {
  const mods = createEmptyMods();
  for (const up of UPGRADE_DEFS) {
    if (!state.upgrades[up.id]) continue;
    applyEffectsToMods(mods, up.effects, 1);
  }
  return mods;
}

function getBuildingDef(id) {
  return BUILDINGS.find((b) => b.id === id);
}

function getCombinedMods() {
  const legacy = getLegacyMods();
  const run = getRunUpgradeMods();
  const influenceBoost = 1 + Math.log10(1 + Math.max(0, state.influence)) / 16;

  const mods = createEmptyMods();
  for (const key of Object.keys(mods)) {
    if (typeof mods[key] === "number") {
      if (key === "startFundsFlat" || key === "offlineCapSeconds" || key === "negativeEventResist") continue;
      mods[key] = (legacy[key] || 1) * (run[key] || 1);
    }
  }

  for (const key of ["dataMult", "computeMult", "prodCapMult", "userGrowthMult", "influenceMult"]) {
    mods[key] *= influenceBoost;
  }

  mods.startFundsFlat = (legacy.startFundsFlat || 0) + (run.startFundsFlat || 0);
  mods.offlineCapSeconds = Math.floor(
    Math.max(60, (legacy.offlineCapSeconds || ECONOMY.baseOfflineCapSeconds))
  );
  mods.negativeEventResist = clamp(
    (legacy.negativeEventResist || 0) + (run.negativeEventResist || 0),
    0,
    0.85
  );

  const eventMods = state.event?.mods || {};
  for (const [key, value] of Object.entries(eventMods)) {
    if (!isFinite(value)) continue;
    if (state.event?.type === "bad" && value < 1) {
      const reducedPenalty = 1 - (1 - value) * (1 - mods.negativeEventResist);
      mods[key] = (mods[key] || 1) * reducedPenalty;
    } else {
      mods[key] = (mods[key] || 1) * value;
    }
  }

  return mods;
}

function calcStartingFundsForLegacy(legacyObj) {
  const base = 260;
  if (!legacyObj || !legacyObj.upgrades) return base;

  let bonus = 0;
  for (const def of LEGACY_UPGRADE_DEFS) {
    const lvl = getLegacyLevel(def.id, legacyObj);
    if (def.effects.startFundsFlat) {
      bonus += def.effects.startFundsFlat * lvl;
    }
  }
  return base + bonus;
}

function getSensorLicenseFundsPerSecond(sensorCount, mods) {
  if (sensorCount <= 0) return 0;
  const sensor = getBuildingDef("sensor");
  const dataPerSec = sensorCount * sensor.baseOut * mods.dataMult;
  return dataPerSec * ECONOMY.sensorLicenseRate * mods.sensorLicenseMult * mods.revenueMult;
}

function getGpuLeaseFundsPerSecond(gpuCount, mods) {
  if (gpuCount <= 0) return 0;
  const gpu = getBuildingDef("gpu");
  const computePerSec = gpuCount * gpu.baseOut * mods.computeMult;
  return computePerSec * ECONOMY.gpuLeaseRate * mods.gpuLeaseMult * mods.revenueMult;
}

function getMediaFundsPerSecond(mediaCount, users, mods) {
  if (mediaCount <= 0) return 0;
  return mediaCount * (0.16 + users * 0.00085) * mods.revenueMult;
}

function getLabFundsPerSecond(labCount, mods) {
  if (labCount <= 0) return 0;
  return labCount * 0.32 * mods.labMult * mods.revenueMult;
}

function getExchangeFundsPerSecond(exchangeCount, mods) {
  if (exchangeCount <= 0) return 0;
  return exchangeCount * 0.9 * mods.exchangeMult * mods.revenueMult;
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

function isUpgradeRequirementMet(up) {
  if (!up) return false;
  if (up.requireUpgrade && !state.upgrades[up.requireUpgrade]) return false;
  if (up.require && typeof up.require === "object") {
    for (const [bid, need] of Object.entries(up.require)) {
      if ((state.buildings[bid] || 0) < need) return false;
    }
  }
  return true;
}

function getUpgradeRequirementText(up) {
  if (!up) return "";
  const list = [];
  if (up.requireUpgrade) {
    const dep = UPGRADE_DEFS.find((u) => u.id === up.requireUpgrade);
    list.push(`前置升级：${dep ? dep.name : up.requireUpgrade}`);
  }
  if (up.require && typeof up.require === "object") {
    for (const [bid, need] of Object.entries(up.require)) {
      const def = getBuildingDef(bid);
      list.push(`${def ? def.name : bid} x${need}`);
    }
  }
  return list.join(" / ");
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
  if (!isUpgradeRequirementMet(up)) return;

  const costInsight = up.costInsight || 0;
  if (state.funds < up.costFunds || state.influence < up.costInfluence || state.insight < costInsight) return;

  state.funds -= up.costFunds;
  state.influence -= up.costInfluence;
  if (costInsight > 0) {
    state.insight -= costInsight;
  }
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
      state.eventCooldown = randomInt(24, 40);
    }
    return;
  }

  state.eventCooldown -= 1;
  if (state.eventCooldown > 0) return;

  const chance = Math.random();
  state.eventCooldown = randomInt(20, 36);
  if (chance > 0.36) return;

  const picked = randomEventFromPool();
  state.event = {
    ...picked,
    remaining: randomInt(picked.duration[0], picked.duration[1]),
  };
  addLog(`市场事件：${picked.name} - ${picked.desc}`, picked.type === "bad" ? "bad" : "good");
}

function generateQuest(tier) {
  const pool = ["funds", "users", "influence"];
  if (tier >= 2) pool.push("allTimeFunds");
  if (tier >= 3) pool.push("insight");
  if (tier >= 4) pool.push("buildingCount");
  const kind = pool[randomInt(0, pool.length - 1)];

  if (kind === "funds") {
    const target = Math.floor(16000 * Math.pow(1.66, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(target * 0.44),
      rewardInfluence: Math.floor(22 * Math.pow(1.36, tier)),
      rewardInsight: Math.floor(4 * Math.pow(1.25, tier)),
      done: false,
      claimed: false,
      title: "现金流冲刺",
      desc: "资金总量达到目标值。",
    };
  }

  if (kind === "users") {
    const target = Math.floor(1200 * Math.pow(1.64, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(12000 * Math.pow(1.56, tier)),
      rewardInfluence: Math.floor(28 * Math.pow(1.4, tier)),
      rewardInsight: Math.floor(6 * Math.pow(1.23, tier)),
      done: false,
      claimed: false,
      title: "用户增长计划",
      desc: "累计用户规模达到目标值。",
    };
  }

  if (kind === "influence") {
    const target = Math.floor(180 * Math.pow(1.67, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(13000 * Math.pow(1.6, tier)),
      rewardInfluence: Math.floor(20 * Math.pow(1.38, tier)),
      rewardInsight: Math.floor(7 * Math.pow(1.26, tier)),
      done: false,
      claimed: false,
      title: "品牌影响力扩散",
      desc: "影响力指数达到目标值。",
    };
  }

  if (kind === "allTimeFunds") {
    const target = Math.floor(50000 * Math.pow(1.72, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(14000 * Math.pow(1.62, tier)),
      rewardInfluence: Math.floor(30 * Math.pow(1.42, tier)),
      rewardInsight: Math.floor(8 * Math.pow(1.28, tier)),
      done: false,
      claimed: false,
      title: "长期营收目标",
      desc: "总收益（历史累计）达到目标值。",
    };
  }

  if (kind === "insight") {
    const target = Math.floor(35 * Math.pow(1.58, tier));
    return {
      tier,
      kind,
      target,
      rewardFunds: Math.floor(22000 * Math.pow(1.58, tier)),
      rewardInfluence: Math.floor(36 * Math.pow(1.4, tier)),
      rewardInsight: Math.floor(10 * Math.pow(1.24, tier)),
      done: false,
      claimed: false,
      title: "研究突破计划",
      desc: "洞察库存达到目标值。",
    };
  }

  const target = Math.floor(24 + tier * 8.5);
  return {
    tier,
    kind,
    target,
    rewardFunds: Math.floor(18000 * Math.pow(1.55, tier)),
    rewardInfluence: Math.floor(34 * Math.pow(1.38, tier)),
    rewardInsight: Math.floor(9 * Math.pow(1.22, tier)),
    done: false,
    claimed: false,
    title: "基础设施拓展",
    desc: "建筑总量达到目标值。",
  };
}

function getQuestProgress(quest) {
  if (!quest) return 0;
  if (quest.kind === "funds") return state.funds;
  if (quest.kind === "users") return state.users;
  if (quest.kind === "influence") return state.influence;
  if (quest.kind === "allTimeFunds") return state.allTimeFunds;
  if (quest.kind === "insight") return state.insight;
  if (quest.kind === "buildingCount") {
    return Object.values(state.buildings).reduce((sum, v) => sum + v, 0);
  }
  return 0;
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
  const mods = getCombinedMods();
  const qMult = mods.questRewardMult || 1;
  const rewardFunds = Math.floor(state.quest.rewardFunds * qMult);
  const rewardInfluence = Math.floor(state.quest.rewardInfluence * qMult);
  const rewardInsight = Math.floor((state.quest.rewardInsight || 0) * qMult);

  addFunds(rewardFunds);
  state.influence += rewardInfluence;
  state.insight += rewardInsight;
  state.quest.claimed = true;
  state.completedQuests += 1;
  addLog(
    `领取任务奖励：+${formatNum(rewardFunds)} 资金，+${formatNum(rewardInfluence)} 影响力，+${formatNum(rewardInsight)} 洞察`,
    "good"
  );
  state.questTier += 1;
  state.quest = generateQuest(state.questTier);
  checkAchievements();
  renderAll();
}

function checkAchievements(allowLog = true) {
  if (!state) return;
  if (!state.achievementUnlocked || typeof state.achievementUnlocked !== "object") {
    state.achievementUnlocked = {};
  }

  for (const def of ACHIEVEMENT_DEFS) {
    if (state.achievementUnlocked[def.id]) continue;
    if (!def.check(state)) continue;
    state.achievementUnlocked[def.id] = Date.now();
    if (allowLog) {
      addLog(`成就达成：${def.title}`, "good");
    }
  }
}

function updateEconomyOneSecond() {
  if (!state) return;

  maybeUpdateEvent();

  const mods = getCombinedMods();
  const b = state.buildings;
  state.playedSeconds += 1;

  const dataGain = b.sensor * getBuildingDef("sensor").baseOut * mods.dataMult;
  const computeGain = b.gpu * getBuildingDef("gpu").baseOut * mods.computeMult;

  state.data += dataGain;
  state.compute += computeGain;

  let fundsThisTick = 0;
  let influenceThisTick = 0;

  // Anti-softlock baseline monetization: early generators always yield stable cashflow.
  const sensorLicenseFunds = getSensorLicenseFundsPerSecond(b.sensor, mods);
  const gpuLeaseFunds = getGpuLeaseFundsPerSecond(b.gpu, mods);
  const baselineFunds = sensorLicenseFunds + gpuLeaseFunds;
  if (baselineFunds > 0) {
    addFunds(baselineFunds);
    fundsThisTick += baselineFunds;
  }

  const studioCapacity = b.studio * getBuildingDef("studio").baseOut * mods.prodCapMult;
  if (studioCapacity > 0 && state.data > 0 && state.compute > 0) {
    const byData = state.data / ECONOMY.studioDataUsePerUnit;
    const byCompute = state.compute / ECONOMY.studioComputeUsePerUnit;
    const throughput = Math.max(0, Math.min(studioCapacity, byData, byCompute));

    if (throughput > 0) {
      state.data -= throughput * ECONOMY.studioDataUsePerUnit;
      state.compute -= throughput * ECONOMY.studioComputeUsePerUnit;

      const usersGain = throughput * ECONOMY.studioUsersPerUnit * mods.userGrowthMult;
      const productFunds = throughput * ECONOMY.studioFundsPerUnit * mods.studioFundsMult * mods.revenueMult;
      state.users += usersGain;
      addFunds(productFunds);
      fundsThisTick += productFunds;
    }
  }

  if (b.media > 0) {
    const mediaFunds = getMediaFundsPerSecond(b.media, state.users, mods);
    const mediaInfluence = b.media * (0.25 + Math.sqrt(Math.max(0, state.users)) * 0.0065) * mods.influenceMult;

    addFunds(mediaFunds);
    state.influence += mediaInfluence;
    fundsThisTick += mediaFunds;
    influenceThisTick += mediaInfluence;
  }

  if (b.lab > 0) {
    const labCapacity = b.lab * getBuildingDef("lab").baseOut * mods.labMult;
    const byData = state.data / ECONOMY.labDataUsePerUnit;
    const byCompute = state.compute / ECONOMY.labComputeUsePerUnit;
    const throughput = Math.max(0, Math.min(labCapacity, byData, byCompute));

    if (throughput > 0) {
      state.data -= throughput * ECONOMY.labDataUsePerUnit;
      state.compute -= throughput * ECONOMY.labComputeUsePerUnit;

      const insightGain = throughput * ECONOMY.labInsightPerUnit;
      const labInfluence = throughput * ECONOMY.labInfluencePerUnit * mods.influenceMult;
      addInsight(insightGain);
      state.influence += labInfluence;
      influenceThisTick += labInfluence;
    }

    const labFunds = getLabFundsPerSecond(b.lab, mods);
    addFunds(labFunds);
    fundsThisTick += labFunds;
  }

  if (b.exchange > 0 && state.insight > 0 && state.users > 0) {
    const dealCapacity = b.exchange * getBuildingDef("exchange").baseOut * mods.exchangeMult;
    const byInsight = state.insight / ECONOMY.exchangeInsightUsePerUnit;
    const byUsers = state.users / ECONOMY.exchangeUsersUsePerUnit;
    const deals = Math.max(0, Math.min(dealCapacity, byInsight, byUsers));

    if (deals > 0) {
      state.insight -= deals * ECONOMY.exchangeInsightUsePerUnit;
      state.users -= deals * ECONOMY.exchangeUsersUsePerUnit * 0.38;

      const contractFunds = deals * ECONOMY.exchangeFundsPerUnit * mods.exchangeMult * mods.revenueMult;
      const contractInfluence = deals * ECONOMY.exchangeInfluencePerUnit * mods.influenceMult;
      addFunds(contractFunds);
      state.influence += contractInfluence;
      fundsThisTick += contractFunds;
      influenceThisTick += contractInfluence;
    }

    const exchangePassive = getExchangeFundsPerSecond(b.exchange, mods);
    addFunds(exchangePassive);
    fundsThisTick += exchangePassive;
  }

  const userDecayRate = clamp(0.00095 / mods.userGrowthMult, 0.00016, 0.0013);
  const userLoss = state.users * userDecayRate;
  state.users = Math.max(0, state.users - userLoss);
  state.insight = Math.max(0, state.insight - state.insight * 0.00012);

  state.avgFundsPerSec = state.avgFundsPerSec * 0.84 + fundsThisTick * 0.16;
  state.history.push(state.funds);
  state.history = state.history.slice(-120);

  state.data = Math.max(0, state.data);
  state.compute = Math.max(0, state.compute);
  state.influence = Math.max(0, state.influence);
  state.maxUsers = Math.max(state.maxUsers, state.users);
  state.maxInfluence = Math.max(state.maxInfluence, state.influence);
  state.maxInsight = Math.max(state.maxInsight, state.insight);

  checkQuest();
  checkAchievements(influenceThisTick > 0 || fundsThisTick > 0);
}

function simulateOffline(seconds) {
  if (!state) return;

  const mods = getCombinedMods();
  const offlineCap = Math.max(60, Math.floor(mods.offlineCapSeconds || ECONOMY.baseOfflineCapSeconds));
  const clamped = Math.floor(clamp(seconds, 0, offlineCap));
  if (clamped <= 0) return;

  for (let i = 0; i < clamped; i++) {
    updateEconomyOneSecond();
  }

  if (seconds > clamped) {
    addLog(`离线补算完成：${clamped} 秒（已触及离线上限）`, "good");
  } else {
    addLog(`离线补算完成：${clamped} 秒`, "good");
  }
}

function getLegacyUpgradeCost(def, currentLevel) {
  return Math.max(1, Math.ceil(def.baseCost * Math.pow(def.costScale, currentLevel)));
}

function buyLegacyUpgrade(id) {
  if (!state || !state.legacy) return;

  const def = LEGACY_UPGRADE_DEFS.find((d) => d.id === id);
  if (!def) return;

  const currentLevel = getLegacyLevel(id);
  if (currentLevel >= def.maxLevel) return;

  const cost = getLegacyUpgradeCost(def, currentLevel);
  if (state.legacy.points < cost) return;

  state.legacy.points -= cost;
  state.legacy.spent += cost;
  state.legacy.upgrades[id] = currentLevel + 1;
  addLog(`遗产科技升级：${def.name} Lv.${currentLevel + 1}`, "good");
  renderAll();
}

function calcPotentialLegacyGain() {
  if (!state) return 0;
  const mods = getCombinedMods();
  const totalFunds = Math.max(0, state.allTimeFunds);
  const wealthTerm = Math.max(0, Math.log10(totalFunds + 1) - 4);
  const influenceTerm = Math.sqrt(Math.max(0, state.maxInfluence)) / 7;
  const usersTerm = Math.sqrt(Math.max(0, state.maxUsers)) / 18;
  const questTerm = Math.sqrt(Math.max(0, state.completedQuests)) * 0.6;

  const gross = (wealthTerm * wealthTerm * 1.45 + influenceTerm + usersTerm + questTerm) * (mods.legacyGainMult || 1);
  const absolute = Math.floor(gross);
  return Math.max(0, absolute - (state.legacy?.totalEarned || 0));
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

  const oldLegacy = {
    points: state.legacy?.points || 0,
    totalEarned: state.legacy?.totalEarned || 0,
    spent: state.legacy?.spent || 0,
    upgrades: { ...(state.legacy?.upgrades || {}) },
  };
  const oldAllTime = state.allTimeFunds;
  const oldTier = state.questTier;
  const oldAchievement = { ...(state.achievementUnlocked || {}) };
  const oldCompletedQuests = state.completedQuests || 0;
  const oldMaxUsers = state.maxUsers || 0;
  const oldMaxInfluence = state.maxInfluence || 0;
  const oldMaxInsight = state.maxInsight || 0;
  const oldEras = state.eras || 0;

  oldLegacy.points += gain;
  oldLegacy.totalEarned += gain;

  state = defaultState();
  state.legacy = oldLegacy;
  state.funds = calcStartingFundsForLegacy(oldLegacy);
  state.history = [state.funds];
  state.allTimeFunds = oldAllTime;
  state.questTier = Math.max(0, Math.floor(oldTier * 0.55));
  state.quest = generateQuest(state.questTier);
  state.achievementUnlocked = oldAchievement;
  state.completedQuests = oldCompletedQuests;
  state.maxUsers = oldMaxUsers;
  state.maxInfluence = oldMaxInfluence;
  state.maxInsight = oldMaxInsight;
  state.eras = oldEras + 1;
  addLog(`时代重构完成，新增遗产点 ${gain}。`, "good");
  checkAchievements(false);

  saveState(true);
  renderAll();
}

function saveState(silent = true) {
  if (!state || !currentSlot) return;

  if (!silent) addLog("已手动存档", "neutral");
  state.version = VERSION;
  state.legacyPoints = state.legacy?.points || 0;
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
    checkAchievements(false);
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
    checkAchievements(false);
    addLog(`已在栏位 ${safeSlot} 创建新存档。`, "good");
    return;
  }

  try {
    const raw = localStorage.getItem(getSlotStorageKey(safeSlot));
    if (!raw) {
      state = defaultState();
      state.quest = generateQuest(0);
      checkAchievements(false);
      addLog(`栏位 ${safeSlot} 为空，已创建新存档。`, "good");
      return;
    }

    const parsed = JSON.parse(raw);
    state = mergeSave(parsed);
    checkAchievements(false);

    const deltaSec = Math.floor((Date.now() - (state.lastTickAt || Date.now())) / 1000);
    if (deltaSec > 2) simulateOffline(deltaSec);
  } catch (err) {
    state = defaultState();
    state.quest = generateQuest(0);
    checkAchievements(false);
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
  els.insight.textContent = "0";
  els.legacy.textContent = "0";
  if (els.legacyBank) {
    els.legacyBank.textContent = "可用遗产点：0";
  }

  els.eventBanner.textContent = "请先选择一个存档栏位";
  els.pps.textContent = "每秒产出：0 资金";

  els.rebootBtn.textContent = "重构时代";
  els.buildingList.innerHTML = '<div class="item-meta">选择存档后可开始游戏。</div>';
  els.upgradeList.innerHTML = '<div class="item-meta">选择存档后可开始游戏。</div>';
  if (els.legacyList) {
    els.legacyList.innerHTML = '<div class="item-meta">选择存档后可开始游戏。</div>';
  }
  if (els.achievementBox) {
    els.achievementBox.innerHTML = "请选择存档栏位";
  }
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
        遗产点：${formatNum(summary.legacyPoints)}<br>
        已重构：${formatNum(summary.eras)} 次
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
  els.insight.textContent = formatNum(state.insight);
  els.legacy.textContent = formatNum(state.legacy?.points || 0);
  if (els.legacyBank) {
    const total = state.legacy?.totalEarned || 0;
    els.legacyBank.textContent = `可用遗产点：${formatNum(state.legacy?.points || 0)} / 累计：${formatNum(total)}`;
  }

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
    let outputPerSec = def.baseOut * owned;
    if (def.id === "sensor") outputPerSec *= mods.dataMult;
    if (def.id === "gpu") outputPerSec *= mods.computeMult;
    if (def.id === "studio") outputPerSec *= mods.prodCapMult;
    if (def.id === "media") outputPerSec *= mods.influenceMult;
    if (def.id === "lab") outputPerSec *= mods.labMult;
    if (def.id === "exchange") outputPerSec *= mods.exchangeMult;

    let passiveFunds = 0;
    let extraLine = "";

    if (def.id === "sensor") {
      passiveFunds = getSensorLicenseFundsPerSecond(owned, mods);
    } else if (def.id === "gpu") {
      passiveFunds = getGpuLeaseFundsPerSecond(owned, mods);
    } else if (def.id === "media") {
      passiveFunds = getMediaFundsPerSecond(owned, state.users, mods);
      extraLine = `<div class="item-meta">影响力增益：${formatNum(owned * (0.25 + Math.sqrt(Math.max(0, state.users)) * 0.0065) * mods.influenceMult)} /秒</div>`;
    } else if (def.id === "lab") {
      passiveFunds = getLabFundsPerSecond(owned, mods);
      extraLine = `<div class="item-meta">研究消耗：每单位需 ${ECONOMY.labDataUsePerUnit} 数据 + ${ECONOMY.labComputeUsePerUnit} 算力</div>`;
    } else if (def.id === "exchange") {
      passiveFunds = getExchangeFundsPerSecond(owned, mods);
      extraLine = `<div class="item-meta">交易消耗：每单位需 ${ECONOMY.exchangeInsightUsePerUnit} 洞察 + ${ECONOMY.exchangeUsersUsePerUnit} 用户</div>`;
    }

    if (def.id === "studio") {
      extraLine = `<div class="item-meta">加工消耗：每单位需 ${ECONOMY.studioDataUsePerUnit} 数据 + ${ECONOMY.studioComputeUsePerUnit} 算力</div>`;
    }

    const passiveLine = passiveFunds > 0 ? `<div class="item-meta">基础现金流：${formatNum(passiveFunds)} 资金/秒</div>` : "";

    html += `
      <div class="item-card">
        <div class="item-title">
          <strong>${def.name}</strong>
          <span class="small">持有 ${formatNum(owned)}</span>
        </div>
        <div class="item-meta">${def.desc}</div>
        <div class="item-meta">当前产能：${formatNum(outputPerSec)} ${def.outLabel}</div>
        ${passiveLine}
        ${extraLine}
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
    const reqMet = isUpgradeRequirementMet(up);
    const costInsight = up.costInsight || 0;
    const affordable = state.funds >= up.costFunds && state.influence >= up.costInfluence && state.insight >= costInsight;
    const disabled = owned || !reqMet || !affordable;
    const reqText = getUpgradeRequirementText(up);
    const statusText = owned ? "已升级" : reqMet ? "可升级" : "前置不足";
    const costText = `${formatNum(up.costFunds)} 资金 / ${formatNum(up.costInfluence)} 影响力${costInsight > 0 ? ` / ${formatNum(costInsight)} 洞察` : ""}`;

    html += `
      <div class="item-card">
        <div class="item-title">
          <strong>${up.name}</strong>
          <span class="small">${statusText}</span>
        </div>
        <div class="item-meta">${up.desc}</div>
        ${reqText ? `<div class="item-meta">解锁条件：${reqText}</div>` : ""}
        <div class="item-actions">
          <span class="small">${costText}</span>
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
    <div class="subtle">奖励：${formatNum(q.rewardFunds)} 资金 + ${formatNum(q.rewardInfluence)} 影响力 + ${formatNum(q.rewardInsight || 0)} 洞察</div>
    <div class="subtle">已完成任务：${formatNum(state.completedQuests || 0)} 次</div>
    <div style="margin-top:8px;">
      <button class="btn" data-action="claim-quest" ${q.done && !q.claimed ? "" : "disabled"}>领取奖励</button>
    </div>
  `;
}

function renderLegacyLab() {
  if (!state || !els.legacyList) return;

  let html = "";
  for (const def of LEGACY_UPGRADE_DEFS) {
    const level = getLegacyLevel(def.id);
    const maxed = level >= def.maxLevel;
    const cost = getLegacyUpgradeCost(def, level);
    const canBuy = !maxed && state.legacy.points >= cost;
    const btnLabel = maxed ? "满级" : `研究 (-${cost})`;

    html += `
      <div class="item-card">
        <div class="item-title">
          <strong>${def.name}</strong>
          <span class="small">Lv.${level}/${def.maxLevel}</span>
        </div>
        <div class="item-meta">${def.desc}</div>
        <div class="item-actions">
          <span class="small">${maxed ? "已达上限" : `消耗 ${formatNum(cost)} 遗产点`}</span>
          <button class="btn small" data-action="buy-legacy" data-id="${def.id}" ${canBuy ? "" : "disabled"}>${btnLabel}</button>
        </div>
      </div>
    `;
  }

  els.legacyList.innerHTML = html;
}

function renderAchievements() {
  if (!state || !els.achievementBox) return;
  const unlocked = state.achievementUnlocked || {};
  const unlockedCount = ACHIEVEMENT_DEFS.filter((d) => !!unlocked[d.id]).length;

  const rows = ACHIEVEMENT_DEFS.map((def) => {
    const ts = unlocked[def.id];
    if (ts) {
      return `<div class="achievement-row unlocked"><strong>${def.title}</strong><div class="subtle">${def.desc}</div><div class="subtle">达成时间：${formatDateTime(ts)}</div></div>`;
    }
    return `<div class="achievement-row locked"><strong>${def.title}</strong><div class="subtle">${def.desc}</div></div>`;
  }).join("");

  els.achievementBox.innerHTML = `
    <div class="subtle">完成度：${unlockedCount} / ${ACHIEVEMENT_DEFS.length}</div>
    <div class="subtle">重构次数：${formatNum(state.eras || 0)}</div>
    <div style="margin-top:8px; display:grid; gap:8px;">
      ${rows}
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
  renderLegacyLab();
  renderQuest();
  renderAchievements();
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

    if (action === "buy-legacy") {
      buyLegacyUpgrade(t.dataset.id);
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
    insight: document.getElementById("insight"),
    legacy: document.getElementById("legacy"),
    buildingList: document.getElementById("buildingList"),
    upgradeList: document.getElementById("upgradeList"),
    legacyList: document.getElementById("legacyList"),
    legacyBank: document.getElementById("legacyBank"),
    questBox: document.getElementById("questBox"),
    achievementBox: document.getElementById("achievementBox"),
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
