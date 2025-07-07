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

// Import enhanced error handling utilities
const { ErrorHandler, ApplicationError } = require("../lib/utils/error-handler");
const { createProjectLogger } = require("../lib/utils/logger");

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

export interface PortInfo {
  port: number;
  wasChanged: boolean;
  offset?: number;
}

export interface PortUser {
  pid: string;
  process: string;
}

export class PortfolioMonitor {
  private workingDir: string;
  private options: PortfolioMonitorOptions;
  private config: PortfolioConfig | null = null;
  private masterController: any = null; // Will be typed when migrated
  private dashboardServer: any = null; // Will be typed when migrated
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  private logger: any;
  private errorHandler: any;

  constructor(options: PortfolioMonitorOptions = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.options = options;
    
    // Initialize enhanced error handling and logging
    this.logger = createProjectLogger('PortfolioMonitor', {
      level: options.dev ? 'debug' : 'info',
      enableFile: true
    });
    this.errorHandler = new ErrorHandler(this.logger);

    this.logger.info('Portfolio Monitor initialized', {
      workingDir: this.workingDir,
      options: this.options
    });
  }

  /**
   * Initialize the portfolio monitor
   */
  async initialize(): Promise<void> {
    return this.errorHandler.safeExecute(async () => {
      await this.logger.info('Initializing Portfolio Monitor');

      // Check dependencies
      await this.checkDependencies();

      // Load configuration
      const configLoader = new ConfigLoader({ workingDir: this.workingDir });
      this.config = await configLoader.loadConfig(this.options.config);

      if (!this.config) {
        throw new ApplicationError(
          "Failed to load configuration",
          'CONFIG_LOAD_FAILED',
          500,
          { workingDir: this.workingDir, configPath: this.options.config }
        );
      }

      // Override config with CLI options
      this.mergeCliOptions();

      // Ensure data directory exists with enhanced error handling
      await this.errorHandler.safeFileOperation(
        () => fs.ensureDir(this.config!.data.directory),
        this.config.data.directory,
        'ensure_directory'
      );

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
        masterController: this.masterController,
      };
      this.dashboardServer = new DashboardServer(dashboardOptions);

      if (this.options.dev) {
        await this.logger.debug('Configuration loaded', {
          config: this.config
        });
      }

      await this.logger.info('Portfolio Monitor initialization completed');
    }, {
      operation: 'initialize_portfolio_monitor',
      maxRetries: 1,
      fallback: async () => {
        await this.logger.error('Initialization failed, attempting minimal initialization');
        await this.initializeMinimal();
      }
    });
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
   * Check system dependencies
   */
  private async checkDependencies(): Promise<void> {
    const dependencies = [
      { name: 'git', type: 'command' },
      { name: 'node', type: 'command' },
      { name: 'fs-extra', type: 'module' },
      { name: 'chalk', type: 'module' }
    ];

    const depCheck = await this.errorHandler.checkDependencies(dependencies);
    
    if (!depCheck.allAvailable) {
      await this.logger.warn('Some dependencies are missing', {
        missing: depCheck.missing.map((d: any) => d.name),
        available: depCheck.available
      });

      // Check for critical dependencies
      const criticalMissing = depCheck.missing.filter((d: any) => 
        ['git', 'node'].includes(d.name)
      );

      if (criticalMissing.length > 0) {
        throw new ApplicationError(
          `Critical dependencies missing: ${criticalMissing.map((d: any) => d.name).join(', ')}`,
          'MISSING_DEPENDENCIES',
          500,
          { missing: criticalMissing }
        );
      }
    } else {
      await this.logger.debug('All dependencies are available');
    }
  }

  /**
   * Initialize minimal configuration for fallback
   */
  private async initializeMinimal(): Promise<void> {
    await this.logger.warn('Initializing in minimal mode due to configuration errors');
    
    const configLoader = new ConfigLoader({ workingDir: this.workingDir });
    this.config = configLoader.getMinimalConfig();
    
    // Ensure basic data directory
    if (this.config?.data?.directory) {
      await fs.ensureDir(this.config.data.directory);
      
      await this.logger.info('Minimal initialization completed', {
        dataDir: this.config.data.directory,
        mode: 'minimal'
      });
    }
  }

  /**
   * Scan for projects
   */
  async scanProjects(): Promise<ProjectScanData[]> {
    return this.errorHandler.safeExecute(async () => {
      if (!this.masterController) {
        throw new ApplicationError(
          "Portfolio monitor not initialized. Call initialize() first.",
          'NOT_INITIALIZED',
          500
        );
      }

      await this.logger.debug('Scanning for projects');
      const projects = await this.masterController.discoverProjects();
      
      await this.logger.info('Project scan completed', {
        projectCount: projects.length
      });

      return projects;
    }, {
      operation: 'scan_projects',
      maxRetries: 2,
      fallback: async () => {
        await this.logger.warn('Falling back to empty project list due to scan errors');
        return [];
      }
    });
  }

  /**
   * Start the dashboard server
   */
  async startDashboard(): Promise<ServerInfo & { portChanged?: boolean; originalPort?: number }> {
    if (!this.dashboardServer || !this.config) {
      throw new Error("Portfolio monitor not initialized. Call initialize() first.");
    }

    // Check for port conflicts and find available port
    const portInfo = await this.findAvailablePortWithAlert(this.config.server.port);
    this.dashboardServer.port = portInfo.port;

    // Start the server with enhanced error handling
    await new Promise<void>((resolve, reject) => {
      this.dashboardServer.start();

      this.dashboardServer.server.on("listening", () => {
        if (portInfo.wasChanged) {
          console.log(chalk.green(`✅ Dashboard started on alternate port: ${portInfo.port}`));
        } else {
          console.log(chalk.green(`✅ Dashboard started on configured port: ${portInfo.port}`));
        }
        resolve();
      });

      this.dashboardServer.server.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          console.error(chalk.red(`❌ Port conflict: ${portInfo.port} is already in use`));
          console.error(chalk.yellow(`💡 Try stopping other services or use a different port`));
          reject(new Error(`Port ${portInfo.port} is already in use after detection`));
        } else if (error.code === "EACCES") {
          console.error(chalk.red(`❌ Permission denied: Cannot bind to port ${portInfo.port}`));
          console.error(chalk.yellow(`💡 Try using a port > 1024 or run with elevated privileges`));
          reject(new Error(`Permission denied for port ${portInfo.port}`));
        } else {
          console.error(chalk.red(`❌ Server error: ${error.message}`));
          reject(error);
        }
      });
    });

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
   * Find an available port with user alerts and conflict detection
   */
  private async findAvailablePortWithAlert(requestedPort: number): Promise<PortInfo> {
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

    const getPortUser = async (port: number): Promise<PortUser | null> => {
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