import { useState, useEffect, useRef, useCallback } from "react";

const INCREMENT_KG = 2;
const WEIGHTS_KEY = "scgym:weights:v2";
const DEFAULT_WEIGHTS = {
  goblet_squat:     0,
  db_rdl:           14,
  db_bench:         14,
  cable_seated_row: 20,
  lat_pulldown:     20,
  db_lateral_raise: 14,
  face_pull_cable:  15,
};

const WORKOUT = [
  {
    id: "goblet_squat",
    name: "GOBLET SQUAT",
    sets: 3, reps: 12, rest: 90,
    muscle: "LEGS",
    note: "Light. Feel the pattern.",
    cues: [
      "Hold dumbbell vertically at chest, elbows pointing down",
      "Feet shoulder-width, toes slightly out",
      "Sit between your heels — chest stays tall throughout",
      "Drive knees out and push the floor away to stand",
    ],
    video: "https://www.youtube.com/results?search_query=alan+thrall+goblet+squat",
    videoLabel: "Alan Thrall — Goblet Squat",
  },
  {
    id: "db_rdl",
    name: "DB ROMANIAN DEADLIFT",
    sets: 3, reps: 10, rest: 90,
    muscle: "POSTERIOR CHAIN",
    note: "Hinge from hips, soft knees.",
    cues: [
      "Soft, fixed bend in knees — they don't move",
      "Push hips back (not down) — like closing a car door with your hips",
      "Dumbbells drag close to your legs all the way down",
      "Feel the hamstring stretch, then drive hips forward to stand",
    ],
    video: "https://www.youtube.com/results?search_query=jeff+nippard+romanian+deadlift+form",
    videoLabel: "Jeff Nippard — Romanian Deadlift",
  },
  {
    id: "db_bench",
    name: "DB BENCH PRESS",
    sets: 3, reps: 12, rest: 90,
    muscle: "CHEST",
    note: null,
    cues: [
      "Shoulder blades pinched and pressed into the bench",
      "Lower dumbbells to chest — elbows at ~45°, not flared wide",
      "Press up and slightly inward, don't fully lock out",
      "Control the descent — never drop the weight",
    ],
    video: "https://www.youtube.com/results?search_query=renaissance+periodization+dumbbell+bench+press+form",
    videoLabel: "RP — Dumbbell Bench Press",
  },
  {
    id: "cable_seated_row",
    name: "CABLE SEATED ROW",
    sets: 3, reps: 12, rest: 60,
    muscle: "BACK",
    note: null,
    cues: [
      "Sit tall, chest proud — don't round forward to reach",
      "Drive elbows back past your torso",
      "Squeeze shoulder blades together at the finish",
      "Full stretch at the front — let scapulae protract before each rep",
    ],
    video: "https://www.youtube.com/results?search_query=mind+pump+seated+cable+row+form",
    videoLabel: "Mind Pump — Seated Cable Row",
  },
  {
    id: "lat_pulldown",
    name: "LAT PULLDOWN",
    sets: 3, reps: 12, rest: 60,
    muscle: "BACK",
    note: null,
    cues: [
      "Slight lean back (15–20°), chest up toward the bar",
      "Pull bar to upper chest — lead with elbows, not hands",
      "Don't lean further back as you pull — that becomes a row",
      "Controlled return — feel the lats fully stretch at the top",
    ],
    video: "https://www.youtube.com/results?search_query=jeff+nippard+lat+pulldown+form",
    videoLabel: "Jeff Nippard — Lat Pulldown",
  },
  {
    id: "db_lateral_raise",
    name: "DB LATERAL RAISE",
    sets: 3, reps: 15, rest: 60,
    muscle: "SHOULDERS",
    note: "Light. Feel the lateral delt.",
    cues: [
      "Slight forward lean at hips, soft bend in elbows",
      "Raise to shoulder height — no higher",
      "Lead with your elbows, not wrists (think: pouring a jug)",
      "Lower slowly — the descent is where the muscle actually works",
    ],
    video: "https://www.youtube.com/results?search_query=mike+israetel+lateral+raise+form",
    videoLabel: "Mike Israetel — Lateral Raise",
  },
  {
    id: "face_pull_cable",
    name: "FACE PULL (CABLE)",
    sets: 3, reps: 15, rest: 60,
    muscle: "SHOULDERS",
    note: "External rotation. Controlled.",
    cues: [
      "Set cable at forehead height or above",
      "Pull toward your face, hands finishing beside your ears",
      "Rotate externally — thumbs finish pointing behind you",
      "Elbows stay high throughout the entire movement",
    ],
    video: "https://www.youtube.com/results?search_query=jeff+cavaliere+athlean+face+pull+form",
    videoLabel: "Jeff Cavaliere — Face Pull",
  },
];

