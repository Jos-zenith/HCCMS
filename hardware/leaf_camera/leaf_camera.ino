/*
  HCCMS - Leaf camera (AI-Thinker ESP32-CAM)
  Photographs the tree canopy a few times a day and uploads the JPEG for leaf
  colour analysis (green vs yellow/brown foliage). Sleeps between captures.

  Mounting: fix the camera 1-2 m from a dense part of the canopy, same angle
  every time, avoiding sky and walls in frame. Captures are limited to
  mid-day for consistent light, with auto white balance locked to daylight.

  Board: "AI Thinker ESP32-CAM" (Arduino-ESP32 core). Flash with an FTDI adapter (IO0 to GND).
*/
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-hccms-site.example";
const char* DEVICE_KEY    = "dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// Capture window in local time (IST = UTC+5:30) and interval
const long UTC_OFFSET_S = 19800;
const int CAPTURE_FROM_HOUR = 10;
const int CAPTURE_TO_HOUR = 15;
const uint64_t SLEEP_MINUTES = 120;

// AI-Thinker pin map
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

bool initCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_VGA;  // 640x480 is plenty for colour analysis
  c.jpeg_quality = 12;
  c.fb_count = 1;
  if (esp_camera_init(&c) != ESP_OK) return false;

  sensor_t* s = esp_camera_sensor_get();
  s->set_whitebal(s, 1);
  s->set_awb_gain(s, 1);
  s->set_wb_mode(s, 1);  // fixed "sunny" white balance so colours are comparable across days
  s->set_saturation(s, 0);
  return true;
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(500);
  return WiFi.status() == WL_CONNECTED;
}

int localHour() {
  configTime(UTC_OFFSET_S, 0, "pool.ntp.org", "time.google.com");
  for (int i = 0; i < 20 && time(nullptr) < 1700000000; i++) delay(500);
  time_t now = time(nullptr);
  if (now < 1700000000) return -1;
  struct tm t;
  localtime_r(&now, &t);
  return t.tm_hour;
}

int upload(camera_fb_t* fb) {
  String url = String(SERVER_URL) + "/api/ingest/leaf-image";
  HTTPClient http;
  WiFiClientSecure secure;
  WiFiClient plain;
  if (url.startsWith("https")) { secure.setInsecure(); http.begin(secure, url); }
  else http.begin(plain, url);
  http.setTimeout(30000);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_KEY);
  int code = http.POST(fb->buf, fb->len);
  Serial.printf("Upload %u bytes -> %d %s\n", (unsigned)fb->len, code, http.getString().c_str());
  http.end();
  return code;
}

void sleepNow() {
  Serial.flush();
  esp_sleep_enable_timer_wakeup(SLEEP_MINUTES * 60ULL * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  if (!connectWifi()) { Serial.println("Wi-Fi failed"); sleepNow(); }

  int hour = localHour();
  if (hour >= 0 && (hour < CAPTURE_FROM_HOUR || hour >= CAPTURE_TO_HOUR)) {
    Serial.printf("Outside capture window (hour %d), sleeping\n", hour);
    sleepNow();
  }

  if (!initCamera()) { Serial.println("Camera init failed"); sleepNow(); }
  // Let auto-exposure settle: discard a few frames
  for (int i = 0; i < 4; i++) { camera_fb_t* f = esp_camera_fb_get(); if (f) esp_camera_fb_return(f); delay(200); }

  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) {
    upload(fb);
    esp_camera_fb_return(fb);
  }
  sleepNow();
}

void loop() {}
