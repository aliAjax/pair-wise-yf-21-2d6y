// 估价单领域模型与计价逻辑（纯函数，便于测试与持久化）

export interface DamageType {
  key: string;
  unitPrice: number; // 元 / cm²
}

export interface ColorCard {
  code: string;
  name: string;
  dye: string;
  surcharge: number; // 色料加价（元 / 色）
  hex: string;
}

// 工种单价：分项金额 = 面积 × 工种单价 + 色料加价
export const DAMAGE_TYPES: DamageType[] = [
  { key: "破洞织补", unitPrice: 14 },
  { key: "边缘磨损", unitPrice: 9 },
  { key: "缺线补线", unitPrice: 7 },
  { key: "褪色补色", unitPrice: 5 },
];

export const COLOR_CARDS: ColorCard[] = [
  { code: "DYE-01", name: "茜草红", dye: "植物染", surcharge: 60, hex: "#9f1d32" },
  { code: "DYE-02", name: "靛蓝", dye: "植物染", surcharge: 65, hex: "#1f3a5f" },
  { code: "DYE-03", name: "石榴皮黄", dye: "植物染", surcharge: 55, hex: "#d9a441" },
  { code: "DYE-04", name: "矿物赭石", dye: "矿物染", surcharge: 45, hex: "#8a4b2a" },
  { code: "DYE-05", name: "羊毛本色", dye: "原色", surcharge: 20, hex: "#e8dcc3" },
  { code: "DYE-06", name: "复原青金", dye: "稀有复原色", surcharge: 90, hex: "#2f6f6a" },
];

export type Progress = "not-started" | "in-progress" | "done";

export interface DamageItem {
  id: string;
  damageType: string;
  area: number; // cm²
  colorCode: string;
  progress: Progress;
  addedAtVersion: number; // 0 = 尚未入单的草稿增项
}

export interface QuoteLine {
  itemId: string;
  damageType: string;
  area: number;
  colorCode: string;
  unitPrice: number;
  colorSurcharge: number;
  amount: number;
}

export type VersionStatus = "pending" | "confirmed" | "superseded";

export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  pending: "待客户确认",
  confirmed: "已确认",
  superseded: "已失效",
};

