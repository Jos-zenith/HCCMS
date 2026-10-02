/*
  HCCMS - Tree module (ESP32 DevKit)
  Measures the growing conditions of one tree and uploads 1-minute averages.

  Wiring (use ADC1 pins only: ADC2 does not work while Wi-Fi is on)
    SHT31 (I2C, 0x44)     -> SDA GPIO 21, SCL GPIO 22, 3V3  (mount in a vented radiation shield)
    Capacitive soil probe -> GPIO 34  (AOUT; power from 3V3)
    pH module (PH-4502C)  -> GPIO 35  (Po through a 10k/20k divider: module outputs up to 5 V)
    LDR divider           -> GPIO 32  (LDR to 3V3, 10k to GND, midpoint to pin)

  Libraries: "Adafruit SHT31 Library", ArduinoJson 7.x
  The SHT31 replaces the prototype's DHT11, which drifts and fails in outdoor humidity.
  Board: ESP32 Dev Module (Arduino-ESP32 core 2.x or 3.x)
*/
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include "hccms_uplink.h"

// ---- Network & identity (from the HCCMS Manage page) ----
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-hccms-site.example";
const char* DEVICE_KEY    = "dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// ---- Pins ----
#define SOIL_PIN  34
#define PH_PIN    35
#define LDR_PIN   32

// ---- Calibration (run the serial "cal" command, see README) ----
// Soil probe raw millivolts in dry air and in a glass of water
int SOIL_DRY_MV = 2600;
int SOIL_WET_MV = 1100;
// pH probe millivolts at the ADC pin (after the divider) in pH 7.00 and pH 4.00 buffer
float PH7_MV = 1700.0;
float PH4_MV = 2030.0;
// LDR millivolts in full direct sun (100 %)
int LDR_FULL_SUN_MV = 3000;

const uint32_t SAMPLE_EVERY_MS = 5000;   // read sensors every 5 s
const uint32_t AVERAGE_EVERY_MS = 60000; // store one averaged reading per minute

Adafruit_SHT31 sht;
bool shtOk = false;
Uplink uplink;

struct Acc { float sum = 0; int n = 0; void add(float v) { if (!isnan(v)) { sum += v; n++; } } float mean() const { return n ? sum / n : NAN; } };
Acc accT, accH, accSoil, accPh, accLight;
uint32_t lastSample = 0, lastAverage = 0;

// Median of several reads to reject ADC spikes
int readMv(int pin, int samples = 9) {
  int v[15];
  for (int i = 0; i < samples; i++) { v[i] = analogReadMilliVolts(pin); delay(3); }
  for (int i = 1; i < samples; i++) for (int j = i; j > 0 && v[j] < v[j - 1]; j--) { int t = v[j]; v[j] = v[j - 1]; v[j - 1] = t; }
  return v[samples / 2];
}

float soilPercent(int mv) {
  float pct = 100.0f * (SOIL_DRY_MV - mv) / (float)(SOIL_DRY_MV - SOIL_WET_MV);
  return constrain(pct, 0.0f, 100.0f);
}

float phValue(int mv) {
  // Two-point linear calibration
  float slope = (7.0f - 4.0f) / (PH7_MV - PH4_MV);
  return constrain(7.0f + (mv - PH7_MV) * slope, 0.0f, 14.0f);
}

float lightPercent(int mv) {
  return constrain(100.0f * mv / LDR_FULL_SUN_MV, 0.0f, 100.0f);
}

void sample() {
  if (shtOk) {
    accT.add(sht.readTemperature());
    accH.add(sht.readHumidity());
  }
  accSoil.add(soilPercent(readMv(SOIL_PIN)));
  accPh.add(phValue(readMv(PH_PIN)));
  accLight.add(lightPercent(readMv(LDR_PIN)));
}

void storeAverage() {
  Reading r = Uplink::blank();
  r.v[0] = accT.mean();
  r.v[1] = accH.mean();
  r.v[2] = accSoil.mean();
  r.v[3] = accPh.mean();
  r.v[4] = accLight.mean();
  accT = accH = accSoil = accPh = accLight = Acc();
  uplink.push(r);
  Serial.printf("T=%.1fC H=%.0f%% soil=%.0f%% pH=%.2f light=%.0f%% (buffered %u)\n",
                r.v[0], r.v[1], r.v[2], r.v[3], r.v[4], (unsigned)uplink.pending());
}

// Serial helper: type "cal" to print raw millivolts for calibration
void handleSerial() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd == "cal") {
    Serial.printf("soil=%d mV  ph=%d mV  ldr=%d mV\n", readMv(SOIL_PIN), readMv(PH_PIN), readMv(LDR_PIN));
  }
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);  // 0-3.3 V range
  shtOk = sht.begin(0x44);
  if (!shtOk) Serial.println("SHT31 not found: temperature/humidity will be omitted");
  uplink.begin(WIFI_SSID, WIFI_PASSWORD, SERVER_URL, DEVICE_KEY);
  Serial.println("HCCMS tree module started. Type 'cal' for raw sensor values.");
}

void loop() {
  uint32_t now = millis();
  if (now - lastSample >= SAMPLE_EVERY_MS) { lastSample = now; sample(); }
  if (now - lastAverage >= AVERAGE_EVERY_MS) { lastAverage = now; storeAverage(); uplink.flush(); }
  handleSerial();
  delay(10);
}
