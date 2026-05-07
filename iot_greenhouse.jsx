import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",    label: "📊", title: "Dashboard"      },
  { id: "automation",   label: "⚙️", title: "Automatizácia"  },
  { id: "history",      label: "📈", title: "História"       },
  { id: "architecture", label: "🏗️", title: "Architektúra"   },
  { id: "esp32",        label: "💾", title: "ESP32 Kód"      },
  { id: "backend",      label: "🖥️", title: "Backend Kód"    },
];



//const BACKEND_CODE = // ============================================================
//  SMART GREENHOUSE — Node.js Backend v1.0
//  npm install express ws cors
//  node server.js
// ============================================================

const express = require("express");
const http    = require("http");
const { WebSocketServer } = require("ws");
const cors    = require("cors");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const PORT   = 3001;

app.use(cors());
app.use(express.json());

// ── STAV SYSTÉMU ─────────────────────────────────────────────
let state = {
  sensors: {
    temperature: 23.0, humidity: 58.0,
    soilMoisture: 50,  light: 600,
    timestamp: Date.now(),
  },
  actuators: { fan: false, pump: false, window: 0 },
  automation: {
    enabled: true,
    thermostat:  { enabled: true, threshold: 28 },
    irrigation:  { enabled: true, threshold: 30 },
    windowAuto:  { enabled: true, tempThreshold: 30, lightThreshold: 800 },
  },
};

// ── AUTOMATIZAČNÝ MODUL ───────────────────────────────────────
function runAutomation() {
  const { sensors: s, actuators: a, automation: auto } = state;
  if (!auto.enabled) return;

  let changed = false;

  // 🌡️ TERMOSTAT — ventilátor zapína keď teplota > prah
  if (auto.thermostat.enabled) {
    const shouldFan = s.temperature > auto.thermostat.threshold;
    if (a.fan !== shouldFan) { a.fan = shouldFan; changed = true; }
  }

  // 💧 ZÁVLAHA — čerpadlo zapína keď vlhkosť pôdy < prah
  if (auto.irrigation.enabled) {
    const shouldPump = s.soilMoisture < auto.irrigation.threshold;
    if (a.pump !== shouldPump) { a.pump = shouldPump; changed = true; }
  }

  // 🪟 OKNO — servo otvára pri vysokej teplote alebo svetle
  if (auto.windowAuto.enabled) {
    const open = s.temperature > auto.windowAuto.tempThreshold
              || s.light       > auto.windowAuto.lightThreshold;
    const angle = open ? 90 : 0;
    if (a.window !== angle) { a.window = angle; changed = true; }
  }

  if (changed) broadcast("actuators", state.actuators);
}

// ── BROADCAST cez WebSocket ───────────────────────────────────
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

// ── REST API — pre ESP32 ──────────────────────────────────────

// ESP32 → posiela senzorové dáta každých 5s
app.post("/api/sensors", (req, res) => {
  state.sensors = { ...req.body, timestamp: Date.now() };
  runAutomation();
  broadcast("sensors", state.sensors);
  res.json({ ok: true });
});

// ESP32 → pýta si aktuálne príkazy pre aktuátory
app.get("/api/actuators", (req, res) => {
  res.json(state.actuators);
});

// ── REST API — pre Frontend ───────────────────────────────────

// Manuálne ovládanie aktuátora
app.post("/api/actuators", (req, res) => {
  state.actuators = { ...state.actuators, ...req.body };
  broadcast("actuators", state.actuators);
  res.json({ ok: true });
});

// Čítanie / zápis automation nastavení
app.get("/api/automation",  (req, res) => res.json(state.automation));
app.post("/api/automation", (req, res) => {
  state.automation = { ...state.automation, ...req.body };
  runAutomation();
  broadcast("automation", state.automation);
  res.json({ ok: true });
});

// Celkový stav (pre initial load)
app.get("/api/state", (req, res) => res.json(state));

// ── WEBSOCKET — real-time push na frontend ────────────────────
wss.on("connection", ws => {
  console.log("🔌 Frontend klient pripojený");

  // Pošli celý aktuálny stav
  ws.send(JSON.stringify({ type: "fullState", data: state }));

  ws.on("message", raw => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === "setActuator") {
        state.actuators = { ...state.actuators, ...msg.data };
        broadcast("actuators", state.actuators);
      }
      if (msg.type === "setAutomation") {
        state.automation = { ...state.automation, ...msg.data };
        runAutomation();
        broadcast("automation", state.automation);
      }
    } catch (e) { console.error("WS parse error:", e); }
  });

  ws.on("close", () => console.log("❌ Klient odpojený"));
});

