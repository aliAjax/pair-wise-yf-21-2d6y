// 工作室公开价目：所有分项金额 = 数量 × 单价，客户可对照核算

/** 基础修复费（按面积，元/m²） */
export const BASE_RATE_PER_SQM = 800;

export interface DamageRate {
  label: string;
  unitPrice: number;
  unit: string;
}

/** 破损修复费（按处计价） */
export const DAMAGE_RATES: Record<string, DamageRate> = {
  edge_wear: { label: "边缘磨损", unitPrice: 260, unit: "处" },
  hole: { label: "破洞织补", unitPrice: 420, unit: "处" },
  moth: { label: "虫蛀修补", unitPrice: 300, unit: "处" },
  tear: { label: "撕裂缝合", unitPrice: 380, unit: "处" },
  stain: { label: "霉斑处理", unitPrice: 200, unit: "处" },
};

export interface ThreadColor {
  code: string;
  name: string;
  hex: string;
  /** 元/绞 */
  unitPrice: number;
}

/** 补线色卡（按绞计价） */
export const THREAD_COLORS: ThreadColor[] = [
  { code: "WL-01", name: "本白羊毛", hex: "#e8ddc7", unitPrice: 45 },
  { code: "ID-03", name: "靛蓝植物染", hex: "#1e3a5f", unitPrice: 68 },
  { code: "MD-02", name: "茜草红", hex: "#9b2c2c", unitPrice: 72 },
  { code: "SA-07", name: "藏红花黄", hex: "#c98f1b", unitPrice: 75 },
];

export const THREAD_UNIT = "绞";

export function damageLabel(key: string): string {
  return DAMAGE_RATES[key]?.label ?? key;
}

export function threadColor(code: string): ThreadColor | undefined {
  return THREAD_COLORS.find((c) => c.code === code);
}
