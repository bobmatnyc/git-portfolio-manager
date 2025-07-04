/**
 * Project Discovery Service
 *
 * Discovers Git repositories and projects throughout the file system
 * with interactive selection capabilities for configuration setup.
 */

const fs = require("fs-extra");
const path = require("node:path");
const { exec } = require("node:child_process");
const { promisify } = require("node:util");
const chalk = require("chalk");
const ora = require("ora");

const execAsync = promisify(exec);

class ProjectDiscoveryService {
  constructor(options = {}) {
    this.workingDir = options.workingDir || process.cwd();
    this.maxDepth = options.maxDepth || 3;
    this.excludeDirs = options.excludeDirs || [
      "node_modules",
      ".git",
      "dist",
      "build",
      "coverage",
      ".next",
      ".nuxt",
      "temp",
      "tmp",
      "backup",
      "archive",
      ".vscode",
      ".idea",
      "__pycache__",
      ".pytest_cache",
      "venv",
      "env",
    ];
  }

  /**
   * Discover all Git repositories starting from the working directory
   * Only scans subdirectories (never parent directories or external paths)
   */
  async discoverGitRepositories(spinner = null) {
    const projects = [];

    try {
      // Only scan the working directory and its subdirectories
      await this.scanDirectoryForGit(this.workingDir, 0, projects, spinner);

      // Filter out any projects that somehow ended up outside the working directory
      const validProjects = projects.filter((project) => {
        return project.path.startsWith(this.workingDir);
      });

      // Sort projects by path for consistent ordering
      validProjects.sort((a, b) => a.path.localeCompare(b.path));

      return validProjects;
    } catch (error) {
      throw new Error(`Failed to discover Git repositories: ${error.message}`);
    }
  }

  /**
   * Recursively scan directory for Git repositories
   */
  async scanDirectoryForGit(dirPath, depth, projects, spinner = null) {
    if (depth > this.maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Check if current directory is a Git repository
      const gitDir = path.join(dirPath, ".git");
      if (await fs.pathExists(gitDir)) {
        const project = await this.analyzeGitRepository(dirPath);
        if (project) {
          projects.push(project);
          if (spinner) {
            spinner.text = `Found ${projects.length} Git repositories...`;
          }
        }
      }

      // Scan subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldExcludeDirectory(entry.name)) {
          const subDirPath = path.join(dirPath, entry.name);
          await this.scanDirectoryForGit(subDirPath, depth + 1, projects, spinner);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read (permissions, etc.)
      return;
    }
  }

  /**
   * Check if directory should be excluded from scanning
   */
  shouldExcludeDirectory(dirName) {
    return this.excludeDirs.includes(dirName) || (dirName.startsWith(".") && dirName !== ".git");
  }

  /**
   * Analyze a Git repository to extract metadata
   */
  async analyzeGitRepository(repoPath) {
    try {
      const name = path.basename(repoPath);
      const project = {
        name,
        path: repoPath,
        relativePath: path.relative(this.workingDir, repoPath),
        type: "unknown",
        hasTrackDown: false,
        hasGitHubRemote: false,
        remoteUrl: null,
        lastCommit: null,
        branches: [],
        packageManager: null,
        selected: false, // For interactive selection
      };

      // Determine project type
      project.type = await this.determineProjectType(repoPath);

      // Check for TrackDown
      project.hasTrackDown = await this.hasTrackDownFiles(repoPath);

      // Get Git information
      const gitInfo = await this.getGitInformation(repoPath);
      project.hasGitHubRemote = gitInfo.hasGitHubRemote;
      project.remoteUrl = gitInfo.remoteUrl;
      project.lastCommit = gitInfo.lastCommit;
      project.branches = gitInfo.branches;

      return project;
    } catch (error) {
      // Return basic info if Git analysis fails
      return {
        name: path.basename(repoPath),
        path: repoPath,
        relativePath: path.relative(this.workingDir, repoPath),
        type: "unknown",
        hasTrackDown: false,
        hasGitHubRemote: false,
        selected: false,
      };
    }
  }

