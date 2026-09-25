import { useState } from "react";
import type { Archive } from "../domain/types";
import { currentVersion } from "../domain/quote";
import { DAMAGE_RATES, THREAD_COLORS } from "../domain/pricing";

interface Props {
  archive: Archive;
  onAddDamage: (damageType: string, spots: number) => void;
  onChangeThread: (code: string, skeins: number) => void;
}

/** 师傅发起变更：追加破损 / 更换补线色号，提交后旧估价失效、生成待确认新版本 */
export function ChangePanel({ archive, onAddDamage, onChangeThread }: Props) {
  const v = currentVersion(archive);
  const pending = v.status !== "confirmed";

  const [damageType, setDamageType] = useState("hole");
  const [spots, setSpots] = useState(1);
  const [code, setCode] = useState(THREAD_COLORS[0].code);
  const [skeins, setSkeins] = useState(2);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>师傅端</p>
          <h2>发起变更</h2>
        </div>
      </div>

      {pending && (
        <p className="hint warn">
          当前 V{v.no} 尚未经客户确认，变更仍可登记：旧版标记失效并生成新版估价单，之前未确认的增项继续停在待确认。
        </p>
      )}

      <div className="change-grid">
        <div className="change-card">
          <h3>追加破损</h3>
          <label>
            <span>破损类型</span>
            <select
              value={damageType}
              onChange={(e) => setDamageType(e.target.value)}
            >
              {Object.entries(DAMAGE_RATES).map(([key, r]) => (
                <option key={key} value={key}>
                  {r.label}（{r.unitPrice} 元/{r.unit}）
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>处数</span>
            <input
              type="number"
              min={1}
              value={spots}
              onChange={(e) => setSpots(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <button
            className="primary"
            onClick={() => onAddDamage(damageType, spots)}
          >
            登记追加破损
          </button>
        </div>

        <div className="change-card">
          <h3>更换补线色号</h3>
          <label>
            <span>色卡色号</span>
            <select value={code} onChange={(e) => setCode(e.target.value)}>
              {THREAD_COLORS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.name}（{c.unitPrice} 元/绞）
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>绞数</span>
            <input
              type="number"
              min={1}
              value={skeins}
              onChange={(e) =>
                setSkeins(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </label>
          <button className="primary" onClick={() => onChangeThread(code, skeins)}>
            登记换色
          </button>
        </div>
      </div>
    </section>
  );
}
