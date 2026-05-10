import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── KONFIGURÁCIA ─────────────────────────────────────────────
// Zmeň na IP tvojho PC ak frontend beží na inom zariadení
const WS_URL = "ws://localhost:3001";

// ── CONSTANTS ────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",    label: "📊", title: "Dashboard"      },
  { id: "automation",   label: "⚙️", title: "Automatizácia"  },
  { id: "history",      label: "📈", title: "História"       },
  { id: "architecture", label: "🏗️", title: "Architektúra"   },
];

// ── STYLES ────────────────────────────────────────────────────
const S = {
  bg: "#07090f", panel: "#0d1117", border: "#1c2d40",
  cyan: "#00e5ff", green: "#00e676", amber: "#ffab00",
  red: "#ff1744", blue: "#448aff",
  textPrimary: "#e0f0ff", textMuted: "#4a6a8a", textDim: "#2a4a6a",
};

// ── HELPER COMPONENTS ─────────────────────────────────────────
const Panel = ({ children, style = {}, glow }) => (
  <div style={{
    background: S.panel,
    border: `1px solid ${glow ? glow + "60" : S.border}`,
    borderRadius: 12,
    boxShadow: glow ? `0 0 20px ${glow}18` : "none",
    ...style,
  }}>{children}</div>
);

const Tag = ({ children, color = S.cyan }) => (
  <span style={{
    background: color + "18", border: `1px solid ${color}40`, color,
    borderRadius: 4, fontSize: 10, padding: "2px 7px",
    fontFamily: "monospace", letterSpacing: 1, fontWeight: 700,
  }}>{children}</span>
);