server.listen(PORT, () => {
  console.log(\`🚀 Backend beží na http://localhost:\${PORT}\`);
  console.log(\`   WebSocket: ws://localhost:\${PORT}\`);
  });`);

// ── STYLES ────────────────────────────────────────────────────
const S = {
  bg: "#07090f",
  panel: "#0d1117",
  panelHover: "#111820",
  border: "#1c2d40",
  borderActive: "#00b8d4",
  cyan: "#00e5ff",
  green: "#00e676",
  amber: "#ffab00",
  red: "#ff1744",
  blue: "#448aff",
  purple: "#e040fb",
  textPrimary: "#e0f0ff",
  textMuted: "#4a6a8a",
  textDim: "#2a4a6a",
};

// ── HELPER COMPONENTS ─────────────────────────────────────────
const Panel = ({ children, style = {}, glow }) => (
  <div style={{
    background: S.panel,
    border: `1px solid ${glow ? glow + "60" : S.border}`,
    borderRadius: 12,
    boxShadow: glow ? `0 0 20px ${glow}18, inset 0 0 30px #00000020` : "none",
    ...style,
  }}>
    {children}
  </div>
);

const Tag = ({ children, color = S.cyan }) => (
  <span style={{
    background: color + "18",
    border: `1px solid ${color}40`,
    color,
    borderRadius: 4,
    fontSize: 10,
    padding: "2px 7px",
    fontFamily: "monospace",
    letterSpacing: 1,
    fontWeight: 700,
  }}>{children}</span>
);

const PulseCircle = ({ color, size = 10 }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <div style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: color,
      animation: "pulse-glow 2s infinite",
    }} />
    <style>{`@keyframes pulse-glow{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
  </div>
);

function SensorCard({ icon, label, value, unit, color, min, max, subtext }) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <Panel glow={color} style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: S.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "monospace", lineHeight: 1 }}>
            {typeof value === "number" ? (value % 1 === 0 ? value : value.toFixed(1)) : value}
            <span style={{ fontSize: 14, marginLeft: 4, fontWeight: 400, color: S.textMuted }}>{unit}</span>
          </div>
        </div>
        <div style={{ fontSize: 28 }}>{icon}</div>
      </div>
      <div style={{ background: S.border, borderRadius: 4, height: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          width: `${Math.min(100, Math.max(0, pct))}%`,
          transition: "width 1s ease",
        }} />
      </div>
      {subtext && <div style={{ fontSize: 10, color: S.textMuted, marginTop: 6 }}>{subtext}</div>}
    </Panel>
  );
}

function ActuatorCard({ icon, label, active, color, onToggle, autoMode, autoReason, value }) {
  return (
    <Panel glow={active ? color : null} style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.textPrimary }}>{label}</div>
            <div style={{ fontSize: 10, color: S.textMuted, marginTop: 2 }}>
              {autoMode ? <Tag color={S.amber}>AUTO</Tag> : <Tag color={S.blue}>MANUAL</Tag>}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={autoMode}
          style={{
            width: 52, height: 28, borderRadius: 14,
            background: active ? color : S.border,
            border: "none", cursor: autoMode ? "not-allowed" : "pointer",
            position: "relative", transition: "background 0.3s",
            opacity: autoMode ? 0.7 : 1,
          }}
        >
          <div style={{
            position: "absolute", top: 3,
            left: active ? 26 : 3,
            width: 22, height: 22, borderRadius: "50%",
            background: active ? "#fff" : S.textMuted,
            transition: "left 0.3s",
          }} />
        </button>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 8, borderTop: `1px solid ${S.border}`,
      }}>
        <div style={{ fontSize: 11, color: active ? color : S.textMuted, fontWeight: 600 }}>
          {active ? "● AKTÍVNY" : "○ NEAKTÍVNY"}
        </div>
        {autoReason && <div style={{ fontSize: 10, color: S.textMuted }}>{autoReason}</div>}
        {value !== undefined && (
          <div style={{ fontSize: 11, color: color, fontFamily: "monospace" }}>{value}°</div>
        )}
      </div>
    </Panel>
  );
}

const SliderRow = ({ label, value, min, max, step = 1, unit, color, onChange }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: S.textPrimary }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{value}{unit}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: color, cursor: "pointer" }}
    />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: S.textDim, marginTop: 2 }}>
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "relative" }}>
      <button onClick={copy} style={{
        position: "sticky", top: 8, float: "right", zIndex: 10,
        background: copied ? "#1a3a1a" : "#1a2a3a",
        border: `1px solid ${copied ? S.green : S.border}`,
        borderRadius: 6, padding: "5px 14px",
        color: copied ? S.green : S.textMuted,
        fontSize: 11, cursor: "pointer", fontFamily: "monospace",
        marginBottom: -32, marginRight: 8,
      }}>
        {copied ? "✓ Skopírované" : "⎘ Kopírovať"}
      </button>
      <div style={{
        background: "#060a0d", border: `1px solid ${S.border}`, borderRadius: 10,
        padding: "16px 14px", overflowX: "auto", maxHeight: "62vh", overflowY: "auto",
        fontSize: 11.5, lineHeight: 1.75, whiteSpace: "pre", fontFamily: "monospace",
      }}>
        {code.split("\n").map((line, i) => {
          let col = S.textPrimary;
          if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) col = "#3a6080";
          else if (line.includes("#include") || line.includes("#define") || line.includes("const ") || line.includes("require(")) col = "#c792ea";
          else if (/\b(void|bool|int|float|char|String|let|const|var|function|if|else|return|while|for|new)\b/.test(line)) col = "#82aaff";
          else if (line.includes("Serial.") || line.includes("digitalWrite") || line.includes("analogRead") || line.includes("console.")) col = "#89ddff";
          else if (line.includes('"') || line.includes("'")) col = "#c3e88d";
          return (
            <div key={i} style={{ color: col, display: "flex" }}>
              <span style={{ color: S.textDim, minWidth: 36, userSelect: "none", fontSize: 10, paddingRight: 12 }}>
                {i + 1}
              </span>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");

  const [sensors, setSensors] = useState({
    temperature: 25.4, humidity: 61, soilMoisture: 48, light: 640,
  });

  const [actuators, setActuators] = useState({
    fan: false, pump: false, window: 0,
  });

  const [automation, setAutomation] = useState({
    enabled: true,
    thermostat: { enabled: true,  threshold: 28 },
    irrigation: { enabled: true,  threshold: 30 },
    windowAuto: { enabled: true,  tempThreshold: 30, lightThreshold: 800 },
  });

  const [history, setHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tick, setTick] = useState(0);

  // Run automation engine (mirrors backend logic on frontend for demo)
  const runAuto = (s, a, auto) => {
    const next = { ...a };
    if (!auto.enabled) return next;
    if (auto.thermostat.enabled) next.fan    = s.temperature  > auto.thermostat.threshold;
    if (auto.irrigation.enabled) next.pump   = s.soilMoisture < auto.irrigation.threshold;
    if (auto.windowAuto.enabled) next.window =
      (s.temperature > auto.windowAuto.tempThreshold || s.light > auto.windowAuto.lightThreshold) ? 90 : 0;
    return next;
  };

  // Simulate live sensor data
  useEffect(() => {
    const iv = setInterval(() => {
      setSensors(prev => {
        const s = {
          temperature:  +Math.max(18, Math.min(40,  prev.temperature  + (Math.random()-0.46)*0.7)).toFixed(1),
          humidity:     +Math.max(30, Math.min(95,  prev.humidity     + (Math.random()-0.5) *1.5)).toFixed(1),
          soilMoisture: +Math.max(0,  Math.min(100, prev.soilMoisture + (Math.random()-0.53)*1.8)).toFixed(1),
          light:        Math.round(Math.max(0, Math.min(1023, prev.light + (Math.random()-0.5)*60))),
        };
        setActuators(a => runAuto(s, a, automation));
        setHistory(h => {
          const t = new Date();
          const label = `${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}`;
          return [...h.slice(-29), { time: label, ...s, lightPct: Math.round(s.light/10.23) }];
        });
        setLastUpdate(new Date());
        setTick(n => n+1);
        return s;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [automation]);

  const manualToggle = key => {
    if (automation.enabled) return;
    setActuators(a => ({
      ...a,
      [key]: key === "window" ? (a.window > 0 ? 0 : 90) : !a[key],
    }));
  };

  const updateAuto = (group, key, val) => {
    setAutomation(prev => {
      const next = { ...prev, [group]: { ...prev[group], [key]: val } };
      setSensors(s => { setActuators(a => runAuto(s, a, next)); return s; });
      return next;
    });
  };

  const tempAlert  = sensors.temperature > automation.thermostat.threshold;
  const soilAlert  = sensors.soilMoisture < automation.irrigation.threshold;
  const lightAlert = sensors.light > automation.windowAuto.lightThreshold;

  return (
    <div style={{ fontFamily: "'Trebuchet MS', sans-serif", background: S.bg, minHeight: "100vh", color: S.textPrimary }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0a0f17; }
        ::-webkit-scrollbar-thumb { background: #1c2d40; border-radius: 3px; }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(180deg, #0a1520 0%, #07090f 100%)",
        borderBottom: `1px solid ${S.border}`,
        padding: "14px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26, animation: "float 3s ease-in-out infinite" }}>🏡</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, color: S.cyan }}>
                SMART GREENHOUSE
              </div>
              <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 2, marginTop: 1 }}>
                IoT CONTROL SYSTEM · ESP32
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseCircle color={S.green} />
              <span style={{ fontSize: 11, color: S.green, fontFamily: "monospace" }}>DEMO LIVE</span>
            </div>
            <div style={{ fontSize: 10, color: S.textMuted, fontFamily: "monospace" }}>
              {lastUpdate.toLocaleTimeString("sk-SK")}
            </div>
            <Tag color={automation.enabled ? S.amber : S.textMuted}>
              {automation.enabled ? "AUTO ON" : "MANUAL"}
            </Tag>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 4, marginTop: 14, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "7px 14px", border: "none", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit", fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400, whiteSpace: "nowrap",
              background: tab === t.id ? S.borderActive + "20" : "transparent",
              color: tab === t.id ? S.cyan : S.textMuted,
              borderBottom: tab === t.id ? `2px solid ${S.cyan}` : "2px solid transparent",
              transition: "all 0.2s",
            }}>
              {t.label} {t.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px" }}>

        {/* ══════════════════════════════════════════════════ */}
        {/* DASHBOARD TAB                                      */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div>
            {/* Alert bar */}
            {(tempAlert || soilAlert || lightAlert) && (
              <Panel style={{ padding: "10px 16px", marginBottom: 14, borderColor: S.red + "50" }} glow={S.red}>
                <div style={{ fontSize: 12, color: S.red, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>⚠ UPOZORNENIA:</span>
                  {tempAlert && <span>🌡️ Teplota nad prahom ({sensors.temperature}°C)</span>}
                  {soilAlert && <span>🌱 Pôda príliš suchá ({sensors.soilMoisture}%)</span>}
                  {lightAlert && <span>☀️ Vysoká intenzita svetla ({sensors.light})</span>}
                </div>
              </Panel>
            )}

            {/* Section label */}
            <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>
              ◈ Senzory — real-time
            </div>

            {/* Sensor grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <SensorCard icon="🌡️" label="Teplota" value={sensors.temperature} unit="°C"
                color={tempAlert ? S.red : S.cyan} min={15} max={45}
                subtext={`Prah: ${automation.thermostat.threshold}°C`} />
              <SensorCard icon="💧" label="Vlhkosť vzduchu" value={sensors.humidity} unit="%"
                color={S.blue} min={0} max={100}
                subtext="DHT22" />
              <SensorCard icon="🌱" label="Vlhkosť pôdy" value={sensors.soilMoisture} unit="%"
                color={soilAlert ? S.red : S.green} min={0} max={100}
                subtext={`Min: ${automation.irrigation.threshold}%`} />
              <SensorCard icon="☀️" label="Svetlo" value={sensors.light} unit=" ADC"
                color={lightAlert ? S.amber : "#ffd54f"} min={0} max={1023}
                subtext={`Prah: ${automation.windowAuto.lightThreshold}`} />
            </div>

            {/* Section label */}
            <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>
              ◈ Akčné členy
            </div>

            {/* Actuator cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ActuatorCard icon="💨" label="Ventilátor / Chladenie" color={S.cyan}
                active={actuators.fan} autoMode={automation.enabled}
                onToggle={() => manualToggle("fan")}
                autoReason={automation.enabled ? `T > ${automation.thermostat.threshold}°C` : undefined} />
              <ActuatorCard icon="🚿" label="Čerpadlo / Závlaha" color={S.blue}
                active={actuators.pump} autoMode={automation.enabled}
                onToggle={() => manualToggle("pump")}
                autoReason={automation.enabled ? `Pôda < ${automation.irrigation.threshold}%` : undefined} />
              <ActuatorCard icon="🪟" label="Okno / Servo motor" color={S.purple}
                active={actuators.window > 0} autoMode={automation.enabled}
                onToggle={() => manualToggle("window")}
                value={actuators.window}
                autoReason={automation.enabled ? "T > 30°C / L > 800" : undefined} />
            </div>

            {/* Manual mode hint */}
            {automation.enabled && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: S.amber + "10",
                border: `1px solid ${S.amber}30`, borderRadius: 8, fontSize: 11, color: S.amber }}>
                💡 Pre manuálne ovládanie aktuátorov vypni AUTO režim v záložke Automatizácia
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* AUTOMATION TAB                                     */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === "automation" && (
          <div>
            {/* Master toggle */}
            <Panel style={{ padding: "18px 20px", marginBottom: 14 }} glow={automation.enabled ? S.amber : null}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.textPrimary, marginBottom: 4 }}>
                    Automatizačný Režim
                  </div>
                  <div style={{ fontSize: 11, color: S.textMuted }}>
                    {automation.enabled
                      ? "Systém automaticky riadi aktuátory podľa senzorov"
                      : "Manuálne ovládanie aktívne — prahy sa sledujú, ale nekonfigurujú"}
                  </div>
                </div>
                <button onClick={() => setAutomation(p => ({ ...p, enabled: !p.enabled }))} style={{
                  width: 60, height: 32, borderRadius: 16,
                  background: automation.enabled ? S.amber : S.border,
                  border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s",
                }}>
                  <div style={{
                    position: "absolute", top: 4,
                    left: automation.enabled ? 30 : 4,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "#fff", transition: "left 0.3s",
                  }} />
                </button>
              </div>
            </Panel>

            {/* Thermostat rule */}
            <Panel style={{ padding: "18px 20px", marginBottom: 12 }} glow={automation.thermostat.enabled ? S.cyan : null}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🌡️</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: S.cyan }}>Termostat</div>
                    <div style={{ fontSize: 10, color: S.textMuted }}>Ventilátor zapne keď teplota prekročí prah</div>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={automation.thermostat.enabled}
                    onChange={e => updateAuto("thermostat", "enabled", e.target.checked)}
                    style={{ accentColor: S.cyan, width: 16, height: 16 }} />
                  <span style={{ fontSize: 11, color: S.textMuted }}>Aktívne</span>
                </label>
              </div>
              <SliderRow label="Teplotný prah — ventilátor ZAP"
                value={automation.thermostat.threshold} min={18} max={40} unit="°C" color={S.cyan}
                onChange={v => updateAuto("thermostat", "threshold", v)} />
              <div style={{ fontSize: 11, color: S.textMuted, padding: "8px 12px", background: S.bg, borderRadius: 8 }}>
                Aktuálna teplota: <span style={{ color: tempAlert ? S.red : S.cyan, fontWeight: 700 }}>
                  {sensors.temperature}°C</span>
                {" → Ventilátor: "}<span style={{ color: actuators.fan ? S.green : S.textMuted, fontWeight: 700 }}>
                  {actuators.fan ? "ZAP" : "VYP"}</span>
              </div>
            </Panel>

            {/* Irrigation rule */}
            <Panel style={{ padding: "18px 20px", marginBottom: 12 }} glow={automation.irrigation.enabled ? S.green : null}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🌱</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: S.green }}>Automatická Závlaha</div>
                    <div style={{ fontSize: 10, color: S.textMuted }}>Čerpadlo zapne keď pôda je suchá</div>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={automation.irrigation.enabled}
                    onChange={e => updateAuto("irrigation", "enabled", e.target.checked)}
                    style={{ accentColor: S.green, width: 16, height: 16 }} />
                  <span style={{ fontSize: 11, color: S.textMuted }}>Aktívne</span>
                </label>
              </div>
              <SliderRow label="Minimálna vlhkosť pôdy — čerpadlo ZAP pod"
                value={automation.irrigation.threshold} min={0} max={80} unit="%" color={S.green}
                onChange={v => updateAuto("irrigation", "threshold", v)} />
              <div style={{ fontSize: 11, color: S.textMuted, padding: "8px 12px", background: S.bg, borderRadius: 8 }}>
                Vlhkosť pôdy: <span style={{ color: soilAlert ? S.red : S.green, fontWeight: 700 }}>
                  {sensors.soilMoisture}%</span>
                {" → Čerpadlo: "}<span style={{ color: actuators.pump ? S.blue : S.textMuted, fontWeight: 700 }}>
                  {actuators.pump ? "ZAP" : "VYP"}</span>
              </div>
            </Panel>

            {/* Window rule */}
            <Panel style={{ padding: "18px 20px" }} glow={automation.windowAuto.enabled ? S.purple : null}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🪟</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: S.purple }}>Automatické Okno</div>
                    <div style={{ fontSize: 10, color: S.textMuted }}>Servo otvára okno pri prehriatí alebo svetle</div>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={automation.windowAuto.enabled}
                    onChange={e => updateAuto("windowAuto", "enabled", e.target.checked)}
                    style={{ accentColor: S.purple, width: 16, height: 16 }} />
                  <span style={{ fontSize: 11, color: S.textMuted }}>Aktívne</span>
                </label>
              </div>
              <SliderRow label="Teplota — okno otvorí nad"
                value={automation.windowAuto.tempThreshold} min={20} max={45} unit="°C" color={S.purple}
                onChange={v => updateAuto("windowAuto", "tempThreshold", v)} />
              <SliderRow label="Intenzita svetla — okno otvorí nad"
                value={automation.windowAuto.lightThreshold} min={200} max={1023} step={10} unit="" color={S.amber}
                onChange={v => updateAuto("windowAuto", "lightThreshold", v)} />
              <div style={{ fontSize: 11, color: S.textMuted, padding: "8px 12px", background: S.bg, borderRadius: 8 }}>
                Okno: <span style={{ color: actuators.window > 0 ? S.purple : S.textMuted, fontWeight: 700 }}>
                  {actuators.window > 0 ? `OTVORENÉ ${actuators.window}°` : "ZATVORENÉ"}</span>
              </div>
            </Panel>
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* HISTORY CHART TAB                                  */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === "history" && (
          <div>
            <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 14, textTransform: "uppercase" }}>
              ◈ História — posledných {history.length} meraní (každé 2.5s)
            </div>
            {history.length < 3 ? (
              <Panel style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: S.textMuted }}>⏳ Zbieranie dát...</div>
              </Panel>
            ) : (
              <>
                <Panel style={{ padding: "16px 8px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: S.textMuted, paddingLeft: 12, marginBottom: 10 }}>
                    🌡️ Teplota &amp; 💧 Vlhkosť vzduchu
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={history} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                      <XAxis dataKey="time" stroke={S.textDim} tick={{ fontSize: 9, fill: S.textDim }} interval="preserveStartEnd" />
                      <YAxis stroke={S.textDim} tick={{ fontSize: 9, fill: S.textDim }} />
                      <Tooltip contentStyle={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="temperature" name="Teplota °C" stroke={S.cyan} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="humidity" name="Vlhkosť %" stroke={S.blue} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Panel>

                <Panel style={{ padding: "16px 8px" }}>
                  <div style={{ fontSize: 12, color: S.textMuted, paddingLeft: 12, marginBottom: 10 }}>
                    🌱 Vlhkosť pôdy &amp; ☀️ Svetlo (%)
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={history} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                      <XAxis dataKey="time" stroke={S.textDim} tick={{ fontSize: 9, fill: S.textDim }} interval="preserveStartEnd" />
                      <YAxis stroke={S.textDim} tick={{ fontSize: 9, fill: S.textDim }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="soilMoisture" name="Pôda %" stroke={S.green} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="lightPct" name="Svetlo %" stroke={S.amber} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Panel>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* ARCHITECTURE TAB                                   */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === "architecture" && (
          <div>
            {[
              {
                label: "FYZICKÝ MODEL", color: S.green,
                items: [
                  { icon: "🌡️", name: "DHT22", detail: "Teplota + Vlhkosť vzduchu → GPIO 4" },
                  { icon: "🌱", name: "Soil Moisture Sensor", detail: "Vlhkosť pôdy (analóg) → GPIO 34 (ADC)" },
                  { icon: "☀️", name: "Fotorezistor LDR", detail: "Intenzita svetla (analóg) → GPIO 35 (ADC)" },
                  { icon: "💨", name: "Relay + Ventilátor", detail: "Chladenie termostat → GPIO 26" },
                  { icon: "🚿", name: "Relay + Čerpadlo", detail: "Závlaha → GPIO 27" },
                  { icon: "🪟", name: "Servo SG90", detail: "Otvorenie okna 0–90° → GPIO 13" },
                ],
              },
              {
                label: "ESP32 FIRMWARE", color: S.cyan,
                items: [
                  { icon: "📶", name: "WiFi 802.11 b/g/n", detail: "Pripojenie na domácu sieť" },
                  { icon: "📤", name: "POST /api/sensors", detail: "Odoslanie dát každých 5s" },
                  { icon: "📥", name: "GET /api/actuators", detail: "Stiahnutie príkazov zo servera" },
                  { icon: "🔄", name: "ArduinoJson", detail: "Serializácia/deserializácia JSON" },
                ],
              },
              {
                label: "BACKEND — Node.js", color: S.amber,
                items: [
                  { icon: "🚀", name: "Express REST API", detail: "HTTP server na porte 3001" },
                  { icon: "🔌", name: "WebSocket (ws)", detail: "Real-time push na frontend" },
                  { icon: "⚙️", name: "Automation Engine", detail: "Termostat, závlaha, okno — pravidlá" },
                  { icon: "💾", name: "In-memory state", detail: "Senzory, aktuátory, nastavenia" },
                ],
              },
              {
                label: "FRONTEND — React", color: S.purple,
                items: [
                  { icon: "📊", name: "Dashboard", detail: "Živé hodnoty senzorov + stav aktuátorov" },
                  { icon: "⚙️", name: "Automation panel", detail: "Nastavenie prahov, zapnutie/vypnutie" },
                  { icon: "📈", name: "Graf histórie", detail: "Recharts line chart — posledné merania" },
                  { icon: "🎛️", name: "Manuálne ovládanie", detail: "Toggle aktuátorov pri vypnutom AUTO" },
                ],
              },
            ].map((section, si) => (
              <Panel key={si} style={{ padding: "16px", marginBottom: 12 }} glow={section.color}>
                <div style={{ fontSize: 10, color: section.color, letterSpacing: 3, fontWeight: 700, marginBottom: 12 }}>
                  ◈ {section.label}
                </div>
                {section.items.map((item, ii) => (
                  <div key={ii} style={{
                    display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10,
                    padding: "8px 10px", background: S.bg, borderRadius: 8,
                    borderLeft: `3px solid ${section.color}40`,
                  }}>
                    <span style={{ fontSize: 18, minWidth: 26 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: section.color }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </Panel>
            ))}

            {/* Data flow */}
            <Panel style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 12 }}>◈ TOK DÁT</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: S.textMuted, lineHeight: 2.2, textAlign: "center" }}>
                <div style={{ color: S.green }}>DHT22 / Soil / LDR</div>
                <div style={{ color: S.textDim }}>↓ GPIO analogRead()</div>
                <div style={{ color: S.cyan }}>ESP32 Arduino Loop</div>
                <div style={{ color: S.textDim }}>↓ HTTP POST (JSON) každých 5s</div>
                <div style={{ color: S.amber }}>Node.js Backend + Automation</div>
                <div style={{ color: S.textDim }}>↓ WebSocket broadcast</div>
                <div style={{ color: S.purple }}>React Frontend Dashboard</div>
                <div style={{ color: S.textDim }}>↑ POST /api/actuators (manual)</div>
                <div style={{ color: S.amber }}>Backend → GET /api/actuators</div>
                <div style={{ color: S.textDim }}>↓ HTTP Response (JSON)</div>
                <div style={{ color: S.green }}>Relay / Relay / Servo</div>
              </div>
            </Panel>
          </div>
        )}

        {/* CODE TABS */}
        {tab === "esp32" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: "DHT sensor library", color: S.cyan },
                { label: "ArduinoJson", color: S.green },
                { label: "ESP32Servo", color: S.purple },
                { label: "Arduino IDE 2.x", color: S.amber },
              ].map(t => <Tag key={t.label} color={t.color}>{t.label}</Tag>)}
            </div>
            <CodeBlock code={ESP32_CODE} />
          </div>
        )}

        {tab === "backend" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: "npm install express ws cors", color: S.cyan },
                { label: "node server.js", color: S.green },
                { label: "Port 3001", color: S.amber },
              ].map(t => <Tag key={t.label} color={t.color}>{t.label}</Tag>)}
            </div>
            <CodeBlock code={BACKEND_CODE} />
          </div>
        )}

      </div>
    </div>
  );
});