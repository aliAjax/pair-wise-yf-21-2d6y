// 估价单 / 变更 / 工序的核心规则（纯函数，便于核对）
import {
  BASE_RATE_PER_SQM,
  DAMAGE_RATES,
  THREAD_UNIT,
  damageLabel,
  threadColor,
} from "./pricing";
import type {
  Archive,
  Change,
  ItemState,
  QuoteItem,
  QuoteVersion,
  RepairStep,
} from "./types";

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function itemAmount(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

export function currentVersion(a: Archive): QuoteVersion {
  return a.versions[a.versions.length - 1];
}

export function buildAreaItem(area: number, state: ItemState = "new"): QuoteItem {
  return {
    id: uid("it"),
    kind: "area",
    label: "基础修复（按面积）",
    detail: `${area} m² × ${BASE_RATE_PER_SQM} 元/m²`,
    qty: area,
    unit: "m²",
    unitPrice: BASE_RATE_PER_SQM,
    amount: itemAmount(area, BASE_RATE_PER_SQM),
    state,
  };
}

export function buildDamageItem(
  damageType: string,
  spots: number,
  state: ItemState = "new"
): QuoteItem {
  const rate = DAMAGE_RATES[damageType];
  return {
    id: uid("it"),
    kind: "damage",
    label: `破损修复 · ${rate.label}`,
    detail: `${spots} 处 × ${rate.unitPrice} 元/处`,
    qty: spots,
    unit: rate.unit,
    unitPrice: rate.unitPrice,
    amount: itemAmount(spots, rate.unitPrice),
    state,
  };
}

export function buildThreadItem(
  code: string,
  skeins: number,
  state: ItemState = "new"
): QuoteItem {
  const color = threadColor(code);
  if (!color) throw new Error(`未知色号 ${code}`);
  return {
    id: uid("it"),
    kind: "thread",
    label: `补线 ${color.code} ${color.name}`,
    detail: `${skeins} 绞 × ${color.unitPrice} 元/绞`,
    qty: skeins,
    unit: THREAD_UNIT,
    unitPrice: color.unitPrice,
    amount: itemAmount(skeins, color.unitPrice),
    state,
    code: color.code,
  };
}

export function sumItems(items: QuoteItem[]): number {
  return items.reduce((s, it) => s + it.amount, 0);
}

/** 由工序进度推导分项状态：已完成工序关联的分项金额锁定保留 */
export function deriveStates(
  items: QuoteItem[],
  steps: RepairStep[]
): QuoteItem[] {
  const lockedIds = new Set(
    steps.filter((s) => s.status === "done").flatMap((s) => s.itemIds)
  );
  return items.map((it) =>
    lockedIds.has(it.id) && it.state !== "locked"
      ? { ...it, state: "locked" as ItemState }
      : it
  );
}

/**
 * 生成下一版本：
 * - 旧版本全部标记失效（superseded）
 * - 已完成工序的分项锁定保留；已确认分项沿用；
 *   上一版未确认的增项继续以"待确认"保留（除非被本次变更替换）
 * - 新增分项为待确认，新版本整体待客户确认后才能继续施工
 */
function nextVersion(
  a: Archive,
  reason: string,
  newItems: QuoteItem[],
  now: number,
  dropItem?: (item: QuoteItem) => boolean
): QuoteVersion[] {
  const cur = currentVersion(a);
  const carried = cur.items
    .filter((it) => it.state === "locked" || !(dropItem?.(it) ?? false))
    .map((it) => ({ ...it }));
  const items = deriveStates([...carried, ...newItems], a.steps);
  const version: QuoteVersion = {
    id: uid("v"),
    no: cur.no + 1,
    createdAt: now,
    reason,
    items,
    total: sumItems(items),
    status: "pending",
  };
  const versions = a.versions.map((v) =>
    v.status === "superseded" ? v : { ...v, status: "superseded" as const }
  );
  return [...versions, version];
}

/** 师傅追加破损：新增破损分项 + 排队工序，生成待确认新版本 */
export function addDamage(
  a: Archive,
  damageType: string,
  spots: number,
  now: number
): Archive {
  const item = buildDamageItem(damageType, spots);
  const step: RepairStep = {
    id: uid("st"),
    name: `破损修补 · ${damageLabel(damageType)} ${spots} 处`,
    status: "queued",
    itemIds: [item.id],
  };
  const reason = `追加破损：${damageLabel(damageType)} ${spots} 处`;
  return {
    ...a,
    versions: nextVersion(a, reason, [item], now),
    steps: [...a.steps, step],
  };
}

/** 师傅更换补线色号：未开工的补线分项被替换，生成待确认新版本 */
export function changeThread(
  a: Archive,
  code: string,
  skeins: number,
  now: number
): Archive {
  const item = buildThreadItem(code, skeins);
  const color = threadColor(code)!;
  const reason = `更换补线色号：${color.code} ${color.name} × ${skeins} 绞`;
  const versions = nextVersion(
    a,
    reason,
    [item],
    now,
    // 未完工的补线项不沿用（已完工的补线金额锁定保留）
    (it) => it.kind === "thread"
  );

  // 未开始的补线工序更新为新色号；进行中/已完成的保留原名
  const steps = a.steps.map((s) =>
    s.status === "queued" && s.name.startsWith("补线")
      ? { ...s, name: `补线配色 · ${color.code} ${color.name}` }
      : s
  );
  const hasThreadStep = steps.some((s) => s.name.startsWith("补线"));
  const finalSteps = hasThreadStep
    ? steps
    : [
        ...steps,
        {
          id: uid("st"),
          name: `补线配色 · ${color.code} ${color.name}`,
          status: "queued" as const,
          itemIds: [],
        },
      ];
  return { ...a, versions, steps: finalSteps };
}

/** 客户确认当前版本：全部待确认分项转为已确认，之后才能施工 */
export function confirmCurrent(a: Archive, now: number): Archive {
  const versions = a.versions.map((v, i) => {
    if (i !== a.versions.length - 1) return v;
    return {
      ...v,
      status: "confirmed" as const,
      confirmedAt: now,
      items: v.items.map((it) =>
        it.state === "new" ? { ...it, state: "carried" as ItemState } : it
      ),
    };
  });
  return { ...a, versions };
}

/** 推进工序：仅当前版本已确认后允许；完成的工序锁定对应分项金额 */
export function advanceStep(a: Archive, stepId: string): Archive {
  if (currentVersion(a).status !== "confirmed") return a;
  const steps = a.steps.map((s) => {
    if (s.id !== stepId || s.status === "done") return s;
    const status: RepairStep["status"] =
      s.status === "queued" ? "in_progress" : "done";
    return { ...s, status };
  });
  const versions = a.versions.map((v, i) =>
    i === a.versions.length - 1
      ? { ...v, items: deriveStates(v.items, steps) }
      : v
  );
  return { ...a, steps, versions };
}

export interface NewArchiveInput {
  code: string;
  name: string;
  origin: string;
  era: string;
  material: string;
  knotDensity: number;
  dyeType: string;
  area: number;
  damageType: string;
  damageSpots: number;
  threadCode: string;
  threadSkeins: number;
}

/** 新档案接单：按面积、破损处、补线色号算出分项，生成 V1 待确认估价单 */
export function createArchive(input: NewArchiveInput, now: number): Archive {
  const items: QuoteItem[] = [buildAreaItem(input.area)];
  const steps: RepairStep[] = [
    {
      id: uid("st"),
      name: "基础修复 · 织补打底",
      status: "queued",
      itemIds: [items[0].id],
    },
  ];
  if (input.damageSpots > 0) {
    const item = buildDamageItem(input.damageType, input.damageSpots);
    items.push(item);
    steps.push({
      id: uid("st"),
      name: `破损修补 · ${damageLabel(input.damageType)} ${input.damageSpots} 处`,
      status: "queued",
      itemIds: [item.id],
    });
  }
  if (input.threadSkeins > 0) {
    const item = buildThreadItem(input.threadCode, input.threadSkeins);
    items.push(item);
    steps.push({
      id: uid("st"),
      name: `补线配色 · ${item.code} ${threadColor(input.threadCode)!.name}`,
      status: "queued",
      itemIds: [item.id],
    });
  }
  const version: QuoteVersion = {
    id: uid("v"),
    no: 1,
    createdAt: now,
    reason: "首次估价",
    items,
    total: sumItems(items),
    status: "pending",
  };
  return {
    id: uid("a"),
    code: input.code,
    name: input.name,
    origin: input.origin,
    era: input.era,
    material: input.material,
    knotDensity: input.knotDensity,
    dyeType: input.dyeType,
    area: input.area,
    versions: [version],
    steps,
  };
}

export function applyChange(a: Archive, change: Change, now: number): Archive {
  return change.type === "damage"
    ? addDamage(a, change.damageType, change.spots, now)
    : changeThread(a, change.code, change.skeins, now);
}
