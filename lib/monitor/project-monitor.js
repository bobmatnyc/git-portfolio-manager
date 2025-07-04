#!/usr/bin/env node
/**
 * Portfolio Monitoring System - Individual Project Monitor
 *
 * Business Purpose: Monitor individual project Git activity and health
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-011 Individual Project Monitor Subprocesses
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const GitHubClient = require("../github/github-client");

const execAsync = promisify(exec);

class ProjectMonitor {
  constructor(options) {
    this.projectName = options.project;
    this.projectPath = options.path;
    this.priority = options.priority || "MEDIUM";
    this.projectType = options.type || "general";
    this.config = options.config || {};

    this.scanInterval = this.getScanInterval();
    this.isRunning = false;
    this.scanTimer = null;

    this.lastScanData = {};
    this.healthStatus = "unknown";

    // Initialize GitHub client if enabled
    this.githubClient = null;
    this.githubRepo = null;
    if (this.config.monitoring?.enableGitHubIssues && this.config.github) {
      this.githubClient = new GitHubClient(this.config.github);
    }

    this.log(`Project monitor initialized for ${this.projectName}`, "info");
  }

  /**
   * Get scan interval based on project priority
   */
  getScanInterval() {
    switch (this.priority) {
      case "HIGH":
        return 2 * 60 * 1000; // 2 minutes for revenue projects
      case "MEDIUM":
        return 5 * 60 * 1000; // 5 minutes for strategic projects
      case "LOW":
        return 15 * 60 * 1000; // 15 minutes for infrastructure
      default:
        return 5 * 60 * 1000;
    }
  }

  /**
   * Start monitoring this project
   */
  async start() {
    this.log(`🚀 Starting monitoring (Priority: ${this.priority})`, "info");

    try {
      // Initial scan
      await this.performScan();

      // Start periodic scanning
      this.scanTimer = setInterval(() => {
        this.performScan().catch((error) => {
          this.log(`❌ Scan error: ${error.message}`, "error");
          this.sendMessage("error", { message: error.message });
        });
      }, this.scanInterval);

      this.isRunning = true;
      this.log("✅ Monitoring started", "info");
    } catch (error) {
      this.log(`❌ Failed to start monitoring: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Perform comprehensive project scan
   */
  async performScan() {
    const scanData = {
      timestamp: new Date().toISOString(),
      project: this.projectName,
      path: this.projectPath,
      priority: this.priority,
    };

    try {
      // Git analysis
      scanData.git = await this.analyzeGitActivity();

      // File system analysis
      scanData.filesystem = await this.analyzeFileSystem();

      // Project health assessment
      scanData.health = this.assessProjectHealth(scanData);

      // Documentation analysis
      scanData.documentation = await this.analyzeDocumentation();

      // GitHub Issues analysis (if enabled)
      if (this.githubClient) {
        scanData.github = await this.analyzeGitHubIssues();
      }

      // Business metrics
      scanData.business = this.calculateBusinessMetrics(scanData);

      // Update health status
      this.healthStatus = scanData.health.status;

      // Send data to master controller
      this.sendMessage("health_update", {
        status: scanData.health.status,
        timestamp: scanData.timestamp,
        details: scanData.health,
      });

      this.sendMessage("activity_report", scanData);

      // Check for alerts
      await this.checkForAlerts(scanData);

      this.lastScanData = scanData;
      this.log(`📊 Scan completed - Health: ${scanData.health.status}`, "debug");
    } catch (error) {
      this.log(`❌ Scan failed: ${error.message}`, "error");
      this.sendMessage("error", { message: error.message });
    }
  }

  /**
   * Analyze Git activity and status
   */
  async analyzeGitActivity() {
    const gitData = {
      hasGit: false,
      currentBranch: null,
      commitsAhead: 0,
      commitsBehind: 0,
      uncommittedChanges: 0,
      branches: [],
      recentCommits: [],
      lastCommitDate: null,
      remoteStatus: "unknown",
    };

    try {
      // Check if Git repository exists
      if (!fs.existsSync(path.join(this.projectPath, ".git"))) {
        return gitData;
      }

      gitData.hasGit = true;

      // Get current branch
      try {
        const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD", {
          cwd: this.projectPath,
        });
        gitData.currentBranch = branch.trim();
      } catch (error) {
        this.log(`⚠️ Could not get current branch: ${error.message}`, "warn");
      }

      // Get commits ahead/behind main
      await this.getCommitStatus(gitData);

      // Get uncommitted changes
      try {
        const { stdout: status } = await execAsync("git status --porcelain", {
          cwd: this.projectPath,
        });
        gitData.uncommittedChanges = status
          .trim()
          .split("\n")
          .filter((line) => line.trim()).length;
      } catch (error) {
        this.log(`⚠️ Could not get git status: ${error.message}`, "warn");
      }

      // Get all branches
      await this.getBranches(gitData);

      // Get recent commits (last 7 days)
      await this.getRecentCommits(gitData);

      // Check remote synchronization status
      await this.checkRemoteStatus(gitData);
    } catch (error) {
      this.log(`⚠️ Git analysis error: ${error.message}`, "warn");
    }

    return gitData;
  }

  /**
   * Get commits ahead/behind main branch
   */
  async getCommitStatus(gitData) {
    try {
      // First, try to fetch latest from remote
      try {
        await execAsync("git fetch origin --quiet", { cwd: this.projectPath });
      } catch (fetchError) {
        this.log(`⚠️ Could not fetch from remote: ${fetchError.message}`, "debug");
      }

      // Determine main branch name (main or master)
      let mainBranch = "main";
      try {
        await execAsync("git rev-parse --verify origin/main", { cwd: this.projectPath });
      } catch (error) {
        try {
          await execAsync("git rev-parse --verify origin/master", { cwd: this.projectPath });
          mainBranch = "master";
        } catch (masterError) {
          this.log(`⚠️ Could not find main/master branch`, "warn");
          return;
        }
      }

      // Commits ahead of main
      try {
        const { stdout: ahead } = await execAsync(
          `git rev-list --count HEAD ^origin/${mainBranch}`,
          { cwd: this.projectPath },
        );
        gitData.commitsAhead = Number.parseInt(ahead.trim()) || 0;
      } catch (error) {
        this.log(`⚠️ Could not get commits ahead: ${error.message}`, "debug");
      }

      // Commits behind main
      try {
        const { stdout: behind } = await execAsync(
          `git rev-list --count origin/${mainBranch} ^HEAD`,
          { cwd: this.projectPath },
        );
        gitData.commitsBehind = Number.parseInt(behind.trim()) || 0;
      } catch (error) {
        this.log(`⚠️ Could not get commits behind: ${error.message}`, "debug");
      }
    } catch (error) {
      this.log(`⚠️ Error getting commit status: ${error.message}`, "warn");
    }
  }

  /**
   * Get all branches with last activity
   */
  async getBranches(gitData) {
    try {
      const { stdout: branchData } = await execAsync(
        `git for-each-ref --format='%(refname:short)|%(committerdate:iso8601)|%(authorname)' refs/heads/`,
        { cwd: this.projectPath },
      );

      gitData.branches = branchData
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [name, date, author] = line.split("|");
          return {
            name: name,
            lastCommit: date,
            lastAuthor: author,
            daysSinceActivity: this.calculateDaysSince(date),
          };
        })
        .sort((a, b) => new Date(b.lastCommit) - new Date(a.lastCommit));
    } catch (error) {
      this.log(`⚠️ Error getting branches: ${error.message}`, "warn");
    }
  }

  /**
   * Get recent commits (last 7 days)
   */
  async getRecentCommits(gitData) {
    try {
      const { stdout: commitData } = await execAsync(
        `git log --since="7 days ago" --pretty=format:"%H|%an|%ad|%s" --date=iso`,
        { cwd: this.projectPath },
      );

      if (commitData.trim()) {
        gitData.recentCommits = commitData
          .trim()
          .split("\n")
          .map((line) => {
            const [hash, author, date, message] = line.split("|");
            return { hash, author, date, message };
          });

        // Set last commit date
        if (gitData.recentCommits.length > 0) {
          gitData.lastCommitDate = gitData.recentCommits[0].date;
        }
      }
    } catch (error) {
      this.log(`⚠️ Error getting recent commits: ${error.message}`, "warn");
    }
  }

  /**
   * Check remote synchronization status
   */
  async checkRemoteStatus(gitData) {
    try {
      // Check if there are unpushed commits
      const { stdout: unpushed } = await execAsync(
        'git log @{u}.. --oneline 2>/dev/null || echo ""',
        { cwd: this.projectPath },
      );

      if (unpushed.trim()) {
        gitData.remoteStatus = "needs_push";
      } else if (gitData.commitsBehind > 0) {
        gitData.remoteStatus = "needs_pull";
      } else if (gitData.uncommittedChanges > 0) {
        gitData.remoteStatus = "uncommitted_changes";
      } else {
        gitData.remoteStatus = "up_to_date";
      }
    } catch (error) {
      this.log(`⚠️ Error checking remote status: ${error.message}`, "debug");
      gitData.remoteStatus = "unknown";
    }
  }

  /**
   * Analyze file system for project activity
   */
  async analyzeFileSystem() {
    const fsData = {
      totalFiles: 0,
      recentlyModified: 0,
      hasPackageJson: false,
      hasPyprojectToml: false,
      hasTrackdown: false,
      hasClaude: false,
      lastModified: null,
    };

    try {
      // Check for key files
      fsData.hasPackageJson = fs.existsSync(path.join(this.projectPath, "package.json"));
      fsData.hasPyprojectToml = fs.existsSync(path.join(this.projectPath, "pyproject.toml"));
      fsData.hasTrackdown = fs.existsSync(path.join(this.projectPath, "trackdown"));
      fsData.hasClaude =
        fs.existsSync(path.join(this.projectPath, "CLAUDE.md")) ||
        fs.existsSync(path.join(this.projectPath, "docs", "CLAUDE.md"));

      // Get file modification stats (last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      fsData.recentlyModified = await this.countRecentFiles(this.projectPath, sevenDaysAgo);
    } catch (error) {
      this.log(`⚠️ File system analysis error: ${error.message}`, "warn");
    }

    return fsData;
  }

  /**
   * Count recently modified files
   */
  async countRecentFiles(dir, since, count = 0) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip common directories that don't indicate project activity
        if (entry.isDirectory()) {
          const dirName = entry.name;
          if (
            !dirName.startsWith(".") &&
            !["node_modules", "__pycache__", "dist", "build"].includes(dirName)
          ) {
            count = await this.countRecentFiles(path.join(dir, dirName), since, count);
          }
        } else {
          const filePath = path.join(dir, entry.name);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() > since) {
            count++;
          }
        }
      }
    } catch (error) {
      // Ignore permission errors and continue counting
    }

    return count;
  }

  /**
   * Analyze project documentation
   */
  async analyzeDocumentation() {
    const docData = {
      hasReadme: false,
      hasClaude: false,
      hasTrackdownBacklog: false,
      hasProperStructure: true,
      documentationScore: 0,
    };

    try {
      // Check for README
      docData.hasReadme = fs.existsSync(path.join(this.projectPath, "README.md"));

      // Check for CLAUDE.md in proper location
      docData.hasClaude =
        fs.existsSync(path.join(this.projectPath, "docs", "CLAUDE.md")) ||
        fs.existsSync(path.join(this.projectPath, "CLAUDE.md"));

      // Check for TrackDown structure
      docData.hasTrackdownBacklog = fs.existsSync(
        path.join(this.projectPath, "trackdown", "BACKLOG.md"),
      );

      // Check for proper file organization
      const docsInRoot = fs
        .readdirSync(this.projectPath)
        .filter((file) => file.endsWith(".md") && file !== "README.md").length;

      if (docsInRoot > 0) {
        docData.hasProperStructure = false;
      }

      // Calculate documentation score
      docData.documentationScore = this.calculateDocumentationScore(docData);
    } catch (error) {
      this.log(`⚠️ Documentation analysis error: ${error.message}`, "warn");
    }

    return docData;
  }

  /**
   * Calculate documentation quality score
   */
  calculateDocumentationScore(docData) {
    let score = 0;

    if (docData.hasReadme) score += 30;
    if (docData.hasClaude) score += 25;
    if (docData.hasTrackdownBacklog) score += 25;
    if (docData.hasProperStructure) score += 20;

    return score;
  }

  /**
   * Analyze GitHub Issues (if enabled and repository detected)
   */
  async analyzeGitHubIssues() {
    const githubData = {
      enabled: false,
      connected: false,
      repository: null,
      issues: [],
      totalIssues: 0,
      openIssues: 0,
      closedIssues: 0,
      lastUpdated: null,
      error: null,
    };

    try {
      if (!this.githubClient) {
        return githubData;
      }

      githubData.enabled = true;

      // Detect GitHub repository from Git remote
      await this.detectGitHubRepository();

      if (!this.githubRepo) {
        githubData.error = "No GitHub repository detected";
        return githubData;
      }

      githubData.repository = this.githubRepo;

      // Check repository accessibility
      const repoCheck = await this.githubClient.checkRepository(
        this.githubRepo.owner,
        this.githubRepo.repo,
      );

      if (!repoCheck.accessible) {
        githubData.error = repoCheck.error;
        return githubData;
      }

      githubData.connected = true;

      // Fetch issues
      const issuesResult = await this.githubClient.getAllIssues(
        this.githubRepo.owner,
        this.githubRepo.repo,
        this.config.github?.issuesOptions || {},
      );

      if (issuesResult.success) {
        githubData.issues = issuesResult.issues;
        githubData.totalIssues = issuesResult.totalCount;
        githubData.openIssues = issuesResult.issues.filter((i) => i.state === "open").length;
        githubData.closedIssues = issuesResult.issues.filter((i) => i.state === "closed").length;

        // Find most recently updated issue
        if (githubData.issues.length > 0) {
          const sortedIssues = githubData.issues.sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
          );
          githubData.lastUpdated = sortedIssues[0].updated_at;
        }

        this.log(
          `📋 Found ${githubData.totalIssues} GitHub issues (${githubData.openIssues} open)`,
          "debug",
        );
      } else {
        githubData.error = issuesResult.error;
        this.log(`⚠️ Failed to fetch GitHub issues: ${issuesResult.error}`, "warn");
      }
    } catch (error) {
      githubData.error = error.message;
      this.log(`⚠️ GitHub analysis error: ${error.message}`, "warn");
    }

    return githubData;
  }

  /**
   * Detect GitHub repository from Git remote URLs
   */
  async detectGitHubRepository() {
    if (this.githubRepo) {
      return; // Already detected
    }

    try {
      // Get remote URL
      const { stdout: remoteUrl } = await execAsync("git remote get-url origin", {
        cwd: this.projectPath,
      });

      this.githubRepo = this.githubClient.parseRepositoryFromUrl(remoteUrl.trim());

      if (this.githubRepo) {
        this.log(
          `🔗 Detected GitHub repository: ${this.githubRepo.owner}/${this.githubRepo.repo}`,
          "debug",
        );
      }
    } catch (error) {
      this.log(`⚠️ Could not detect GitHub repository: ${error.message}`, "debug");
    }
  }

  /**
   * Assess overall project health
   */
  assessProjectHealth(scanData) {
    const health = {
      status: "healthy",
      score: 100,
      issues: [],
      recommendations: [],
    };

    // Git-based health checks
    if (scanData.git.hasGit) {
      // Stagnation check
      if (scanData.git.lastCommitDate) {
        const daysSinceCommit = this.calculateDaysSince(scanData.git.lastCommitDate);
        if (daysSinceCommit > 7) {
          health.issues.push(`No commits in ${daysSinceCommit} days`);
          health.score -= 20;
          if (daysSinceCommit > 14) {
            health.status = "critical";
            health.score -= 30;
          } else {
            health.status = "attention";
          }
        }
      }

      // Uncommitted changes check
      if (scanData.git.uncommittedChanges > 5) {
        health.issues.push(`${scanData.git.uncommittedChanges} uncommitted changes`);
        health.score -= 10;
        health.status = health.status === "healthy" ? "attention" : health.status;
      }

      // Behind main branch check
      if (scanData.git.commitsBehind > 5) {
        health.issues.push(`${scanData.git.commitsBehind} commits behind main`);
        health.score -= 15;
        health.status = health.status === "healthy" ? "attention" : health.status;
      }

      // Long-running branches
      const staleBranches = scanData.git.branches.filter((b) => b.daysSinceActivity > 14);
      if (staleBranches.length > 0) {
        health.issues.push(`${staleBranches.length} stale branches (14+ days)`);
        health.score -= 10;
      }
    }

    // Documentation health checks
    if (scanData.documentation && scanData.documentation.documentationScore < 70) {
      health.issues.push("Poor documentation quality");
      health.score -= 15;
      health.status = health.status === "healthy" ? "attention" : health.status;
    }

    if (scanData.documentation && !scanData.documentation.hasProperStructure) {
      health.issues.push("Documentation not in proper /docs/ directory");
      health.score -= 10;
    }

    // File system activity checks
    if (scanData.filesystem.recentlyModified === 0 && scanData.git.recentCommits.length === 0) {
      health.issues.push("No recent file or Git activity");
      health.score -= 25;
      health.status = health.status === "healthy" ? "attention" : health.status;
    }

    // Generate recommendations
    this.generateHealthRecommendations(health, scanData);

    return health;
  }

  /**
   * Generate health improvement recommendations
   */
  generateHealthRecommendations(health, scanData) {
    if (scanData.git.commitsBehind > 0) {
      health.recommendations.push("Consider rebasing or merging from main branch");
    }

    if (scanData.git.uncommittedChanges > 0) {
      health.recommendations.push("Commit or stash uncommitted changes");
    }

    if (scanData.documentation && !scanData.documentation.hasTrackdownBacklog) {
      health.recommendations.push("Implement TrackDown project management structure");
    }

    if (scanData.documentation && !scanData.documentation.hasProperStructure) {
      health.recommendations.push("Move documentation files to /docs/ directory");
    }

    if (scanData.git.branches.length > 5) {
      health.recommendations.push("Consider cleaning up old branches");
    }
  }

  /**
   * Calculate business metrics
   */
  calculateBusinessMetrics(scanData) {
    return {
      priority: this.priority,
      revenueImpact: this.getRevenueImpact(),
      daysSinceActivity: scanData.git.lastCommitDate
        ? this.calculateDaysSince(scanData.git.lastCommitDate)
        : null,
      velocityIndicator: this.calculateVelocity(scanData),
      businessRisk: this.assessBusinessRisk(scanData),
    };
  }

  /**
   * Determine revenue impact category
   */
  getRevenueImpact() {
    const revenueProjects = ["ai-power-rankings", "matsuoka-com", "scraper-engine"];
    if (revenueProjects.includes(this.projectName) || this.projectPath.includes("/Clients/")) {
      return "DIRECT_REVENUE";
    }

    const strategicProjects = ["eva-agent", "eva-monorepo", "ai-code-review"];
    if (strategicProjects.includes(this.projectName)) {
      return "STRATEGIC_INVESTMENT";
    }

    return "COST_SAVINGS";
  }

  /**
   * Calculate velocity indicator
   */
  calculateVelocity(scanData) {
    const recentCommits = scanData.git.recentCommits?.length || 0;
    const recentFiles = scanData.filesystem.recentlyModified || 0;

    if (recentCommits >= 10 || recentFiles >= 20) return "HIGH";
    if (recentCommits >= 5 || recentFiles >= 10) return "MEDIUM";
    if (recentCommits >= 1 || recentFiles >= 1) return "LOW";
    return "NONE";
  }

  /**
   * Assess business risk level
   */
  assessBusinessRisk(scanData) {
    let riskScore = 0;

    // Revenue projects have higher risk when stagnant
    if (this.getRevenueImpact() === "DIRECT_REVENUE") {
      if (scanData.git.lastCommitDate) {
        const daysSince = this.calculateDaysSince(scanData.git.lastCommitDate);
        if (daysSince > 7) riskScore += 3;
        if (daysSince > 14) riskScore += 5;
      }
    }

    // Git issues increase risk
    if (scanData.git.commitsBehind > 10) riskScore += 2;
    if (scanData.git.uncommittedChanges > 10) riskScore += 1;

    // Documentation issues
    if (scanData.documentation && scanData.documentation.documentationScore < 50) riskScore += 2;

    if (riskScore >= 7) return "HIGH";
    if (riskScore >= 4) return "MEDIUM";
    if (riskScore >= 1) return "LOW";
    return "NONE";
  }

  /**
   * Check for alerts and notifications
   */
  async checkForAlerts(scanData) {
    const alerts = [];

    // Critical alerts
    if (this.priority === "HIGH" && scanData.git.lastCommitDate) {
      const daysSince = this.calculateDaysSince(scanData.git.lastCommitDate);
      if (daysSince > 7) {
        alerts.push({
          severity: "CRITICAL",
          message: `Revenue project stagnant for ${daysSince} days`,
          details: { daysSinceCommit: daysSince, projectType: "revenue" },
        });
      }
    }

    // Warning alerts
    if (scanData.git.commitsBehind > 20) {
      alerts.push({
        severity: "WARNING",
        message: `Project significantly behind main (${scanData.git.commitsBehind} commits)`,
        details: { commitsBehind: scanData.git.commitsBehind },
      });
    }

    if (scanData.git.uncommittedChanges > 20) {
      alerts.push({
        severity: "WARNING",
        message: `Many uncommitted changes (${scanData.git.uncommittedChanges} files)`,
        details: { uncommittedChanges: scanData.git.uncommittedChanges },
      });
    }

    // Best practices alerts
    if (scanData.documentation && !scanData.documentation.hasProperStructure) {
      alerts.push({
        severity: "INFO",
        message: "Documentation files not in proper /docs/ directory",
        details: { issue: "file_organization" },
      });
    }

    if (scanData.documentation && !scanData.documentation.hasTrackdownBacklog) {
      alerts.push({
        severity: "INFO",
        message: "Missing TrackDown project management structure",
        details: { issue: "trackdown_missing" },
      });
    }

    // Send alerts
    for (const alert of alerts) {
      this.sendMessage("alert", alert);
    }
  }

  /**
   * Calculate days since a given date
   */
  calculateDaysSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Send message to master controller
   */
  sendMessage(type, data) {
    if (process.send) {
      process.send({
        type,
        data,
        timestamp: new Date().toISOString(),
        project: this.projectName,
      });
    }
  }

  /**
   * Handle messages from master controller
   */
  handleMessage(message) {
    const { type, data, timestamp } = message;

    switch (type) {
      case "health_check":
        this.sendMessage("health_response", {
          status: this.healthStatus,
          uptime: Date.now() - this.startTime,
          lastScan: this.lastScanData.timestamp,
        });
        break;

      case "force_scan":
        this.performScan();
        break;

      case "shutdown":
        this.stop();
        break;

      default:
        this.log(`🔍 Unknown message type: ${type}`, "debug");
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.log("🛑 Stopping project monitor", "info");

    this.isRunning = false;

    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    this.log("✅ Project monitor stopped", "info");
  }

  /**
   * Logging utility
   */
  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = logLevels[process.env.LOG_LEVEL] || 2;
    const messageLevel = logLevels[level] || 2;

    if (messageLevel <= currentLevel) {
      const prefix =
        level === "error" ? "❌" : level === "warn" ? "⚠️" : level === "debug" ? "🔍" : "ℹ️";
      console.log(`${timestamp} ${prefix} [${this.projectName}] ${message}`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    const value = args[i + 1];
    options[key] = value;
  }

  if (!options.project || !options.path) {
    console.error("❌ Required arguments: --project <name> --path <path>");
    process.exit(1);
  }

  const monitor = new ProjectMonitor(options);
  monitor.startTime = Date.now();

  // Handle messages from master controller
  process.on("message", (message) => {
    monitor.handleMessage(message);
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    monitor.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    monitor.stop();
    process.exit(0);
  });

  // Start monitoring
  monitor.start().catch((error) => {
    console.error(`❌ Failed to start project monitor: ${error.message}`);
    process.exit(1);
  });
}

module.exports = ProjectMonitor;
