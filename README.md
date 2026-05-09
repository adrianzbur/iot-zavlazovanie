# 🌱 IoT Zavlažovanie — Smart Greenhouse

Inteligentný skleník riadený cez ESP32 s automatickou závlahou, real-time dashboardom a vzdialenom ovládaním cez webový prehliadač.

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

IoT Zavlažovanie je systém ktorý monitoruje podmienky v skleníku a automaticky ovláda vodnú pumpu na základe vlhkosti pôdy. Systém pozostáva z troch vrstiev:

| Vrstva | Technológia | Úloha |
|--------|-------------|-------|
| **Firmware** | ESP32 + Arduino | Čítanie senzorov, ovládanie pumpy |
| **Backend** | Node.js + Express | REST API, WebSocket, automatizácia |
| **Frontend** | React + Recharts | Dashboard, grafy, manuálne ovládanie |

### Senzory a aktuátory

| Komponent | Typ | Poznámka |
|-----------|-----|----------|
| DHT11 | Teplota + Vlhkosť vzduchu | GPIO 4 |
| Soil Moisture | Vlhkosť pôdy — **AO pin** | GPIO 34 · potenciometer pokazený → AO |
| LDR Fotorezistor | Intenzita svetla | GPIO 35 |
| Vodná pumpa + Relay | Závlaha | GPIO 26 · active LOW |

### Funkcie
- 📡 **Real-time monitoring** — senzory sa odosielajú každých 5 sekúnd
- 💧 **Automatická závlaha** — pumpa reaguje na vlhkosť pôdy
- ⏱️ **Ochranný časovač** — pumpa sa automaticky vypne po nastavenom čase
- 🎛️ **Manuálne ovládanie** — prepnutie z AUTO do MANUAL režimu
- 📈 **Graf histórie** — zobrazenie posledných meraní
- ⚠️ **Upozornenia** — alert keď vlhkosť pôdy klesne pod prah
- 🔌 **WebSocket** — okamžité aktualizácie bez obnovenia stránky

---

## 🏗️ Architektúra systému

```
┌──────────────────────────────────────────────────────┐
│                    FYZICKÝ SKLENÍK                   │
│  DHT11   ──┐                                         │
│  Soil AO ──┤── ESP32 ──── WiFi ──── Node.js Backend  │
│  LDR     ──┘     │                      │            │
│               Relay ──── Vodná pumpa    │            │
└──────────────────────────────────────────────────────┘
                                          │ WebSocket
                                     React Frontend
                                     (prehliadač)
```

### Tok dát

```
DHT11 + Soil AO + LDR
    ↓  analogRead() + map() kalibrácia
ESP32 → HTTP POST /api/sensors (každých 5s)
    ↓
Node.js Automation Engine
    ↓  WebSocket broadcast
React Dashboard
    ↑  ESP32 GET /api/actuators
Relay → Vodná pumpa 💧
```

---

## 🔧 Hardvér

### Zoznam komponentov

| Komponent | Model | Funkcia |
|-----------|-------|---------|
| Mikrokontrolér | ESP32 DevKit v1 | Hlavná jednotka |
| Teplotný senzor | DHT11 | Teplota + vlhkosť vzduchu |
| Senzor vlhkosti pôdy | Resistívny (modrá doska) | Vlhkosť substrátu — **AO pin** |
| Fotorezistor | LDR + 10kΩ | Intenzita svetla |
| Relé modul | 1-kanálový 5V | Spínanie pumpy |
| Vodná pumpa | Mini 3–5V | Závlaha |
| Napájanie | 5V / 2A | USB alebo adaptér |

> ⚠️ **Poznámka k Soil Moisture senzoru:** Potenciometer na module je pokazený — preto **nepripájaj DO pin**. Používame **AO (analógový)** pin a prah nastavujeme softwarovo cez dashboard a premenné `SOIL_DRY` / `SOIL_WET` v kóde.

---

## 🔌 Zapojenie — Schéma pinov

```
ESP32 Pin    →    Komponent
─────────────────────────────────────────────────
GPIO  4      →    DHT11 DATA
GPIO 34      →    Soil Moisture AO  (analóg ADC)
GPIO 35      →    LDR Fotorezistor  (analóg ADC)
GPIO 26      →    Relay IN → Vodná pumpa (active LOW)
3.3V / GND   →    DHT11, LDR
5V   / GND   →    Relay modul, Pumpa
```

> ⚠️ **Pozor:** Relé modul je **active LOW** — HIGH = pumpa vypnutá, LOW = pumpa zapnutá. Pumpu napájaj z 5V, nie z 3.3V pinu ESP32.

---

## 🚀 Inštalácia

### 1. Klonovanie repozitára

```bash
git clone https://github.com/tvoj-username/iot-zavlazovanie.git
cd iot-zavlazovanie
```

### 2. Backend — Node.js

```bash
cd backend
npm install
```

### 3. Frontend — React

```bash
cd frontend
npm install
npm install recharts
```

### 4. ESP32 Firmware — Arduino IDE

**Požadované knižnice** (inštaluj cez Library Manager):
- `DHT sensor library` — od Adafruit
- `ArduinoJson` — od Benoit Blanchon

