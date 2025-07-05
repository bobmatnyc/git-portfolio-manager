/**
 * Portfolio Monitor - Main Class
 *
 * Orchestrates project portfolio monitoring with Git analytics,
 * TrackDown integration, and business intelligence dashboard.
 */

const path = require("node:path");
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
      masterController: this.masterController,
      projectsBasePath: this.config.directories?.include?.[0] || this.workingDir,
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

    // Check for port conflicts and find available port
    const portInfo = await this.findAvailablePortWithAlert(this.config.server.port);
    this.dashboardServer.port = portInfo.port;

    // Start the server with enhanced error handling
    try {
      await this.dashboardServer.start();
      if (portInfo.wasChanged) {
        console.log(chalk.green(`✅ Dashboard started on alternate port: ${portInfo.port}`));
      } else {
        console.log(chalk.green(`✅ Dashboard started on configured port: ${portInfo.port}`));
      }
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        console.error(chalk.red(`❌ Port conflict: ${portInfo.port} is already in use`));
        console.error(chalk.yellow(`💡 Try stopping other services or use a different port`));
        throw new Error(`Port ${portInfo.port} is already in use after detection`);
      } else if (error.code === "EACCES") {
        console.error(chalk.red(`❌ Permission denied: Cannot bind to port ${portInfo.port}`));
        console.error(chalk.yellow(`💡 Try using a port > 1024 or run with elevated privileges`));
        throw new Error(`Permission denied for port ${portInfo.port}`);
      } else {
        console.error(chalk.red(`❌ Server error: ${error.message}`));
        throw error;
      }
    }

    const url = `http://${this.config.server.host}:${portInfo.port}`;

    // Start monitoring if not dashboard-only mode
    if (!this.options.dashboardOnly) {
      await this.startMonitoring();
    }

    return {
      url,
      port: portInfo.port,
      host: this.config.server.host,
      portChanged: portInfo.wasChanged,
      originalPort: this.config.server.port,
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

    // Start the master controller (which handles discovery and monitoring)
    await this.masterController.start();

    // Set up periodic updates
    if (this.config.monitoring.updateInterval > 0) {
      this.monitoringInterval = setInterval(async () => {
        if (this.isRunning) {
          try {
            // Re-discover projects periodically
            await this.masterController.discoverProjects();
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

      if (this.dashboardServer?.server) {
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
   * Find an available port with user alerts and conflict detection
   */
  async findAvailablePortWithAlert(requestedPort) {
    const net = require("node:net");

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

    const getPortUser = async (port) => {
      try {
        const { execSync } = require("child_process");
        const result = execSync(`lsof -ti:${port}`, { encoding: "utf8", stdio: "pipe" });
        const pid = result.trim();
        if (pid) {
          const processInfo = execSync(`ps -p ${pid} -o comm=`, { encoding: "utf8", stdio: "pipe" });
          return { pid, process: processInfo.trim() };
        }
      } catch (error) {
        // lsof might not be available or port might not be in use
      }
      return null;
    };

    // Check if requested port is available - double check to avoid race conditions
    if (await isPortAvailable(requestedPort)) {
      // Double-check with lsof to ensure no race condition
      const portUser = await getPortUser(requestedPort);
      if (!portUser) {
        console.log(chalk.blue(`🔍 Port ${requestedPort} is available and ready`));
        return { port: requestedPort, wasChanged: false };
      } else {
        console.log(chalk.yellow(`⚠️  Port ${requestedPort} became unavailable (race condition detected)`));
        console.log(chalk.yellow(`   Currently used by: ${portUser.process} (PID: ${portUser.pid})`));
      }
    }

    // Port is in use, get details about what's using it
    const portUser = await getPortUser(requestedPort);
    if (portUser) {
      console.log(chalk.yellow(`⚠️  Port conflict detected!`));
      console.log(chalk.yellow(`   Requested port: ${requestedPort}`));
      console.log(chalk.yellow(`   Currently used by: ${portUser.process} (PID: ${portUser.pid})`));
      console.log(chalk.blue(`🔍 Searching for alternative port...`));
    } else {
      console.log(chalk.yellow(`⚠️  Port ${requestedPort} is in use, searching for alternative...`));
    }

    // Find next available port
    const maxPortsToCheck = 100;
    for (let offset = 1; offset <= maxPortsToCheck; offset++) {
      const testPort = requestedPort + offset;
      
      // Skip well-known ports and stay within valid range
      if (testPort > 65535) break;
      if (testPort < 1024 && requestedPort >= 1024) continue;

      if (await isPortAvailable(testPort)) {
        console.log(chalk.green(`✅ Found available port: ${testPort} (offset +${offset})`));
        
        // Alert user about port change
        if (offset <= 10) {
          console.log(chalk.blue(`💡 Dashboard will start on port ${testPort} instead of ${requestedPort}`));
        } else {
          console.log(chalk.yellow(`⚠️  Had to use port ${testPort} - consider configuring a different base port`));
        }

        return { port: testPort, wasChanged: true, offset };
      }
    }

    // No available port found
    console.error(chalk.red(`❌ No available ports found in range ${requestedPort}-${requestedPort + maxPortsToCheck}`));
    console.error(chalk.yellow(`💡 Suggestions:`));
    console.error(chalk.yellow(`   1. Stop other services using ports in this range`));
    console.error(chalk.yellow(`   2. Configure a different port in your config file`));
    console.error(chalk.yellow(`   3. Use --port option to specify a different port`));
    
    if (portUser) {
      console.error(chalk.yellow(`   4. Stop the conflicting process: kill ${portUser.pid}`));
    }

    throw new Error(`No available ports found in range ${requestedPort}-${requestedPort + maxPortsToCheck}`);
  }

  /**
   * Legacy method for backward compatibility
   */
  async findAvailablePort(startPort) {
    const result = await this.findAvailablePortWithAlert(startPort);
    return result.port;
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
