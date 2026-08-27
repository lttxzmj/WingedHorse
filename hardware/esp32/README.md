# WingedHorse 飞马心情灯 — 硬件接线与烧录

## 组件

- ESP32 开发板
- WS2812B LED 灯带（数据线 DIN 接 ESP32 GPIO18）
- RGB 三色 LED（共阴，R/G/B 分别接 GPIO25/26/27，各串 220Ω 限流）
- FSR 压力传感器（接 GPIO34，配 10kΩ 下拉，按压时电压升高）
- 可选：DHT22（数据接 GPIO4）、MAX30102（I2C：SDA=21 / SCL=22）

## 接线速查

| 组件        | 引脚      | ESP32            | 备注                             |
| ----------- | --------- | ---------------- | -------------------------------- |
| WS2812B DIN | 数据      | GPIO18           | 灯带 5V/GND 单独供电，共地       |
| RGB LED     | R / G / B | GPIO25 / 26 / 27 | 各串 220Ω，共阴                  |
| FSR         | 一端      | GPIO34 (ADC)     | 另一端接 3V3；并 10kΩ 下拉到 GND |
| DHT22       | DATA      | GPIO4            | 并 10kΩ 上拉到 3V3               |
| MAX30102    | SDA / SCL | GPIO21 / GPIO22  | 3V3 / GND                        |

## 烧录前配置

编辑 `wingedhorse_lamp.ino` 顶部：

- `WIFI_SSID` / `WIFI_PASS`
- `MQTT_HOST`（服务器 IP）、`MQTT_USER` / `MQTT_PASS`（broker 里为设备单独建的用户）
- `DEVICE_ID`（与服务器配对一致，如 `lamp-001`）
- `ENABLE_DHT`、`ENABLE_HEART` 按实际有没有传感器置 1/0

## 依赖库（Arduino Library Manager 安装）

- `PubSubClient` by Nick O'Leary
- `ArduinoJson` by Benoit Blanchon
- `FastLED` by Daniel Garcia
- `DHT sensor library` by Adafruit（仅 ENABLE_DHT=1）
- `SparkFun MAX3010x Sensor Library`（仅 ENABLE_HEART=1）

## 行为说明

- 上电 → 连 WiFi → 连 MQTT → 订阅 `devices/{DEVICE_ID}/effect`。
- RGB 状态点：灭=断网，蓝=连 MQTT 中，金=在线。
- 收到 `{mood, effect:{color, brightness, animation}}` → 灯带按动画表现。
- FSR 短按=确认（金色脉冲 + 上报 `tap`），长按 3 秒=切换休养（暗暖慢呼吸 + 上报 `rest_on/off`）。
- 每 30 秒上报遥测，**只传派生标签**（温湿度取整、心率只传 `calm/active/elevated`，不上传原始数值）。

## 服务器端消息（下行）

```json
{
  "seq": 123,
  "mood": "tired",
  "effect": { "color": "#FFB25A", "brightness": 55, "animation": "breathe" },
  "ts": "..."
}
```

`animation`：`off | steady | breathe | pulse | flow | rainbow`。`pulse` 由固件映射为一次短脉冲后回到稳态。
