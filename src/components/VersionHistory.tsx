import type { Archive } from "../domain/types";
import { fmtDateTime, fmtMoney } from "../lib/format";
import { ITEM_STATE_LABEL, VERSION_STATUS_LABEL } from "../lib/labels";

/** 版本历史：重开页面可查看每版金额、变更原因、确认状态 */
export function VersionHistory({ archive }: { archive: Archive }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>版本留痕</p>
          <h2>估价单版本</h2>
        </div>
      </div>
      <div className="timeline">
        {[...archive.versions].reverse().map((v) => (
          <article key={v.id} className={`version-card v-${v.status}`}>
            <header>
              <div>
                <b>V{v.no}</b>
                <span className={`tag st-${v.status}`}>
                  {VERSION_STATUS_LABEL[v.status]}
                </span>
              </div>
              <strong>{fmtMoney(v.total)}</strong>
            </header>
            <p className="version-reason">{v.reason}</p>
            <p className="version-time">
              生成 {fmtDateTime(v.createdAt)}
              {v.confirmedAt && ` · 确认 ${fmtDateTime(v.confirmedAt)}`}
            </p>
            <ul className="version-items">
              {v.items.map((it) => (
                <li key={it.id}>
                  <span>{it.label}</span>
                  <span className="version-item-meta">
                    <em className={v.status === "superseded" ? "dim" : ""}>
                      {fmtMoney(it.amount)}
                    </em>
                    <span className={`tag it-${it.state}`}>
                      {ITEM_STATE_LABEL[it.state]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
