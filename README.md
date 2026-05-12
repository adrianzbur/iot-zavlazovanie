# 🌱 IoT Zavlažovanie — Smart Greenhouse

Inteligentný systém automatického zavlažovania riadený cez ESP32 s real-time dashboardom, automatickou závlahou a LCD displejom.

---

## 📋 Obsah

- [Prehľad projektu](#prehľad-projektu)
- [Architektúra systému](#architektúra-systému)
- [Hardvér](#hardvér)
- [Zapojenie](#zapojenie)
- [Kalibrácia soil senzora](#kalibrácia-soil-senzora)
- [Inštalácia](#inštalácia)
- [Spustenie](#spustenie)
- [Automatizačné pravidlá](#automatizačné-pravidlá)
- [API Dokumentácia](#api-dokumentácia)
- [Štruktúra projektu](#štruktúra-projektu)
- [Riešenie problémov](#riešenie-problémov)

---

## 🌿 Prehľad projektu

IoT Zavlažovanie je systém ktorý monitoruje podmienky prostredia a automaticky ovláda vodnú pumpu podľa vlhkosti pôdy. Systém pozostáva z troch vrstiev:

| Vrstva | Technológia | Úloha |
|--------|-------------|-------|
| **Firmware** | ESP32 + Arduino | Čítanie senzorov, LCD displej, ovládanie pumpy |
| **Backend** | Node.js + Express | REST API, WebSocket, automatizácia |
| **Frontend** | React + Vite | Dashboard, grafy, manuálne ovládanie |

### Funkcie
- 📡 **Real-time monitoring** — senzory sa odosielajú každých 5 sekúnd
- 💧 **Automatická závlaha** — pumpa reaguje na vlhkosť pôdy
- ⏱️ **Ochranný časovač** — pumpa sa automaticky vypne po nastavenom čase
- 🖥️ **LCD displej** — zobrazuje aktuálne hodnoty priamo na zariadení
- 🎛️ **Manuálne ovládanie** — prepnutie z AUTO do MANUAL režimu cez dashboard
- 📈 **Graf histórie** — zobrazenie posledných 50 meraní
- ⚠️ **Upozornenia** — alert keď vlhkosť pôdy klesne pod prah
- 🔌 **WebSocket** — okamžité aktualizácie bez obnovenia stránky
- 🔄 **Auto-reconnect** — frontend sa automaticky reconnectuje pri výpadku

---

## 🏗️ Architektúra systému

```
┌──────────────────────────────────────────────────────────┐
│                    FYZICKÝ SKLENÍK                       │
│  DHT11        ──┐                                        │
│  Soil (2-pin) ──┤── ESP32 ──── WiFi ──── Node.js Backend │
│  LDR          ──┘     │                      │           │
│  LCD I2C    ←─────────┤                      │           │
│               Relay ──── Vodná pumpa          │           │
└───────────────────────────────────────────────┼──────────┘
                                                │ WebSocket
                                          React Dashboard
                                          (prehliadač)
```

### Tok dát

```
DHT11 + Soil (2-pin AO) + LDR
    ↓  analogRead() + map() kalibrácia
ESP32 → zobrazí na LCD
    ↓  HTTP POST /api/sensors (každých 5s)
Node.js Automation Engine
    ↓  WebSocket broadcast
React Dashboard (Live)
    ↑  ESP32 GET /api/actuators
Relay NC → Vodná pumpa 💧
```

---

## 🔧 Hardvér

### Zoznam komponentov

| Komponent | Model/Typ | Funkcia |
|-----------|-----------|---------|
| Mikrokontrolér | ESP32 DevKit v1 | Hlavná jednotka |
| Teplotný senzor | DHT11 | Teplota + vlhkosť vzduchu |
| Senzor vlhkosti pôdy | Resistívny 2-pin | Vlhkosť substrátu — **priamo na ESP32 cez 10kΩ** |
| Fotorezistor | LDR + 10kΩ | Intenzita svetla |
| Relay modul | 1-kanálový 5V | Spínanie pumpy — **zapojený cez NC** |
| Vodná pumpa | Mini 3–5V DC | Závlaha |
| LCD displej | 16x2 + I2C modul | Zobrazenie hodnôt |
| Batéria/zdroj | 4x AA alebo 5V adaptér | Napájanie pumpy (oddelené od ESP32!) |

> ⚠️ **Pumpa musí mať vlastný zdroj napájania** — ESP32 USB nestačí na napájanie pumpy!

---

## 🔌 Zapojenie

### ESP32 → Senzory

```
ESP32 Pin    →    Komponent
──────────────────────────────────────────────────────
GPIO  4      →    DHT11 DATA
GPIO 21      →    LCD I2C SDA
GPIO 22      →    LCD I2C SCL
GPIO 34      →    Soil senzor PIN B + cez 10kΩ na GND
GPIO 35      →    LDR + cez 10kΩ na GND
GPIO 26      →    Relay IN
3.3V         →    DHT11 VCC, Soil PIN A, LDR
5V           →    Relay VCC, LCD VCC
GND          →    Všetky GND dokopy
```

### Soil senzor (2-pin, bez modulu)

```
Soil PIN A  →  3.3V
Soil PIN B  →  GPIO 34  +  cez 10kΩ rezistor na GND
```

> Senzor nemá polaritu — piny sú zameniteľné.

### LDR Fotorezistor (holý, bez modulu)

```
LDR nôžka 1  →  3.3V
LDR nôžka 2  →  GPIO 35  +  cez 10kΩ rezistor na GND
```

> LDR tiež nemá polaritu.

### Relay + Pumpa (zapojenie cez NC)

```
Relay svorkovnica:
  COM  ←  Batéria + (červený)
  NC   ←  Pumpa + (fialový)
  NO   →  prázdny

Batéria –  →  GND (spoločná s ESP32)
Pumpa –    →  GND (spoločná s ESP32)
```

> ⚠️ **Prečo NC a nie NO?**
> NC (Normally Closed) = pumpa ide keď relay je VYPNUTÝ.
> Logika v kóde je obrátená: `pump=true → GPIO HIGH → relay aktívny → obvod otvorený → pumpa VYP`.
> Výhoda: pumpa NEpôjde pri výpadku WiFi ani reštarte ESP32.

### LCD 16x2 s I2C modulom

```
LCD I2C    →    ESP32
─────────────────────
VCC        →    5V
GND        →    GND
SDA        →    GPIO 21
SCL        →    GPIO 22
```

> I2C adresa: **0x27** (alebo 0x3F — skontroluj pomocou I2C scannera)

---

## 📏 Kalibrácia soil senzora

Resistívny senzor mení odpor podľa vlhkosti:
- **Suchá pôda** = vysoký odpor = **vysoké ADC** hodnoty
- **Mokrá pôda** = nízky odpor = **nízke ADC** hodnoty

**Postup kalibrácie:**
1. Zapoj senzor a otvor Serial Monitor (115200 baud)
2. Daj senzor **na vzduch** (sucho) → zapíš `ADC=XXXX` → to je `SOIL_DRY`
3. Daj senzor **do pohára s vodou** → zapíš `ADC=XXXX` → to je `SOIL_WET`
4. Uprav v `firmware/greenhouse.ino`:

```cpp
const int SOIL_DRY = 4095;  // tvoja hodnota na vzduchu
const int SOIL_WET =  800;  // tvoja hodnota vo vode
```

---

## 🚀 Inštalácia

### 1. Klonovanie repozitára

```bash
git clone https://github.com/tvoj-username/iot-zavlazovanie.git
cd iot-zavlazovanie
```

### 2. Backend

```bash
cd backend
npm install
```

### 3. Frontend (Vite + React)

```bash
cd frontend
npm install
npm install recharts
```

### 4. ESP32 Firmware — Arduino IDE

**Požadované knižnice** (inštaluj cez Library Manager):
- `DHT sensor library` — od Adafruit
- `ArduinoJson` — od Benoit Blanchon
- `LiquidCrystal I2C` — od Frank de Brabander

**Nastavenie Arduino IDE:**
1. Pridaj ESP32 board URL: `File → Preferences → Additional Board URLs`
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. `Tools → Board → ESP32 Dev Module`
3. `Tools → Port → COMx`

---

## ▶️ Spustenie

### Krok 1 — Uprav `greenhouse.ino`

```cpp
const char* WIFI_SSID  = "tvoja-wifi-siet";   // len 2.4GHz!
const char* WIFI_PASS  = "tvoje-heslo";
const char* SERVER_URL = "http://192.168.0.XXX:3001";  // IP tvojho PC (ipconfig)

const int SOIL_DRY = 4095;  // skalibrovať!
const int SOIL_WET =  800;  // skalibrovať!
```

### Krok 2 — Spusti backend

```bash
cd backend
node server.js
```

Výstup:
```
Backend bezi na http://localhost:3001
WebSocket:       ws://localhost:3001
```

### Krok 3 — Spusti frontend

```bash
cd frontend
npm run dev
```

Dashboard sa otvorí na `http://localhost:5173`

### Krok 4 — Nahraj firmware

Otvor `firmware/greenhouse.ino` v Arduino IDE → **Upload**.

Serial Monitor (115200 baud) ukáže:
```
Smart Greenhouse v2.0 pripravený!
  Senzory : DHT11 | Soil AO | LDR | LCD
  Aktuátor: Vodná pumpa (Relay NC)
WiFi OK — IP: 192.168.0.116
[SENZORY] T=26.5 C  H=58.0%  Soil=45% (ADC=2100)  LDR=3200
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

Nastavenia sú meniteľné cez dashboard → záložka **Automatizácia**.

---

## 📡 API Dokumentácia

Base URL: `http://localhost:3001`

### ESP32 endpointy

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| `POST` | `/api/sensors` | Odoslanie senzorových dát |
| `GET` | `/api/actuators` | Stiahnutie príkazu pre pumpu |

**POST /api/sensors:**
```json
{
  "temperature": 26.5,
  "humidity": 58.0,
  "soilMoisture": 45,
  "light": 3200
}
```

**GET /api/actuators:**
```json
{ "pump": false }
```

### Frontend endpointy

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| `GET` | `/api/state` | Celkový stav |
| `POST` | `/api/actuators` | Manuálne ovládanie pumpy |
| `GET/POST` | `/api/automation` | Nastavenia automatizácie |

### WebSocket — `ws://localhost:3001`

```json
{ "type": "sensors",   "data": { ... }, "ts": 1234567890 }
{ "type": "actuators", "data": { "pump": false }, "ts": 1234567890 }
{ "type": "fullState", "data": { ... }, "ts": 1234567890 }
```

---

## 📁 Štruktúra projektu

```
iot-zavlazovanie/
│
├── firmware/
│   └── greenhouse.ino          # ESP32 C++ kód — Arduino IDE
│
├── backend/
│   ├── server.js               # Node.js Express + WebSocket
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── main.jsx            # React vstupný bod
│       └── iot_greenhouse.jsx  # Dashboard (WebSocket live dáta)
│
└── README.md
```

---

## 🛠️ Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| ESP32 sa nepripája na WiFi | ESP32 podporuje **len 2.4GHz** — skontroluj frekvenciu siete |
| `POST /sensors -> -1` | Backend nebeží alebo zlá IP v `SERVER_URL` |
| DHT11 vracia `nan` | Skontroluj zapojenie GPIO 4, pridaj 10kΩ pull-up na DATA pin |
| Soil ukazuje 0% alebo 100% | Skalibrácia — uprav `SOIL_DRY` a `SOIL_WET` podľa Serial Monitora |
| Pumpa nejde (NO) | Pumpa potrebuje **vlastný zdroj** — ESP32 USB nestačí |
| Pumpa ide stále (NC) | Skontroluj `digitalWrite(PUMP_PIN, LOW)` v `setup()` |
| LCD nezobrazuje nič | Skontroluj I2C adresu (0x27 alebo 0x3F), kontrast potenciometrom |
| Dashboard OFFLINE | Skontroluj či backend beží na porte 3001 |
| Frontend sa neotvorí | Spusti `npm run dev` v priečinku `frontend/` |

---

## 📄 Licencia

MIT License — voľne použiteľné pre školské aj osobné projekty.

---

*IoT Zavlažovanie — ESP32 + Node.js + React + Vite · Školský projekt*