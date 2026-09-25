import { useEffect, useState } from "react";
import "./styles.css";
import {
  COLOR_CARDS,
  DAMAGE_TYPES,
  DamageItem,
  QuoteLine,
  RugQuote,
  VERSION_STATUS_LABEL,
  autoReason,
  colorOf,
  confirmCurrent,
  createVersion,
  draftChanges,
  emptyQuote,
  latestVersion,
  quoteLineFor,
  seedQuoteBook,
  sumLines,
  workStateOf,
} from "./quote";

const project = {
  id: "hxyfront-62009",
  sourceNo: 2,
  port: 62009,
  title: "地毯修复纹样档案 · 报价确认台",
};

interface Rug {
  id: string;
  origin: string;
  era: string;
  knot: string;
  material: string;
  dye: string;
  damage: string;
}

const RUGS: Rug[] = [
  { id: "CAR-092", origin: "波斯", era: "约1960s", knot: "36 结/cm", material: "羊毛", dye: "植物染", damage: "边缘磨损待补线" },
  { id: "CAR-117", origin: "安纳托利亚", era: "约1940s", knot: "42 结/cm", material: "羊毛", dye: "植物染", damage: "中心纹样缺口" },
  { id: "CAR-138", origin: "藏毯", era: "约1970s", knot: "30 结/cm", material: "羊毛 / 牦牛毛", dye: "矿物染", damage: "局部褪色，需匹配靛蓝色卡" },
];

const ORIGINS = ["全部", "波斯", "安纳托利亚", "高加索", "藏毯"];

const STORAGE_KEY = "hxyfront-62009.quotebook.v1";

function loadBook(): Record<string, RugQuote> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, RugQuote>;
  } catch {
    // 本地数据损坏时回退到演示数据
  }
  return seedQuoteBook();
}

