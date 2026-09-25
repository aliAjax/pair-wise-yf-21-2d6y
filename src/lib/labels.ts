import type { ItemState, StepStatus, VersionStatus } from "../domain/types";

export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  superseded: "已失效",
};

export const ITEM_STATE_LABEL: Record<ItemState, string> = {
  new: "待确认",
  carried: "已确认",
  locked: "已完成·保留",
};

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  queued: "排队中",
  in_progress: "进行中",
  done: "已完成",
};

export const KIND_LABEL = {
  area: "面积",
  damage: "破损",
  thread: "补线",
} as const;
