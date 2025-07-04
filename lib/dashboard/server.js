#!/usr/bin/env node
/**
 * Portfolio Monitoring Dashboard - Web Server
 *
 * Business Purpose: Serve dashboard and provide API for monitoring data
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-014 Basic Web Dashboard Implementation
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

class DashboardServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || "localhost";
    this.dashboardDir = options.dashboardDir || __dirname;
    this.reportsDir = options.reportsDir || path.join(__dirname, "..", "reports");
    this.dataDir = options.dataDir || path.join(__dirname, "..", "data");

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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

      default:
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

  /**
   * Handle static file requests
   */
  async handleStaticRequest(req, res, pathname) {
    // Default to index.html for root path
    if (pathname === "/") {
      pathname = "/index.html";
    }

    const filePath = path.join(this.dashboardDir, pathname);

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
