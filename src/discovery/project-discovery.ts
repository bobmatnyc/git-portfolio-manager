/**
 * Project Discovery Service
 *
 * Discovers Git repositories and projects throughout the file system
 * with interactive selection capabilities for configuration setup.
 */

import * as fs from "fs-extra";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import { Ora } from "ora";

import {
  ProjectConfig,
  ProjectType,
  GitCommit,
  DiscoveryOptions,
} from "../types";

const execAsync = promisify(exec);

export class ProjectDiscoveryService {
  private workingDir: string;
  private maxDepth: number;
  private excludeDirs: string[];

  constructor(options: DiscoveryOptions = {}) {
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
  async discoverGitRepositories(spinner?: Ora): Promise<ProjectConfig[]> {
    const projects: ProjectConfig[] = [];

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
      throw new Error(`Failed to discover Git repositories: ${(error as Error).message}`);
    }
  }

  /**
   * Recursively scan directory for Git repositories
   */
  private async scanDirectoryForGit(
    dirPath: string,
    depth: number,
    projects: ProjectConfig[],
    spinner?: Ora
  ): Promise<void> {
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
  private shouldExcludeDirectory(dirName: string): boolean {
    return this.excludeDirs.includes(dirName) || (dirName.startsWith(".") && dirName !== ".git");
  }

  /**
   * Analyze a Git repository to extract metadata
   */
  private async analyzeGitRepository(repoPath: string): Promise<ProjectConfig | null> {
    try {
      const name = path.basename(repoPath);
      const project: ProjectConfig = {
        name,
        path: repoPath,
        relativePath: path.relative(this.workingDir, repoPath),
        type: "unknown" as ProjectType,
        hasTrackDown: false,
        hasGitHubRemote: false,
        remoteUrl: undefined as string | undefined,
        lastCommit: undefined as GitCommit | undefined,
        branches: [],
        packageManager: undefined as string | undefined,
        selected: false, // For interactive selection
      };

      // Determine project type
      project.type = await this.determineProjectType(repoPath);

      // Check for TrackDown
      project.hasTrackDown = await this.hasTrackDownFiles(repoPath);

      // Get Git information
      const gitInfo = await this.getGitInformation(repoPath);
      project.hasGitHubRemote = gitInfo.hasGitHubRemote;
      if (gitInfo.remoteUrl !== undefined) {
        project.remoteUrl = gitInfo.remoteUrl;
      }
      if (gitInfo.lastCommit !== undefined) {
        project.lastCommit = gitInfo.lastCommit;
      }
      project.branches = gitInfo.branches;

      return project;
    } catch (error) {
      // Return basic info if Git analysis fails
      return {
        name: path.basename(repoPath),
        path: repoPath,
        relativePath: path.relative(this.workingDir, repoPath),
        type: "unknown" as ProjectType,
        hasTrackDown: false,
        hasGitHubRemote: false,
        remoteUrl: undefined as string | undefined,
        lastCommit: undefined as GitCommit | undefined,
        selected: false,
        branches: [],
        packageManager: undefined as string | undefined,
      };
    }
  }

  /**
   * Determine project type based on files present
   */
  private async determineProjectType(repoPath: string): Promise<ProjectType> {
    const indicators: Record<string, ProjectType> = {
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
  private async hasTrackDownFiles(repoPath: string): Promise<boolean> {
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
  private async getGitInformation(repoPath: string): Promise<{
    hasGitHubRemote: boolean;
    remoteUrl?: string;
    lastCommit?: GitCommit;
    branches: string[];
  }> {
    const result = {
      hasGitHubRemote: false,
      remoteUrl: undefined as string | undefined,
      lastCommit: undefined as GitCommit | undefined,
      branches: [] as string[],
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
        { cwd: repoPath, timeout: 5000 }
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

    const returnValue: {
      hasGitHubRemote: boolean;
      remoteUrl?: string;
      lastCommit?: GitCommit;
      branches: string[];
    } = {
      hasGitHubRemote: result.hasGitHubRemote,
      branches: result.branches,
    };

    if (result.remoteUrl !== undefined) {
      returnValue.remoteUrl = result.remoteUrl;
    }
    if (result.lastCommit !== undefined) {
      returnValue.lastCommit = result.lastCommit;
    }

    return returnValue;
  }

  /**
   * Get summary statistics of discovered projects
   */
  getDiscoverySummary(projects: ProjectConfig[]): {
    total: number;
    byType: Record<string, number>;
    withTrackDown: number;
    withGitHub: number;
    selected: number;
  } {
    const summary = {
      total: projects.length,
      byType: {} as Record<string, number>,
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
  formatProjectForDisplay(project: ProjectConfig): {
    name: string;
    value: ProjectConfig;
    short: string;
  } {
    const typeLabel = `[${project.type}]`.padEnd(10);

    const features: string[] = [];
    if (project.hasTrackDown) features.push("📋 TrackDown");
    if (project.hasGitHubRemote) features.push("🐙 GitHub");

    const featuresText = features.length > 0 ? ` (${features.join(", ")})` : "";
    return {
      name: `${typeLabel} ${chalk.bold(project.name)}${featuresText}`,
      value: project,
      short: project.name,
    };
  }
}