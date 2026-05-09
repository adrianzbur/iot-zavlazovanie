// ============================================================
//  SMART GREENHOUSE — Node.js Backend v2.0
//  npm install
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

// -- STAV SYSTÉMU -------------------------------------------
let state = {
  sensors: {
    temperature: 22.0,
    humidity: 55.0,
    soilMoisture: 50,
    light: 600,
    timestamp: Date.now(),
  },
  actuators: {
    pump: false,   // jediný aktuátor — vodná pumpa
  },
  automation: {
    enabled: true,
    irrigation: {
      enabled: true,
      threshold: 35,   // pumpa zapne keď vlhkosť pôdy klesne pod toto %
      duration: 10,    // max. čas behu pumpy v sekundách (ochrana)
    },
  },
};

let pumpTimer = null;   // ochranný časovač — automatické vypnutie pumpy

// -- AUTOMATIZAČNÝ MODUL ------------------------------------
function runAutomation() {
  const { sensors: s, actuators: a, automation: auto } = state;
  if (!auto.enabled || !auto.irrigation.enabled) return;

  const shouldPump = s.soilMoisture < auto.irrigation.threshold;

  if (shouldPump && !a.pump) {
    // Zapni pumpu
    a.pump = true;
    broadcast("actuators", state.actuators);
    console.log(`[AUTO] Pumpa ZAP — poda: ${s.soilMoisture}% < prah: ${auto.irrigation.threshold}%`);

    // Ochranný časovač — vypni po X sekundách
    if (pumpTimer) clearTimeout(pumpTimer);
    pumpTimer = setTimeout(() => {
      state.actuators.pump = false;
      broadcast("actuators", state.actuators);
      console.log(`[AUTO] Pumpa VYP — uplynulo ${auto.irrigation.duration}s (ochrana)`);
      pumpTimer = null;
    }, auto.irrigation.duration * 1000);

  } else if (!shouldPump && a.pump) {
    // Pôda je dosť vlhká -> vypni pumpu
    a.pump = false;
    if (pumpTimer) { clearTimeout(pumpTimer); pumpTimer = null; }
    broadcast("actuators", state.actuators);
    console.log(`[AUTO] Pumpa VYP — poda dostatocne vlhka: ${s.soilMoisture}%`);
  }
}

// -- BROADCAST cez WebSocket --------------------------------
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

// -- REST API — pre ESP32 -----------------------------------

// ESP32 posiela senzorové dáta každých 5s
app.post("/api/sensors", (req, res) => {
  state.sensors = { ...req.body, timestamp: Date.now() };
  runAutomation();
  broadcast("sensors", state.sensors);
  res.json({ ok: true });
});

// ESP32 pýta si príkaz pre pumpu
app.get("/api/actuators", (req, res) => {
  res.json(state.actuators);
});

// -- REST API — pre Frontend --------------------------------

app.post("/api/actuators", (req, res) => {
  state.actuators = { ...state.actuators, ...req.body };
  broadcast("actuators", state.actuators);
  res.json({ ok: true });
});

app.get("/api/automation",  (req, res) => res.json(state.automation));
app.post("/api/automation", (req, res) => {
  state.automation = { ...state.automation, ...req.body };
  runAutomation();
  broadcast("automation", state.automation);
  res.json({ ok: true });
});

app.get("/api/state", (req, res) => res.json(state));

// -- WEBSOCKET ----------------------------------------------
wss.on("connection", ws => {
  console.log("[WS] Frontend klient pripojeny");
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

  ws.on("close", () => console.log("[WS] Klient odpojeny"));
});

server.listen(PORT, () => {
  console.log(`Backend bezi na http://localhost:${PORT}`);
  console.log(`WebSocket:       ws://localhost:${PORT}`);
});