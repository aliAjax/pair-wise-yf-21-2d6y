import type { Archive } from "../domain/types";
import { currentVersion } from "../domain/quote";
import { STEP_STATUS_LABEL } from "../lib/labels";

interface Props {
  archive: Archive;
  onAdvance: (stepId: string) => void;
}

const NEXT_LABEL = { queued: "开始工序", in_progress: "标记完成", done: "已完成" } as const;

/** 工序进度：客户确认当前版本后才能推进；完成的工序锁定对应分项金额 */
export function StepsPanel({ archive, onAdvance }: Props) {
  const v = currentVersion(archive);
  const locked = v.status !== "confirmed";
  const doneCount = archive.steps.filter((s) => s.status === "done").length;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>工序进度</p>
          <h2>
            {doneCount}/{archive.steps.length} 完成
          </h2>
        </div>
      </div>

      {locked && (
        <p className="hint warn">
          当前估价单 V{v.no} 待客户确认，施工暂停；确认后才可开始或推进工序。
        </p>
      )}

      <ol className="steps">
        {archive.steps.map((s) => (
          <li key={s.id} className={`step s-${s.status}`}>
            <span className="step-dot" />
            <div className="step-body">
              <b>{s.name}</b>
              <span className="tag">{STEP_STATUS_LABEL[s.status]}</span>
            </div>
            {s.status !== "done" && (
              <button
                disabled={locked}
                className="step-btn"
                onClick={() => onAdvance(s.id)}
              >
                {NEXT_LABEL[s.status]}
              </button>
            )}
          </li>
        ))}
      </ol>
      <p className="hint">工序完成后，其对应分项金额锁定保留，后续变更不再改动。</p>
    </section>
  );
}
