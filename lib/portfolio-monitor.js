/**
 * Portfolio Monitor - Main Class
 *
 * Orchestrates project portfolio monitoring with Git analytics,
 * TrackDown integration, and business intelligence dashboard.
 */

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const ConfigLoader = require("./config/config-loader");
const MasterController = require("./monitor/master-controller");
const DashboardServer = require("./dashboard/server");

class PortfolioMonitor {
  constructor(options = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.options = options;
    this.config = null;
    this.masterController = null;
    this.dashboardServer = null;
    this.isRunning = false;
  }

  /**
   * Initialize the portfolio monitor
   */
  async initialize() {
    // Load configuration
    const configLoader = new ConfigLoader({ workingDir: this.workingDir });
    this.config = await configLoader.loadConfig(this.options.config);

    // Override config with CLI options
    this.mergeCliOptions();

    // Ensure data directory exists
    await fs.ensureDir(this.config.data.directory);

    // Initialize monitoring system
    this.masterController = new MasterController({
      workingDir: this.workingDir,
      dataDir: this.config.data.directory,
      config: this.config,
    });

    // Initialize dashboard server
    this.dashboardServer = new DashboardServer({
      port: this.config.server.port,
      host: this.config.server.host,
      dashboardDir: path.join(__dirname, "dashboard", "static"),
      dataDir: this.config.data.directory,
      config: this.config,
    });

    if (this.options.dev) {
      console.log(chalk.gray("📋 Configuration loaded:"));
      console.log(chalk.gray(JSON.stringify(this.config, null, 2)));
    }
  }

  /**
   * Merge CLI options with configuration
   */
  mergeCliOptions() {
    if (this.options.port) {
      this.config.server.port = this.options.port;
    }
    if (this.options.host) {
      this.config.server.host = this.options.host;
    }
    if (this.options.depth) {
      this.config.directories.scanDepth = this.options.depth;
    }
    if (this.options.interval) {
      this.config.monitoring.updateInterval = this.options.interval;
    }
    if (this.options.exclude) {
      const excludeDirs = this.options.exclude.split(",").map((d) => d.trim());
      this.config.directories.exclude = excludeDirs;
    }
    if (this.options.open === false) {
      this.config.server.autoOpen = false;
    }
  }

  /**
   * Scan for projects
   */
  async scanProjects() {
    if (!this.masterController) {
      throw new Error("Portfolio monitor not initialized. Call initialize() first.");
    }

    return await this.masterController.discoverProjects();
  }

  /**
   * Start the dashboard server
   */
  async startDashboard() {
    if (!this.dashboardServer) {
      throw new Error("Portfolio monitor not initialized. Call initialize() first.");
    }

    // Find available port if specified port is in use
    const port = await this.findAvailablePort(this.config.server.port);
    this.dashboardServer.port = port;

    // Start the server
    await new Promise((resolve, reject) => {
      this.dashboardServer.start();

      this.dashboardServer.server.on("listening", () => {
        resolve();
      });

      this.dashboardServer.server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(error);
        }
      });
    });

    const url = `http://${this.config.server.host}:${port}`;

    // Start monitoring if not dashboard-only mode
    if (!this.options.dashboardOnly) {
      await this.startMonitoring();
    }

    return {
      url,
      port,
      host: this.config.server.host,
    };
  }

  /**
   * Start the monitoring system
   */
  async startMonitoring() {
    if (!this.masterController) {
      throw new Error("Master controller not initialized");
    }

    this.isRunning = true;

    // Initial scan
    await this.masterController.discoverProjects();
    await this.masterController.startMonitoring();

    // Set up periodic updates
    if (this.config.monitoring.updateInterval > 0) {
      this.monitoringInterval = setInterval(async () => {
        if (this.isRunning) {
          try {
            await this.masterController.updateAllProjects();
          } catch (error) {
            if (this.options.dev) {
              console.error(chalk.red("Monitoring update error:"), error);
            }
          }
        }
      }, this.config.monitoring.updateInterval);
    }

    // Graceful shutdown
    const shutdown = async () => {
      console.log(chalk.yellow("\n🛑 Shutting down portfolio monitor..."));
      this.isRunning = false;

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }

      if (this.masterController) {
        await this.masterController.stop();
      }

      if (this.dashboardServer && this.dashboardServer.server) {
        this.dashboardServer.server.close(() => {
          console.log(chalk.green("✅ Portfolio monitor stopped"));
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  /**
   * Get portfolio information
   */
  async getInfo() {
    const projects = await this.scanProjects();
    const gitRepos = projects.filter((p) => p.hasGit);
    const trackdownProjects = projects.filter((p) => p.hasTrackdown);

    return {
      workingDir: this.workingDir,
      projectCount: projects.length,
      gitRepoCount: gitRepos.length,
      trackdownCount: trackdownProjects.length,
      dataDir: this.config?.data?.directory || "Unknown",
      lastScan: new Date().toISOString(),
      projects: projects.map((p) => ({
        name: p.name,
        type: p.type,
        health: p.health,
        hasGit: p.hasGit,
        hasTrackdown: p.hasTrackdown,
      })),
    };
  }

  /**
   * Find an available port starting from the specified port
   */
  async findAvailablePort(startPort) {
    const net = require("net");

    const isPortAvailable = (port) => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.once("close", () => resolve(true));
          server.close();
        });
        server.on("error", () => resolve(false));
      });
    };

    for (let port = startPort; port < startPort + 100; port++) {
      if (await isPortAvailable(port)) {
        return port;
      }
    }

    throw new Error(`No available ports found in range ${startPort}-${startPort + 99}`);
  }

  /**
   * Stop monitoring
   */
  async stop() {
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.masterController) {
      await this.masterController.stop();
    }
  }
}

module.exports = PortfolioMonitor;
