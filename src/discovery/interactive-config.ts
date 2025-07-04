/**
 * Interactive Configuration Service
 *
 * Provides interactive setup for project portfolio monitoring
 * with project selection and GitHub/TrackDown configuration.
 */

import inquirer from "inquirer";
import chalk from "chalk";
import {
  ProjectConfig,
  ProjectType,
  InteractiveSetupResult,
  IntegrationConfig,
  BasicConfig,
  PortfolioConfig,
  DiscoveryOptions,
} from "../types";

export class InteractiveConfigService {
  private workingDir: string;

  constructor(options: DiscoveryOptions = {}) {
    this.workingDir = options.workingDir || process.cwd();
  }

  /**
   * Run complete interactive configuration setup
   */
  async runSetup(discoveredProjects: ProjectConfig[]): Promise<InteractiveSetupResult | null> {
    console.log(chalk.green.bold("\n🔧 Git Portfolio Manager - Interactive Setup\n"));

    console.log(chalk.cyan("Welcome! Let's configure your portfolio monitoring."));
    console.log(chalk.gray(`Installation directory: ${this.workingDir}\n`));

    // Step 1: Project selection
    const selectedProjects = await this.selectProjects(discoveredProjects);

    if (selectedProjects.length === 0) {
      console.log(chalk.yellow("No projects selected. Exiting setup."));
      return null;
    }

    // Step 2: TrackDown detection and GitHub configuration
    const integrationConfig = await this.configureIntegration(selectedProjects);

    // Step 3: Basic settings
    const basicConfig = await this.configureBasicSettings();

    // Step 4: Generate final configuration
    const config = this.generateConfiguration(selectedProjects, integrationConfig, basicConfig);

    return {
      config,
      selectedProjects: selectedProjects.length,
      hasTrackDown: integrationConfig.hasTrackDown,
      hasGitHub: integrationConfig.enableGitHub,
    };
  }

  /**
   * Interactive project selection
   */
  private async selectProjects(projects: ProjectConfig[]): Promise<ProjectConfig[]> {
    if (projects.length === 0) {
      console.log(chalk.yellow("No Git repositories found in subdirectories."));
      return [];
    }

    console.log(chalk.green(`📁 Found ${projects.length} Git repositories:\n`));

    // Show project summary
    this.displayProjectSummary(projects);

    console.log(); // Add spacing

    // Ask for selection method
    const { selectionMethod } = await inquirer.prompt([
      {
        type: "list",
        name: "selectionMethod",
        message: "How would you like to select projects to monitor?",
        choices: [
          { name: "Select specific projects", value: "specific" },
          { name: "Select all projects", value: "all" },
          { name: "Select by project type", value: "byType" },
          { name: "Auto-select (GitHub repos + TrackDown projects)", value: "auto" },
        ],
      },
    ]);

    let selectedProjects: ProjectConfig[] = [];

    switch (selectionMethod) {
      case "all":
        selectedProjects = [...projects];
        break;

      case "specific":
        selectedProjects = await this.selectSpecificProjects(projects);
        break;

      case "byType":
        selectedProjects = await this.selectByType(projects);
        break;

      case "auto":
        selectedProjects = this.autoSelectProjects(projects);
        break;
    }

    if (selectedProjects.length > 0) {
      console.log(chalk.green(`\n✅ Selected ${selectedProjects.length} projects for monitoring`));
    }

    return selectedProjects;
  }

  /**
   * Display project summary
   */
  private displayProjectSummary(projects: ProjectConfig[]): void {
    const summary = this.getProjectSummary(projects);

    console.log(`${chalk.bold("Project Types:")}`);
    for (const [type, count] of Object.entries(summary.byType)) {
      console.log(`  ${type}: ${count} projects`);
    }

    console.log(`\n${chalk.bold("Features:")}`);
    console.log(`  📋 TrackDown projects: ${summary.withTrackDown}`);
    console.log(`  🐙 GitHub repositories: ${summary.withGitHub}`);
  }

