import type { Archive } from "../domain/types";
import { currentVersion } from "../domain/quote";
import { fmtDateTime, fmtMoney } from "../lib/format";
import { ITEM_STATE_LABEL, KIND_LABEL, VERSION_STATUS_LABEL } from "../lib/labels";

interface Props {
  archive: Archive;
  onConfirm: () => void;
}

/** 当前版本估价单：分项金额明细 + 客户确认 */
export function QuotePanel({ archive, onConfirm }: Props) {
  const v = currentVersion(archive);
  const pendingCount = v.items.filter((it) => it.state === "new").length;
  return (
    <section className="panel quote-panel">
      <div className="heading">
        <div>
          <p>估价单 · 当前版本</p>
          <h2>
            V{v.no}
            <span className={`tag st-${v.status}`}>
              {VERSION_STATUS_LABEL[v.status]}
            </span>
          </h2>
        </div>
        <div className="quote-total">
          <small>合计金额</small>
          <strong>{fmtMoney(v.total)}</strong>
        </div>
      </div>

      <p className="quote-reason">
        变更原因：{v.reason} · 生成于 {fmtDateTime(v.createdAt)}
        {v.confirmedAt && ` · 客户确认于 ${fmtDateTime(v.confirmedAt)}`}
      </p>

      <table className="items-table">
        <thead>
          <tr>
            <th>分项</th>
            <th>计价明细</th>
            <th className="num">金额</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {v.items.map((it) => (
            <tr key={it.id} className={`item-${it.state}`}>
              <td>
                <span className={`kind kind-${it.kind}`}>
                  {KIND_LABEL[it.kind]}
                </span>
                {it.label}
              </td>
              <td className="detail">{it.detail}</td>
              <td className="num">{fmtMoney(it.amount)}</td>
              <td>
                <span className={`tag it-${it.state}`}>
                  {ITEM_STATE_LABEL[it.state]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {v.status === "pending" && (
        <div className="confirm-banner">
          <div>
            <b>等待客户确认 V{v.no}</b>
            <p>
              {pendingCount > 0
                ? `本版含 ${pendingCount} 项待确认增项，确认前施工暂停；已完成工序的金额保留、不受变更影响。`
                : "确认前施工暂停。"}
            </p>
          </div>
          <button className="primary" onClick={onConfirm}>
            客户已同意，确认 V{v.no}
          </button>
        </div>
      )}
      {v.status === "confirmed" && (
        <div className="confirm-banner ok">
          <div>
            <b>V{v.no} 已经客户确认</b>
            <p>可按本版估价单施工；师傅追加破损或换色号将生成新版本并需重新确认。</p>
          </div>
        </div>
      )}
    </section>
  );
}
