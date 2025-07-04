/**
 * Portfolio Monitoring System - Master Controller
 *
 * Business Purpose: Central coordinator for portfolio-wide project monitoring
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-010 Master Controller Implementation
 */

import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import {
  PortfolioConfig,
  MasterControllerOptions,
  ProjectScanData,
  Priority,
  ProjectType,
  HealthStatus,
  LogLevel,
} from "../types";

// Import JavaScript class until migrated
const ProjectMonitor = require("../../lib/monitor/project-monitor");

interface ProjectInfo {
  name: string;
  path: string;
  type: ProjectType;
  priority: Priority;
  hasGit: boolean;
  hasPackageJson: boolean;
  hasPyprojectToml: boolean;
  hasTrackdown: boolean;
  lastScan: string | null;
  health: HealthStatus;
  monitor: any | null; // Will be typed when ProjectMonitor is migrated
}

interface HealthStatusSummary {
  healthy: number;
  attention: number;
  critical: number;
  unknown: number;
}

interface ExecutiveSummary {
  timestamp: string;
  totalProjects: number;
  activeMonitors: number;
  healthStatus: HealthStatusSummary;
  topAlerts: string;
  activitySummary: string;
}

interface MasterControllerConfig {
  projectsRoot: string;
  scanInterval: number;
  maxProcesses: number;
  healthCheckInterval: number;
  reportGenerationInterval: number;
  logLevel: LogLevel;
  outputDir: string;
  dataDir: string;
  directories: any;
  monitoring: any;
}

export class PortfolioMasterController extends EventEmitter {
  private workingDir: string;
  private dataDir: string;
  private fullConfig: PortfolioConfig;
  private config: MasterControllerConfig;
  private projectMonitors = new Map<string, any>();
  private projectRegistry = new Map<string, ProjectInfo>();
  private isRunning = false;
  private scanTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reportTimer: NodeJS.Timeout | null = null;

  constructor(options: MasterControllerOptions = { workingDir: process.cwd(), dataDir: "", config: {} as PortfolioConfig }) {
    super();

    // Extract modern config structure or use legacy format
    this.workingDir = options.workingDir || process.cwd();
    this.dataDir = options.dataDir || path.join(this.workingDir, "data");
    this.fullConfig = options.config || ({} as PortfolioConfig);

    this.config = {
      projectsRoot: this.workingDir,
      scanInterval: this.fullConfig.monitoring?.updateInterval || 5 * 60 * 1000,
      maxProcesses: this.fullConfig.monitoring?.maxConcurrentScans || 20,
      healthCheckInterval: 60 * 1000, // 1 minute
      reportGenerationInterval: 30 * 60 * 1000, // 30 minutes
      logLevel: this.fullConfig.logging?.level || "info",
      outputDir: path.join(this.dataDir, "reports"),
      dataDir: this.dataDir,
      // New configuration options
      directories: this.fullConfig.directories || {},
      monitoring: this.fullConfig.monitoring || {},
    };

    this.log("Master Controller initialized", "info");
  }

  /**
   * Start the master controller and begin monitoring
   */
  async start(): Promise<void> {
    this.log("🚀 Starting Portfolio Monitoring System", "info");

    try {
      // Discover all projects in portfolio
      await this.discoverProjects();

      // Start monitoring processes for each project
      await this.startProjectMonitors();

      // Begin periodic scans and health checks
      this.startPeriodicTasks();

      this.isRunning = true;
      this.log("✅ Master Controller started successfully", "info");
      this.log(`📊 Monitoring ${this.projectRegistry.size} projects`, "info");
    } catch (error) {
      this.log(`❌ Failed to start Master Controller: ${(error as Error).message}`, "error");
      throw error;
    }
  }

  /**
   * Discover all software projects in the portfolio
   */
  async discoverProjects(): Promise<ProjectScanData[]> {
    this.log("🔍 Discovering projects in portfolio...", "info");

    const directories = this.config.directories;

    // Clear existing projects
    this.projectRegistry.clear();

    // Scan specified directories
    if (directories.include && directories.include.length > 0) {
      // Use specific include paths
      for (const includePath of directories.include) {
        if (fs.existsSync(includePath) && fs.statSync(includePath).isDirectory()) {
          const projectName = path.basename(includePath);
          const project = await this.analyzeProject(includePath, projectName);

          if (project) {
            this.projectRegistry.set(projectName, project);
            this.log(`📁 Registered project: ${projectName} (${project.type})`, "debug");
          }
        }
      }
    } else if (directories.scanCurrent) {
      // Fallback to scanning current directory
      const projectsRoot = this.config.projectsRoot;
      const entries = fs.readdirSync(projectsRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const projectPath = path.join(projectsRoot, entry.name);
          const project = await this.analyzeProject(projectPath, entry.name);

          if (project) {
            this.projectRegistry.set(entry.name, project);
            this.log(`📁 Registered project: ${entry.name} (${project.type})`, "debug");
          }
        }
      }
    }