  /**
   * Select specific projects
   */
  private async selectSpecificProjects(projects: ProjectConfig[]): Promise<ProjectConfig[]> {
    const choices = projects.map((project) => ({
      name: this.formatProjectChoice(project),
      value: project,
      checked: project.hasTrackDown || project.hasGitHubRemote, // Pre-select interesting projects
    }));

    const { selectedProjects } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedProjects",
        message: "Select projects to monitor:",
        choices,
        pageSize: 15,
        validate: (answer: ProjectConfig[]) => {
          if (answer.length === 0) {
            return "Please select at least one project.";
          }
          return true;
        },
      },
    ]);

    return selectedProjects;
  }

  /**
   * Select projects by type
   */
  private async selectByType(projects: ProjectConfig[]): Promise<ProjectConfig[]> {
    const types = [...new Set(projects.map((p) => p.type))];

    const { selectedTypes } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedTypes",
        message: "Select project types to monitor:",
        choices: types.map((type) => ({
          name: `${this.getTypeEmoji(type)} ${type} (${projects.filter((p) => p.type === type).length} projects)`,
          value: type,
          checked: type !== "general", // Pre-select specific types
        })),
        validate: (answer: ProjectType[]) => {
          if (answer.length === 0) {
            return "Please select at least one project type.";
          }
          return true;
        },
      },
    ]);

    return projects.filter((project) => selectedTypes.includes(project.type));
  }

  /**
   * Auto-select interesting projects
   */
  private autoSelectProjects(projects: ProjectConfig[]): ProjectConfig[] {
    const selected = projects.filter(
      (project) =>
        project.hasTrackDown ||
        project.hasGitHubRemote ||
        ["nodejs", "python", "rust", "go"].includes(project.type)
    );

    console.log(
      chalk.green(
        `Auto-selected ${selected.length} projects based on GitHub remotes, TrackDown, and common project types.`
      )
    );

    return selected;
  }

  /**
   * Configure GitHub/TrackDown integration
   */
  private async configureIntegration(selectedProjects: ProjectConfig[]): Promise<IntegrationConfig> {
    const hasTrackDown = selectedProjects.some((p) => p.hasTrackDown);
    const hasGitHub = selectedProjects.some((p) => p.hasGitHubRemote);

    const config: IntegrationConfig = {
      hasTrackDown,
      enableGitHub: false,
      githubToken: undefined as string | undefined,
    };

    if (hasTrackDown) {
      console.log(chalk.green("\n📋 TrackDown detected in selected projects!"));
      console.log(chalk.gray("TrackDown integration will be enabled automatically."));
    }

    if (hasGitHub && !hasTrackDown) {
      console.log(chalk.yellow("\n🐙 GitHub repositories detected, but no TrackDown found."));

      const { useGitHub } = await inquirer.prompt([
        {
          type: "confirm",
          name: "useGitHub",
          message: "Would you like to use GitHub Issues for project tracking?",
          default: true,
        },
      ]);

      if (useGitHub) {
        const { githubToken } = await inquirer.prompt([
          {
            type: "password",
            name: "githubToken",
            message: "Enter your GitHub personal access token (optional for public repos):",
            mask: "*",
          },
        ]);

        config.enableGitHub = true;
        config.githubToken = githubToken || undefined;
      }
    } else if (hasGitHub && hasTrackDown) {
      const { preferredTracking } = await inquirer.prompt([
        {
          type: "list",
          name: "preferredTracking",
          message:
            "Both TrackDown and GitHub repositories found. Which would you prefer for issue tracking?",
          choices: [
            { name: "📋 TrackDown (markdown-based)", value: "trackdown" },
            { name: "🐙 GitHub Issues", value: "github" },
            { name: "Both (hybrid approach)", value: "both" },
          ],
          default: "trackdown",
        },
      ]);

      if (preferredTracking === "github" || preferredTracking === "both") {
        const { githubToken } = await inquirer.prompt([
          {
            type: "password",
            name: "githubToken",
            message: "Enter your GitHub personal access token:",
            mask: "*",
          },
        ]);

        config.enableGitHub = true;
        config.githubToken = githubToken || undefined;
      }
    }

    return config;
  }

  /**
   * Configure basic settings
   */
  private async configureBasicSettings(): Promise<BasicConfig> {
    const { serverPort, autoOpen, updateInterval } = await inquirer.prompt([
      {
        type: "number",
        name: "serverPort",
        message: "Dashboard server port:",
        default: 8080,
        validate: (value: number) => {
          if (value < 1024 || value > 65535) {
            return "Port must be between 1024 and 65535";
          }
          return true;
        },
      },
      {
        type: "confirm",
        name: "autoOpen",
        message: "Auto-open dashboard in browser when starting?",
        default: true,
      },
      {
        type: "list",
        name: "updateInterval",
        message: "How often should projects be scanned?",
        choices: [
          { name: "Every 30 seconds (development)", value: 30000 },
          { name: "Every 2 minutes (active monitoring)", value: 120000 },
          { name: "Every 5 minutes (balanced)", value: 300000 },
          { name: "Every 15 minutes (light monitoring)", value: 900000 },
        ],
        default: 300000,
      },
    ]);

    return { serverPort, autoOpen, updateInterval };
  }

  /**
   * Generate final configuration object
   */
  private generateConfiguration(
    selectedProjects: ProjectConfig[],
    integrationConfig: IntegrationConfig,
    basicConfig: BasicConfig
  ): PortfolioConfig {
    // Generate paths for selected projects
    const includePaths = selectedProjects.map((project) => project.path);

    const config: PortfolioConfig = {
      server: {
        port: basicConfig.serverPort,
        host: "localhost",
        autoOpen: basicConfig.autoOpen,
      },
      directories: {
        scanCurrent: false, // We're specifying exact paths
        scanDepth: 0,
        include: includePaths,
        exclude: [
          "node_modules",
          "dist",
          ".git",
          "temp",
          "backup",
          "archive",
          ".next",
          ".nuxt",
          "build",
          "out",
          "coverage",
        ],
      },
      monitoring: {
        updateInterval: basicConfig.updateInterval,
        enableGitAnalysis: true,
        enableTrackDown: integrationConfig.hasTrackDown,
        enableGitHubIssues: integrationConfig.enableGitHub,
        enableHealthChecks: true,
        staleThreshold: 14,
        maxConcurrentScans: Math.min(5, selectedProjects.length),
      },
      dashboard: {
        theme: "light",
        title: "Portfolio Monitor",
        autoRefresh: true,
        showCharts: true,
        showTables: true,
      },
      business: {
        priorityMapping: {
          revenue: "HIGH",
          strategic: "MEDIUM",
          infrastructure: "LOW",
        },
        alertThresholds: {
          staleDays: 14,
          criticalIssues: 3,
          uncommittedFiles: 10,
        },
      },
      git: {
        defaultBranch: "main",
        remoteTimeout: 10000,
        enableRemoteCheck: true,
        analyzeCommitHistory: true,
        maxCommitHistory: 100,
      },
      data: {
        directory: "data",
        retentionDays: 30,
        compressionEnabled: true,
      },
      github: {
        baseUrl: "https://api.github.com",
        userAgent: "portfolio-monitor",
        timeout: 10000,
        rateLimit: {
          requests: 60,
          retryAfter: 60000,
        },
        issuesOptions: {
          state: "open",
          labels: [],
          sort: "updated",
          direction: "desc",
          perPage: 30,
        },
      },
      logging: {
        level: "info",
        console: true,
      },
    };

    // Add GitHub token if provided
    if (integrationConfig.enableGitHub && integrationConfig.githubToken) {
      config.github.token = integrationConfig.githubToken;
    }

    return config;
  }

  /**
   * Format project for choice display
   */
  private formatProjectChoice(project: ProjectConfig): string {
    const typeEmoji = this.getTypeEmoji(project.type);
    const features = [];

    if (project.hasTrackDown) features.push("📋");
    if (project.hasGitHubRemote) features.push("🐙");

    const featuresText = features.length > 0 ? ` ${features.join("")}` : "";
    const relPath = project.relativePath || project.name;

    return `${typeEmoji} ${chalk.bold(project.name)}${featuresText} ${chalk.gray(`(${relPath})`)}`;
  }

  /**
   * Get emoji for project type
   */
  private getTypeEmoji(type: ProjectType): string {
    const emojis: Record<ProjectType, string> = {
      nodejs: "📦",
      python: "🐍",
      rust: "🦀",
      go: "🐹",
      web: "🌐",
      java: "☕",
      php: "🐘",
      ruby: "💎",
      cpp: "⚙️",
      make: "🔨",
      general: "📁",
    };
    return emojis[type] || "📁";
  }


  /**
   * Get project summary statistics
   */
  private getProjectSummary(projects: ProjectConfig[]): {
    total: number;
    byType: Record<string, number>;
    withTrackDown: number;
    withGitHub: number;
  } {
    const summary = {
      total: projects.length,
      byType: {} as Record<string, number>,
      withTrackDown: 0,
      withGitHub: 0,
    };

    for (const project of projects) {
      summary.byType[project.type] = (summary.byType[project.type] || 0) + 1;
      if (project.hasTrackDown) summary.withTrackDown++;
      if (project.hasGitHubRemote) summary.withGitHub++;
    }

    return summary;
  }
}