**Nastavenie Arduino IDE:**
1. Pridaj ESP32 board: `File → Preferences → Additional Board URLs`
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Vyber board: `Tools → Board → ESP32 Dev Module`
3. Nastav port: `Tools → Port → COMx` (Windows) alebo `/dev/ttyUSB0` (Linux)

---

## ▶️ Spustenie

### Krok 1 — Uprav WiFi a IP adresu vo firmware

Otvor `firmware/greenhouse.ino` a zmeň:

```cpp
const char* WIFI_SSID  = "tvoja-wifi-siet";
const char* WIFI_PASS  = "tvoje-heslo";
const char* SERVER_URL = "http://192.168.1.100:3001";  // IP tvojho PC
```

> IP adresu backendu zistíš príkazom `ipconfig` (Windows) alebo `ip a` (Linux/Mac).

### Krok 2 — Skalibrácia soil senzora

Otvor `firmware/greenhouse.ino` a uprav:

```cpp
const int SOIL_DRY = 3200;  // ADC keď je senzor suchý (na vzduchu)
const int SOIL_WET =  800;  // ADC keď je senzor vo vode
```

Skutočné hodnoty odčítaš zo **Serial Monitora** (115200 baud) — pozri riadok `Soil=xx% (ADC=xxxx)`.

### Krok 3 — Spusti backend

```bash
cd backend
node server.js
# alebo pri vývoji:
npm run dev
```

Výstup:
```
Backend bezi na http://localhost:3001
WebSocket:       ws://localhost:3001
```

### Krok 4 — Spusti frontend

```bash
cd frontend
npm start
```

Dashboard sa otvorí na `http://localhost:3000`

### Krok 5 — Nahraj firmware na ESP32

Otvor `firmware/greenhouse.ino` v Arduino IDE a klikni **Upload** (→).

Po úspešnom nahraní uvidíš v Serial Monitore:
```
Smart Greenhouse v2.0 pripraveny!
  Senzory : DHT11 | Soil AO | LDR
  Aktuator: Vodna pumpa (Relay)
WiFi OK — IP: 192.168.1.xxx
[SENZORY] T=22.5 C  H=58.0%  Soil=65% (ADC=1820)  LDR=420
[HTTP] POST /sensors -> 200
[AKTUATOR] Pumpa=VYP
```

---

## ⚙️ Automatizačné pravidlá

| Pravidlo | Podmienka | Akcia |
|----------|-----------|-------|
| 💧 **Závlaha** | Vlhkosť pôdy < prah (predvolene 35%) | Zapne pumpu |
| ⏱️ **Ochrana** | Pumpa beží dlhšie ako max. čas (predvolene 10s) | Vypne pumpu |
| ✅ **Vypnutie** | Vlhkosť pôdy ≥ prah | Vypne pumpu |

Prah vlhkosti a maximálny čas behu sú **nastaviteľné** cez dashboard v záložke **Automatizácia**.

V **MANUAL** režime môžeš pumpu zapínať a vypínať priamo z dashboardu.

---

## 📡 API Dokumentácia

Base URL: `http://localhost:3001`

### ESP32 endpointy

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| `POST` | `/api/sensors` | ESP32 odosiela namerané hodnoty |
| `GET` | `/api/actuators` | ESP32 sťahuje príkaz pre pumpu |

**POST /api/sensors — telo:**
```json
{
  "temperature": 22.5,
  "humidity": 58.0,
  "soilMoisture": 32,
  "light": 640
}
```

**GET /api/actuators — odpoveď:**
```json
{
  "pump": true
}
```

### Frontend endpointy

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| `GET` | `/api/state` | Celkový stav systému |
| `POST` | `/api/actuators` | Manuálne ovládanie pumpy |
| `GET` | `/api/automation` | Čítanie nastavení automatizácie |
| `POST` | `/api/automation` | Zápis nastavení automatizácie |

### WebSocket — `ws://localhost:3001`

**Správy zo servera:**
```json
{ "type": "sensors",   "data": { ... }, "ts": 1234567890 }
{ "type": "actuators", "data": { "pump": true }, "ts": 1234567890 }
{ "type": "fullState", "data": { ... }, "ts": 1234567890 }
```

---

## 📁 Štruktúra projektu

```
iot-zavlazovanie/
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
| ESP32 sa nepripája na WiFi | Skontroluj SSID/heslo, ESP32 podporuje **len 2.4GHz** |
| `POST /sensors -> -1` | Backend nebeží alebo zlá IP v `SERVER_URL` |
| DHT11 vracia `nan` | Skontroluj zapojenie GPIO 4, pridaj 10kΩ pull-up na DATA pin |
| Soil senzor ukazuje 0% alebo 100% stále | Skalibrácia — uprav `SOIL_DRY` a `SOIL_WET` podľa tvojho senzora |
| Pumpa nekliká | Skontroluj napájanie 5V, relay je active LOW (LOW = zapnutý) |
| Dashboard sa neaktualizuje | Skontroluj či backend beží na porte 3001 |

---

## 📄 Licencia

MIT License — voľne použiteľné pre školské aj osobné projekty.

---

*Projekt vytvorený ako IoT školský projekt — ESP32 + Node.js + React*