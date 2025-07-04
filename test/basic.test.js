/**
 * Basic Portfolio Monitor Tests
 */

import { describe, expect, test } from "vitest";
const { PortfolioMonitor, ConfigLoader } = require("../lib");

describe("Portfolio Monitor", () => {
  test("should create monitor instance", () => {
    const monitor = new PortfolioMonitor();
    expect(monitor).toBeInstanceOf(PortfolioMonitor);
  });

  test("should create config loader", () => {
    const configLoader = new ConfigLoader();
    expect(configLoader).toBeInstanceOf(ConfigLoader);
  });

  test("should have correct package exports", () => {
    const exports = require("../lib");
    expect(exports.PortfolioMonitor).toBeDefined();
    expect(exports.ConfigLoader).toBeDefined();
    expect(exports.createMonitor).toBeDefined();
    expect(exports.createConfigLoader).toBeDefined();
  });
});

describe("Config Loader", () => {
  test("should load default configuration", async () => {
    const configLoader = new ConfigLoader();
    const config = configLoader.getDefaultConfig();

    expect(config).toHaveProperty("server");
    expect(config).toHaveProperty("directories");
    expect(config).toHaveProperty("monitoring");
    expect(config.server.port).toBe(8080);
  });

  test("should merge configurations correctly", () => {
    const configLoader = new ConfigLoader();
    const base = { server: { port: 8080, host: "localhost" } };
    const override = { server: { port: 3000 } };

    const merged = configLoader.mergeConfigs(base, override);

    expect(merged.server.port).toBe(3000);
    expect(merged.server.host).toBe("localhost");
  });
});