    this.log(`📋 Discovered ${this.projectRegistry.size} projects`, "info");
    
    // Convert to ProjectScanData format for return value
    const projectScanData: ProjectScanData[] = Array.from(this.projectRegistry.values()).map(project => ({
      timestamp: new Date().toISOString(),
      project: project.name,
      path: project.path,
      priority: project.priority,
      fileSystem: {
        totalFiles: 0, // Will be populated by actual scan
        projectType: project.type,
        hasTests: false, // Will be determined by scan
        hasDocumentation: false, // Will be determined by scan
        configFiles: [], // Will be populated by scan
      },
      health: {
        status: project.health,
        score: project.health === "healthy" ? 100 : project.health === "attention" ? 60 : 20,
        factors: {
          recentActivity: 0,
          codeQuality: 0,
          documentation: 0,
          testing: 0,
          maintenance: 0,
        },
        issues: [],
        recommendations: [],
      },
    }));

    return projectScanData;
  }

  /**
   * Analyze individual project to determine monitoring requirements
   */
  private async analyzeProject(projectPath: string, projectName: string): Promise<ProjectInfo | null> {
    try {
      // Check if project has .no-monitor file (opt-out)
      if (fs.existsSync(path.join(projectPath, ".no-monitor"))) {
        this.log(`⏭️ Skipping ${projectName} (opted out)`, "debug");
        return null;
      }

      // Determine project type and business value
      const hasGit = fs.existsSync(path.join(projectPath, ".git"));
      const hasPackageJson = fs.existsSync(path.join(projectPath, "package.json"));
      const hasPyprojectToml = fs.existsSync(path.join(projectPath, "pyproject.toml"));
      const hasTrackdown = fs.existsSync(path.join(projectPath, "trackdown"));

      // Determine business priority based on directory structure
      const businessPriority = this.determinePriority(projectName, projectPath);
      const projectType = this.determineProjectType(projectName, hasPackageJson, hasPyprojectToml);

      return {
        name: projectName,
        path: projectPath,
        type: projectType,
        priority: businessPriority,
        hasGit,
        hasPackageJson,
        hasPyprojectToml,
        hasTrackdown,
        lastScan: null,
        health: "unknown",
        monitor: null,
      };
    } catch (error) {
      this.log(`⚠️ Error analyzing ${projectName}: ${(error as Error).message}`, "warn");
      return null;
    }
  }

  /**
   * Determine business priority based on project categorization
   */
  private determinePriority(projectName: string, projectPath: string): Priority {
    // Revenue-generating projects (highest priority)
    if (
      ["ai-power-rankings", "matsuoka-com", "scraper-engine"].includes(projectName) ||
      projectPath.includes("/Clients/")
    ) {
      return "HIGH";
    }

    // Strategic development projects
    if (["eva-agent", "eva-monorepo", "hot-flash", "ai-code-review"].includes(projectName)) {
      return "MEDIUM";
    }

    // Infrastructure and support projects
    if (
      projectPath.includes("/docs/") ||
      projectPath.includes("/Github/") ||
      projectPath.includes("/_archive/")
    ) {
      return "LOW";
    }

    return "MEDIUM"; // Default priority
  }

  /**
   * Determine project type based on technical indicators
   */
  private determineProjectType(projectName: string, hasPackageJson: boolean, hasPyprojectToml: boolean): ProjectType {
    if (hasPackageJson) return "nodejs";
    if (hasPyprojectToml) return "python";
    if (projectName.includes("web") || projectName.includes("site")) return "web";
    return "general";
  }

  /**
   * Start individual project monitors
   */
  private async startProjectMonitors(): Promise<void> {
    this.log("🔧 Starting individual project monitors...", "info");

    let startedCount = 0;

    for (const [projectName, project] of this.projectRegistry) {
      try {
        if (startedCount >= this.config.maxProcesses) {
          this.log(`⚠️ Reached max processes limit (${this.config.maxProcesses})`, "warn");
          break;
        }

        await this.startProjectMonitor(projectName, project);
        startedCount++;

        // Small delay to prevent overwhelming the system
        await this.sleep(100);
      } catch (error) {
        this.log(`❌ Failed to start monitor for ${projectName}: ${(error as Error).message}`, "error");
      }
    }

    this.log(`✅ Started ${startedCount} project monitors`, "info");
  }

  /**
   * Start monitoring process for individual project
   */
  private async startProjectMonitor(projectName: string, project: ProjectInfo): Promise<any> {
    try {
      const monitor = new ProjectMonitor({
        project: projectName,
        path: project.path,
        priority: project.priority,
        type: project.type,
        config: this.fullConfig,
      });

      // Start the monitor
      await monitor.start();

      // Store reference
      this.projectMonitors.set(projectName, monitor);
      project.monitor = monitor;

      this.log(`✅ Started monitor for ${projectName}`, "info");
      return monitor;
    } catch (error) {
      this.log(`❌ Failed to start monitor for ${projectName}: ${(error as Error).message}`, "error");
      throw error;
    }
  }




  /**
   * Start periodic tasks (health checks, reports)
   */
  private startPeriodicTasks(): void {
    // Health check timer
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Report generation timer
    this.reportTimer = setInterval(() => {
      this.generateReports();
    }, this.config.reportGenerationInterval);

    this.log("⏰ Started periodic tasks", "debug");
  }

  /**
   * Perform health check on all project monitors
   */
  private performHealthCheck(): void {
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const [projectName, monitor] of this.projectMonitors) {
      if (monitor && !monitor.killed) {
        if (typeof monitor.send === "function") {
          monitor.send({ type: "health_check", timestamp: Date.now() });
        }
        healthyCount++;
      } else {
        unhealthyCount++;
        this.log(`⚠️ Unhealthy monitor detected: ${projectName}`, "warn");
        this.restartProjectMonitor(projectName);
      }
    }

    this.log(`💓 Health check: ${healthyCount} healthy, ${unhealthyCount} unhealthy`, "debug");
  }

  /**
   * Generate consolidated reports
   */
  private async generateReports(): Promise<void> {
    this.log("📄 Generating portfolio reports...", "info");

    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }

      // Generate executive summary
      await this.generateExecutiveSummary();

      // Generate individual project reports
      await this.generateProjectReports();

      this.log("✅ Reports generated successfully", "info");
    } catch (error) {
      this.log(`❌ Report generation failed: ${(error as Error).message}`, "error");
    }
  }

  /**
   * Generate executive summary report
   */
  private async generateExecutiveSummary(): Promise<void> {
    const summary: ExecutiveSummary = {
      timestamp: new Date().toISOString(),
      totalProjects: this.projectRegistry.size,
      activeMonitors: this.projectMonitors.size,
      healthStatus: this.getPortfolioHealth(),
      topAlerts: await this.getTopAlerts(),
      activitySummary: await this.getActivitySummary(),
    };

    const reportPath = path.join(this.config.outputDir, "executive-summary.json");
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    // Also generate markdown version
    const markdownReport = this.generateExecutiveMarkdown(summary);
    const markdownPath = path.join(this.config.outputDir, "executive-summary.md");
    fs.writeFileSync(markdownPath, markdownReport);
  }

  /**
   * Generate individual project reports
   */
  private async generateProjectReports(): Promise<void> {
    // Implementation for individual project reports
    // This would generate detailed reports for each project
    this.log("Individual project reports generation not yet implemented", "debug");
  }

  /**
   * Get top alerts from recent data
   */
  private async getTopAlerts(): Promise<string> {
    // Implementation would read recent alert files and summarize
    return "No critical alerts";
  }

  /**
   * Get activity summary from recent data
   */
  private async getActivitySummary(): Promise<string> {
    // Implementation would read recent activity files and summarize
    return "Activity data being collected...";
  }

  /**
   * Get portfolio health overview
   */
  private getPortfolioHealth(): HealthStatusSummary {
    const health: HealthStatusSummary = { healthy: 0, attention: 0, critical: 0, unknown: 0 };

    for (const project of this.projectRegistry.values()) {
      switch (project.health) {
        case "healthy":
          health.healthy++;
          break;
        case "attention":
          health.attention++;
          break;
        case "critical":
          health.critical++;
          break;
        default:
          health.unknown++;
          break;
      }
    }

    return health;
  }

  /**
   * Generate executive summary markdown
   */
  private generateExecutiveMarkdown(summary: ExecutiveSummary): string {
    const { healthy, attention, critical, unknown } = summary.healthStatus;

    return `# Portfolio Executive Summary
**Generated**: ${summary.timestamp}
**Portfolio Health**: ${this.calculateHealthScore(summary.healthStatus)}/100

## Executive Dashboard
| Status | Count | Percentage |
|--------|-------|------------|
| 🟢 Healthy Projects | ${healthy} | ${Math.round((healthy / summary.totalProjects) * 100)}% |
| 🟡 Need Attention | ${attention} | ${Math.round((attention / summary.totalProjects) * 100)}% |
| 🔴 Critical Issues | ${critical} | ${Math.round((critical / summary.totalProjects) * 100)}% |
| ⚪ Unknown Status | ${unknown} | ${Math.round((unknown / summary.totalProjects) * 100)}% |

## Key Metrics
- **Total Projects Monitored**: ${summary.totalProjects}
- **Active Monitoring Processes**: ${summary.activeMonitors}
- **System Health**: ${summary.activeMonitors === summary.totalProjects ? "🟢 All systems operational" : "🟡 Some monitors offline"}

## Recent Activity Summary
${summary.activitySummary || "Activity data being collected..."}

## Top Alerts
${summary.topAlerts || "No critical alerts"}

---
*Generated by Portfolio Monitoring System - Master Controller*
*Next update: ${new Date(Date.now() + 30 * 60 * 1000).toLocaleString()}*
`;
  }

  /**
   * Calculate overall portfolio health score
   */
  private calculateHealthScore(healthStatus: HealthStatusSummary): number {
    const total =
      healthStatus.healthy + healthStatus.attention + healthStatus.critical + healthStatus.unknown;
    if (total === 0) return 0;

    const score =
      (healthStatus.healthy * 100 + healthStatus.attention * 60 + healthStatus.critical * 20) /
      total;
    return Math.round(score);
  }

  /**
   * Restart a project monitor
   */
  private async restartProjectMonitor(projectName: string): Promise<void> {
    const project = this.projectRegistry.get(projectName);
    if (!project) return;

    // Kill existing monitor
    const existingMonitor = this.projectMonitors.get(projectName);
    if (existingMonitor && !existingMonitor.killed) {
      if (typeof existingMonitor.kill === "function") {
        existingMonitor.kill();
      }
    }

    // Remove from monitors map
    this.projectMonitors.delete(projectName);

    // Wait a moment
    await this.sleep(1000);

    // Restart monitor
    try {
      await this.startProjectMonitor(projectName, project);
      this.log(`🔄 Restarted monitor for ${projectName}`, "info");
    } catch (error) {
      this.log(`❌ Failed to restart monitor for ${projectName}: ${(error as Error).message}`, "error");
    }
  }

  /**
   * Gracefully stop the master controller
   */
  async stop(): Promise<void> {
    this.log("🛑 Stopping Portfolio Monitoring System...", "info");

    this.isRunning = false;

    // Clear timers
    if (this.scanTimer) clearInterval(this.scanTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.reportTimer) clearInterval(this.reportTimer);

    // Stop all project monitors
    for (const [projectName, monitor] of this.projectMonitors) {
      if (monitor && typeof monitor.stop === "function") {
        try {
          await monitor.stop();
        } catch (error) {
          this.log(`Error stopping monitor for ${projectName}: ${(error as Error).message}`, "error");
        }
      }
    }

    this.projectMonitors.clear();

    this.log("✅ Master Controller stopped", "info");
  }


  /**
   * Utility functions
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(message: string, level: LogLevel = "info"): void {
    const timestamp = new Date().toISOString();
    const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = logLevels[this.config.logLevel] || 2;
    const messageLevel = logLevels[level] || 2;

    if (messageLevel <= currentLevel) {
      const prefix =
        level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "debug" ? "🔍" : "ℹ️";
      console.log(`${timestamp} ${prefix} [MASTER] ${message}`);
    }
  }

  // Getter methods for accessing internal state
  get projects(): Map<string, ProjectInfo> {
    return new Map(this.projectRegistry);
  }

  get monitors(): Map<string, any> {
    return new Map(this.projectMonitors);
  }

  get running(): boolean {
    return this.isRunning;
  }

  get configuration(): MasterControllerConfig {
    return { ...this.config };
  }
}