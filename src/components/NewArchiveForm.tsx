import { useState } from "react";
import { DAMAGE_RATES, THREAD_COLORS } from "../domain/pricing";

interface Props {
  origins: string[];
  onClose: () => void;
  onCreate: (input: {
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
  }) => void;
}

/** 接单建档：按面积、破损处、补线色号录入，保存即生成 V1 估价单 */
export function NewArchiveForm({ origins, onClose, onCreate }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState(origins[0] ?? "");
  const [era, setEra] = useState("");
  const [material, setMaterial] = useState("羊毛");
  const [knotDensity, setKnotDensity] = useState(40);
  const [dyeType, setDyeType] = useState("植物染");
  const [area, setArea] = useState(2);
  const [damageType, setDamageType] = useState(Object.keys(DAMAGE_RATES)[0]);
  const [damageSpots, setDamageSpots] = useState(1);
  const [threadCode, setThreadCode] = useState(THREAD_COLORS[0].code);
  const [threadSkeins, setThreadSkeins] = useState(2);

  const valid = code.trim() !== "" && name.trim() !== "" && area > 0;

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="heading">
          <div>
            <p>接单建档</p>
            <h2>新修复档案 · 生成 V1 估价单</h2>
          </div>
          <button onClick={onClose}>关闭</button>
        </div>
        <div className="field-grid">
          <label>
            <span>档案编号 *</span>
            <input
              placeholder="如 CAR-145"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label>
            <span>地毯名称 *</span>
            <input
              placeholder="如 克尔曼藤蔓毯"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            <span>产地</span>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {origins.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label>
            <span>年代</span>
            <input
              placeholder="如 约1960s"
              value={era}
              onChange={(e) => setEra(e.target.value)}
            />
          </label>
          <label>
            <span>材质</span>
            <input value={material} onChange={(e) => setMaterial(e.target.value)} />
          </label>
          <label>
            <span>结密度（结/10cm）</span>
            <input
              type="number"
              min={0}
              value={knotDensity}
              onChange={(e) => setKnotDensity(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            <span>染色类型</span>
            <input value={dyeType} onChange={(e) => setDyeType(e.target.value)} />
          </label>
          <label>
            <span>修复面积 m² *</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={area}
              onChange={(e) => setArea(Number(e.target.value) || 0)}
            />
          </label>
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
            <span>破损处数（0 为无）</span>
            <input
              type="number"
              min={0}
              value={damageSpots}
              onChange={(e) =>
                setDamageSpots(Math.max(0, Number(e.target.value) || 0))
              }
            />
          </label>
          <label>
            <span>补线色号</span>
            <select
              value={threadCode}
              onChange={(e) => setThreadCode(e.target.value)}
            >
              {THREAD_COLORS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.name}（{c.unitPrice} 元/绞）
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>补线绞数（0 为无）</span>
            <input
              type="number"
              min={0}
              value={threadSkeins}
              onChange={(e) =>
                setThreadSkeins(Math.max(0, Number(e.target.value) || 0))
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button
            className="primary"
            disabled={!valid}
            onClick={() =>
              onCreate({
                code: code.trim(),
                name: name.trim(),
                origin,
                era: era.trim() || "年代不详",
                material,
                knotDensity,
                dyeType,
                area,
                damageType,
                damageSpots,
                threadCode,
                threadSkeins,
              })
            }
          >
            生成 V1 估价单
          </button>
        </div>
      </div>
    </div>
  );
}
