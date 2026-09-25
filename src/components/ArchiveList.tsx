import type { Archive } from "../domain/types";
import { currentVersion } from "../domain/quote";
import { fmtMoney } from "../lib/format";
import { VERSION_STATUS_LABEL } from "../lib/labels";

interface Props {
  archives: Archive[];
  selectedId: string | null;
  origins: string[];
  origin: string;
  onOrigin: (origin: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ArchiveList({
  archives,
  selectedId,
  origins,
  origin,
  onOrigin,
  onSelect,
  onNew,
}: Props) {
  const list =
    origin === "全部" ? archives : archives.filter((a) => a.origin === origin);
  return (
    <aside className="panel archive-list">
      <div className="heading">
        <div>
          <p>档案台</p>
          <h2>修复档案</h2>
        </div>
        <button className="primary" onClick={onNew}>
          + 接单建档
        </button>
      </div>
      <div className="chips">
        {["全部", ...origins].map((o) => (
          <button
            key={o}
            className={o === origin ? "chip active" : "chip"}
            onClick={() => onOrigin(o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="archive-cards">
        {list.map((a) => {
          const v = currentVersion(a);
          return (
            <button
              key={a.id}
              className={
                a.id === selectedId ? "archive-card active" : "archive-card"
              }
              onClick={() => onSelect(a.id)}
            >
              <div className="archive-card-top">
                <b>{a.code}</b>
                <span className={`tag st-${v.status}`}>
                  V{v.no} {VERSION_STATUS_LABEL[v.status]}
                </span>
              </div>
              <div className="archive-card-name">{a.name}</div>
              <div className="archive-card-meta">
                {a.origin} · {a.era} · {a.area} m²
              </div>
              <div className="archive-card-total">{fmtMoney(v.total)}</div>
            </button>
          );
        })}
        {list.length === 0 && <p className="empty">该产地暂无档案</p>}
      </div>
    </aside>
  );
}
