// ============================================================
// SMART GREENHOUSE — ESP32 Firmware v2.0
// Senzory  : DHT11 (teplota+vlhkosť), Soil Moisture (AO), LDR
// Aktuátory: Vodná pumpa (Relay)
// Protokol : HTTP REST  ->  Node.js backend
// Knižnice : DHT sensor library, ArduinoJson
//
// POZOR: Soil moisture senzor je zapojený cez AO (analóg) pin
// pretože potenciometer na module je pokazený. Prah sa nastavuje
// softwarovo priamo v kóde / cez dashboard.
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

//-- KONFIGURÁCIA --------------------------------------------
const char* WIFI_SSID  = "tvoja-wifi-siet";
const char* WIFI_PASS  = "tvoje-heslo";
const char* SERVER_URL = "http://192.168.1.100:3001";

// -- PINY ---------------------------------------------------
#define DHT_PIN        4    // DHT11 data
#define SOIL_AO_PIN   34    // Analóg AO — vlhkosť pôdy (AO pin, nie DO!)
#define LDR_PIN       35    // Analóg — intenzita svetla
#define PUMP_PIN      26    // Relay — vodná pumpa (active LOW)

// -- KALIBRÁCIA SOIL SENZORA --------------------------------
// Resistívny senzor: suchá pôda = vysoké ADC, mokrá = nízke ADC
// Postup kalibrácie:
//   1. Daj senzor na vzduch (sucho) -> zapíš ADC hodnotu -> SOIL_DRY
//   2. Daj senzor do vody           -> zapíš ADC hodnotu -> SOIL_WET
// Použi Serial Monitor (115200 baud) na odčítanie hodnôt.
const int SOIL_DRY = 3200;   // ADC pri suchej pôde  (~78% z 4095)
const int SOIL_WET =  800;   // ADC pri mokrej pôde  (~20% z 4095)

// -- OBJEKTY ------------------------------------------------
DHT dht(DHT_PIN, DHT11);

unsigned long lastSend = 0;
const int     INTERVAL = 5000;   // ms medzi odoslaním

// -- SETUP --------------------------------------------------
void setup() {
  Serial.begin(115200);

  // Relay — predvolene vypnutý (HIGH = neaktívny pre active LOW)
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH);

  dht.begin();
  connectWiFi();

  Serial.println("Smart Greenhouse v2.0 pripraveny!");
  Serial.println("  Senzory : DHT11 | Soil AO | LDR");
  Serial.println("  Aktuator: Vodna pumpa (Relay)");
}

// -- HLAVNÁ SLUČKA ------------------------------------------
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  if (millis() - lastSend >= INTERVAL) {
    lastSend = millis();

    // 1. Čítaj DHT11
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("CHYBA: DHT11 nereaguje — skontroluj zapojenie (GPIO 4)");
      return;
    }

    // 2. Čítaj vlhkosť pôdy cez AO pin
    //    map() prevedie surové ADC na percentá 0–100%
    int soilRaw = analogRead(SOIL_AO_PIN);
    int soil    = map(soilRaw, SOIL_DRY, SOIL_WET, 0, 100);
    soil        = constrain(soil, 0, 100);

    // 3. Čítaj LDR (0 = tma, 4095 = max svetlo)
    int ldr = analogRead(LDR_PIN);

    Serial.printf("[SENZORY] T=%.1f C  H=%.1f%%  Soil=%d%% (ADC=%d)  LDR=%d\n",
                  temp, hum, soil, soilRaw, ldr);

    // 4. Odošli dáta na backend
    sendSensors(temp, hum, soil, ldr);

    // 5. Stiahni a aplikuj príkaz pre pumpu
    applyActuators();
  }
}

// -- WIFI ---------------------------------------------------
void connectWiFi() {
  Serial.printf("Pripajam na %s ...", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 20) {
    delay(500); Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED)
    Serial.println("\nWiFi OK — IP: " + WiFi.localIP().toString());
  else
    Serial.println("\nWiFi ZLYHALO!");
}

// -- ODOSLANIE SENZOROVÝCH DÁT -----------------------------
void sendSensors(float t, float h, int soil, int ldr) {
  HTTPClient http;
  StaticJsonDocument<200> doc;
  doc["temperature"]  = t;
  doc["humidity"]     = h;
  doc["soilMoisture"] = soil;
  doc["light"]        = ldr;

  String body;
  serializeJson(doc, body);

  http.begin(String(SERVER_URL) + "/api/sensors");
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  http.end();
  Serial.printf("[HTTP] POST /sensors -> %d\n", code);
}

// -- PRIJATIE PRÍKAZOV A APLIKOVANIE -----------------------
void applyActuators() {
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/actuators");
  int code = http.GET();

  if (code == 200) {
    StaticJsonDocument<100> doc;
    deserializeJson(doc, http.getString());

    bool pump = doc["pump"] | false;

    // Relay active-LOW: LOW = pumpa ide, HIGH = pumpa stojí
    digitalWrite(PUMP_PIN, pump ? LOW : HIGH);

    Serial.printf("[AKTUATOR] Pumpa=%s\n", pump ? "ZAP" : "VYP");
  }
  http.end();
}