const TOTAL_SETS = WORKOUT.reduce((sum, ex) => sum + ex.sets, 0);

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: #0A0A0A; }
  .cue-enter { animation: fadeDown 0.2s ease; }
  @keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
`;

const C = {
  bg: "#0A0A0A", surface: "#141414", surface2: "#181818",
  border: "#222", accent: "#C97A0A", accentDim: "#6B4206",
  text: "#E8E4DC", muted: "#555",
  mono: "'IBM Plex Mono', monospace", sans: "'Barlow Condensed', sans-serif",
};

function getLastWeight(history, name) {
  for (let i = history.sessions.length - 1; i >= 0; i--) {
    const sets = history.sessions[i].exercises?.[name];
    if (sets?.length) return sets[sets.length - 1].weight;
  }
  return null;
}

function getPR(history, name) {
  let pr = null;
  for (const session of history.sessions) {
    for (const set of session.exercises?.[name] ?? []) {
      if (pr === null || set.weight > pr) pr = set.weight;
    }
  }
  return pr;
}

const Btn = ({ children, onClick, variant = "primary", style = {} }) => (
  <button onClick={onClick} style={{
    width: "100%", cursor: "pointer", padding: "20px 0",
    fontSize: 22, fontWeight: 900, fontFamily: C.sans, letterSpacing: 2,
    background: variant === "primary" ? C.accent : "transparent",
    color: variant === "primary" ? "#0A0A0A" : C.muted,
    border: variant !== "primary" ? `1px solid ${C.border}` : "none",
    ...style,
  }}>{children}</button>
);

export default function App() {
  const [phase, setPhase] = useState("start");
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("gym_history");
      return raw ? JSON.parse(raw) : { sessions: [] };
    } catch {
      return { sessions: [] };
    }
  });
  const [workoutList, setWorkoutList] = useState([...WORKOUT]);
  const [reorderMode, setReorderMode] = useState(false);
  const [currentSession, setCurrentSession] = useState({});
  const [weightInput, setWeightInput] = useState(0);
  const [workingWeights, setWorkingWeights] = useState(() => {
    try {
      const raw = localStorage.getItem(WEIGHTS_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      const result = {};
      for (const ex of WORKOUT) {
        result[ex.id] = saved[ex.id]?.weight ?? DEFAULT_WEIGHTS[ex.id] ?? 0;
      }
      return result;
    } catch {
      const result = {};
      for (const ex of WORKOUT) result[ex.id] = DEFAULT_WEIGHTS[ex.id] ?? 0;
      return result;
    }
  });
  const timerRef = useRef(null);
  const current = workoutList[exIdx];

  const moveExercise = (fromIdx, direction) => {
    const toIdx = fromIdx + direction;
    if (toIdx <= exIdx || toIdx >= workoutList.length) return;
    const newList = [...workoutList];
    [newList[fromIdx], newList[toIdx]] = [newList[toIdx], newList[fromIdx]];
    setWorkoutList(newList);
  };

  const persistHistory = (h) => {
    setHistory(h);
    localStorage.setItem("gym_history", JSON.stringify(h));
  };

  const advance = useCallback(() => {
    clearInterval(timerRef.current);
    if (setIdx + 1 < current.sets) { setSetIdx(s => s + 1); setPhase("exercise"); }
    else if (exIdx + 1 < WORKOUT.length) { setExIdx(e => e + 1); setSetIdx(0); setPhase("exercise"); setShowForm(false); }
    else setPhase("complete");
  }, [setIdx, exIdx, current.sets]);

  useEffect(() => {
    if (phase !== "rest") return;
    let remaining = restTotal;
    timerRef.current = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      setRestTime(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current);
        advance();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, exIdx, setIdx, restTotal, advance]);

  const completeSet = () => {
    setWeightInput(workingWeights[current.id] ?? 0);
    setPhase("weight");
  };

  const logSetAndRest = () => {
    setCurrentSession(prev => ({
      ...prev,
      [current.name]: [
        ...(prev[current.name] ?? []),
        { set: setIdx + 1, weight: weightInput, reps: current.reps },
      ],
    }));
    const r = current.rest;
    setRestTotal(r); setRestTime(r); setPhase("rest");
  };

  const reset = () => {
    if (Object.keys(currentSession).length > 0) {
      const now = new Date();
      persistHistory({
        sessions: [...history.sessions, {
          id: now.toISOString(),
          date: now.toISOString().slice(0, 10),
          exercises: currentSession,
        }],
      });

      const nextStored = {};
      const nextFlat = {};
      for (const ex of WORKOUT) {
        const logged = currentSession[ex.name] ?? [];
        const allMaxed =
          logged.length === ex.sets &&
          logged.every(s => s.reps >= ex.reps);
        const next = allMaxed
          ? (workingWeights[ex.id] ?? 0) + INCREMENT_KG
          : (workingWeights[ex.id] ?? 0);
        nextStored[ex.id] = { weight: next };
        nextFlat[ex.id] = next;
      }
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(nextStored));
      setWorkingWeights(nextFlat);
    }
    setCurrentSession({});
    setWeightInput(0);
    setWorkoutList([...WORKOUT]);
    setReorderMode(false);
    setPhase("start"); setExIdx(0); setSetIdx(0);
    setRestTime(0); setRestTotal(0); setShowForm(false);
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gym-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importHistory = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed?.sessions)) { alert("Invalid history file."); return; }
        if (window.confirm("Replace current history with imported data?")) persistHistory(parsed);
      } catch { alert("Could not read file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const circumference = 2 * Math.PI * 88;
  const restPct = restTotal > 0 ? (restTime / restTotal) * 100 : 0;

  const ReorderOverlay = () => {
    const upcoming = workoutList.slice(exIdx + 1);
    const startIdx = exIdx + 1;
    const rowBtn = (label, onClick, disabled) => (
      <button onClick={onClick} disabled={disabled} style={{
        width: 36, height: 36, background: "transparent",
        border: `1px solid ${disabled ? C.border : C.muted}`,
        color: disabled ? C.border : C.muted,
        fontFamily: C.mono, fontSize: 14, cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{label}</button>
    );
    return (
      <div style={{
        position: "fixed", inset: 0, background: C.bg, zIndex: 100,
        overflowY: "auto", maxWidth: 430, margin: "0 auto", padding: "64px 24px 48px",
      }}>
        <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 5, marginBottom: 8 }}>UPCOMING</div>
        <h2 style={{ fontSize: 48, fontWeight: 900, lineHeight: 0.9, marginBottom: 32 }}>REORDER</h2>
        {upcoming.length === 0
          ? <div style={{ color: C.muted, fontSize: 16, marginBottom: 32 }}>No upcoming exercises.</div>
          : (
            <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 32 }}>
              {upcoming.map((ex, i) => {
                const abs = startIdx + i;
                return (
                  <div key={ex.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 0", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{ex.name}</div>
                      <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 11 }}>{ex.sets}×{ex.reps}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {rowBtn("↑", () => moveExercise(abs, -1), i === 0)}
                      {rowBtn("↓", () => moveExercise(abs, 1), i === upcoming.length - 1)}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
        <Btn onClick={() => setReorderMode(false)}>DONE</Btn>
      </div>
    );
  };

  const wrap = (children) => (
    <div style={{ background: C.bg, minHeight: "100dvh", color: C.text, fontFamily: C.sans, maxWidth: 430, margin: "0 auto", padding: "0 24px 64px" }}>
      <style>{FONTS}</style>
      {reorderMode && <ReorderOverlay />}
      {children}
    </div>
  );

  if (phase === "start") return wrap(
    <div style={{ paddingTop: 64, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: 0, display: "flex", gap: 8 }}>
        <button
          onClick={exportHistory}
          title="Export history"
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.muted, cursor: "pointer",
            fontFamily: C.mono, fontSize: 10, letterSpacing: 2,
            padding: "6px 10px",
          }}
        >↓ EXPORT</button>
        <label
          htmlFor="import-file"
          title="Import history"
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.muted, cursor: "pointer",
            fontFamily: C.mono, fontSize: 10, letterSpacing: 2,
            padding: "6px 10px", display: "inline-block",
          }}
        >↑ IMPORT</label>
        <input id="import-file" type="file" accept=".json" onChange={importHistory} style={{ display: "none" }} />
      </div>

      <div style={{ color: C.accent, fontFamily: C.mono, fontSize: 10, letterSpacing: 5, marginBottom: 20 }}>SIGNAL CULT / PHASE 2</div>
      <h1 style={{ fontSize: 80, fontWeight: 900, lineHeight: 0.88, marginBottom: 8 }}>FULL<br />BODY</h1>
      <div style={{ color: C.muted, fontSize: 18, marginBottom: 48, fontWeight: 500 }}>MON · WED · FRI</div>
      <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 40 }}>
        {WORKOUT.map((ex, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{ex.name}</span>
            <span style={{ color: C.muted, fontFamily: C.mono, fontSize: 13 }}>{ex.sets}×{ex.reps}</span>
          </div>
        ))}
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 32, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ color: C.accent, fontSize: 20, marginTop: 3 }}>→</div>
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 3, color: C.muted, marginBottom: 4 }}>PROGRESSION</div>
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.5 }}>Hit all reps at your weight → +{INCREMENT_KG}kg next session. Miss any → repeat the weight.</div>
        </div>
      </div>
      <Btn onClick={() => setPhase("warmup")}>BEGIN SESSION</Btn>
    </div>
  );

  if (phase === "warmup") return wrap(
    <div style={{ paddingTop: 64 }}>
      <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 5, marginBottom: 48 }}>BEFORE YOU LIFT</div>
      <h1 style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.88, marginBottom: 32 }}>WARM<br />UP</h1>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "28px 24px", marginBottom: 48 }}>
        <div style={{ fontFamily: C.mono, fontSize: 36, fontWeight: 500, marginBottom: 12 }}>10 MIN</div>
        <div style={{ color: C.muted, fontSize: 17, lineHeight: 1.5 }}>Treadmill walk at 5.5–6 km/h or stationary bike. Easy pace — priming, not training.</div>
      </div>
      <Btn onClick={() => setPhase("exercise")}>WARMUP DONE</Btn>
    </div>
  );

  if (phase === "weight") {
    const stepWeight = (delta) => setWeightInput(w => Math.max(0, w + delta));
    const stepBtnStyle = {
      width: 52, height: 52, borderRadius: "50%",
      background: "transparent", border: `2px solid ${C.border}`,
      color: C.muted, cursor: "pointer",
      fontFamily: C.mono, fontSize: 20, fontWeight: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    };
    return wrap(
      <div style={{ paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 5, marginBottom: 12 }}>WEIGHT LOGGED</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
        <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 4, marginBottom: 48 }}>
          SET {setIdx + 1} OF {current.sets}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
          <button style={stepBtnStyle} onClick={() => stepWeight(-2)}>−</button>
          <div style={{ fontFamily: C.mono, fontSize: 80, fontWeight: 500, lineHeight: 1, minWidth: 120, textAlign: "center" }}>
            {weightInput}
          </div>
          <button style={stepBtnStyle} onClick={() => stepWeight(2)}>+</button>
        </div>

        <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: 4, color: C.muted, marginBottom: 32 }}>KG</div>

        <input
          type="number"
          value={weightInput}
          min={0}
          onChange={e => setWeightInput(Math.max(0, Number(e.target.value) || 0))}
          onBlur={e => setWeightInput(Math.max(0, Number(e.target.value) || 0))}
          style={{
            fontFamily: C.mono, fontSize: 28, fontWeight: 500,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.text, textAlign: "center",
            padding: "12px 0", width: 120, marginBottom: 48,
            MozAppearance: "textfield",
          }}
        />

        <div style={{ width: "100%" }}>
          <Btn onClick={logSetAndRest}>LOG SET</Btn>
        </div>

        <button
          onClick={() => { setWeightInput(0); logSetAndRest(); }}
          style={{
            background: "transparent", border: "none",
            color: C.muted, cursor: "pointer",
            fontFamily: C.mono, fontSize: 11, letterSpacing: 2,
            marginTop: 16, padding: "8px 0",
          }}
        >
          SKIP — LOG 0 KG
        </button>
      </div>
    );
  }

  if (phase === "rest") {
    const mins = Math.floor(restTime / 60);
    const secs = restTime % 60;
    const display = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${restTime}`;
    const nextLabel = (() => {
      if (setIdx + 1 < current.sets) return `SET ${setIdx + 2} OF ${current.sets} — ${current.reps} REPS`;
      if (exIdx + 1 < workoutList.length) return workoutList[exIdx + 1].name;
      return "LAST SET DONE";
    })();
    return wrap(
      <div style={{ paddingTop: 64, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 5, marginBottom: 12 }}>REST</div>
        <div style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 40 }}>{current.name}</div>
        <div style={{ position: "relative", width: 200, height: 200, marginBottom: 40 }}>
          <svg width="200" height="200" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx="100" cy="100" r="88" fill="none" stroke={C.border} strokeWidth="5" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={C.accent} strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - restPct / 100)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: C.mono, fontSize: 52, fontWeight: 500 }}>{display}</span>
          </div>
        </div>
        <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 4, marginBottom: 8 }}>NEXT UP</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 56, textAlign: "center", letterSpacing: 1 }}>{nextLabel}</div>
        <Btn onClick={advance} variant="ghost" style={{ width: "auto", padding: "14px 48px", fontSize: 15 }}>SKIP REST</Btn>
        <button onClick={() => setReorderMode(true)} style={{
          background: "transparent", border: "none", color: C.muted, cursor: "pointer",
          fontFamily: C.mono, fontSize: 10, letterSpacing: 2, marginTop: 24, padding: 0,
        }}>↕ REORDER</button>
      </div>
    );
  }

  if (phase === "complete") return wrap(
    <div style={{ paddingTop: 80, textAlign: "center" }}>
      <div style={{ color: C.accent, fontFamily: C.mono, fontSize: 10, letterSpacing: 5, marginBottom: 20 }}>SESSION COMPLETE</div>
      <h1 style={{ fontSize: 80, fontWeight: 900, lineHeight: 0.88, marginBottom: 24 }}>DONE.<br />GET OUT.</h1>
      <div style={{ color: C.muted, fontSize: 20, marginBottom: 80 }}>21 sets. Rest. Eat your protein.</div>
      <Btn onClick={reset} variant="ghost">BACK TO PROGRAM</Btn>
    </div>
  );

  // ── EXERCISE ───────────────────────────────────────────────────────────────
  const completedSets = workoutList.slice(0, exIdx).reduce((s, ex) => s + ex.sets, 0) + setIdx;
  const sessionProgress = (completedSets / TOTAL_SETS) * 100;

  const last = getLastWeight(history, current.name);
  const pr   = getPR(history, current.name);

  return wrap(
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: C.border, zIndex: 10 }}>
        <div style={{ height: "100%", background: C.accent, width: `${sessionProgress}%`, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ paddingTop: 56 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <span style={{ color: C.muted, fontFamily: C.mono, fontSize: 11, letterSpacing: 3 }}>{exIdx + 1} / {workoutList.length}</span>
          <button onClick={() => setReorderMode(true)} style={{
            background: "transparent", border: "none", color: C.muted, cursor: "pointer",
            fontFamily: C.mono, fontSize: 10, letterSpacing: 2, padding: 0,
          }}>↕ REORDER</button>
          <span style={{ color: C.accent, fontFamily: C.mono, fontSize: 11, letterSpacing: 3 }}>{current.muscle}</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: current.name.length > 14 ? 40 : current.name.length > 10 ? 52 : 64, fontWeight: 900, lineHeight: 0.92, marginBottom: current.note ? 10 : 0 }}>
            {current.name}
          </h1>
          {current.note && <div style={{ color: C.muted, fontSize: 15, fontStyle: "italic" }}>{current.note}</div>}
        </div>

        <div style={{ display: "flex", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          {[
            { label: "LAST", value: last !== null ? String(last) : "—", unit: last !== null },
            { label: "PR",   value: pr   !== null ? String(pr)   : "—", unit: pr   !== null },
            { label: "TARGET", value: pr !== null ? String(pr + 2) : "—", unit: pr !== null, accent: true },
          ].map((col, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 0", textAlign: "center",
              borderRight: i < 2 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 4, color: C.muted, marginBottom: 4 }}>
                {col.label}
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 500, color: col.accent ? C.accent : C.text }}>
                {col.value}
              </div>
              {col.unit && (
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted }}>KG</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {Array.from({ length: current.sets }).map((_, i) => (
            <div key={i} style={{
              width: 52, height: 52, borderRadius: "50%",
              background: i < setIdx ? C.accent : "transparent",
              border: `2px solid ${i < setIdx ? C.accent : i === setIdx ? C.text : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: C.mono, fontSize: 15, fontWeight: 500,
              color: i < setIdx ? "#0A0A0A" : i === setIdx ? C.text : C.muted,
              transition: "all 0.2s",
            }}>
              {i < setIdx ? "✓" : i + 1}
            </div>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "24px", marginBottom: 12 }}>
          <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: 4, marginBottom: 10 }}>SET {setIdx + 1} OF {current.sets}</div>
          <div style={{ fontFamily: C.mono, fontSize: 64, fontWeight: 500, lineHeight: 1 }}>{current.reps}</div>
          <div style={{ color: C.muted, fontSize: 18, fontWeight: 600, marginTop: 4 }}>REPS</div>
        </div>

        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            width: "100%", background: "transparent", cursor: "pointer",
            border: `1px solid ${showForm ? C.accentDim : C.border}`,
            borderBottom: showForm ? "none" : `1px solid ${showForm ? C.accentDim : C.border}`,
            color: showForm ? C.accent : C.muted,
            padding: "13px 0", fontSize: 15, fontWeight: 700,
            fontFamily: C.sans, letterSpacing: 2,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <span style={{ fontSize: 11 }}>{showForm ? "▲" : "▼"}</span> FORM CUES + VIDEO
        </button>

        {showForm && (
          <div className="cue-enter" style={{
            background: C.surface2, border: `1px solid ${C.accentDim}`,
            borderTop: "none", padding: "20px 20px 16px", marginBottom: 0,
          }}>
            {current.cues.map((cue, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                <span style={{ color: C.accent, fontFamily: C.mono, fontSize: 11, marginTop: 2, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 15, lineHeight: 1.5, color: C.text }}>{cue}</span>
              </div>
            ))}
            <a
              href={current.video}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 12, marginTop: 8,
                background: "#160900", border: `1px solid ${C.accentDim}`,
                padding: "14px 16px", textDecoration: "none",
                color: C.accent, fontSize: 15, fontWeight: 700, letterSpacing: 1,
              }}
            >
              <span style={{ fontSize: 16 }}>▶</span>
              <span>{current.videoLabel}</span>
            </a>
          </div>
        )}

        <div style={{ height: 16 }} />

        <Btn onClick={completeSet}>SET DONE</Btn>

        <div style={{ textAlign: "center", marginTop: 14, color: C.muted, fontFamily: C.mono, fontSize: 11, letterSpacing: 2 }}>
          {current.rest}s REST FOLLOWS
        </div>
      </div>
    </>
  );
}
