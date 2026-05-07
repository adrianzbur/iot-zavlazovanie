# 🏡 Smart Greenhouse — IoT Control System

Inteligentný skleník riadený cez ESP32 s automatizáciou, real-time dashboardom a vzdialenom ovládaním cez webový prehliadač.

---

## 📋 Obsah

- [Prehľad projektu](#prehľad-projektu)
- [Architektúra systému](#architektúra-systému)
- [Hardvér](#hardvér)
- [Zapojenie — Schéma pinov](#zapojenie--schéma-pinov)
- [Inštalácia](#inštalácia)
- [Spustenie](#spustenie)
- [Automatizačné pravidlá](#automatizačné-pravidlá)
- [API Dokumentácia](#api-dokumentácia)
- [Štruktúra projektu](#štruktúra-projektu)

---

## 🌿 Prehľad projektu

Smart Greenhouse je IoT systém ktorý monitoruje podmienky v skleníku a automaticky riadi aktuátory na základe nameraných hodnôt. Systém pozostáva z troch vrstiev:

| Vrstva | Technológia | Úloha |
|--------|-------------|-------|
| **Firmware** | ESP32 + Arduino | Čítanie senzorov, ovládanie aktuátorov |
| **Backend** | Node.js + Express | REST API, WebSocket, automatizácia |
| **Frontend** | React + Recharts | Dashboard, grafy, manuálne ovládanie |

### Funkcie
- 📡 **Real-time monitoring** — senzory sa odosielajú každých 5 sekúnd
- ⚙️ **Automatizácia** — termostat, závlaha a okno reagujú na prahy
- 🎛️ **Manuálne ovládanie** — prepnutie z AUTO do MANUAL režimu
- 📈 **Graf histórie** — zobrazenie posledných meraní
- ⚠️ **Upozornenia** — alert keď hodnoty prekročia prahy
- 🔌 **WebSocket** — okamžité aktualizácie bez obnovenia stránky

---

## 🏗️ Architektúra systému

```
┌─────────────────────────────────────────────────────────┐
│                     FYZICKÝ SKLENÍK                     │
│  DHT22 ──┐                                              │
│  Soil  ──┤── ESP32 ──── WiFi ──── Node.js Backend       │
│  LDR   ──┘     │                      │                 │
│               Relay ──── Ventilátor   │                 │
│               Relay ──── Čerpadlo     │                 │
│               Servo ──── Okno         │                 │
└───────────────────────────────────────┼─────────────────┘
                                        │ WebSocket
                                   React Frontend
                                   (prehliadač)
```

### Tok dát

```
DHT22 / Soil / LDR
    ↓  GPIO analogRead()
ESP32 Arduino Loop
    ↓  HTTP POST /api/sensors  (každých 5s)
Node.js Backend + Automation Engine
    ↓  WebSocket broadcast
React Frontend Dashboard
    ↑  POST /api/actuators  (manuálne)
Backend → GET /api/actuators
    ↓  HTTP Response JSON
Relay / Relay / Servo
```

---

## 🔧 Hardvér

### Zoznam komponentov

| Komponent | Model | Funkcia |
|-----------|-------|---------|
| Mikrokontrolér | ESP32 DevKit v1 | Hlavná jednotka |
| Teplotný senzor | DHT22 | Teplota + vlhkosť vzduchu |
| Senzor vlhkosti pôdy | Kapacitný | Vlhkosť substrátu |
| Fotorezistor | LDR + 10kΩ | Intenzita svetla |
| Relé modul | 2-kanálový 5V | Spínanie ventilátora a čerpadla |
| Servo motor | SG90 | Otvorenie/zatvorenie okna |
| Ventilátor | 5V DC | Chladenie / vetranie |
| Čerpadlo | Mini 3–5V | Závlaha |
| Napájanie | 5V / 2A | USB alebo adaptér |

---

## 🔌 Zapojenie — Schéma pinov

```
ESP32 Pin    →    Komponent
─────────────────────────────────────
GPIO  4      →    DHT22 DATA
GPIO 34      →    Soil Moisture (analóg ADC)
GPIO 35      →    LDR Fotorezistor (analóg ADC)
GPIO 26      →    Relay IN1 → Ventilátor  (active LOW)
GPIO 27      →    Relay IN2 → Čerpadlo   (active LOW)
GPIO 13      →    Servo SG90 signal
3.3V / GND   →    DHT22, LDR
5V   / GND   →    Relay modul, Servo, Čerpadlo
```

> ⚠️ **Pozor:** Relé moduly sú **active LOW** — HIGH = vypnuté, LOW = zapnuté. Servo a čerpadlo napájaj z 5V, nie z 3.3V pinu ESP32.

---

## 🚀 Inštalácia

### 1. Klonovanie repozitára

```bash
git clone https://github.com/tvoj-username/smart-greenhouse.git
cd smart-greenhouse
```

### 2. Backend — Node.js

```bash
cd backend
npm install
```

**Závislosti:**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "ws": "^8.14.0",
    "cors": "^2.8.5"
  }
}
```

### 3. Frontend — React

```bash
cd frontend
npm install
```

**Závislosti:**
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "recharts": "^2.8.0"
  }
}
```

### 4. ESP32 Firmware — Arduino IDE

**Požadované knižnice** (inštaluj cez Library Manager):
- `DHT sensor library` — od Adafruit
- `ArduinoJson` — od Benoit Blanchon
- `ESP32Servo` — od Kevin Harrington

**Nastavenie Arduino IDE:**
1. Pridaj ESP32 board: `File → Preferences → Additional Board URLs`
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Vyber board: `Tools → Board → ESP32 Dev Module`
3. Nastav port: `Tools → Port → COMx` (Windows) alebo `/dev/ttyUSB0` (Linux)

---

## ▶️ Spustenie

### 1. Uprav WiFi a IP adresu vo firmware

Otvor `firmware/greenhouse.ino` a zmeň:

```cpp
const char* WIFI_SSID  = "tvoja-wifi-siet";
const char* WIFI_PASS  = "tvoje-heslo";
const char* SERVER_URL = "http://192.168.1.100:3001";  // IP tvojho PC
```

> 💡 IP adresu backendu zistíš príkazom `ipconfig` (Windows) alebo `ip a` (Linux).

### 2. Spusti backend

```bash
cd backend
node server.js
```

Výstup:
```
🚀 Backend beží na http://localhost:3001
   WebSocket: ws://localhost:3001
```

### 3. Spusti frontend

```bash
cd frontend
npm start
```

Dashboard sa otvorí na `http://localhost:3000`

### 4. Nahraj firmware na ESP32

Otvor `firmware/greenhouse.ino` v Arduino IDE a klikni **Upload** (→).

Po úspešnom nahraní uvidíš v Serial Monitore (115200 baud):
```
✅ Smart Greenhouse pripravený!
[SENZORY] T=24.5°C  H=58.0%  S=65%  L=420
[HTTP] POST /sensors → 200
[AKTUÁTORY] Vent=0  Pump=0  Okno=0°
```

---

## ⚙️ Automatizačné pravidlá

Automatizačný engine beží na backende a vyhodnocuje pravidlá po každom prijatí senzorových dát.

| Pravidlo | Podmienka | Akcia |
|----------|-----------|-------|
| 🌡️ **Termostat** | Teplota > prah (predvolene 28°C) | Zapne ventilátor |
| 🌱 **Závlaha** | Vlhkosť pôdy < prah (predvolene 30%) | Zapne čerpadlo |
| 🪟 **Okno** | Teplota > 30°C alebo Svetlo > 800 ADC | Otvorí okno na 90° |

Všetky prahy sú **nastaviteľné** cez dashboard v záložke **Automatizácia**.

V **MANUAL** režime môžeš každý aktuátor ovládať samostatne priamo z dashboardu.

---

## 📡 API Dokumentácia

Base URL: `http://localhost:3001`

### ESP32 endpointy

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| `POST` | `/api/sensors` | ESP32 odosiela namerané hodnoty |
| `GET` | `/api/actuators` | ESP32 sťahuje príkazy pre aktuátory |

**POST /api/sensors — príklad tela:**
```json
{
  "temperature": 26.3,
  "humidity": 61.0,
  "soilMoisture": 28,
  "light": 850
}
```

**GET /api/actuators — príklad odpovede:**
```json
{
  "fan": true,
  "pump": true,
  "window": 90
}
```

### Frontend endpointy

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| `GET` | `/api/state` | Celkový stav systému |
| `POST` | `/api/actuators` | Manuálne ovládanie aktuátorov |
| `GET` | `/api/automation` | Čítanie automation nastavení |
| `POST` | `/api/automation` | Zápis automation nastavení |

### WebSocket

Pripojenie: `ws://localhost:3001`

**Typy správ zo servera:**

```json
{ "type": "sensors",   "data": { ... }, "ts": 1234567890 }
{ "type": "actuators", "data": { ... }, "ts": 1234567890 }
{ "type": "fullState", "data": { ... }, "ts": 1234567890 }
```

---

## 📁 Štruktúra projektu

```
smart-greenhouse/
│
├── firmware/
│   └── greenhouse.ino          # ESP32 C++ kód pre Arduino IDE
│
├── backend/
│   ├── server.js               # Node.js Express + WebSocket server
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       └── iot_greenhouse.jsx  # React dashboard
│
└── README.md
```

---

## 🛠️ Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| ESP32 sa nepripája na WiFi | Skontroluj SSID/heslo, ESP32 podporuje len 2.4GHz |
| `POST /sensors → -1` | Backend nebeží alebo zlá IP adresa v `SERVER_URL` |
| DHT22 vracia `nan` | Skontroluj zapojenie, pridaj 10kΩ pull-up na DATA pin |
| Relay nekliká | Skontroluj napájanie 5V, logika je active LOW |
| Dashboard sa neaktualizuje | Skontroluj či backend beží a WebSocket je dostupný |

---

## 📄 Licencia

MIT License — voľne použiteľné pre školské aj osobné projekty.

---

*Projekt vytvorený ako IoT školský projekt — ESP32 + Node.js + React*