export interface QuoteVersion {
  version: number;
  status: VersionStatus;
  reason: string; // 变更原因
  lines: QuoteLine[];
  total: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface RugQuote {
  items: DamageItem[];
  versions: QuoteVersion[];
}

export const emptyQuote: RugQuote = { items: [], versions: [] };

export function damageTypeOf(key: string): DamageType {
  return DAMAGE_TYPES.find((t) => t.key === key) ?? DAMAGE_TYPES[0];
}

export function colorOf(code: string): ColorCard {
  return COLOR_CARDS.find((c) => c.code === code) ?? COLOR_CARDS[0];
}

export function quoteLineFor(item: DamageItem): QuoteLine {
  const unitPrice = damageTypeOf(item.damageType).unitPrice;
  const colorSurcharge = colorOf(item.colorCode).surcharge;
  return {
    itemId: item.id,
    damageType: item.damageType,
    area: item.area,
    colorCode: item.colorCode,
    unitPrice,
    colorSurcharge,
    amount: Math.round((item.area * unitPrice + colorSurcharge) * 100) / 100,
  };
}

export function sumLines(lines: QuoteLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
}

export function latestVersion(quote: RugQuote): QuoteVersion | undefined {
  return quote.versions[quote.versions.length - 1];
}

export interface DraftChanges {
  additions: DamageItem[];
  recolors: { item: DamageItem; from: string }[];
  changed: boolean;
}

// 对比当前项目清单与最新一版估价单，找出未提交的变更
export function draftChanges(quote: RugQuote): DraftChanges {
  const latest = latestVersion(quote);
  if (!latest) {
    return { additions: [...quote.items], recolors: [], changed: quote.items.length > 0 };
  }
  const additions = quote.items.filter((it) => !latest.lines.some((l) => l.itemId === it.id));
  const recolors = quote.items
    .map((item) => {
      const line = latest.lines.find((l) => l.itemId === item.id);
      return line && line.colorCode !== item.colorCode ? { item, from: line.colorCode } : null;
    })
    .filter((x): x is { item: DamageItem; from: string } => x !== null);
  return { additions, recolors, changed: additions.length > 0 || recolors.length > 0 };
}

// 根据变更内容自动生成变更原因，师傅可再改写
export function autoReason(quote: RugQuote, changes: DraftChanges): string {
  if (quote.versions.length === 0) return "首次报价";
  const parts: string[] = [];
  if (changes.additions.length > 0) {
    parts.push(
      "追加破损：" +
        changes.additions.map((it) => `${it.damageType} ${it.area}cm²（${it.colorCode}）`).join("、")
    );
  }
  if (changes.recolors.length > 0) {
    parts.push(
      "换色号：" +
        changes.recolors.map((r) => `${r.item.damageType} ${r.from}→${r.item.colorCode}`).join("、")
    );
  }
  return parts.join("；") || "例行调整";
}

// 生成新版本：旧版本全部标记失效，草稿增项归入新版本
export function createVersion(quote: RugQuote, reason: string, now: string): RugQuote {
  const versionNo = quote.versions.length + 1;
  const lines = quote.items.map(quoteLineFor);
  const versions: QuoteVersion[] = quote.versions.map((v) =>
    v.status === "superseded" ? v : { ...v, status: "superseded" }
  );
  versions.push({
    version: versionNo,
    status: "pending",
    reason,
    lines,
    total: sumLines(lines),
    createdAt: now,
  });
  const items = quote.items.map((it) =>
    it.addedAtVersion === 0 ? { ...it, addedAtVersion: versionNo } : it
  );
  return { items, versions };
}

export function confirmCurrent(quote: RugQuote, now: string): RugQuote {
  const versions = quote.versions.map((v, i) =>
    i === quote.versions.length - 1 && v.status === "pending"
      ? { ...v, status: "confirmed" as VersionStatus, confirmedAt: now }
      : v
  );
  return { ...quote, versions };
}

export type WorkState = "done" | "blocked" | "ready" | "working";

// 工序门禁：只有当前版本已确认、且该项目的色号与入单一致时才允许施工
export function workStateOf(item: DamageItem, quote: RugQuote): WorkState {
  if (item.progress === "done") return "done";
  const latest = latestVersion(quote);
  if (!latest || latest.status !== "confirmed") return "blocked";
  const line = latest.lines.find((l) => l.itemId === item.id);
  if (!line || line.colorCode !== item.colorCode) return "blocked";
  return item.progress === "in-progress" ? "working" : "ready";
}

// 首次打开的演示数据：一单一 rug 一份报价档案
export function seedQuoteBook(): Record<string, RugQuote> {
  const car092Items: DamageItem[] = [
    { id: "D-092-1", damageType: "边缘磨损", area: 18, colorCode: "DYE-05", progress: "done", addedAtVersion: 1 },
    { id: "D-092-2", damageType: "破洞织补", area: 6.5, colorCode: "DYE-01", progress: "not-started", addedAtVersion: 2 },
  ];
  const v1Lines = [quoteLineFor(car092Items[0])];
  const v2Lines = car092Items.map(quoteLineFor);
  return {
    "CAR-092": {
      items: car092Items,
      versions: [
        {
          version: 1,
          status: "superseded",
          reason: "首次报价",
          lines: v1Lines,
          total: sumLines(v1Lines),
          createdAt: "2026-09-18T10:00:00+08:00",
          confirmedAt: "2026-09-18T15:20:00+08:00",
        },
        {
          version: 2,
          status: "pending",
          reason: "师傅拆边时发现边角破洞，追加织补",
          lines: v2Lines,
          total: sumLines(v2Lines),
          createdAt: "2026-09-23T11:10:00+08:00",
        },
      ],
    },
    "CAR-117": {
      items: [
        { id: "D-117-1", damageType: "缺线补线", area: 12, colorCode: "DYE-02", progress: "not-started", addedAtVersion: 0 },
      ],
      versions: [],
    },
    "CAR-138": { items: [], versions: [] },
  };
}
