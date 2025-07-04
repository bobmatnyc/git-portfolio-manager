/**
 * Portfolio Monitor - Package Entry Point
 */

const PortfolioMonitor = require("./portfolio-monitor");
const ConfigLoader = require("./config/config-loader");

module.exports = {
  PortfolioMonitor,
  ConfigLoader,

  // Convenience exports
  createMonitor: (options) => new PortfolioMonitor(options),
  createConfigLoader: (options) => new ConfigLoader(options),
};

// Default export
module.exports.default = PortfolioMonitor;