function money(n: number): string {
  return "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

let idCounter = 0;
function genId(): string {
  idCounter += 1;
  return `D-${Date.now().toString(36)}-${idCounter}`;
}

function LinesTable({ lines }: { lines: QuoteLine[] }) {
  return (
    <table className="lines">
      <thead>
        <tr>
          <th>项目</th>
          <th>面积</th>
          <th>补线色号</th>
          <th>工种单价</th>
          <th>色料加价</th>
          <th>分项金额</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.itemId}>
            <td>{l.damageType}</td>
            <td>{l.area} cm²</td>
            <td>
              <i className="dot" style={{ background: colorOf(l.colorCode).hex }} />
              {l.colorCode} {colorOf(l.colorCode).name}
            </td>
            <td>¥{l.unitPrice}/cm²</td>
            <td>¥{l.colorSurcharge}</td>
            <td>
              <b>{money(l.amount)}</b>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function App() {
  const [originFilter, setOriginFilter] = useState("全部");
  const [selectedId, setSelectedId] = useState(RUGS[0].id);
  const [book, setBook] = useState<Record<string, RugQuote>>(loadBook);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState({
    damageType: DAMAGE_TYPES[0].key,
    area: "",
    colorCode: COLOR_CARDS[0].code,
  });

  // 重开页面仍能看见每版金额、变更原因和确认状态
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    } catch {
      // 存储不可用时仅保留在内存
    }
  }, [book]);

  useEffect(() => {
    setReason("");
  }, [selectedId]);

  const rug = RUGS.find((r) => r.id === selectedId) ?? RUGS[0];
  const quote = book[rug.id] ?? emptyQuote;
  const latest = latestVersion(quote);
  const changes = draftChanges(quote);
  const auto = autoReason(quote, changes);
  const draftLines = quote.items.map(quoteLineFor);
  const draftTotal = sumLines(draftLines);
  const doneCount = quote.items.filter((i) => i.progress === "done").length;
  const blockedCount = quote.items.filter((i) => workStateOf(i, quote) === "blocked").length;

  const updateQuote = (fn: (q: RugQuote) => RugQuote) =>
    setBook((prev) => ({ ...prev, [rug.id]: fn(prev[rug.id] ?? emptyQuote) }));

  const addItem = () => {
    const area = Math.round(parseFloat(form.area) * 10) / 10;
    if (!Number.isFinite(area) || area <= 0) return;
    const item: DamageItem = {
      id: genId(),
      damageType: form.damageType,
      area,
      colorCode: form.colorCode,
      progress: "not-started",
      addedAtVersion: 0,
    };
    updateQuote((q) => ({ ...q, items: [...q.items, item] }));
    setForm((f) => ({ ...f, area: "" }));
  };

  const removeItem = (id: string) =>
    updateQuote((q) => ({ ...q, items: q.items.filter((i) => i.id !== id) }));

  const recolor = (id: string, code: string) =>
    updateQuote((q) => ({
      ...q,
      items: q.items.map((i) => (i.id === id ? { ...i, colorCode: code } : i)),
    }));

  const advance = (id: string) =>
    updateQuote((q) => ({
      ...q,
      items: q.items.map((i) => {
        if (i.id !== id) return i;
        const state = workStateOf(i, q);
        if (state === "ready") return { ...i, progress: "in-progress" as const };
        if (state === "working") return { ...i, progress: "done" as const };
        return i;
      }),
    }));

  const submitVersion = () => {
    if (!changes.changed || quote.items.length === 0) return;
    const finalReason = reason.trim() || auto;
    updateQuote((q) => createVersion(q, finalReason, new Date().toISOString()));
    setReason("");
  };

  const confirm = () => updateQuote((q) => confirmCurrent(q, new Date().toISOString()));

  const filteredRugs = RUGS.filter((r) => originFilter === "全部" || r.origin === originFilter);
  const areaValue = parseFloat(form.area);
  const canAdd = Number.isFinite(areaValue) && areaValue > 0;

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>
          接单先出估价单：按面积 × 工种单价 + 补线色料加价算出分项金额，生成带版本号的估价单。
          师傅追加破损或换色号后提交变更，旧版本自动标记失效；未开始的增项停在待确认，已完成工序保留在单内。
          客户确认当前版本后才能继续施工，每版金额、变更原因和确认状态都会留档。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>当前版本金额</small>
          <strong>{latest ? money(latest.total) : quote.items.length > 0 ? money(draftTotal) : "—"}</strong>
          <em>{latest ? `V${latest.version} · ${VERSION_STATUS_LABEL[latest.status]}` : quote.items.length > 0 ? "草稿未入单" : "暂无项目"}</em>
        </article>
        <article>
          <small>待确认工序</small>
          <strong>{blockedCount}</strong>
          <em>客户确认当前版本后解锁</em>
        </article>
        <article>
          <small>已完成工序</small>
          <strong>
            {doneCount}/{quote.items.length}
          </strong>
          <em>变更后仍保留在估价单内</em>
        </article>
        <article>
          <small>估价版本数</small>
          <strong>{quote.versions.length}</strong>
          <em>{quote.versions.filter((v) => v.status === "superseded").length} 版已失效</em>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>产地筛选</h2>
          <div className="chips">
            {ORIGINS.map((o) => (
              <button
                key={o}
                className={o === originFilter ? "active" : ""}
                onClick={() => setOriginFilter(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="rug-list">
            {filteredRugs.length === 0 && <p className="empty-hint">该产地暂无档案</p>}
            {filteredRugs.map((r) => {
              const q = book[r.id] ?? emptyQuote;
              const lv = latestVersion(q);
              return (
                <button
                  key={r.id}
                  className={"rug-item" + (r.id === selectedId ? " selected" : "")}
                  onClick={() => setSelectedId(r.id)}
                >
                  <b>{r.id}</b>
                  <span>
                    {r.origin} · {r.material} · {r.era}
                  </span>
                  <small>
                    {lv
                      ? `V${lv.version} ${money(lv.total)} · ${VERSION_STATUS_LABEL[lv.status]}`
                      : q.items.length > 0
                        ? "草稿待入单"
                        : "未报价"}
                  </small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel quote-panel">
          <div className="heading">
            <div>
              <p>报价确认流程</p>
              <h2>
                {rug.id} · {rug.origin}地毯
              </h2>
              <span className="rug-meta">
                {rug.era} · 结密度 {rug.knot} · {rug.material} · {rug.dye} · 破损：{rug.damage}
              </span>
            </div>
            {latest && (
              <span className={"badge " + latest.status}>
                V{latest.version} {VERSION_STATUS_LABEL[latest.status]}
              </span>
            )}
          </div>

          {latest?.status === "pending" && (
            <div className="banner warn">
              估价单 V{latest.version} 待客户确认：未完工工序全部暂停，已完成工序保留在单内，客户确认后才能继续施工。
            </div>
          )}
          {changes.changed && (
            <div className="banner info">
              有未提交的变更（追加 {changes.additions.length} 处、换色 {changes.recolors.length} 处），提交后生成
              V{quote.versions.length + 1}，当前版本将标记失效。
            </div>
          )}

          <h3 className="section-title">破损项目与工序</h3>
          {quote.items.length === 0 ? (
            <p className="empty-hint">还没有破损项目，先在下面追加。</p>
          ) : (
            <table className="items">
              <thead>
                <tr>
                  <th>破损项目</th>
                  <th>面积</th>
                  <th>补线色号</th>
                  <th>分项金额</th>
                  <th>工序状态</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => {
                  const line = quoteLineFor(item);
                  const state = workStateOf(item, quote);
                  const stagedRecolor = latest?.lines.find(
                    (l) => l.itemId === item.id && l.colorCode !== item.colorCode
                  );
                  return (
                    <tr key={item.id}>
                      <td>
                        <b>{item.damageType}</b>
                        {item.addedAtVersion === 0 ? (
                          <span className="tag draft">未入单</span>
                        ) : (
                          <span className="tag">V{item.addedAtVersion} 入单</span>
                        )}
                      </td>
                      <td>{item.area} cm²</td>
                      <td>
                        <div className="color-cell">
                          <select
                            value={item.colorCode}
                            disabled={item.progress === "done"}
                            onChange={(e) => recolor(item.id, e.target.value)}
                          >
                            {COLOR_CARDS.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} {c.name}（+¥{c.surcharge}）
                              </option>
                            ))}
                          </select>
                          {stagedRecolor && <span className="tag warn">换色待提交</span>}
                        </div>
                      </td>
                      <td>
                        <b>{money(line.amount)}</b>
                        <small>
                          {item.area}×¥{line.unitPrice} + 色料¥{line.colorSurcharge}
                        </small>
                      </td>
                      <td>
                        {state === "done" && (
                          <>
                            <span className="badge confirmed">已完成</span>
                            <small>保留入后续版本</small>
                          </>
                        )}
                        {state === "blocked" && (
                          <>
                            <span className="badge pending">待确认</span>
                            <small>客户确认后施工</small>
                          </>
                        )}
                        {state === "ready" && (
                          <button className="primary small" onClick={() => advance(item.id)}>
                            开始工序
                          </button>
                        )}
                        {state === "working" && (
                          <div className="working-cell">
                            <span className="badge working">施工中</span>
                            <button className="small" onClick={() => advance(item.id)}>
                              完成工序
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        {item.addedAtVersion === 0 && (
                          <button className="ghost small" onClick={() => removeItem(item.id)}>
                            移除
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="add-bar">
            <select
              value={form.damageType}
              onChange={(e) => setForm((f) => ({ ...f, damageType: e.target.value }))}
            >
              {DAMAGE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.key}（¥{t.unitPrice}/cm²）
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="面积 cm²"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            />
            <select
              value={form.colorCode}
              onChange={(e) => setForm((f) => ({ ...f, colorCode: e.target.value }))}
            >
              {COLOR_CARDS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.name}（+¥{c.surcharge}）
                </option>
              ))}
            </select>
            <button className="primary" onClick={addItem} disabled={!canAdd}>
              追加破损
            </button>
          </div>

          <div className="submit-bar">
            <input
              placeholder={`变更原因（留空自动填写：${auto}）`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className="primary"
              disabled={!changes.changed || quote.items.length === 0}
              onClick={submitVersion}
            >
              {quote.versions.length === 0
                ? "生成估价单 V1"
                : `提交变更，生成 V${quote.versions.length + 1}`}
            </button>
          </div>

          {latest ? (
            <div className="version current">
              <header>
                <b>估价单 V{latest.version}</b>
                <span className={"badge " + latest.status}>{VERSION_STATUS_LABEL[latest.status]}</span>
                <strong>{money(latest.total)}</strong>
              </header>
              <p className="reason">变更原因：{latest.reason}</p>
              <p className="meta">
                生成于 {fmtTime(latest.createdAt)}
                {latest.confirmedAt && ` · 客户确认于 ${fmtTime(latest.confirmedAt)}`}
              </p>
              <LinesTable lines={latest.lines} />
              {latest.status === "pending" && (
                <button className="primary confirm-btn" onClick={confirm}>
                  客户确认当前版本（V{latest.version}）
                </button>
              )}
              {latest.status === "confirmed" && (
                <p className="ok-note">客户已确认当前版本，工序可继续施工。</p>
              )}
            </div>
          ) : (
            quote.items.length > 0 && (
              <div className="version draft">
                <header>
                  <b>草稿估价（未入单）</b>
                  <strong>{money(draftTotal)}</strong>
                </header>
                <LinesTable lines={draftLines} />
                <p className="meta">生成估价单并经客户确认后才能开工。</p>
              </div>
            )
          )}

          {quote.versions.length > 1 && (
            <div className="history">
              <h3 className="section-title">历史版本</h3>
              {quote.versions
                .slice(0, -1)
                .reverse()
                .map((v) => (
                  <details className="version old" key={v.version}>
                    <summary>
                      <b>V{v.version}</b>
                      <span className={"badge " + v.status}>{VERSION_STATUS_LABEL[v.status]}</span>
                      <span className="h-total">{money(v.total)}</span>
                      <span className="h-reason">{v.reason}</span>
                    </summary>
                    <p className="meta">
                      生成于 {fmtTime(v.createdAt)}
                      {v.confirmedAt && ` · 曾确认于 ${fmtTime(v.confirmedAt)}`} · 已被 V{v.version + 1} 取代
                    </p>
                    <LinesTable lines={v.lines} />
                  </details>
                ))}
            </div>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>材料色卡</p>
            <h2>补线色号与色料加价</h2>
          </div>
        </div>
        <div className="swatches">
          {COLOR_CARDS.map((c) => (
            <article key={c.code}>
              <i style={{ background: c.hex }} />
              <b>
                {c.code} {c.name}
              </b>
              <small>
                {c.dye} · 每色加价 ¥{c.surcharge}
              </small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
