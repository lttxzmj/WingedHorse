/*
 * WingedHorse 飞马心情灯 — ESP32 固件
 *
 * 职责：
 *   - 连 WiFi，连 MQTT，订阅 devices/{DEVICE_ID}/effect
 *   - 收到灯效 → 驱动 WS2812B 灯带（主心情灯）
 *   - RGB 三色 LED 作状态点（连接中/在线/离线）
 *   - FSR 压力：短按=确认/切换休养，长按=上报进入休养
 *   - DHT22 温湿度、MAX30102 心率 → 只上传派生标签（不上传原始数值）
 *
 * 依赖（Arduino Library Manager 安装）：
 *   PubSubClient (Nick O'Leary)
 *   ArduinoJson (Benoit Blanchon)
 *   FastLED (Daniel Garcia)
 *   DHT sensor library (Adafruit)
 *   SparkFun MAX3010x Sensor Library（可选，ENABLE_HEART=1 时才需要）
 *
 * 硬件接线（见 hardware/esp32/README.md）
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <FastLED.h>

#if ENABLE_DHT
#include <DHT.h>
#endif
#if ENABLE_HEART
#include "MAX30105.h"
#endif

// ==================== 配置（烧录前填写） ====================
const char *WIFI_SSID = "你的WiFi名称";
const char *WIFI_PASS = "你的WiFi密码";

const char *MQTT_HOST = "43.140.245.191";     // 生产服务器公网 IP（本地联调使用 Mac 局域网/热点 IP）
const uint16_t MQTT_PORT = 1883;
const char *MQTT_USER = "lamp-001";          // 生产环境在 broker 为设备创建的账号
const char *MQTT_PASS = "请替换为设备密码";    // 生产环境为设备分配的密码
const char *DEVICE_ID = "lamp-001";          // 设备唯一 ID，与网页设置一致

#define ENABLE_DHT 0      // 有 DHT22 时置 1
#define ENABLE_HEART 0    // 有 MAX30102 时置 1
// ============================================================

// ==================== 引脚 ====================
#define PIN_LED_STRIP 18
#define NUM_LEDS 30
#define PIN_RGB_R 25
#define PIN_RGB_G 26
#define PIN_RGB_B 27
#define PIN_FSR 34
#if ENABLE_DHT
#define PIN_DHT 4
#define DHT_TYPE DHT22
#endif

// ==================== 全局状态 ====================
CRGB leds[NUM_LEDS];

enum class Animation { OFF, STEADY, BREATHE, FLOW, RAINBOW };
struct Effect {
  Animation animation = Animation::OFF;
  uint8_t brightness = 0;  // 0-255
  CRGB color = CRGB::Black;
};
Effect currentEffect;
bool restMode = false;

uint32_t lastAnimAt = 0;
uint32_t lastTelemetryAt = 0;
const uint32_t TELEMETRY_INTERVAL_MS = 30000;

#if ENABLE_DHT
DHT dht(PIN_DHT, DHT_TYPE);
#endif
#if ENABLE_HEART
MAX30105 particleSensor;
#endif

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ==================== 灯效渲染 ====================
CRGB parseColor(const char *hex) {
  long value = strtol(hex + 1, nullptr, 16);  // 跳过 '#'
  return CRGB((value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF);
}

void fillSolidWithBrightness(CRGB color, uint8_t brightness) {
  color.nscale8_video(brightness);
  fill_solid(leds, NUM_LEDS, color);
  FastLED.show();
}

void renderAnimation() {
  uint32_t now = millis();
  uint8_t base = currentEffect.brightness;
  switch (currentEffect.animation) {
    case Animation::OFF:
      FastLED.clear();
      FastLED.show();
      break;
    case Animation::STEADY:
      fillSolidWithBrightness(currentEffect.color, base);
      break;
    case Animation::BREATHE: {
      float t = (now % 4000UL) / 4000.0f;
      float factor = 0.45f + 0.55f * (0.5f + 0.5f * sinf(t * 2.0f * PI));
      fillSolidWithBrightness(currentEffect.color, (uint8_t)(base * factor));
      break;
    }
    case Animation::FLOW: {
      // 缓慢流动：整体亮度做正弦偏移，不闪不吓人
      float t = (now % 6000UL) / 6000.0f;
      uint8_t offset = (uint8_t)(40 * sinf(t * 2.0f * PI));
      fillSolidWithBrightness(currentEffect.color, constrain(base + offset, 0, 255));
      break;
    }
    case Animation::RAINBOW: {
      // 活泼但克制的多彩渐变
      uint8_t hue = (now / 40) % 255;
      fill_rainbow(leds, NUM_LEDS, hue, 7);
      FastLED.setBrightness(constrain(base, 10, 200));
      FastLED.show();
      break;
    }
  }
}

void setStatusLed(uint8_t r, uint8_t g, uint8_t b) {
  analogWrite(PIN_RGB_R, r);
  analogWrite(PIN_RGB_G, g);
  analogWrite(PIN_RGB_B, b);
}

void updateStatusLed() {
  if (!WiFi.isConnected()) { setStatusLed(0, 0, 0); return; }
  if (!mqtt.connected()) { setStatusLed(0, 0, 255); return; }  // 蓝=连 MQTT 中
  setStatusLed(255, 200, 0);                                    // 金=在线
}

// ==================== MQTT 回调 ====================
void onEffectReceived(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  const char *anim = doc["effect"]["animation"] | "steady";
  const char *colorHex = doc["effect"]["color"] | "#FFF3D6";
  int brightnessPct = doc["effect"]["brightness"] | 40;

  if (strcmp(anim, "off") == 0) currentEffect.animation = Animation::OFF;
  else if (strcmp(anim, "breathe") == 0) currentEffect.animation = Animation::BREATHE;
  else if (strcmp(anim, "flow") == 0) currentEffect.animation = Animation::FLOW;
  else if (strcmp(anim, "rainbow") == 0) currentEffect.animation = Animation::RAINBOW;
  else currentEffect.animation = Animation::STEADY;

  currentEffect.color = parseColor(colorHex);
  currentEffect.brightness = (uint8_t)(brightnessPct * 255 / 100);
  lastAnimAt = millis();
}

// ==================== 遥测（只上传派生标签） ====================
void publishTelemetry() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["online"] = true;

#if ENABLE_DHT
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    JsonObject env = doc.createNestedObject("env");
    env["temperatureC"] = (int)t;
    env["humidityPct"] = (int)h;
  }
#endif

#if ENABLE_HEART
  // 粗糙趋势：用 IR 信号短窗口的变异性近似（趣味参考，非医疗）
  uint16_t samples[16];
  for (int i = 0; i < 16; i++) samples[i] = particleSensor.getIR();
  long sum = 0, sq = 0;
  for (int i = 0; i < 16; i++) { sum += samples[i]; sq += (long)samples[i] * samples[i]; }
  long var = sq / 16 - (sum / 16) * (sum / 16);
  const char *trend = var > 4000 ? "elevated" : (var > 1200 ? "active" : "calm");
  doc["heartTrend"] = trend;
#endif

  char buffer[256];
  size_t n = serializeJson(doc, buffer);
  String topic = String("devices/") + DEVICE_ID + "/telemetry";
  mqtt.publish(topic.c_str(), buffer, n);
}

void publishInteraction(const char *kind) {
  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["interaction"] = kind;
  char buffer[128];
  size_t n = serializeJson(doc, buffer);
  String topic = String("devices/") + DEVICE_ID + "/telemetry";
  mqtt.publish(topic.c_str(), buffer, n);
}

// ==================== FSR 压力：短按/长按 ====================
bool fsrPressed() { return analogRead(PIN_FSR) > 2000; }

void handlePress() {
  uint32_t start = millis();
  while (fsrPressed()) {
    if (millis() - start > 3000) {  // 长按 3s
      restMode = !restMode;
      publishInteraction(restMode ? "rest_on" : "rest_off");
      if (restMode) {
        currentEffect = {Animation::BREATHE, 40, CRGB(255, 246, 232)};
      }
      while (fsrPressed()) delay(20);  // 等松手
      return;
    }
    delay(20);
  }
  // 短按：确认（这里只做一次短暂脉冲 + 上报）
  publishInteraction("tap");
  fillSolidWithBrightness(CRGB(255, 208, 87), 200);
  delay(300);
}

// ==================== 连接 ====================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) delay(300);
}

void connectMqtt() {
  String topic = String("devices/") + DEVICE_ID + "/effect";
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onEffectReceived);
  mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS);
  mqtt.subscribe(topic.c_str());
}

// ==================== setup / loop ====================
void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, PIN_LED_STRIP, GRB>(leds, NUM_LEDS);
  FastLED.clear();
  FastLED.show();

  pinMode(PIN_RGB_R, OUTPUT);
  pinMode(PIN_RGB_G, OUTPUT);
  pinMode(PIN_RGB_B, OUTPUT);
  pinMode(PIN_FSR, INPUT);

#if ENABLE_DHT
  dht.begin();
#endif
#if ENABLE_HEART
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("MAX30102 未找到，继续以无心率模式运行");
  } else {
    particleSensor.setup();
  }
#endif

  connectWiFi();
  connectMqtt();
}

void loop() {
  if (!WiFi.isConnected()) connectWiFi();
  if (WiFi.isConnected() && !mqtt.connected()) connectMqtt();
  mqtt.loop();

  renderAnimation();
  updateStatusLed();

  if (fsrPressed()) handlePress();

  uint32_t now = millis();
  if (mqtt.connected() && now - lastTelemetryAt > TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;
    publishTelemetry();
  }

  delay(10);
}
