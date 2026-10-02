/*
  HCCMS - Vehicle & air module (ESP32 DevKit)
  Ambient air near the home and its parking spot: fine dust PM2.5 (Sharp
  GP2Y1010AU0F) and an indicative CO2 trend (MQ135). A static module mostly sees
  neighbourhood air, so these readings inform residents and are NOT used for the
  household's emissions (those come from fuel purchases) or its Green Score.
  MQ135 output drifts with temperature/humidity and cross-reacts with CO, NH3 and
  VOCs; use an NDIR sensor (SCD40/MH-Z19) where real CO2 values are needed.

  Wiring (ADC1 pins only)
    MQ135 AO        -> GPIO 34 through a 10k/20k divider (module runs on 5 V)
    GP2Y1010 Vo     -> GPIO 35 through a 10k/20k divider
    GP2Y1010 LED    -> GPIO 25 (via 150 ohm resistor; 220 uF cap from LED-V to GND, per datasheet)
    SHT31 (I2C)     -> SDA GPIO 21, SCL GPIO 22 (optional, ambient temperature/humidity)

  Libraries: "Adafruit SHT31 Library", ArduinoJson 7.x
  MQ135: burn in for 24 h on first use, then calibrate R0 outdoors (send "cal" over serial).
*/
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Preferences.h>
#include "hccms_uplink.h"

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-hccms-site.example";
const char* DEVICE_KEY    = "dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

#define MQ135_PIN   34
#define DUST_PIN    35
#define DUST_LED    25

const float DIVIDER = 1.5f;        // 10k/20k divider: Vsensor = Vpin * 1.5
const float MQ_VC = 5.0f;          // MQ135 heater/load supply
const float MQ_RL_KOHM = 1.0f;     // load resistor on your MQ135 board (check: often 1k, sometimes 10k)
// CO2 curve from the MQ135 datasheet fit: ppm = A * (Rs/R0)^-B
const float MQ_A = 116.6020682f;
const float MQ_B = 2.769034857f;
const float ATMOSPHERIC_CO2 = 420.0f;
const uint32_t MQ_WARMUP_MS = 180000;  // ignore readings for 3 min after power-on

// GP2Y1010 typical datasheet response: 0.17 mg/m3 per volt above ~0.6 V clean-air output
float DUST_ZERO_V = 0.6f;

const uint32_t SAMPLE_EVERY_MS = 2000;
const uint32_t AVERAGE_EVERY_MS = 60000;

Adafruit_SHT31 sht;
bool shtOk = false;
Preferences prefs;
Uplink uplink;
float R0 = 76.63f;  // overwritten by stored calibration

struct Acc { float sum = 0; int n = 0; void add(float v) { if (!isnan(v)) { sum += v; n++; } } float mean() const { return n ? sum / n : NAN; } };
Acc accCo2, accPm, accT, accH;
uint32_t lastSample = 0, lastAverage = 0;

float mqResistance() {
  float vout = 0;
  for (int i = 0; i < 10; i++) { vout += analogReadMilliVolts(MQ135_PIN) / 1000.0f * DIVIDER; delay(5); }
  vout /= 10;
  if (vout < 0.01f) return NAN;
  return MQ_RL_KOHM * (MQ_VC - vout) / vout;
}

float co2Ppm() {
  float rs = mqResistance();
  if (isnan(rs)) return NAN;
  return MQ_A * pow(rs / R0, -MQ_B);
}

// One GP2Y1010 measurement: LED pulse 0.32 ms, sample at 0.28 ms (datasheet timing)
float dustSampleV() {
  digitalWrite(DUST_LED, LOW);
  delayMicroseconds(280);
  float v = analogReadMilliVolts(DUST_PIN) / 1000.0f * DIVIDER;
  delayMicroseconds(40);
  digitalWrite(DUST_LED, HIGH);
  delayMicroseconds(9680);
  return v;
}

float pm25() {
  float v = 0;
  for (int i = 0; i < 30; i++) v += dustSampleV();
  v /= 30;
  return max(0.0f, (v - DUST_ZERO_V) * 0.17f * 1000.0f);  // ug/m3
}

void calibrate() {
  // Run outdoors in fresh air after warm-up: solve R0 so that Rs/R0 gives atmospheric CO2
  float rs = 0;
  for (int i = 0; i < 20; i++) { rs += mqResistance(); delay(250); }
  rs /= 20;
  R0 = rs * pow(ATMOSPHERIC_CO2 / MQ_A, 1.0f / MQ_B);
  float vClean = 0;
  for (int i = 0; i < 20; i++) vClean += dustSampleV();
  DUST_ZERO_V = vClean / 20;
  prefs.putFloat("r0", R0);
  prefs.putFloat("dust0", DUST_ZERO_V);
  Serial.printf("Calibrated: R0=%.2f kOhm, dust zero=%.3f V\n", R0, DUST_ZERO_V);
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  pinMode(DUST_LED, OUTPUT);
  digitalWrite(DUST_LED, HIGH);
  shtOk = sht.begin(0x44);
  prefs.begin("hccms", false);
  R0 = prefs.getFloat("r0", R0);
  DUST_ZERO_V = prefs.getFloat("dust0", DUST_ZERO_V);
  uplink.begin(WIFI_SSID, WIFI_PASSWORD, SERVER_URL, DEVICE_KEY);
  Serial.printf("HCCMS vehicle module. R0=%.2f. Type 'cal' outdoors after warm-up to calibrate.\n", R0);
}

void loop() {
  uint32_t now = millis();
  if (now - lastSample >= SAMPLE_EVERY_MS) {
    lastSample = now;
    if (now > MQ_WARMUP_MS) accCo2.add(co2Ppm());
    accPm.add(pm25());
    if (shtOk) {
      accT.add(sht.readTemperature());
      accH.add(sht.readHumidity());
    }
  }
  if (now - lastAverage >= AVERAGE_EVERY_MS) {
    lastAverage = now;
    Reading r = Uplink::blank();
    r.v[0] = accT.mean();
    r.v[1] = accH.mean();
    r.v[5] = accCo2.mean();
    r.v[6] = accPm.mean();
    accCo2 = accPm = accT = accH = Acc();
    if (!isnan(r.v[5]) || !isnan(r.v[6])) uplink.push(r);
    Serial.printf("CO2=%.0f ppm PM2.5=%.0f ug/m3 (buffered %u)\n", r.v[5], r.v[6], (unsigned)uplink.pending());
    uplink.flush();
  }
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "cal") calibrate();
  }
  delay(10);
}
