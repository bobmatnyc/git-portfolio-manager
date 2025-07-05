#!/usr/bin/env node
/**
 * Portfolio Monitoring System - Master Controller
 *
 * Business Purpose: Central coordinator for portfolio-wide project monitoring
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-010 Master Controller Implementation
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawn, fork } = require("node:child_process");
const EventEmitter = require("node:events");

class PortfolioMasterController extends EventEmitter {
  constructor(options = {}) {
    super();

    // Extract modern config structure or use legacy format
    this.workingDir = options.workingDir || process.cwd();
    this.dataDir = options.dataDir || path.join(this.workingDir, "data");
    this.fullConfig = options.config || {};

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

    this.projectMonitors = new Map();
    this.projectRegistry = new Map();
    this.isRunning = false;
    this.scanTimer = null;
    this.healthCheckTimer = null;
    this.reportTimer = null;

    this.log("Master Controller initialized", "info");
  }

  /**
   * Start the master controller and begin monitoring
   */
  async start() {
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
      this.log(`❌ Failed to start Master Controller: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Discover all software projects in the portfolio
   */
  async discoverProjects() {
    this.log("🔍 Discovering projects in portfolio...", "info");

    const directories = this.config.directories;

    // Clear existing projects
    this.projectRegistry.clear();

    // Scan specified directories (support both new 'tracked' and legacy 'include' formats)
    const trackedDirs = directories.tracked || directories.include || [];
    this.log(`🔍 Debug: directories = ${JSON.stringify(directories)}`, "debug");
    this.log(`🔍 Debug: trackedDirs = ${JSON.stringify(trackedDirs)}`, "debug");
    if (trackedDirs && trackedDirs.length > 0) {
      // Scan each tracked directory for projects inside it
      for (const trackedPath of trackedDirs) {
        if (fs.existsSync(trackedPath) && fs.statSync(trackedPath).isDirectory()) {
          this.log(`🔍 Scanning tracked directory: ${trackedPath}`, "debug");
          
          // Read all subdirectories in this tracked path
          const entries = fs.readdirSync(trackedPath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              const projectPath = path.join(trackedPath, entry.name);
              const project = await this.analyzeProject(projectPath, entry.name);

              if (project) {
                this.projectRegistry.set(entry.name, project);
                this.log(`📁 Registered project: ${entry.name} (${project.type})`, "debug");
              }
            }
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
    return Array.from(this.projectRegistry.values());
  }

  /**
   * Analyze individual project to determine monitoring requirements
   */
  async analyzeProject(projectPath, projectName) {
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
      this.log(`⚠️ Error analyzing ${projectName}: ${error.message}`, "warn");
      return null;
    }
  }

  /**
   * Determine business priority based on project categorization
   */
  determinePriority(projectName, projectPath) {
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
  determineProjectType(projectName, hasPackageJson, hasPyprojectToml) {
    if (hasPackageJson) return "nodejs";
    if (hasPyprojectToml) return "python";
    if (projectName.includes("web") || projectName.includes("site")) return "web";
    return "general";
  }

  /**
   * Start individual project monitors
   */
  async startProjectMonitors() {
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
        this.log(`❌ Failed to start monitor for ${projectName}: ${error.message}`, "error");
      }
    }

    this.log(`✅ Started ${startedCount} project monitors`, "info");
  }

  /**
   * Start monitoring process for individual project
   */
  async startProjectMonitor(projectName, project) {
    // Use direct instantiation instead of forking for better integration
    const ProjectMonitor = require("./project-monitor");

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
      this.log(`❌ Failed to start monitor for ${projectName}: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Handle messages from project monitor subprocesses
   */
  handleMonitorMessage(projectName, message) {
    const { type, data, timestamp } = message;

    switch (type) {
      case "health_update":
        this.updateProjectHealth(projectName, data);
        break;

      case "activity_report":
        this.processActivityReport(projectName, data);
        break;

      case "alert":
        this.handleProjectAlert(projectName, data);
        break;

      case "error":
        this.log(`❌ Monitor error from ${projectName}: ${data.message}`, "error");
        break;

      default:
        this.log(`🔍 Unknown message type from ${projectName}: ${type}`, "debug");
    }
  }

  /**
   * Update project health status
   */
  updateProjectHealth(projectName, healthData) {
    const project = this.projectRegistry.get(projectName);
    if (project) {
      project.health = healthData.status;
      project.lastScan = healthData.timestamp;

      // Save health data to file
      this.saveProjectData(projectName, "health", healthData);

      this.log(`📊 Health update for ${projectName}: ${healthData.status}`, "debug");
    }
  }

  /**
   * Process activity report from project monitor
   */
  processActivityReport(projectName, activityData) {
    // Save activity data
    this.saveProjectData(projectName, "activity", activityData);

    // Emit event for real-time updates
    this.emit("activity_update", { project: projectName, data: activityData });

    this.log(
      `📈 Activity report for ${projectName}: ${activityData.commits || 0} commits`,
      "debug",
    );
  }

  /**
   * Handle alert from project monitor
   */
  handleProjectAlert(projectName, alertData) {
    const { severity, message, details } = alertData;

    this.log(`🚨 ALERT [${severity}] ${projectName}: ${message}`, "warn");

    // Save alert data
    this.saveProjectData(projectName, "alerts", {
      ...alertData,
      timestamp: new Date().toISOString(),
    });

    // Emit alert event
    this.emit("project_alert", { project: projectName, alert: alertData });

    // Send immediate notification for critical alerts
    if (severity === "CRITICAL") {
      this.sendCriticalAlert(projectName, alertData);
    }
  }

  /**
   * Save project data to file system
   */
  saveProjectData(projectName, dataType, data) {
    try {
      const dataDir = path.join(this.config.dataDir, projectName);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filename = `${dataType}-${Date.now()}.json`;
      const filepath = path.join(dataDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.log(`❌ Failed to save data for ${projectName}: ${error.message}`, "error");
    }
  }

  /**
   * Start periodic tasks (health checks, reports)
   */
  startPeriodicTasks() {
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
  performHealthCheck() {
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const [projectName, monitor] of this.projectMonitors) {
      if (monitor && typeof monitor === 'object' && !monitor.killed) {
        // Direct instantiation - check if monitor has a health check method
        if (typeof monitor.performHealthCheck === 'function') {
          try {
            monitor.performHealthCheck();
          } catch (error) {
            this.log(`⚠️ Health check failed for ${projectName}: ${error.message}`, "warn");
          }
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
  async generateReports() {
    this.log("📄 Generating portfolio reports...", "info");

    try {
      // Generate executive summary
      await this.generateExecutiveSummary();

      // Generate individual project reports
      await this.generateProjectReports();

      this.log("✅ Reports generated successfully", "info");
    } catch (error) {
      this.log(`❌ Report generation failed: ${error.message}`, "error");
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary() {
    const summary = {
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
   * Get portfolio health overview
   */
  getPortfolioHealth() {
    const health = { healthy: 0, attention: 0, critical: 0, unknown: 0 };

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
  generateExecutiveMarkdown(summary) {
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
  calculateHealthScore(healthStatus) {
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
  async restartProjectMonitor(projectName) {
    const project = this.projectRegistry.get(projectName);
    if (!project) return;

    // Kill existing monitor
    const existingMonitor = this.projectMonitors.get(projectName);
    if (existingMonitor && !existingMonitor.killed) {
      existingMonitor.kill();
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
      this.log(`❌ Failed to restart monitor for ${projectName}: ${error.message}`, "error");
    }
  }

  /**
   * Gracefully stop the master controller
   */
  async stop() {
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
          this.log(`Error stopping monitor for ${projectName}: ${error.message}`, "error");
        }
      }
    }

    this.projectMonitors.clear();

    this.log("✅ Master Controller stopped", "info");
  }

  /**
   * Send critical alert notification
   */
  sendCriticalAlert(projectName, alertData) {
    // In a real implementation, this would send email/Slack/etc
    console.log(`\n🚨 CRITICAL ALERT 🚨`);
    console.log(`Project: ${projectName}`);
    console.log(`Issue: ${alertData.message}`);
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log(`Details: ${JSON.stringify(alertData.details, null, 2)}\n`);
  }

  /**
   * Utility functions
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  log(message, level = "info") {
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
}

// CLI interface for starting the master controller
if (require.main === module) {
  const controller = new PortfolioMasterController();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received SIGINT, shutting down gracefully...");
    await controller.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
    await controller.stop();
    process.exit(0);
  });

  // Start the master controller
  controller.start().catch((error) => {
    console.error("❌ Failed to start master controller:", error);
    process.exit(1);
  });
}

module.exports = PortfolioMasterController;
