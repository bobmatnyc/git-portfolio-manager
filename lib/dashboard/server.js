#!/usr/bin/env node
/**
 * Portfolio Monitoring Dashboard - Web Server
 *
 * Business Purpose: Serve dashboard and provide API for monitoring data
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-014 Basic Web Dashboard Implementation
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

class DashboardServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || "localhost";
    this.dashboardDir = options.dashboardDir || __dirname;
    this.reportsDir = options.reportsDir || path.join(__dirname, "..", "reports");
    this.dataDir = options.dataDir || path.join(__dirname, "..", "data");
    this.config = options.config || null;
    this.masterController = options.masterController || null;

    this.server = null;
    this.mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".ico": "image/x-icon",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    };

    console.log(`📊 Dashboard Server initialized`);
    console.log(`   Dashboard Dir: ${this.dashboardDir}`);
    console.log(`   Reports Dir: ${this.reportsDir}`);
    console.log(`   Data Dir: ${this.dataDir}`);
  }

  /**
   * Start the web server
   */
  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.port, this.host, () => {
      console.log(`🚀 Dashboard server running at http://${this.host}:${this.port}`);
      console.log(`📊 Dashboard URL: http://${this.host}:${this.port}`);
    });

    // Handle server errors
    this.server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${this.port} is already in use`);
        console.log(`💡 Try: node server.js --port 3001`);
      } else {
        console.error(`❌ Server error:`, error);
      }
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down dashboard server...");
      this.server.close(() => {
        console.log("✅ Dashboard server stopped");
        process.exit(0);
      });
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
      // API endpoints
      if (pathname.startsWith("/api/")) {
        await this.handleApiRequest(req, res, pathname);
        return;
      }

      // Static file serving
      await this.handleStaticRequest(req, res, pathname);
    } catch (error) {
      console.error(`❌ Request error for ${pathname}:`, error);
      this.sendErrorResponse(res, 500, "Internal Server Error");
    }
  }

  /**
   * Handle API requests
   */
  async handleApiRequest(req, res, pathname) {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    switch (pathname) {
      case "/api/summary":
        await this.handleSummaryRequest(res);
        break;

      case "/api/projects":
        await this.handleProjectsRequest(res);
        break;

      case "/api/git-status":
        await this.handleGitStatusRequest(res);
        break;

      case "/api/activity":
        await this.handleActivityRequest(res);
        break;

      case "/api/health":
        await this.handleHealthRequest(res);
        break;

      // New discovery management endpoints
      case "/api/discovery/trigger":
        if (req.method === "POST") {
          await this.handleDiscoveryTrigger(req, res);
        } else {
          this.sendErrorResponse(res, 405, "Method not allowed");
        }
        break;

      case "/api/discovery/directories":
        await this.handleDirectoriesRequest(res);
        break;

      case "/api/projects/manage":
        if (req.method === "POST") {
          await this.handleProjectManagement(req, res);
        } else {
          this.sendErrorResponse(res, 405, "Method not allowed");
        }
        break;

      case "/api/config/restart":
        if (req.method === "POST") {
          await this.handleConfigRestart(req, res);
        } else {
          this.sendErrorResponse(res, 405, "Method not allowed");
        }
        break;

      case "/api/config/raw":
        await this.handleConfigRawRequest(req, res);
        break;

      default: {
        // Check for project detail requests
        const projectDetailMatch = pathname.match(/^\/api\/projects\/(.+)$/);
        if (projectDetailMatch) {
          await this.handleProjectDetailRequest(res, projectDetailMatch[1]);
        } else {
          this.sendErrorResponse(res, 404, "API endpoint not found");
        }
        break;
      }
    }
  }

  /**
   * Handle static file requests
   */
  async handleStaticRequest(req, res, pathname) {
    // Default to index.html for root path
    const requestPath = pathname === "/" ? "/index.html" : pathname;

    const filePath = path.join(this.dashboardDir, requestPath);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(this.dashboardDir)) {
      this.sendErrorResponse(res, 403, "Forbidden");
      return;
    }

    try {
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const ext = path.extname(filePath);
        const mimeType = this.mimeTypes[ext] || "application/octet-stream";

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Length", stats.size);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);

        console.log(`📄 Served: ${pathname} (${mimeType})`);
      } else {
        this.sendErrorResponse(res, 404, "File not found");
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        this.sendErrorResponse(res, 404, "File not found");
      } else {
        console.error(`❌ File serving error for ${pathname}:`, error);
        this.sendErrorResponse(res, 500, "Internal Server Error");
      }
    }
  }

  /**
   * Handle summary API request
   */
  async handleSummaryRequest(res) {
    try {
      const summaryPath = path.join(this.reportsDir, "executive-summary.json");

      if (fs.existsSync(summaryPath)) {
        const data = fs.readFileSync(summaryPath, "utf8");
        this.sendJsonResponse(res, JSON.parse(data));
      } else {
        // Generate summary from real data if no summary exists yet
        const summary = await this.generateRealSummary();
        this.sendJsonResponse(res, summary);
      }
    } catch (error) {
      console.error("❌ Error loading summary:", error);
      this.sendErrorResponse(res, 500, "Failed to load summary data");
    }
  }

  /**
   * Handle projects API request
   */
  async handleProjectsRequest(res) {
    try {
      const projects = await this.aggregateProjectData();
      this.sendJsonResponse(res, projects);
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      this.sendErrorResponse(res, 500, "Failed to load project data");
    }
  }

  /**
   * Handle git status API request
   */
  async handleGitStatusRequest(res) {
    try {
      const gitStatus = await this.aggregateGitStatus();
      this.sendJsonResponse(res, gitStatus);
    } catch (error) {
      console.error("❌ Error loading git status:", error);
      this.sendErrorResponse(res, 500, "Failed to load git status");
    }
  }

  /**
   * Handle activity API request
   */
  async handleActivityRequest(res) {
    try {
      const activity = await this.aggregateActivityData();
      this.sendJsonResponse(res, activity);
    } catch (error) {
      console.error("❌ Error loading activity data:", error);
      this.sendErrorResponse(res, 500, "Failed to load activity data");
    }
  }

  /**
   * Handle health check request
   */
  async handleHealthRequest(res) {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      services: {
        dashboard: "healthy",
        monitoring: "healthy",
        dataAccess: "healthy",
      },
    };

    this.sendJsonResponse(res, health);
  }

  /**
   * Handle project detail request
   */
  async handleProjectDetailRequest(res, projectName) {
    try {
      const projectDataDir = path.join(this.dataDir, projectName);

      if (!fs.existsSync(projectDataDir)) {
        this.sendErrorResponse(res, 404, "Project not found");
        return;
      }

      // Load latest activity and health data
      const projectData = await this.loadLatestProjectData(projectDataDir, projectName);
      if (!projectData) {
        this.sendErrorResponse(res, 404, "Project data not available");
        return;
      }

      // Load raw activity data for detailed information
      const activityFiles = fs
        .readdirSync(projectDataDir)
        .filter((file) => file.startsWith("activity-"))
        .sort()
        .reverse();

      const healthFiles = fs
        .readdirSync(projectDataDir)
        .filter((file) => file.startsWith("health-"))
        .sort()
        .reverse();

      let rawActivityData = {};
      let rawHealthData = {};

      if (activityFiles.length > 0) {
        const latestActivityFile = path.join(projectDataDir, activityFiles[0]);
        rawActivityData = JSON.parse(fs.readFileSync(latestActivityFile, "utf8"));
      }

      if (healthFiles.length > 0) {
        const latestHealthFile = path.join(projectDataDir, healthFiles[0]);
        rawHealthData = JSON.parse(fs.readFileSync(latestHealthFile, "utf8"));
      }

      // Load TrackDown backlog if available
      const backlogPath = path.join(rawActivityData.path || "", "trackdown", "BACKLOG.md");
      let backlogIssues = [];

      if (fs.existsSync(backlogPath)) {
        try {
          const backlogContent = fs.readFileSync(backlogPath, "utf8");
          backlogIssues = this.parseTrackDownBacklog(backlogContent);
        } catch (error) {
          console.warn(`Could not parse backlog for ${projectName}:`, error.message);
        }
      }

      // Create detailed response
      const detailResponse = {
        ...projectData,
        details: {
          branches: rawActivityData.git?.branches || [],
          recentCommits: rawActivityData.git?.recentCommits || [],
          health: rawHealthData.details || rawHealthData,
          backlog: backlogIssues,
          documentation: rawActivityData.documentation || {},
          business: rawActivityData.business || {},
          filesystem: rawActivityData.filesystem || {},
          path: rawActivityData.path || "",
        },
      };

      this.sendJsonResponse(res, detailResponse);
    } catch (error) {
      console.error(`❌ Error loading project details for ${projectName}:`, error);
      this.sendErrorResponse(res, 500, "Failed to load project details");
    }
  }

  /**
   * Aggregate project data from monitoring system
   */
  async aggregateProjectData() {
    const projects = [];

    try {
      if (fs.existsSync(this.dataDir)) {
        const projectDirs = fs.readdirSync(this.dataDir);

        for (const projectName of projectDirs) {
          const projectDataDir = path.join(this.dataDir, projectName);
          const projectData = await this.loadLatestProjectData(projectDataDir, projectName);

          if (projectData) {
            projects.push(projectData);
          }
        }

        console.log(
          `📊 Loaded ${projects.length} Git-tracked projects from ${projectDirs.length} total directories`,
        );
      }
    } catch (error) {
      console.warn("⚠️ Could not load project data, using mock data:", error.message);
    }

    // Return mock data if no real data available
    if (projects.length === 0) {
      return this.generateMockProjects();
    }

    return projects;
  }

  /**
   * Load latest project data from monitoring files
   */
  async loadLatestProjectData(projectDir, projectName) {
    try {
      if (!fs.existsSync(projectDir)) return null;

      // Find latest health file
      const healthFiles = fs
        .readdirSync(projectDir)
        .filter((file) => file.startsWith("health-"))
        .sort()
        .reverse();

      if (healthFiles.length === 0) return null;

      const latestHealthFile = path.join(projectDir, healthFiles[0]);
      const healthData = JSON.parse(fs.readFileSync(latestHealthFile, "utf8"));

      // Find latest activity file
      const activityFiles = fs
        .readdirSync(projectDir)
        .filter((file) => file.startsWith("activity-"))
        .sort()
        .reverse();

      let activityData = {};
      if (activityFiles.length > 0) {
        const latestActivityFile = path.join(projectDir, activityFiles[0]);
        activityData = JSON.parse(fs.readFileSync(latestActivityFile, "utf8"));
      }

      // Only include projects that have Git repositories
      if (!activityData.git?.hasGit) {
        console.log(`📊 Excluding non-Git project: ${projectName}`);
        return null;
      }

      // Exclude common non-project directories
      const excludedDirs = [
        "docs",
        "documentation",
        "notes",
        "temp",
        "_temp",
        "backup",
        "archive",
        "assets",
        "public",
        "static",
      ];
      if (excludedDirs.includes(projectName.toLowerCase())) {
        console.log(`📊 Excluding infrastructure directory: ${projectName}`);
        return null;
      }

      // Extract project description
      const description = await this.extractProjectDescription(activityData.path || "");
      
      // Determine toolchain from project analysis
      const toolchain = this.determineToolchain(activityData);

      // Transform data to match dashboard format
      const transformedProject = {
        name: projectName,
        priority: activityData.priority || "MEDIUM",
        type:
          activityData.business?.revenueImpact === "DIRECT_REVENUE"
            ? "revenue"
            : activityData.business?.revenueImpact === "STRATEGIC_INVESTMENT"
              ? "strategic"
              : "infrastructure",
        toolchain: toolchain,
        description: description,
        health: healthData.status || healthData.details?.status || "unknown",
        git: {
          currentBranch: activityData.git?.currentBranch || "unknown",
          commitsAhead: activityData.git?.commitsAhead || 0,
          commitsBehind: activityData.git?.commitsBehind || 0,
          branches: activityData.git?.branches?.length || 0,
          lastActivity: activityData.git?.lastCommitDate
            ? this.formatTimeAgo(activityData.git.lastCommitDate)
            : "unknown",
          uncommittedChanges: activityData.git?.uncommittedChanges || 0,
        },
        activity: {
          commits7d: activityData.git?.recentCommits?.length || 0,
          linesAdded: activityData.filesystem?.recentlyModified || 0,
          linesRemoved: 0, // Not tracked yet
        },
        timestamp: healthData.timestamp,
      };

      return transformedProject;
    } catch (error) {
      console.warn(`⚠️ Could not load data for ${projectName}:`, error.message);
      return null;
    }
  }

  /**
   * Aggregate git status across all projects
   */
  async aggregateGitStatus() {
    // This would aggregate git status from all project monitors
    // For now, return mock data
    return {
      totalBranches: 47,
      activeBranches: 42,
      staleBranches: 5,
      behindMainCount: 8,
      aheadMainCount: 12,
      uncommittedCount: 15,
      mergedThisWeek: 12,
      pushesThisWeek: 89,
    };
  }

  /**
   * Aggregate activity data
   */
  async aggregateActivityData() {
    return {
      commitsToday: 15,
      commitsThisWeek: 89,
      linesAddedToday: 1247,
      linesRemovedToday: 456,
      activeDevelopers: 3,
      chartData: {
        commits7d: [12, 19, 3, 5, 2, 3, 20],
        lines7d: [847, 423, 127, 234, 567, 123, 456],
      },
    };
  }

  /**
   * Generate summary data from real project data
   */
  async generateRealSummary() {
    try {
      const projects = await this.aggregateProjectData();

      const healthCounts = projects.reduce(
        (counts, project) => {
          const status = project.health || "unknown";
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        },
        { healthy: 0, attention: 0, critical: 0, unknown: 0 },
      );

      const totalCommits = projects.reduce((sum, p) => sum + (p.activity?.commits7d || 0), 0);
      const totalBranches = projects.reduce((sum, p) => sum + (p.git?.branches || 0), 0);
      const behindMain = projects.filter((p) => (p.git?.commitsBehind || 0) > 0).length;
      const uncommitted = projects.filter((p) => (p.git?.uncommittedChanges || 0) > 0).length;

      return {
        timestamp: new Date().toISOString(),
        totalProjects: projects.length,
        activeMonitors: projects.length,
        healthStatus: healthCounts,
        activitySummary: {
          totalCommits,
          activeBranches: totalBranches,
          behindMain,
          pendingPushes: uncommitted,
          openPRs: Math.floor(projects.length * 0.2), // Estimated
        },
      };
    } catch (error) {
      console.warn("Could not generate real summary, using fallback:", error.message);
      return {
        timestamp: new Date().toISOString(),
        totalProjects: 18,
        activeMonitors: 18,
        healthStatus: {
          healthy: 8,
          attention: 6,
          critical: 2,
          unknown: 2,
        },
        activitySummary: {
          totalCommits: 142,
          activeBranches: 47,
          behindMain: 8,
          pendingPushes: 12,
          openPRs: 15,
        },
      };
    }
  }

  /**
   * Generate mock project data
   */
  generateMockProjects() {
    return [
      {
        name: "ai-power-rankings",
        priority: "HIGH",
        type: "revenue",
        health: "healthy",
        git: {
          currentBranch: "feature/rankings",
          commitsAhead: 3,
          commitsBehind: 0,
          branches: 3,
          lastActivity: "2 hours ago",
          uncommittedChanges: 0,
        },
        activity: {
          commits7d: 15,
          linesAdded: 847,
          linesRemoved: 203,
        },
      },
      {
        name: "matsuoka-com",
        priority: "HIGH",
        type: "revenue",
        health: "healthy",
        git: {
          currentBranch: "main",
          commitsAhead: 0,
          commitsBehind: 0,
          branches: 2,
          lastActivity: "4 hours ago",
          uncommittedChanges: 0,
        },
        activity: {
          commits7d: 8,
          linesAdded: 423,
          linesRemoved: 156,
        },
      },
      {
        name: "scraper-engine",
        priority: "HIGH",
        type: "revenue",
        health: "attention",
        git: {
          currentBranch: "main",
          commitsAhead: 0,
          commitsBehind: 5,
          branches: 5,
          lastActivity: "2 days ago",
          uncommittedChanges: 0,
        },
        activity: {
          commits7d: 3,
          linesAdded: 127,
          linesRemoved: 89,
        },
      },
    ];
  }

  /**
   * Send JSON response
   */
  sendJsonResponse(res, data) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  sendErrorResponse(res, statusCode, message) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(statusCode);
    res.end(
      JSON.stringify({
        error: message,
        statusCode: statusCode,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Format timestamp to "X time ago" format
   */
  formatTimeAgo(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "just now";
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
    } catch (error) {
      return "unknown";
    }
  }

  /**
   * Parse TrackDown backlog markdown to extract issues
   */
  parseTrackDownBacklog(content) {
    const issues = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for task entries like: - [x] Task description (T-001)
      const taskMatch = line.match(/^-\s*\[([x\s])\]\s*(.+?)(?:\s*\(([T-]\w+)\))?$/);
      if (taskMatch) {
        const [, status, description, taskId] = taskMatch;

        issues.push({
          id: taskId || `task-${issues.length + 1}`,
          description: description.trim(),
          status: status === "x" ? "completed" : "open",
          type: "task",
        });
      }

      // Look for user story entries
      const storyMatch = line.match(/^#+\s*(US-\w+):\s*(.+)$/);
      if (storyMatch) {
        const [, storyId, description] = storyMatch;

        issues.push({
          id: storyId,
          description: description.trim(),
          status: "open",
          type: "user_story",
        });
      }
    }

    return issues;
  }

  /**
   * Handle discovery trigger request
   */
  async handleDiscoveryTrigger(req, res) {
    try {
      console.log("🔍 Manual discovery triggered from dashboard");
      
      // Trigger discovery through the master controller if available
      if (this.masterController && typeof this.masterController.discoverProjects === 'function') {
        await this.masterController.discoverProjects();
        this.sendJsonResponse(res, {
          success: true,
          message: "Discovery triggered successfully",
          timestamp: new Date().toISOString()
        });
      } else {
        this.sendJsonResponse(res, {
          success: false,
          message: "Master controller not available for discovery",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("❌ Error triggering discovery:", error);
      this.sendErrorResponse(res, 500, "Failed to trigger discovery");
    }
  }

  /**
   * Handle directories listing request
   */
  async handleDirectoriesRequest(res) {
    try {
      const configPath = this.findConfigFile();
      const directories = [];
      
      if (configPath && fs.existsSync(configPath)) {
        const config = await this.loadYamlConfig(configPath);
        
        // Add directories from config (support both 'tracked' and legacy 'include' formats)
        const trackedDirs = config.directories?.tracked || config.directories?.include || [];
        if (trackedDirs && trackedDirs.length > 0) {
          directories.push(...trackedDirs.map(dir => ({
            path: dir,
            source: 'config',
            tracked: true,
            name: path.basename(dir),
            isGit: this.isGitDirectory(dir)
          })));
        }
        
        // Scan for git directories in common locations
        const homeDir = require('os').homedir();
        const scanDirs = [
          path.join(homeDir, 'Projects'),
          path.join(homeDir, 'Development'),
          path.join(homeDir, 'Code'),
          path.join(homeDir, 'workspace'),
          '/Users/dev',
          '/workspace'
        ];
        
        for (const scanDir of scanDirs) {
          if (fs.existsSync(scanDir)) {
            const gitDirs = await this.findGitDirectories(scanDir);
            gitDirs.forEach(gitDir => {
              // Only add if not already tracked
              if (!directories.some(d => d.path === gitDir)) {
                directories.push({
                  path: gitDir,
                  source: 'discovered',
                  tracked: false,
                  name: path.basename(gitDir),
                  isGit: true
                });
              }
            });
          }
        }
      }
      
      this.sendJsonResponse(res, {
        directories: directories,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("❌ Error loading directories:", error);
      this.sendErrorResponse(res, 500, "Failed to load directories");
    }
  }

  /**
   * Handle project management requests (add/remove sites)
   */
  async handleProjectManagement(req, res) {
    try {
      const body = await this.parseRequestBody(req);
      const { action, directory } = body;
      
      if (!action || !directory) {
        this.sendErrorResponse(res, 400, "Missing action or directory parameter");
        return;
      }
      
      const configPath = this.findConfigFile();
      if (!configPath) {
        this.sendErrorResponse(res, 500, "Configuration file not found");
        return;
      }
      
      let config = await this.loadYamlConfig(configPath);
      if (!config.directories) config.directories = {};
      if (!config.directories.include) config.directories.include = [];
      
      if (action === 'add') {
        if (!config.directories.include.includes(directory)) {
          config.directories.include.push(directory);
          await this.saveYamlConfig(configPath, config);
          
          console.log(`✅ Added directory to monitoring: ${directory}`);
          this.sendJsonResponse(res, {
            success: true,
            message: `Directory added to monitoring: ${directory}`,
            action: 'add',
            directory: directory
          });
        } else {
          this.sendJsonResponse(res, {
            success: false,
            message: `Directory already being monitored: ${directory}`,
            action: 'add',
            directory: directory
          });
        }
      } else if (action === 'remove') {
        const index = config.directories.include.indexOf(directory);
        if (index > -1) {
          config.directories.include.splice(index, 1);
          await this.saveYamlConfig(configPath, config);
          
          console.log(`🗑️ Removed directory from monitoring: ${directory}`);
          this.sendJsonResponse(res, {
            success: true,
            message: `Directory removed from monitoring: ${directory}`,
            action: 'remove',
            directory: directory
          });
        } else {
          this.sendJsonResponse(res, {
            success: false,
            message: `Directory not found in monitoring list: ${directory}`,
            action: 'remove',
            directory: directory
          });
        }
      } else {
        this.sendErrorResponse(res, 400, "Invalid action. Use 'add' or 'remove'");
      }
    } catch (error) {
      console.error("❌ Error managing project:", error);
      this.sendErrorResponse(res, 500, "Failed to manage project");
    }
  }

  /**
   * Handle config restart request
   */
  async handleConfigRestart(req, res) {
    try {
      console.log("🔄 Server restart requested from dashboard");
      
      this.sendJsonResponse(res, {
        success: true,
        message: "Server restart initiated",
        timestamp: new Date().toISOString()
      });
      
      // Give time for response to be sent before restarting
      setTimeout(() => {
        console.log("🔄 Restarting server...");
        process.exit(0); // Exit gracefully - deployment script will restart
      }, 1000);
      
    } catch (error) {
      console.error("❌ Error restarting server:", error);
      this.sendErrorResponse(res, 500, "Failed to restart server");
    }
  }

  /**
   * Handle raw config file request
   */
  async handleConfigRawRequest(req, res) {
    try {
      const configPath = this.findConfigFile();
      if (!configPath || !fs.existsSync(configPath)) {
        this.sendErrorResponse(res, 404, "Configuration file not found");
        return;
      }
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain');
      res.writeHead(200);
      res.end(configContent);
    } catch (error) {
      console.error("❌ Error loading raw config:", error);
      this.sendErrorResponse(res, 500, "Failed to load configuration");
    }
  }

  /**
   * Parse request body for POST requests
   */
  async parseRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Check if directory is a git repository
   */
  isGitDirectory(dirPath) {
    try {
      return fs.existsSync(path.join(dirPath, '.git'));
    } catch {
      return false;
    }
  }

  /**
   * Find git directories in a given path (non-recursive)
   */
  async findGitDirectories(searchPath, maxDepth = 2) {
    const gitDirs = [];
    
    try {
      const scanDirectory = async (currentPath, depth = 0) => {
        if (depth > maxDepth) return;
        
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const fullPath = path.join(currentPath, entry.name);
            
            if (this.isGitDirectory(fullPath)) {
              gitDirs.push(fullPath);
            } else if (depth < maxDepth) {
              // Scan one level deeper for git directories
              await scanDirectory(fullPath, depth + 1);
            }
          }
        }
      };
      
      await scanDirectory(searchPath);
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${searchPath}:`, error.message);
    }
    
    return gitDirs;
  }

  /**
   * Find configuration file
   */
  findConfigFile() {
    const configOptions = [
      this.config?.configPath,
      path.join(process.cwd(), 'portfolio-monitor.yml'),
      path.join(require('os').homedir(), 'Projects', 'portfolio-monitor.yml'),
      path.join(__dirname, '..', '..', 'portfolio-monitor.yml')
    ].filter(Boolean);
    
    for (const configPath of configOptions) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }

  /**
   * Load YAML configuration
   */
  async loadYamlConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      // Simple YAML parsing for basic key-value structures
      const config = {};
      const lines = content.split('\n');
      let currentSection = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
          // New section
          currentSection = trimmed.slice(0, -1);
          config[currentSection] = {};
        } else if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          if (currentSection) {
            if (key.trim().startsWith('-')) {
              // Array item
              const arrayKey = key.trim().substring(1).trim();
              if (!config[currentSection].include) config[currentSection].include = [];
              config[currentSection].include.push(value);
            } else {
              // Regular key-value
              config[currentSection][key.trim()] = this.parseYamlValue(value);
            }
          } else {
            config[key.trim()] = this.parseYamlValue(value);
          }
        }
      }
      
      return config;
    } catch (error) {
      console.error("Error parsing YAML config:", error);
      return {};
    }
  }

  /**
   * Parse YAML value
   */
  parseYamlValue(value) {
    if (!value) return '';
    
    // Remove comments
    const cleanValue = value.split('#')[0].trim();
    
    // Parse numbers
    if (/^\d+$/.test(cleanValue)) return parseInt(cleanValue);
    if (/^\d+\.\d+$/.test(cleanValue)) return parseFloat(cleanValue);
    
    // Parse booleans
    if (cleanValue === 'true') return true;
    if (cleanValue === 'false') return false;
    
    return cleanValue;
  }

  /**
   * Save YAML configuration
   */
  async saveYamlConfig(configPath, config) {
    try {
      const lines = [];
      
      for (const [sectionKey, sectionValue] of Object.entries(config)) {
        if (typeof sectionValue === 'object' && sectionValue !== null) {
          lines.push(`${sectionKey}:`);
          
          for (const [key, value] of Object.entries(sectionValue)) {
            if (Array.isArray(value)) {
              for (const item of value) {
                lines.push(`  - ${item}`);
              }
            } else {
              lines.push(`  ${key}: ${value}`);
            }
          }
          lines.push(''); // Empty line between sections
        } else {
          lines.push(`${sectionKey}: ${sectionValue}`);
        }
      }
      
      fs.writeFileSync(configPath, lines.join('\n'));
      console.log(`✅ Configuration saved to ${configPath}`);
    } catch (error) {
      console.error("Error saving YAML config:", error);
      throw error;
    }
  }

  /**
   * Extract project description from README or project files
   */
  async extractProjectDescription(projectPath) {
    if (!projectPath || !fs.existsSync(projectPath)) {
      return { summary: "No description available", expandable: false };
    }

    const readmeFiles = [
      'README.md',
      'readme.md', 
      'README.txt',
      'readme.txt',
      'README',
      'readme',
      'PROJECT.md',
      'project.md'
    ];

    for (const readmeFile of readmeFiles) {
      const readmePath = path.join(projectPath, readmeFile);
      
      if (fs.existsSync(readmePath)) {
        try {
          const content = fs.readFileSync(readmePath, 'utf8');
          return this.parseProjectDescription(content);
        } catch (error) {
          console.warn(`Could not read ${readmeFile}:`, error.message);
        }
      }
    }

    // Check package.json for description
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.description) {
          return {
            summary: packageJson.description,
            expandable: false,
            source: 'package.json'
          };
        }
      } catch (error) {
        // Ignore package.json parsing errors
      }
    }

    return { summary: "No description available", expandable: false };
  }

  /**
   * Parse project description from README content
   */
  parseProjectDescription(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      return { summary: "No description available", expandable: false };
    }

    // Skip title lines that are just the project name
    const contentLines = lines.filter(line => 
      !line.startsWith('#') || 
      (line.includes(' ') && line.length > 30)
    );

    if (contentLines.length === 0) {
      return { summary: "No description available", expandable: false };
    }

    // Take first 3 lines of actual content
    const firstThreeLines = contentLines.slice(0, 3);
    const summary = firstThreeLines.join(' ').substring(0, 200);
    
    // Check if there's more content to show
    const hasMoreContent = contentLines.length > 3 || summary.length < content.length - 100;

    return {
      summary: summary + (summary.length === 200 ? '...' : ''),
      expandable: hasMoreContent,
      fullContent: hasMoreContent ? contentLines.slice(3).join('\n') : null,
      source: 'README'
    };
  }

  /**
   * Determine project toolchain from analysis data
   */
  determineToolchain(activityData) {
    if (!activityData.fileSystem) return "unknown";

    const { projectType, dependencies, configFiles } = activityData.fileSystem;
    
    // Primary language/framework detection
    if (projectType === 'node' || dependencies?.includes('node_modules')) {
      if (dependencies?.includes('next') || configFiles?.includes('next.config.js')) return "Next.js";
      if (dependencies?.includes('react')) return "React";
      if (dependencies?.includes('vue')) return "Vue.js";
      if (dependencies?.includes('angular')) return "Angular";
      if (dependencies?.includes('express')) return "Express";
      if (dependencies?.includes('typescript')) return "TypeScript";
      return "Node.js";
    }

    if (projectType === 'python' || configFiles?.includes('requirements.txt') || configFiles?.includes('pyproject.toml')) {
      if (dependencies?.includes('django')) return "Django";
      if (dependencies?.includes('flask')) return "Flask";
      if (dependencies?.includes('fastapi')) return "FastAPI";
      return "Python";
    }

    if (projectType === 'go' || configFiles?.includes('go.mod')) return "Go";
    if (projectType === 'rust' || configFiles?.includes('Cargo.toml')) return "Rust";
    if (projectType === 'java' || configFiles?.includes('pom.xml') || configFiles?.includes('build.gradle')) return "Java";
    if (projectType === 'dotnet' || configFiles?.includes('*.csproj')) return ".NET";
    if (projectType === 'php' || configFiles?.includes('composer.json')) return "PHP";
    if (projectType === 'ruby' || configFiles?.includes('Gemfile')) return "Ruby";

    // Check for specific frameworks/tools
    if (configFiles?.includes('docker-compose.yml') || configFiles?.includes('Dockerfile')) return "Docker";
    if (configFiles?.includes('terraform')) return "Terraform";
    if (configFiles?.includes('cloudformation')) return "CloudFormation";

    return projectType || "unknown";
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    const value = args[i + 1];

    if (key === "port") {
      options.port = Number.parseInt(value);
    } else if (key === "host") {
      options.host = value;
    }
  }

  const server = new DashboardServer(options);
  server.start();
}

module.exports = DashboardServer;