const PulseCircle = ({ color, size = 10 }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <div style={{
      position: "absolute", inset: 0, borderRadius: "50%",
      background: color, animation: "pulse-glow 2s infinite",
    }} />
    <style>{`@keyframes pulse-glow{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
  </div>
);

function SensorCard({ icon, label, value, unit, color, min, max, subtext, badge }) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <Panel glow={color} style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: S.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
            {label}
            {badge && <span style={{ marginLeft: 6, fontSize: 9, background: color + "20", color, borderRadius: 3, padding: "1px 5px" }}>{badge}</span>}
          </div>
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

function PumpCard({ active, autoMode, onToggle, autoReason }) {
  return (
    <Panel glow={active ? S.blue : null} style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: active ? S.blue + "20" : S.border + "60",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, border: `2px solid ${active ? S.blue + "80" : S.border}`,
            transition: "all 0.3s",
          }}>💧</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.textPrimary }}>Vodná pumpa</div>
            <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2 }}>Relé — zavlažovanie</div>
            <div style={{ marginTop: 4 }}>
              {autoMode ? <Tag color={S.amber}>AUTO</Tag> : <Tag color={S.blue}>MANUAL</Tag>}
            </div>
          </div>
        </div>
        <button onClick={onToggle} disabled={autoMode} style={{
          width: 60, height: 32, borderRadius: 16,
          background: active ? S.blue : S.border,
          border: "none", cursor: autoMode ? "not-allowed" : "pointer",
          position: "relative", transition: "background 0.3s",
          opacity: autoMode ? 0.7 : 1,
        }}>
          <div style={{
            position: "absolute", top: 4, left: active ? 30 : 4,
            width: 24, height: 24, borderRadius: "50%",
            background: active ? "#fff" : S.textMuted,
            transition: "left 0.3s",
          }} />
        </button>
      </div>
      <div style={{
        padding: "10px 14px", borderRadius: 8,
        background: active ? S.blue + "12" : S.bg,
        border: `1px solid ${active ? S.blue + "40" : S.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 12, color: active ? S.blue : S.textMuted, fontWeight: 700 }}>
          {active ? "● PUMPA BEŽÍ — zavlažuje" : "○ PUMPA STOJÍ"}
        </div>
        {autoReason && <div style={{ fontSize: 11, color: S.textMuted }}>{autoReason}</div>}
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
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: color, cursor: "pointer" }} />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: S.textDim, marginTop: 2 }}>
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);

  const [sensors, setSensors] = useState({
    temperature: null, humidity: null, soilMoisture: null, light: null,
  });
  const [actuators, setActuators] = useState({ pump: false });
  const [automation, setAutomation] = useState({
    enabled: true,
    irrigation: { enabled: true, threshold: 35, duration: 10 },
  });
  const [history, setHistory] = useState([]);

  // ── WebSocket pripojenie ──────────────────────────────────
  useEffect(() => {
    let reconnectTimer = null;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("WebSocket pripojený");
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === "fullState") {
            setSensors(msg.data.sensors);
            setActuators(msg.data.actuators);
            setAutomation(msg.data.automation);
            setLastUpdate(new Date());
          }

          if (msg.type === "sensors") {
            setSensors(msg.data);
            setLastUpdate(new Date());
            // Pridaj do histórie
            setHistory(h => {
              const t = new Date();
              const label = `${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}`;
              const lightPct = Math.round((msg.data.light ?? 0) / 10.23);
              return [...h.slice(-49), { time: label, ...msg.data, lightPct }];
            });
          }

          if (msg.type === "actuators") {
            setActuators(msg.data);
          }

          if (msg.type === "automation") {
            setAutomation(msg.data);
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("WebSocket odpojený — skúšam znova o 3s...");
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // ── Manuálne ovládanie pumpy ──────────────────────────────
  const manualToggle = () => {
    if (automation.enabled) return;
    const newState = { pump: !actuators.pump };
    setActuators(newState);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "setActuator", data: newState }));
    }
  };

  // ── Zmena automation nastavení ────────────────────────────
  const updateAuto = (key, val) => {
    const next = { ...automation, irrigation: { ...automation.irrigation, [key]: val } };
    setAutomation(next);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "setAutomation", data: next }));
    }
  };

  const toggleAutoMode = () => {
    const next = { ...automation, enabled: !automation.enabled };
    setAutomation(next);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "setAutomation", data: next }));
    }
  };

  // ── Computed ─────────────────────────────────────────────
  const soilAlert = sensors.soilMoisture !== null && sensors.soilMoisture < automation.irrigation.threshold;
  const lightPct  = sensors.light !== null ? Math.round(sensors.light / 10.23) : null;
  const hasData   = sensors.temperature !== null;

  return (
    <div style={{ fontFamily: "'Trebuchet MS', sans-serif", background: S.bg, minHeight: "100vh", color: S.textPrimary }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0f17; }
        ::-webkit-scrollbar-thumb { background: #1c2d40; border-radius: 3px; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(180deg, #0a1520 0%, #07090f 100%)",
        borderBottom: `1px solid ${S.border}`, padding: "14px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26, animation: "float 3s ease-in-out infinite" }}>🌱</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, color: S.cyan }}>SMART WATERING</div>
              <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 2, marginTop: 1 }}>IoT CONTROL SYSTEM · ESP32</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseCircle color={connected ? S.green : S.red} />
              <span style={{ fontSize: 11, color: connected ? S.green : S.red, fontFamily: "monospace" }}>
                {connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            {lastUpdate && (
              <div style={{ fontSize: 10, color: S.textMuted, fontFamily: "monospace" }}>
                {lastUpdate.toLocaleTimeString("sk-SK")}
              </div>
            )}
            <Tag color={automation.enabled ? S.amber : S.blue}>
              {automation.enabled ? "AUTO ON" : "MANUAL"}
            </Tag>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 14, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "7px 14px", border: "none", borderRadius: 8,
              cursor: "pointer", fontFamily: "inherit", fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400, whiteSpace: "nowrap",
              background: tab === t.id ? "#00b8d420" : "transparent",
              color: tab === t.id ? S.cyan : S.textMuted,
              borderBottom: tab === t.id ? `2px solid ${S.cyan}` : "2px solid transparent",
              transition: "all 0.2s",
            }}>{t.label} {t.title}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px" }}>

        {/* Banner keď nie je pripojenie */}
        {!connected && (
          <Panel style={{ padding: "12px 16px", marginBottom: 14 }} glow={S.red}>
            <div style={{ fontSize: 12, color: S.red }}>
              ⚠ <strong>Backend nedostupný</strong> — skontroluj či beží <code style={{ fontFamily: "monospace" }}>node server.js</code> na porte 3001
            </div>
          </Panel>
        )}

        {/* Banner keď čakáme na prvé dáta */}
        {connected && !hasData && (
          <Panel style={{ padding: "12px 16px", marginBottom: 14 }} glow={S.amber}>
            <div style={{ fontSize: 12, color: S.amber }}>
              ⏳ Čakám na dáta z ESP32...
            </div>
          </Panel>
        )}

        {/* ══════ DASHBOARD ══════ */}
        {tab === "dashboard" && (
          <div>
            {soilAlert && (
              <Panel style={{ padding: "10px 16px", marginBottom: 14 }} glow={S.red}>
                <div style={{ fontSize: 12, color: S.red, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>⚠ UPOZORNENIE:</span>
                  <span>🌱 Pôda príliš suchá — {sensors.soilMoisture}% (prah: {automation.irrigation.threshold}%)</span>
                  {actuators.pump && <Tag color={S.blue}>PUMPA BEŽÍ</Tag>}
                </div>
              </Panel>
            )}

            <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>
              ◈ Senzory — real-time
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <SensorCard icon="🌡️" label="Teplota"
                value={hasData ? sensors.temperature : "—"} unit="°C"
                color={S.cyan} min={15} max={40} subtext="DHT11" badge="DHT11" />
              <SensorCard icon="💧" label="Vlhkosť vzduchu"
                value={hasData ? sensors.humidity : "—"} unit="%"
                color={S.blue} min={0} max={100} subtext="DHT11" />
              <SensorCard icon="🌱" label="Vlhkosť pôdy"
                value={hasData ? sensors.soilMoisture : "—"} unit="%"
                color={soilAlert ? S.red : S.green} min={0} max={100}
                subtext={`Min prah: ${automation.irrigation.threshold}% · AO pin`} badge="AO" />
              <SensorCard icon="☀️" label="Svetlo"
                value={hasData ? lightPct : "—"} unit="%"
                color={sensors.light > 800 ? S.amber : "#ffd54f"} min={0} max={100}
                subtext={hasData ? `Raw ADC: ${sensors.light}` : ""} />
            </div>

            <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>
              ◈ Aktuátor
            </div>

            <PumpCard
              active={actuators.pump}
              autoMode={automation.enabled}
              onToggle={manualToggle}
              autoReason={automation.enabled ? `Pôda < ${automation.irrigation.threshold}%` : undefined}
            />

            {automation.enabled && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: S.amber + "10",
                border: `1px solid ${S.amber}30`, borderRadius: 8, fontSize: 11, color: S.amber }}>
                💡 Pre manuálne ovládanie pumpy vypni AUTO režim v záložke Automatizácia
              </div>
            )}
          </div>
        )}

        {/* ══════ AUTOMATION ══════ */}
        {tab === "automation" && (
          <div>
            <Panel style={{ padding: "18px 20px", marginBottom: 14 }} glow={automation.enabled ? S.amber : null}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.textPrimary, marginBottom: 4 }}>Automatizačný Režim</div>
                  <div style={{ fontSize: 11, color: S.textMuted }}>
                    {automation.enabled ? "Pumpa sa automaticky riadi podľa vlhkosti pôdy" : "Manuálne ovládanie — pumpu ovládaš sám z dashboardu"}
                  </div>
                </div>
                <button onClick={toggleAutoMode} style={{
                  width: 60, height: 32, borderRadius: 16,
                  background: automation.enabled ? S.amber : S.border,
                  border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s",
                }}>
                  <div style={{
                    position: "absolute", top: 4, left: automation.enabled ? 30 : 4,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "#fff", transition: "left 0.3s",
                  }} />
                </button>
              </div>
            </Panel>

            <Panel style={{ padding: "20px" }} glow={automation.irrigation.enabled ? S.green : null}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>💧</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: S.green }}>Automatická Závlaha</div>
                    <div style={{ fontSize: 11, color: S.textMuted }}>Pumpa zapne keď vlhkosť pôdy klesne pod prah</div>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={automation.irrigation.enabled}
                    onChange={e => updateAuto("enabled", e.target.checked)}
                    style={{ accentColor: S.green, width: 16, height: 16 }} />
                  <span style={{ fontSize: 11, color: S.textMuted }}>Aktívne</span>
                </label>
              </div>

              <SliderRow label="Minimálna vlhkosť pôdy — pumpa ZAP pod"
                value={automation.irrigation.threshold} min={0} max={80} unit="%" color={S.green}
                onChange={v => updateAuto("threshold", v)} />
              <SliderRow label="Maximálny čas behu pumpy (ochrana pred pretopením)"
                value={automation.irrigation.duration} min={3} max={60} unit="s" color={S.blue}
                onChange={v => updateAuto("duration", v)} />

              <div style={{ marginTop: 12, padding: "10px 14px", background: S.bg, borderRadius: 8, fontSize: 11, color: S.textMuted }}>
                <div>Vlhkosť pôdy: <span style={{ color: soilAlert ? S.red : S.green, fontWeight: 700 }}>
                  {hasData ? `${sensors.soilMoisture}%` : "—"}</span></div>
                <div style={{ marginTop: 4 }}>Pumpa: <span style={{ color: actuators.pump ? S.blue : S.textMuted, fontWeight: 700 }}>
                  {actuators.pump ? "ZAP 💧" : "VYP"}</span></div>
              </div>
            </Panel>
          </div>
        )}

        {/* ══════ HISTORY ══════ */}
        {tab === "history" && (
          <div>
            <div style={{ fontSize: 10, color: S.textMuted, letterSpacing: 3, marginBottom: 14, textTransform: "uppercase" }}>
              ◈ História — posledných {history.length} meraní (každé 5s z ESP32)
            </div>
            {history.length < 3 ? (
              <Panel style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: S.textMuted }}>⏳ Zbieranie dát z ESP32...</div>
              </Panel>
            ) : (
              <>
                <Panel style={{ padding: "16px 8px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: S.textMuted, paddingLeft: 12, marginBottom: 10 }}>🌡️ Teplota &amp; 💧 Vlhkosť vzduchu</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={history} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                      <XAxis dataKey="time" stroke={S.textDim} tick={{ fontSize: 9, fill: S.textDim }} interval="preserveStartEnd" />
                      <YAxis stroke={S.textDim} tick={{ fontSize: 9, fill: S.textDim }} />
                      <Tooltip contentStyle={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="temperature" name="Teplota °C" stroke={S.cyan} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="humidity" name="Vlhkosť vzd. %" stroke={S.blue} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Panel>
                <Panel style={{ padding: "16px 8px" }}>
                  <div style={{ fontSize: 12, color: S.textMuted, paddingLeft: 12, marginBottom: 10 }}>🌱 Vlhkosť pôdy &amp; ☀️ Svetlo (%)</div>
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

        {/* ══════ ARCHITECTURE ══════ */}
        {tab === "architecture" && (
          <div>
            {[
              {
                label: "FYZICKÝ MODEL", color: S.green,
                items: [
                  { icon: "🌡️", name: "DHT11", detail: "Teplota + Vlhkosť vzduchu → GPIO 4" },
                  { icon: "🌱", name: "Soil Moisture — AO pin", detail: "GPIO 34 (ADC) · potenciometer pokazený → AO namiesto DO" },
                  { icon: "☀️", name: "Fotorezistor LDR", detail: "Intenzita svetla (analóg) → GPIO 35 (ADC)" },
                  { icon: "💧", name: "Relay + Vodná pumpa", detail: "Závlaha → GPIO 26 · active LOW · ochranný časovač" },
                ],
              },
              {
                label: "ESP32 FIRMWARE", color: S.cyan,
                items: [
                  { icon: "📶", name: "WiFi 802.11 b/g/n", detail: "Pripojenie na domácu sieť (len 2.4GHz)" },
                  { icon: "📤", name: "POST /api/sensors", detail: "T, H, Soil%, LDR — každých 5s" },
                  { icon: "📥", name: "GET /api/actuators", detail: "Stiahnutie príkazu: pump true/false" },
                  { icon: "🔢", name: "map() kalibrácia", detail: "SOIL_DRY / SOIL_WET → 0–100%" },
                ],
              },
              {
                label: "BACKEND — Node.js", color: S.amber,
                items: [
                  { icon: "🚀", name: "Express REST API", detail: "HTTP server na porte 3001" },
                  { icon: "🔌", name: "WebSocket (ws)", detail: "Real-time push na frontend" },
                  { icon: "⚙️", name: "Automation Engine", detail: "Pôda < prah → ZAP pumpu" },
                  { icon: "⏱️", name: "Ochranný časovač", detail: "Automatické VYP pumpy po X sekundách" },
                ],
              },
              {
                label: "FRONTEND — React + Vite", color: "#e040fb",
                items: [
                  { icon: "🔌", name: "WebSocket klient", detail: "ws://localhost:3001 · auto-reconnect" },
                  { icon: "📊", name: "Dashboard", detail: "Živé hodnoty z ESP32" },
                  { icon: "⚙️", name: "Automatizácia", detail: "Nastavenie prahu + čas behu" },
                  { icon: "📈", name: "Graf histórie", detail: "Posledných 50 meraní" },
                ],
              },
            ].map((section, si) => (
              <Panel key={si} style={{ padding: "16px", marginBottom: 12 }} glow={section.color}>
                <div style={{ fontSize: 10, color: section.color, letterSpacing: 3, fontWeight: 700, marginBottom: 12 }}>◈ {section.label}</div>
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
          </div>
        )}
      </div>
    </div>
  );
}