// 核心流程校验：npx esbuild src/verify.ts --bundle --platform=node | node
import {
  addDamage,
  advanceStep,
  changeThread,
  confirmCurrent,
  createArchive,
  currentVersion,
} from "./domain/quote";

const T0 = 1_700_000_000_000;
let failures = 0;

function check(name: string, cond: boolean, extra = "") {
  if (!cond) {
    failures++;
    console.error(`✗ ${name} ${extra}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

let a = createArchive(
  {
    code: "T-001",
    name: "测试毯",
    origin: "波斯",
    era: "约1970s",
    material: "羊毛",
    knotDensity: 40,
    dyeType: "植物染",
    area: 2,
    damageType: "hole",
    damageSpots: 1,
    threadCode: "WL-01",
    threadSkeins: 2,
  },
  T0
);

// V1: 2*800=1600, 1*420=420, 2*45=90 → 2110
let v = currentVersion(a);
check("V1 版本号/状态", v.no === 1 && v.status === "pending");
check("V1 分项数", v.items.length === 3);
check("V1 合计 2110", v.total === 2110, `实际 ${v.total}`);
check("V1 全部待确认", v.items.every((i) => i.state === "new"));

// 未确认不能推进工序
const queuedStep = a.steps[0].id;
a = advanceStep(a, queuedStep);
check("未确认时工序不能推进", a.steps[0].status === "queued");

// 客户确认 V1
a = confirmCurrent(a, T0 + 1000);
v = currentVersion(a);
check("V1 已确认", v.status === "confirmed");
check("确认后分项转为已确认", v.items.every((i) => i.state === "carried"));

// 开始基础工序并完成 → 面积项锁定
a = advanceStep(a, a.steps[0].id);
a = advanceStep(a, a.steps[0].id);
check("工序两次推进后完成", a.steps[0].status === "done");
v = currentVersion(a);
check("已完成工序的面积项锁定", v.items[0].state === "locked");

// 师傅追加破损 → V2：旧版失效，面积锁定保留，新增破损待确认
a = addDamage(a, "moth", 2, T0 + 2000);
check("追加后共 2 版", a.versions.length === 2);
check("V1 标记失效", a.versions[0].status === "superseded");
v = currentVersion(a);
check("V2 待确认", v.status === "pending");
check("V2 含 4 分项", v.items.length === 4, `实际 ${v.items.length}`);
const lockedArea = v.items.find((i) => i.kind === "area")!;
const newDamage = v.items.find((i) => i.label.includes("虫蛀"))!;
check("面积项在 V2 仍锁定保留", lockedArea.state === "locked" && lockedArea.amount === 1600);
check("追加破损待确认", newDamage.state === "new" && newDamage.amount === 600);
// V2: 1600 + 420 + 90 + 600 = 2710
check("V2 合计 2710", v.total === 2710, `实际 ${v.total}`);
check("V2 未确认不能施工", advanceStep(a, a.steps[1].id).steps[1].status === "queued");

// 未确认 V2 时直接换色 → V3：未开工的补线被替换，V2 的虫蛀增项继续待确认
a = changeThread(a, "ID-03", 4, T0 + 3000);
check("换色后共 3 版", a.versions.length === 3);
check("V2 也标记失效", a.versions[1].status === "superseded");
v = currentVersion(a);
check("V3 待确认", v.status === "pending");
const oldThread = v.items.find((i) => i.code === "WL-01");
const newThread = v.items.find((i) => i.code === "ID-03")!;
check("旧色号未开工→被移除", !oldThread);
check("新色号待确认", newThread.state === "new" && newThread.amount === 272);
const moth = v.items.find((i) => i.label.includes("虫蛀"))!;
check("未确认的追加破损继续待确认", moth.state === "new");
check("锁定面积仍保留", v.items.find((i) => i.kind === "area")!.state === "locked");
// V3: 1600 + 420 + 600 + 272 = 2892
check("V3 合计 2892", v.total === 2892, `实际 ${v.total}`);

// 客户确认 V3
a = confirmCurrent(a, T0 + 4000);
v = currentVersion(a);
check("V3 已确认", v.status === "confirmed");
check("确认后无待确认项", v.items.every((i) => i.state !== "new"));

// 再追加破损并完成对应工序，之后再换色：完工破损锁定保留
a = addDamage(a, "tear", 1, T0 + 5000); // V4
a = confirmCurrent(a, T0 + 6000);
const tearStep = a.steps.find((s) => s.name.includes("撕裂"))!;
a = advanceStep(a, tearStep.id);
a = advanceStep(a, tearStep.id);
a = changeThread(a, "SA-07", 3, T0 + 7000); // V5
v = currentVersion(a);
const tear = v.items.find((i) => i.label.includes("撕裂"))!;
check("已完成的追加破损锁定保留", tear.state === "locked" && tear.amount === 380);
check("每次变更版本号递增", v.no === 5);
check("变更原因保留在版本上", v.reason.includes("更换补线色号"));
// V5: 1600 + 420 + 600 + 380 + 225 = 3225（未完工的 ID-03 补线被 SA-07 替换）
check("V5 合计 3225", v.total === 3225, `实际 ${v.total}`);
check("未完工的旧补线被替换", !v.items.some((i) => i.code === "ID-03"));
check("历史版本全部可追溯", a.versions.map((x) => x.no).join() === "1,2,3,4,5");

// 零破损/零补线建档
const b = createArchive(
  {
    code: "T-002",
    name: "小毯",
    origin: "藏毯",
    era: "近代",
    material: "羊毛",
    knotDensity: 30,
    dyeType: "化学染",
    area: 1,
    damageType: "hole",
    damageSpots: 0,
    threadCode: "WL-01",
    threadSkeins: 0,
  },
  T0
);
const vb = currentVersion(b);
check("无破损无补线时仅面积项", vb.items.length === 1 && vb.total === 800);

console.log(failures === 0 ? "\n全部校验通过" : `\n${failures} 项失败`);
