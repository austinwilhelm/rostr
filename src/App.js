import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "rostr_data";

const ACCENT_PALETTE = [
  "#39FF14","#FF3131","#00BFFF","#FF6B00","#BF5FFF",
  "#FF1493","#00FFD1","#FFD700","#FF8C00","#7FFF00",
];

function getAccent(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

const DEFAULT_ENTRIES = [
  { id: "e1", name: "Entry One" },
  { id: "e2", name: "Entry Two" },
  { id: "e3", name: "Entry Three" },
  { id: "e4", name: "Entry Four" },
  { id: "e5", name: "Entry Five" },
];

function loadFromStorage() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function computeMovement(current, previous) {
  if (!previous) return {};
  const prevMap = {};
  previous.forEach((e, i) => { prevMap[e.id] = i; });
  const result = {};
  current.forEach((e, i) => {
    const prev = prevMap[e.id];
    if (prev === undefined) result[e.id] = "new";
    else if (i < prev) result[e.id] = "up";
    else if (i > prev) result[e.id] = "down";
    else result[e.id] = "same";
  });
  return result;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 600);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

function renderSnapshotCanvas(title, entries, movement) {
  const W = 640, ROW_H = 52, HEADER_H = 120, FOOTER_H = 44, PAD = 40;
  const H = HEADER_H + entries.length * ROW_H + FOOTER_H;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
  const topGrad = ctx.createLinearGradient(0,0,W*0.7,0);
  topGrad.addColorStop(0,"#39FF14"); topGrad.addColorStop(1,"#0a0a0a");
  ctx.fillStyle = topGrad; ctx.fillRect(0,0,W,2);
  ctx.fillStyle = "#39FF14"; ctx.beginPath(); ctx.arc(PAD,28,3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#2e2e2e"; ctx.font = "700 9px 'Courier New',monospace";
  ctx.fillText("ROSTR — POWER RANKINGS", PAD+12, 32);
  ctx.fillStyle = "#e8e8e8"; ctx.font = "900 38px Impact,'Arial Black',sans-serif";
  ctx.fillText(title.toUpperCase(), PAD, 82);
  const dg = ctx.createLinearGradient(0,0,W*0.65,0);
  dg.addColorStop(0,"#39FF14"); dg.addColorStop(1,"#0a0a0a");
  ctx.fillStyle = dg; ctx.fillRect(PAD, HEADER_H-8, W-PAD*2, 1);
  entries.forEach((entry, i) => {
    const y = HEADER_H + i * ROW_H;
    const accent = getAccent(entry.id);
    const mv = movement[entry.id];
    ctx.fillStyle = "#141414"; ctx.fillRect(PAD, y+ROW_H-1, W-PAD*2, 1);
    ctx.fillStyle = accent; ctx.globalAlpha = 0.55;
    ctx.fillRect(PAD, y+10, 2, ROW_H-20); ctx.globalAlpha = 1;
    ctx.font = "900 20px Impact,'Arial Black',sans-serif";
    ctx.fillStyle = accent; ctx.globalAlpha = 0.6; ctx.textAlign = "right";
    ctx.fillText(String(i+1).padStart(2,"0"), PAD+44, y+ROW_H/2+7);
    ctx.globalAlpha = 1; ctx.textAlign = "left";
    ctx.font = `${i===0?"900":"700"} ${i===0?16:14}px 'Courier New',monospace`;
    ctx.fillStyle = i===0?"#ffffff":"#dddddd";
    ctx.fillText(entry.name.toUpperCase(), PAD+54, y+ROW_H/2+5);
    const mvX = W-PAD-8, mvY = y+ROW_H/2+4;
    ctx.font = "700 9px 'Courier New',monospace"; ctx.textAlign = "right";
    if (mv==="up") { ctx.fillStyle="#39FF14"; ctx.fillText("↑ UP",mvX,mvY); }
    else if (mv==="down") { ctx.fillStyle="#FF3131"; ctx.fillText("↓ DN",mvX,mvY); }
    else if (mv==="new") { ctx.fillStyle="#FFD700"; ctx.fillText("★ NEW",mvX,mvY); }
    else { ctx.fillStyle="#333"; ctx.fillText("— --",mvX,mvY); }
    ctx.textAlign = "left";
  });
  const fy = HEADER_H + entries.length*ROW_H + 14;
  ctx.font = "700 8px 'Courier New',monospace"; ctx.fillStyle = "#222";
  ctx.fillText(`rostr.app · ${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}).toUpperCase()}`, PAD, fy+12);
  const bg = ctx.createLinearGradient(0,0,W*0.4,0);
  bg.addColorStop(0,"#39FF14"); bg.addColorStop(1,"#0a0a0a");
  ctx.fillStyle = bg; ctx.fillRect(0, H-2, W, 2);
  return canvas.toDataURL("image/png");
}

const MovementIcon = ({ type }) => {
  const b = { fontFamily:"monospace", fontSize:"10px", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:"2px", whiteSpace:"nowrap" };
  if (type==="up")   return <span style={{...b,color:"#39FF14"}}><svg width="8" height="10" viewBox="0 0 10 12" fill="none"><path d="M5 1L9 6H6V11H4V6H1L5 1Z" fill="#39FF14"/></svg>UP</span>;
  if (type==="down") return <span style={{...b,color:"#FF3131"}}><svg width="8" height="10" viewBox="0 0 10 12" fill="none"><path d="M5 11L1 6H4V1H6V6H9L5 11Z" fill="#FF3131"/></svg>DN</span>;
  if (type==="new")  return <span style={{...b,color:"#FFD700"}}>★ NEW</span>;
  return <span style={{...b,color:"#2a2a2a"}}><span style={{display:"inline-block",width:"8px",height:"2px",background:"#2a2a2a"}}/>--</span>;
};

export default function Rostr() {
  const [entries, setEntries] = useState([]);
  const [previousEntries, setPreviousEntries] = useState(null);
  const [movement, setMovement] = useState({});
  const [title, setTitle] = useState("UNTITLED ROSTR");
  const [editingTitle, setEditingTitle] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [flash, setFlash] = useState(null);

  // Drag state
  const [draggingId, setDraggingId] = useState(null);
  // insertPos: { targetId, position: "before"|"after" }
  const [insertPos, setInsertPos] = useState(null);

  const isMobile = useIsMobile();

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setEntries(saved.entries || DEFAULT_ENTRIES);
      setPreviousEntries(saved.previousEntries || null);
      setTitle(saved.title || "UNTITLED ROSTR");
      setMovement(saved.movement || {});
    } else {
      setEntries(DEFAULT_ENTRIES);
    }
  }, []);

  useEffect(() => {
    if (entries.length === 0) return;
    saveToStorage({ entries, previousEntries, title, movement });
  }, [entries, previousEntries, title, movement]);

  // ── Drag handlers ──
  const handleDragStart = useCallback((e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Needed so Firefox doesn't cancel immediately
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Determine if cursor is in top or bottom half of the row
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";
    setInsertPos(prev =>
      prev && prev.targetId === id && prev.position === position ? prev : { targetId: id, position }
    );
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Only clear if we've actually left the row (not just entered a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setInsertPos(null);
    }
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    const sourceId = draggingId;
    if (!sourceId || !insertPos) { setDraggingId(null); setInsertPos(null); return; }

    setEntries(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(x => x.id === sourceId);
      const toIdx = next.findIndex(x => x.id === insertPos.targetId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;

      const [moved] = next.splice(fromIdx, 1);
      // Recalc toIdx after splice
      const newToIdx = next.findIndex(x => x.id === insertPos.targetId);
      const insertAt = insertPos.position === "before" ? newToIdx : newToIdx + 1;
      next.splice(insertAt, 0, moved);

      setPreviousEntries(prev);
      setMovement(computeMovement(next, prev));
      return next;
    });

    setFlash(insertPos.targetId);
    setTimeout(() => setFlash(null), 500);
    setDraggingId(null);
    setInsertPos(null);
  }, [draggingId, insertPos]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setInsertPos(null);
  }, []);

  // ── Mobile reorder ──
  const moveEntry = (id, dir) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (dir === -1 && idx === 0) return prev;
      if (dir === 1 && idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx+dir]] = [next[idx+dir], next[idx]];
      setPreviousEntries(prev);
      setMovement(computeMovement(next, prev));
      return next;
    });
  };

  const addEntry = () => {
    const newId = `e${Date.now()}`;
    setEntries(prev => {
      const next = [...prev, { id: newId, name: "New Entry" }];
      setPreviousEntries(prev);
      setMovement(m => ({ ...m, [newId]: "new" }));
      return next;
    });
  };

  const removeEntry = (id) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      setPreviousEntries(prev);
      setMovement(computeMovement(next, prev));
      return next;
    });
  };

  const updateName = (id, name) => setEntries(prev => prev.map(e => e.id===id ? {...e,name} : e));

  const openShare = () => {
    setSnapshotUrl(renderSnapshotCanvas(title, entries, movement));
    setShareMode(true);
  };

  const downloadSnapshot = () => {
    const a = document.createElement("a");
    a.href = snapshotUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g,"-")}-rostr.png`;
    a.click();
  };

  const GRID_COLS = isMobile ? "28px 8px 1fr 44px 66px" : "36px 8px 1fr 54px 22px";

  const css = `
    *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { margin: 0; background: #0a0a0a; }

    @keyframes rowFlash { 0%,100%{background:transparent} 50%{background:rgba(57,255,20,0.06)} }

    .r-row { position: relative; border-bottom: 1px solid #141414; transition: opacity 0.1s; }
    .r-row.is-dragging { opacity: 0.15; }
    .r-row.is-flash { animation: rowFlash 0.45s ease; }

    /* Insertion line — rendered as ::before (above) or ::after (below) */
    .r-row.insert-before::before,
    .r-row.insert-after::after {
      content: "";
      position: absolute;
      left: 0; right: 0;
      height: 2px;
      background: #39FF14;
      box-shadow: 0 0 8px #39FF14, 0 0 2px #39FF14;
      z-index: 10;
      pointer-events: none;
    }
    .r-row.insert-before::before { top: -1px; }
    .r-row.insert-after::after  { bottom: -1px; }

    /* Diamond tips on the insertion line */
    .r-row.insert-before::before,
    .r-row.insert-after::after {
      border-radius: 1px;
    }

    .r-del { background:none; border:none; color:#252525; cursor:pointer; font-size:18px; padding:2px 5px; line-height:1; transition:color 0.12s; }
    .r-del:hover { color:#FF3131; }
    .mv-btn { background:none; border:1px solid #1e1e1e; color:#2e2e2e; font-size:13px; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.1s; padding:0; }
    .mv-btn:not(:disabled):active { border-color:#39FF14; color:#39FF14; transform:scale(0.9); }
    .mv-btn:disabled { opacity:0.12; cursor:default; }
    .a-btn { font-family:'Courier New',monospace; font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; cursor:pointer; transition:all 0.12s; border-radius:0; }
    .a-btn:active { transform:scale(0.97); }
    .name-input { background:none; border:none; outline:none; font-family:'Courier New',Courier,monospace; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; width:100%; padding:2px 0; cursor:text; border-bottom:1px solid transparent; transition:border-color 0.15s; }
    .name-input:focus { border-bottom-color:rgba(255,255,255,0.1); }
    .title-input { background:none; border:none; border-bottom:2px solid transparent; outline:none; color:#e8e8e8; font-family:'Impact','Arial Black',sans-serif; font-size:clamp(26px,9vw,52px); font-weight:900; letter-spacing:0.03em; text-transform:uppercase; width:100%; padding:0; line-height:1; transition:border-color 0.15s; }
    .title-input:focus { border-bottom-color:#39FF14; }
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e8e8e8", fontFamily:"'Courier New',Courier,monospace", display:"flex", flexDirection:"column", alignItems:"center" }}>

        {/* Header */}
        <div style={{ width:"100%", maxWidth:"640px", padding: isMobile ? "28px 16px 0" : "48px 24px 0" }}>
          <div style={{ fontSize:"9px", letterSpacing:"0.35em", color:"#2e2e2e", textTransform:"uppercase", marginBottom:"10px", display:"flex", alignItems:"center", gap:"7px" }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"#39FF14", flexShrink:0, display:"inline-block" }}/>
            ROSTR — POWER RANKINGS
          </div>
          <input className="title-input" value={title} onChange={e=>setTitle(e.target.value)} onFocus={()=>setEditingTitle(true)} onBlur={()=>setEditingTitle(false)} maxLength={40} spellCheck={false} placeholder="UNTITLED ROSTR"/>
          <div style={{ fontSize:"9px", color:"#242424", letterSpacing:"0.16em", marginTop:"6px" }}>
            {entries.length} ENTRIES{isMobile ? " · ↕ REORDER · TAP TO EDIT" : " · DRAG TO REORDER · CLICK TO EDIT"}
          </div>
          <div style={{ width:"100%", height:"1px", background:"linear-gradient(90deg,#39FF14 0%,#141414 65%)", margin:"16px 0 0" }}/>
        </div>

        {/* List */}
        <div style={{ width:"100%", maxWidth:"640px", padding: isMobile ? "0 16px 80px" : "0 24px 100px" }}>

          {/* Col headers */}
          <div style={{ display:"grid", gridTemplateColumns:GRID_COLS, gap:"0 6px", padding:"9px 0 7px", borderBottom:"1px solid #161616" }}>
            <div style={{ fontSize:"8px", letterSpacing:"0.2em", color:"#222", textAlign:"right" }}>#</div>
            <div/>
            <div style={{ fontSize:"8px", letterSpacing:"0.2em", color:"#222" }}>NAME</div>
            <div style={{ fontSize:"8px", letterSpacing:"0.2em", color:"#222", textAlign:"right" }}>MV</div>
            <div style={{ fontSize:"8px", letterSpacing:"0.2em", color:"#222", textAlign:"center" }}>{isMobile?"↕ DEL":""}</div>
          </div>

          {entries.map((entry, i) => {
            const accent = getAccent(entry.id);
            const mv = movement[entry.id];
            const isIns = insertPos?.targetId === entry.id;
            const rowClass = [
              "r-row",
              draggingId === entry.id ? "is-dragging" : "",
              flash === entry.id ? "is-flash" : "",
              isIns && insertPos.position === "before" ? "insert-before" : "",
              isIns && insertPos.position === "after"  ? "insert-after"  : "",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={entry.id}
                className={rowClass}
                style={{ display:"grid", gridTemplateColumns:GRID_COLS, alignItems:"center", gap:"0 6px", padding: isMobile?"11px 0":"8px 0", cursor: isMobile?"default":"grab" }}
                draggable={!isMobile}
                onDragStart={!isMobile ? e => handleDragStart(e, entry.id) : undefined}
                onDragOver={!isMobile ? e => handleDragOver(e, entry.id) : undefined}
                onDragLeave={!isMobile ? handleDragLeave : undefined}
                onDrop={!isMobile ? e => handleDrop(e, entry.id) : undefined}
                onDragEnd={!isMobile ? handleDragEnd : undefined}
              >
                {/* Rank */}
                <div style={{ fontFamily:"'Impact','Arial Black',sans-serif", fontSize: isMobile?"16px":"20px", color:accent, opacity:0.55, textAlign:"right", userSelect:"none", letterSpacing:"-0.02em", lineHeight:1 }}>
                  {String(i+1).padStart(2,"0")}
                </div>

                {/* Accent bar */}
                <div style={{ width:"2px", height:"22px", background:accent, opacity:0.4, borderRadius:"1px" }}/>

                {/* Name */}
                <input
                  className="name-input"
                  style={{ fontSize: isMobile?"13px":"14px", color:accent, opacity: i===0?1:0.85, fontWeight: i===0?"900":"700" }}
                  value={entry.name}
                  onChange={e => updateName(entry.id, e.target.value)}
                  spellCheck={false}
                  maxLength={60}
                  placeholder="NAME"
                />

                {/* Movement */}
                <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
                  <MovementIcon type={mv||"same"}/>
                </div>

                {/* Controls */}
                {isMobile ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"2px" }}>
                    <button className="mv-btn" onClick={()=>moveEntry(entry.id,-1)} disabled={i===0}>↑</button>
                    <button className="mv-btn" onClick={()=>moveEntry(entry.id,1)} disabled={i===entries.length-1}>↓</button>
                    <button className="r-del" onClick={()=>removeEntry(entry.id)}>×</button>
                  </div>
                ) : (
                  <button className="r-del" onClick={()=>removeEntry(entry.id)} title="Remove">×</button>
                )}
              </div>
            );
          })}

          {/* Actions */}
          <div style={{ display:"flex", gap:"8px", marginTop:"28px", flexWrap:"wrap" }}>
            <button className="a-btn" style={{ background:"#39FF14", border:"none", color:"#0a0a0a", padding: isMobile?"14px 0":"11px 18px", flex: isMobile?"1 1 100%":"0 0 auto" }} onClick={addEntry}>
              + SIGN NEW RECRUIT
            </button>
            <button className="a-btn" style={{ background:"none", border:"1px solid #222", color:"#555", padding: isMobile?"13px 0":"11px 16px", flex: isMobile?"1 1 calc(50% - 4px)":"0 0 auto" }} onClick={openShare}>
              📸 SNAPSHOT
            </button>
            <button className="a-btn" style={{ background:"none", border:"1px solid #1a1a1a", color:"#333", padding: isMobile?"13px 0":"11px 14px", flex: isMobile?"1 1 calc(50% - 4px)":"0 0 auto", fontSize:"10px" }} onClick={()=>{ setPreviousEntries(null); setMovement({}); }}>
              ⟳ RESET MV
            </button>
          </div>

          <div style={{ marginTop:"18px", fontSize:"8px", color:"#1a1a1a", letterSpacing:"0.18em" }}>
            AUTO-SAVED · {new Date().getFullYear()} ROSTR
          </div>
        </div>

        {/* Snapshot modal */}
        {shareMode && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:"20px", overflowY:"auto" }} onClick={()=>setShareMode(false)}>
            <div style={{ width:"100%", maxWidth:"440px", background:"#0d0d0d", border:"1px solid #1e1e1e", padding: isMobile?"20px 16px":"28px" }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:"8px", letterSpacing:"0.35em", color:"#3a3a3a", textTransform:"uppercase", marginBottom:"14px" }}>
                📸 SNAPSHOT · SHARE THIS
              </div>
              {snapshotUrl && <img src={snapshotUrl} alt="Rostr snapshot" style={{ width:"100%", border:"1px solid #1e1e1e", display:"block", marginBottom:"16px" }}/>}
              <div style={{ display:"flex", gap:"8px" }}>
                <button className="a-btn" style={{ background:"#39FF14", border:"none", color:"#0a0a0a", padding:"13px 0", flex:1 }} onClick={downloadSnapshot}>
                  ↓ SAVE IMAGE
                </button>
                <button className="a-btn" style={{ background:"none", border:"1px solid #222", color:"#555", padding:"13px 14px" }} onClick={()=>setShareMode(false)}>
                  CLOSE
                </button>
              </div>
              <div style={{ marginTop:"10px", fontSize:"8px", color:"#2a2a2a", letterSpacing:"0.15em" }}>
                SAVE THE IMAGE THEN SHARE ANYWHERE ↑
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