  /**
   * Determine project type based on files present
   */
  async determineProjectType(repoPath) {
    const indicators = {
      "package.json": "nodejs",
      "pyproject.toml": "python",
      "requirements.txt": "python",
      "Cargo.toml": "rust",
      "go.mod": "go",
      "composer.json": "php",
      Gemfile: "ruby",
      "pom.xml": "java",
      "build.gradle": "java",
      "CMakeLists.txt": "cpp",
      Makefile: "make",
    };

    for (const [file, type] of Object.entries(indicators)) {
      if (await fs.pathExists(path.join(repoPath, file))) {
        return type;
      }
    }

    // Check for common web frameworks
    const hasIndexHtml = await fs.pathExists(path.join(repoPath, "index.html"));
    const hasSrcDir = await fs.pathExists(path.join(repoPath, "src"));

    if (hasIndexHtml || hasSrcDir) {
      return "web";
    }

    return "general";
  }

  /**
   * Check if repository has TrackDown files
   */
  async hasTrackDownFiles(repoPath) {
    const trackdownPaths = [
      path.join(repoPath, "trackdown"),
      path.join(repoPath, "TRACKDOWN.md"),
      path.join(repoPath, "trackdown.md"),
    ];

    for (const trackdownPath of trackdownPaths) {
      if (await fs.pathExists(trackdownPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get Git repository information
   */
  async getGitInformation(repoPath) {
    const result = {
      hasGitHubRemote: false,
      remoteUrl: null,
      lastCommit: null,
      branches: [],
    };

    try {
      // Get remote URL
      const { stdout: remoteOutput } = await execAsync("git remote get-url origin", {
        cwd: repoPath,
        timeout: 5000,
      });

      if (remoteOutput.trim()) {
        result.remoteUrl = remoteOutput.trim();
        result.hasGitHubRemote = remoteOutput.includes("github.com");
      }

      // Get last commit info
      const { stdout: commitOutput } = await execAsync(
        "git log -1 --format='%H|%an|%ad|%s' --date=iso",
        { cwd: repoPath, timeout: 5000 },
      );

      if (commitOutput.trim()) {
        const [hash, author, date, message] = commitOutput.trim().split("|");
        result.lastCommit = {
          hash: hash.substring(0, 8),
          author,
          date: new Date(date),
          message,
        };
      }

      // Get branch information
      const { stdout: branchOutput } = await execAsync("git branch -a", {
        cwd: repoPath,
        timeout: 5000,
      });

      result.branches = branchOutput
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\*?\s+/, "").replace(/^remotes\//, ""))
        .filter((branch) => !branch.includes("HEAD ->"));
    } catch (error) {
      // Git commands failed, return partial info
    }

    return result;
  }

  /**
   * Get summary statistics of discovered projects
   */
  getDiscoverySummary(projects) {
    const summary = {
      total: projects.length,
      byType: {},
      withTrackDown: 0,
      withGitHub: 0,
      selected: 0,
    };

    for (const project of projects) {
      // Count by type
      summary.byType[project.type] = (summary.byType[project.type] || 0) + 1;

      // Count features
      if (project.hasTrackDown) summary.withTrackDown++;
      if (project.hasGitHubRemote) summary.withGitHub++;
      if (project.selected) summary.selected++;
    }

    return summary;
  }

  /**
   * Format project for display in selection interface
   */
  formatProjectForDisplay(project) {
    const typeColor = {
      nodejs: "green",
      python: "blue",
      rust: "red",
      go: "cyan",
      web: "yellow",
      general: "gray",
    };

    const color = typeColor[project.type] || "gray";
    const typeLabel = `[${project.type}]`.padEnd(10);

    const features = [];
    if (project.hasTrackDown) features.push("📋 TrackDown");
    if (project.hasGitHubRemote) features.push("🐙 GitHub");

    const featuresText = features.length > 0 ? ` (${features.join(", ")})` : "";
    const relPath = project.relativePath || project.path;

    return {
      name: `${chalk[color](typeLabel)} ${chalk.bold(project.name)}${featuresText}`,
      value: project,
      short: project.name,
    };
  }
}

module.exports = ProjectDiscoveryService;
