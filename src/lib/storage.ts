// localStorage 持久化：重开页面可看到每版金额、变更原因和确认状态
import type { Archive } from "../domain/types";
import { seedArchives } from "../data/seed";

const STORAGE_KEY = "carpet-quote-archives-v1";

export function loadArchives(): Archive[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedArchives(Date.now());
    const parsed = JSON.parse(raw) as Archive[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedArchives(Date.now());
    }
    return parsed;
  } catch {
    return seedArchives(Date.now());
  }
}

export function saveArchives(archives: Archive[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  } catch {
    // 存储不可用时静默降级为内存态
  }
}

export function resetArchives(): Archive[] {
  const fresh = seedArchives(Date.now());
  saveArchives(fresh);
  return fresh;
}
