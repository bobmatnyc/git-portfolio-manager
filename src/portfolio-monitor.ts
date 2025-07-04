/**
 * Portfolio Monitor - Main Class
 *
 * Orchestrates project portfolio monitoring with Git analytics,
 * TrackDown integration, and business intelligence dashboard.
 */

import * as path from "path";
import * as fs from "fs-extra";
import * as net from "net";
import chalk from "chalk";
import {
  PortfolioConfig,
  CLIOptions,
  MasterControllerOptions,
  DashboardServerOptions,
  ServerInfo,
  ProjectScanData,
} from "./types";

// Import JavaScript classes until they're migrated
const ConfigLoader = require("../lib/config/config-loader");
const MasterController = require("../lib/monitor/master-controller");
const DashboardServer = require("../lib/dashboard/server");

export interface PortfolioMonitorOptions extends CLIOptions {
  workingDir?: string;
  config?: string;
}

export interface PortfolioInfo {
  workingDir: string;
  projectCount: number;
  gitRepoCount: number;
  trackdownCount: number;
  dataDir: string;
  lastScan: string;
  projects: Array<{
    name: string;
    type: string;
    health: string;
    hasGit: boolean;
    hasTrackdown: boolean;
  }>;
}

export class PortfolioMonitor {
  private workingDir: string;
  private options: PortfolioMonitorOptions;
  private config: PortfolioConfig | null = null;
  private masterController: any = null; // Will be typed when migrated
  private dashboardServer: any = null; // Will be typed when migrated
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(options: PortfolioMonitorOptions = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.options = options;
  }

  /**
   * Initialize the portfolio monitor
   */
  async initialize(): Promise<void> {
    // Load configuration
    const configLoader = new ConfigLoader({ workingDir: this.workingDir });
    this.config = await configLoader.loadConfig(this.options.config);

    if (!this.config) {
      throw new Error("Failed to load configuration");
    }

    // Override config with CLI options
    this.mergeCliOptions();

    // Ensure data directory exists
    await fs.ensureDir(this.config.data.directory);

    // Initialize monitoring system
    const masterControllerOptions: MasterControllerOptions = {
      workingDir: this.workingDir,
      dataDir: this.config.data.directory,
      config: this.config,
    };
    this.masterController = new MasterController(masterControllerOptions);

    // Initialize dashboard server
    const dashboardOptions: DashboardServerOptions = {
      port: this.config.server.port,
      host: this.config.server.host,
      dashboardDir: path.join(__dirname, "..", "lib", "dashboard", "static"),
      dataDir: this.config.data.directory,
      config: this.config,
    };
    this.dashboardServer = new DashboardServer(dashboardOptions);

    if (this.options.dev) {
      console.log(chalk.gray("📋 Configuration loaded:"));
      console.log(chalk.gray(JSON.stringify(this.config, null, 2)));
    }
  }

  /**
   * Merge CLI options with configuration
   */
  private mergeCliOptions(): void {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }

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
  async scanProjects(): Promise<ProjectScanData[]> {
    if (!this.masterController) {
      throw new Error("Portfolio monitor not initialized. Call initialize() first.");
    }

    return await this.masterController.discoverProjects();
  }

  /**
   * Start the dashboard server
   */
  async startDashboard(): Promise<ServerInfo> {
    if (!this.dashboardServer || !this.config) {
      throw new Error("Portfolio monitor not initialized. Call initialize() first.");
    }

    // Find available port if specified port is in use
    const port = await this.findAvailablePort(this.config.server.port);
    this.dashboardServer.port = port;

    // Start the server
    await new Promise<void>((resolve, reject) => {
      this.dashboardServer.start();

      this.dashboardServer.server.on("listening", () => {
        resolve();
      });

      this.dashboardServer.server.on("error", (error: any) => {
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
  async startMonitoring(): Promise<void> {
    if (!this.masterController || !this.config) {
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
    const shutdown = async (): Promise<void> => {
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
  async getInfo(): Promise<PortfolioInfo> {
    const projects = await this.scanProjects();
    const gitRepos = projects.filter((p) => p.git !== undefined);
    const trackdownProjects = projects.filter((p) => p.trackdown?.hasTrackDown);

    return {
      workingDir: this.workingDir,
      projectCount: projects.length,
      gitRepoCount: gitRepos.length,
      trackdownCount: trackdownProjects.length,
      dataDir: this.config?.data?.directory || "Unknown",
      lastScan: new Date().toISOString(),
      projects: projects.map((p) => ({
        name: p.project,
        type: p.fileSystem?.projectType || "unknown",
        health: p.health?.status || "unknown",
        hasGit: p.git !== undefined,
        hasTrackdown: p.trackdown?.hasTrackDown || false,
      })),
    };
  }

  /**
   * Find an available port starting from the specified port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    const isPortAvailable = (port: number): Promise<boolean> => {
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
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.masterController) {
      await this.masterController.stop();
    }
  }

  // Getter methods for accessing internal state
  get currentConfig(): PortfolioConfig | null {
    return this.config;
  }

  get running(): boolean {
    return this.isRunning;
  }

  get workingDirectory(): string {
    return this.workingDir;
  }
}