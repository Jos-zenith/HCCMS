// HCCMS uplink: Wi-Fi, NTP time and an offline ring buffer for sensor readings.
// Shared by tree_module and vehicle_module (copy this file next to each .ino).
//
// Readings are timestamped with millis() when taken and converted to Unix time
// at upload, so readings captured before Wi-Fi/NTP came up still get correct
// timestamps. The server ignores duplicates, so retries are safe.

#pragma once
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>

#ifndef BUFFER_CAPACITY
#define BUFFER_CAPACITY 360  // 6 hours at one reading per minute
#endif
#define UPLOAD_BATCH 30
#define NUM_FIELDS 7

// Field order matches the /api/ingest payload keys
static const char* FIELD_NAMES[NUM_FIELDS] = {
  "temperature", "humidity", "soil_moisture", "ph", "light", "co2_ppm", "pm25"
};

struct Reading {
  uint32_t takenAtMs;
  float v[NUM_FIELDS];  // NAN = not measured
};

class Uplink {
 public:
  void begin(const char* ssid, const char* pass, const char* serverUrl, const char* deviceKey) {
    _ssid = ssid; _pass = pass; _url = String(serverUrl) + "/api/ingest"; _key = deviceKey;
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(_ssid, _pass);
    configTime(0, 0, "pool.ntp.org", "time.google.com");
  }

  static Reading blank() {
    Reading r;
    r.takenAtMs = millis();
    for (int i = 0; i < NUM_FIELDS; i++) r.v[i] = NAN;
    return r;
  }

  void push(const Reading& r) {
    _buf[_head] = r;
    _head = (_head + 1) % BUFFER_CAPACITY;
    if (_count < BUFFER_CAPACITY) _count++;
    else _tail = (_tail + 1) % BUFFER_CAPACITY;  // full: drop the oldest
  }

  size_t pending() const { return _count; }

  bool timeValid() const { return time(nullptr) > 1700000000; }

  // Upload buffered readings in batches. Call regularly from loop().
  void flush() {
    if (_count == 0) return;
    if (WiFi.status() != WL_CONNECTED) {
      if (millis() - _lastReconnect > 30000) { _lastReconnect = millis(); WiFi.reconnect(); }
      return;
    }
    if (!timeValid()) return;  // wait for NTP so timestamps are right

    while (_count > 0) {
      size_t n = _count < UPLOAD_BATCH ? _count : UPLOAD_BATCH;
      time_t now = time(nullptr);
      uint32_t nowMs = millis();

      JsonDocument doc;
      JsonArray arr = doc["readings"].to<JsonArray>();
      for (size_t i = 0; i < n; i++) {
        const Reading& r = _buf[(_tail + i) % BUFFER_CAPACITY];
        JsonObject o = arr.add<JsonObject>();
        o["ts"] = (uint32_t)(now - (nowMs - r.takenAtMs) / 1000);
        for (int f = 0; f < NUM_FIELDS; f++) {
          if (!isnan(r.v[f])) o[FIELD_NAMES[f]] = serialized(String(r.v[f], 2));
        }
      }
      String body;
      serializeJson(doc, body);

      int code = post(body);
      Serial.printf("[uplink] POST %u readings -> %d\n", (unsigned)n, code);
      if (code == 200 || code == 400) {
        // 400 = server rejected these readings (out of range / too old); drop them, don't retry forever
        _tail = (_tail + n) % BUFFER_CAPACITY;
        _count -= n;
      } else {
        break;  // network/server error: keep buffered, retry next time
      }
    }
  }

 private:
  int post(const String& body) {
    HTTPClient http;
    WiFiClientSecure secure;
    WiFiClient plain;
    if (_url.startsWith("https")) {
      secure.setInsecure();  // see README: pin your server's root CA for production
      http.begin(secure, _url);
    } else {
      http.begin(plain, _url);
    }
    http.setTimeout(10000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + _key);
    int code = http.POST(body);
    http.end();
    return code;
  }

  const char* _ssid = nullptr;
  const char* _pass = nullptr;
  String _url;
  const char* _key = nullptr;
  Reading _buf[BUFFER_CAPACITY];
  size_t _head = 0, _tail = 0, _count = 0;
  uint32_t _lastReconnect = 0;
};
