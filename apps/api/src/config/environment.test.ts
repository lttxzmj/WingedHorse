import { describe, expect, it } from "vitest";
import { parseEnvironment } from "./environment.js";

describe("parseEnvironment", () => {
  it("uses safe local defaults without requiring OpenRouter", () => {
    expect(parseEnvironment({})).toMatchObject({
      NODE_ENV: "development",
      API_PORT: 3100,
      OPENROUTER_TIMEOUT_MS: 15_000
    });
  });

  it("requires persistent storage in production", () => {
    expect(() => parseEnvironment({ NODE_ENV: "production" })).toThrow(
      "Invalid server configuration: DATABASE_URL"
    );
  });

  it("rejects a half-configured OpenRouter without exposing the key", () => {
    const secret = "sk-or-private-value";
    let message = "";
    try {
      parseEnvironment({ OPENROUTER_API_KEY: secret });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("OPENROUTER_CHAT_MODEL");
    expect(message).not.toContain(secret);
  });

  it("validates ports, protocols, timeouts and paired MQTT credentials", () => {
    expect(() =>
      parseEnvironment({
        API_PORT: "70000",
        DATABASE_URL: "https://database.example.com",
        OPENROUTER_TIMEOUT_MS: "200",
        MQTT_URL: "https://broker.example.com",
        MQTT_USER: "device"
      })
    ).toThrow(
      "Invalid server configuration: API_PORT, DATABASE_URL, OPENROUTER_TIMEOUT_MS, MQTT_URL, MQTT_PASSWORD"
    );
  });

  it("fails closed when an environment template reaches production unchanged", () => {
    expect(() =>
      parseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://wingedhorse:请替换密码@postgres:5432/wingedhorse",
        OPENROUTER_API_KEY: "请替换为真实密钥",
        OPENROUTER_CHAT_MODEL: "deepseek/deepseek-chat",
        MQTT_USER: "wingedhorse",
        MQTT_PASSWORD: "change-me"
      })
    ).toThrow("Invalid server configuration: DATABASE_URL, OPENROUTER_API_KEY, MQTT_PASSWORD");
  });
});
