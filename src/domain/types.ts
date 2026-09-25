// 地毯修复档案 · 报价确认流程 领域模型

/** 分项类型：基础面积 / 破损修复 / 补线色号 */
export type ItemKind = "area" | "damage" | "thread";

/**
 * 分项状态：
 * - new     新增项，待客户确认（未开始的增项停在待确认）
 * - carried 上一版本已确认、沿用到当前版本
 * - locked  对应工序已完成，金额锁定保留，不受后续变更影响
 */
export type ItemState = "new" | "carried" | "locked";

export interface QuoteItem {
  id: string;
  kind: ItemKind;
  label: string;
  detail: string;
  /** 面积 m² / 破损处数 / 补线绞数 */
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
  state: ItemState;
  /** 补线色卡编号，仅 thread 分项有值 */
  code?: string;
}

/** 估价单版本状态 */
export type VersionStatus = "pending" | "confirmed" | "superseded";

export interface QuoteVersion {
  id: string;
  /** 版本号，从 1 递增 */
  no: number;
  createdAt: number;
  /** 变更原因（首版为"首次估价"） */
  reason: string;
  items: QuoteItem[];
  total: number;
  status: VersionStatus;
  confirmedAt?: number;
}

export type StepStatus = "queued" | "in_progress" | "done";

export interface RepairStep {
  id: string;
  name: string;
  status: StepStatus;
  /** 关联的报价分项 id，工序完成时这些分项金额锁定 */
  itemIds: string[];
}

export interface Archive {
  id: string;
  code: string;
  name: string;
  origin: string;
  era: string;
  material: string;
  knotDensity: number;
  dyeType: string;
  /** 修复面积 m² */
  area: number;
  versions: QuoteVersion[];
  steps: RepairStep[];
}

/** 师傅发起的变更 */
export type Change =
  | { type: "damage"; damageType: string; spots: number }
  | { type: "thread"; code: string; skeins: number };
