/**
 * Interactive Configuration Service
 *
 * Provides interactive setup for project portfolio monitoring
 * with project selection and GitHub/TrackDown configuration.
 */

const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs-extra");
const path = require("node:path");

class InteractiveConfigService {
  constructor(options = {}) {
    this.workingDir = options.workingDir || process.cwd();
  }

  /**
   * Run complete interactive configuration setup
   */
  async runSetup(discoveredProjects) {
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
  async selectProjects(projects) {
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

    let selectedProjects = [];

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
  displayProjectSummary(projects) {
    const summary = this.getProjectSummary(projects);

    console.log(`${chalk.bold("Project Types:")}`);
    for (const [type, count] of Object.entries(summary.byType)) {
      const typeColor = this.getTypeColor(type);
      console.log(`  ${chalk[typeColor](type)}: ${count} projects`);
    }

    console.log(`\n${chalk.bold("Features:")}`);
    console.log(`  📋 TrackDown projects: ${summary.withTrackDown}`);
    console.log(`  🐙 GitHub repositories: ${summary.withGitHub}`);
  }

  /**
   * Select specific projects
   */
  async selectSpecificProjects(projects) {
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
        validate: (answer) => {
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
  async selectByType(projects) {
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
        validate: (answer) => {
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
  autoSelectProjects(projects) {
    const selected = projects.filter(
      (project) =>
        project.hasTrackDown ||
        project.hasGitHubRemote ||
        ["nodejs", "python", "rust", "go"].includes(project.type),
    );

    console.log(
      chalk.green(
        `Auto-selected ${selected.length} projects based on GitHub remotes, TrackDown, and common project types.`,
      ),
    );

    return selected;
  }

  /**
   * Configure GitHub/TrackDown integration
   */
  async configureIntegration(selectedProjects) {
    const hasTrackDown = selectedProjects.some((p) => p.hasTrackDown);
    const hasGitHub = selectedProjects.some((p) => p.hasGitHubRemote);

    const config = {
      hasTrackDown,
      enableGitHub: false,
      githubToken: null,
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
        config.githubToken = githubToken || null;
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
        config.githubToken = githubToken || null;
      }
    }

    return config;
  }

  /**
   * Configure basic settings
   */
  async configureBasicSettings() {
    const { serverPort, autoOpen, updateInterval } = await inquirer.prompt([
      {
        type: "number",
        name: "serverPort",
        message: "Dashboard server port:",
        default: 8080,
        validate: (value) => {
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
  generateConfiguration(selectedProjects, integrationConfig, basicConfig) {
    // Generate paths for selected projects
    const includePaths = selectedProjects.map((project) => project.path);

    const config = {
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
    };

    // Add GitHub configuration if enabled
    if (integrationConfig.enableGitHub && integrationConfig.githubToken) {
      config.github = {
        token: integrationConfig.githubToken,
      };
    }

    return config;
  }

  /**
   * Format project for choice display
   */
  formatProjectChoice(project) {
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
  getTypeEmoji(type) {
    const emojis = {
      nodejs: "📦",
      python: "🐍",
      rust: "🦀",
      go: "🐹",
      web: "🌐",
      java: "☕",
      php: "🐘",
      ruby: "💎",
      cpp: "⚙️",
      general: "📁",
    };
    return emojis[type] || "📁";
  }

  /**
   * Get color for project type
   */
  getTypeColor(type) {
    const colors = {
      nodejs: "green",
      python: "blue",
      rust: "red",
      go: "cyan",
      web: "yellow",
      java: "magenta",
      general: "gray",
    };
    return colors[type] || "gray";
  }

  /**
   * Get project summary statistics
   */
  getProjectSummary(projects) {
    const summary = {
      total: projects.length,
      byType: {},
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

module.exports = InteractiveConfigService;
