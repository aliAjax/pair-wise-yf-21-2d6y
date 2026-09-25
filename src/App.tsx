import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Archive } from "./domain/types";
import {
  addDamage,
  advanceStep,
  changeThread,
  confirmCurrent,
  createArchive,
  currentVersion,
} from "./domain/quote";
import { loadArchives, resetArchives, saveArchives } from "./lib/storage";
import { ArchiveList } from "./components/ArchiveList";
import { QuotePanel } from "./components/QuotePanel";
import { ChangePanel } from "./components/ChangePanel";
import { StepsPanel } from "./components/StepsPanel";
import { VersionHistory } from "./components/VersionHistory";
import { NewArchiveForm } from "./components/NewArchiveForm";

const ORIGINS = ["波斯", "安纳托利亚", "高加索", "藏毯"];
const INITIAL_ARCHIVES = loadArchives();

function App() {
  const [archives, setArchives] = useState<Archive[]>(INITIAL_ARCHIVES);
  const [selectedId, setSelectedId] = useState<string | null>(
    INITIAL_ARCHIVES[0]?.id ?? null
  );
  const [origin, setOrigin] = useState("全部");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    saveArchives(archives);
  }, [archives]);

  const selected = archives.find((a) => a.id === selectedId) ?? null;

  const update = (next: Archive) => {
    setArchives((prev) => prev.map((a) => (a.id === next.id ? next : a)));
  };

  const pendingCount = archives.filter(
    (a) => currentVersion(a).status === "pending"
  ).length;
  const activeCount = archives.filter((a) =>
    a.steps.some((s) => s.status === "in_progress")
  ).length;
  const allSteps = archives.flatMap((a) => a.steps);
  const doneRate =
    allSteps.length === 0
      ? 0
      : Math.round(
          (allSteps.filter((s) => s.status === "done").length /
            allSteps.length) *
            100
        );

  const metrics = useMemo(
    () => [
      { label: "修复档案", value: archives.length },
      { label: "待客户确认", value: pendingCount },
      { label: "施工中档案", value: activeCount },
      { label: "工序完工率", value: `${doneRate}%` },
    ],
    [archives.length, pendingCount, activeCount, doneRate]
  );

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62009 · 地毯修复纹样档案 · Port 62009</p>
        <h1>报价确认流程</h1>
        <span>
          接单先建档出估价：按面积、破损处、补线色号核算分项金额。师傅追加破损或换色号即生成带版本号的变更估价单，
          旧版标记失效、未开始的增项停在待确认、已完成工序金额锁定保留；客户确认当前版本后才能继续施工。
        </span>
      </section>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace detail-layout">
        <ArchiveList
          archives={archives}
          selectedId={selectedId}
          origins={ORIGINS}
          origin={origin}
          onOrigin={setOrigin}
          onSelect={setSelectedId}
          onNew={() => setShowNew(true)}
        />

        <div className="detail">
          {selected ? (
            <>
              <section className="panel archive-head">
                <div>
                  <p>{selected.origin} · 纹样档案</p>
                  <h2>
                    {selected.code} {selected.name}
                  </h2>
                </div>
                <div className="head-fields">
                  <span>年代：{selected.era}</span>
                  <span>结密度：{selected.knotDensity}</span>
                  <span>材质：{selected.material}</span>
                  <span>染色：{selected.dyeType}</span>
                  <span>修复面积：{selected.area} m²</span>
                </div>
              </section>

              <QuotePanel
                archive={selected}
                onConfirm={() => update(confirmCurrent(selected, Date.now()))}
              />

              <div className="two-col">
                <ChangePanel
                  archive={selected}
                  onAddDamage={(type, spots) =>
                    update(addDamage(selected, type, spots, Date.now()))
                  }
                  onChangeThread={(code, skeins) =>
                    update(changeThread(selected, code, skeins, Date.now()))
                  }
                />
                <StepsPanel
                  archive={selected}
                  onAdvance={(stepId) =>
                    update(advanceStep(selected, stepId))
                  }
                />
              </div>

              <VersionHistory archive={selected} />
            </>
          ) : (
            <section className="panel placeholder">
              <h2>请选择左侧档案，或接单建档</h2>
            </section>
          )}
        </div>
      </section>

      <footer className="app-foot">
        <button
          onClick={() => {
            const fresh = resetArchives();
            setArchives(fresh);
            setSelectedId(fresh[0]?.id ?? null);
          }}
        >
          重置演示数据
        </button>
        <span>数据保存在本机浏览器，重开页面不丢失</span>
      </footer>

      {showNew && (
        <NewArchiveForm
          origins={ORIGINS}
          onClose={() => setShowNew(false)}
          onCreate={(input) => {
            const a = createArchive(input, Date.now());
            setArchives((prev) => [...prev, a]);
            setSelectedId(a.id);
            setOrigin("全部");
            setShowNew(false);
          }}
        />
      )}
    </main>
  );
}

export default App;
