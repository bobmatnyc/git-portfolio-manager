#!/usr/bin/env node

/**
 * Portfolio Monitor CLI
 *
 * A comprehensive project portfolio monitoring tool with Git analytics,
 * TrackDown integration, and business intelligence for development teams.
 */

const { program } = require("commander");
const chalk = require("chalk");
const ora = require("ora");
const path = require("node:path");
const fs = require("fs-extra");
const open = require("open");

const PortfolioMonitor = require("../lib/portfolio-monitor");
const { version } = require("../package.json");

// Configure CLI
program
  .name("git-portfolio-manager")
  .description(
    "Git portfolio management and monitoring dashboard with TrackDown integration and GitHub Issues",
  )
  .version(version, "-v, --version", "output the current version");

// Main command - start monitoring
program
  .command("start", { isDefault: true })
  .description("Start portfolio monitoring dashboard")
  .option("-p, --port <number>", "Dashboard port (auto-detected if not specified)", Number.parseInt)
  .option("-h, --host <string>", "Dashboard host", "localhost")
  .option("-d, --depth <number>", "Scan depth for projects", Number.parseInt, 1)
  .option(
    "-e, --exclude <dirs>",
    "Comma-separated list of directories to exclude",
    "node_modules,dist,.git,temp",
  )
  .option("-i, --interval <ms>", "Update interval in milliseconds", Number.parseInt, 30000)
  .option("-c, --config <file>", "Configuration file path (YAML or JS)")
  .option("--config-example", "Generate example configuration file")
  .option("--no-open", "Do not auto-open browser")
  .option("--dev", "Run in development mode with verbose logging")
  .action(async (options) => {
    const spinner = ora("Starting Portfolio Monitor...").start();

    try {
      const monitor = new PortfolioMonitor({
        workingDir: process.cwd(),
        ...options,
      });

      spinner.text = "Initializing monitoring system...";
      await monitor.initialize();

      spinner.text = "Scanning projects...";
      const projects = await monitor.scanProjects();

      spinner.text = "Starting dashboard server...";
      const serverInfo = await monitor.startDashboard();

      spinner.succeed(`Portfolio Monitor started successfully!`);

      console.log(chalk.green.bold("\n🚀 Portfolio Monitor Dashboard\n"));
      console.log(`${chalk.cyan("Dashboard URL:")} ${chalk.underline(serverInfo.url)}`);
      console.log(`${chalk.cyan("Projects Found:")} ${projects.length}`);
      console.log(`${chalk.cyan("Working Directory:")} ${process.cwd()}`);
      console.log(`${chalk.cyan("Update Interval:")} ${options.interval / 1000}s`);

      if (options.dev) {
        console.log(chalk.yellow("\n⚠️  Development mode enabled - verbose logging active"));
      }

      console.log(chalk.gray("\nPress Ctrl+C to stop monitoring"));

      // Auto-open browser unless disabled
      if (options.open !== false && monitor.config.server.autoOpen) {
        console.log(chalk.gray("Opening dashboard in browser..."));
        setTimeout(() => {
          open(serverInfo.url).catch(() => {
            console.log(chalk.gray("Could not auto-open browser. Please visit the URL manually."));
          });
        }, 1500);
      }
    } catch (error) {
      spinner.fail("Failed to start Portfolio Monitor");
      console.error(chalk.red(`Error: ${error.message}`));

      if (options.dev) {
        console.error(chalk.gray(error.stack));
      }

      process.exit(1);
    }
  });

// Initialize command - interactive setup with project discovery
program
  .command("init")
  .description("Initialize portfolio monitor with interactive setup")
  .option("-f, --format <type>", "Configuration format (yaml|js)", "yaml")
  .option("-o, --output <file>", "Output file path")
  .option("--force", "Overwrite existing configuration")
  .option("--no-interactive", "Skip interactive setup and create example config")
  .action(async (options) => {
    const ConfigLoader = require("../lib/config/config-loader");
    const ProjectDiscoveryService = require("../lib/discovery/project-discovery");
    const InteractiveConfigService = require("../lib/discovery/interactive-config");

    const configLoader = new ConfigLoader({ workingDir: process.cwd() });

    let configPath;
    if (options.output) {
      configPath = path.resolve(options.output);
    } else {
      const ext = options.format === "js" ? ".config.js" : ".yml";
      configPath = path.join(process.cwd(), `portfolio-monitor${ext}`);
    }

    if (fs.existsSync(configPath) && !options.force) {
      console.log(chalk.yellow("Configuration file already exists. Use --force to overwrite."));
      return;
    }

    // Non-interactive mode - create example config
    if (!options.interactive) {
      const spinner = ora("Creating example configuration file...").start();

      try {
        if (options.format === "yaml" || options.format === "yml") {
          await configLoader.createExampleConfig(configPath);
        } else {
          // Create example JS config
          const defaultConfig = `module.exports = {
  // Server settings
  server: {
    port: 8080,
    host: 'localhost',
    autoOpen: true
  },
  
  // Directory tracking - Add your project paths here
  directories: {
    scanCurrent: true,
    scanDepth: 1,
    include: [
      // '/path/to/other/projects',
      // '/workspace/legacy-apps'
    ],
    exclude: ['node_modules', 'dist', '.git', 'temp', 'backup']
  },
  
  // Monitoring settings
  monitoring: {
    updateInterval: 30000, // 30 seconds
    enableGitAnalysis: true,
    enableTrackDown: true,
    enableHealthChecks: true,
    staleThreshold: 14, // days
    maxConcurrentScans: 5
  },
  
  // Dashboard customization
  dashboard: {
    theme: 'light', // light, dark, or auto
    title: 'Portfolio Monitor',
    autoRefresh: true,
    showCharts: true,
    showTables: true
  },
  
  // Business intelligence
  business: {
    priorityMapping: {
      revenue: 'HIGH',
      strategic: 'MEDIUM', 
      infrastructure: 'LOW'
    },
    alertThresholds: {
      staleDays: 14,
      criticalIssues: 3,
      uncommittedFiles: 10
    }
  }
};`;

          await fs.writeFile(configPath, defaultConfig);
        }
        spinner.succeed("Example configuration file created!");

        console.log(chalk.green(`\n📄 Configuration created: ${configPath}`));
        console.log(chalk.cyan("Edit the file to customize your monitoring setup."));
        console.log(
          chalk.gray(`Run: git-portfolio-manager start --config ${path.basename(configPath)}`),
        );
      } catch (error) {
        spinner.fail("Failed to create configuration file");
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
      return;
    }

    // Interactive mode - discover projects and configure
    const discoverySpinner = ora("Discovering Git repositories...").start();

    try {
      // Discover projects
      const discoveryService = new ProjectDiscoveryService({
        workingDir: process.cwd(),
        maxDepth: 3,
      });

      const projects = await discoveryService.discoverGitRepositories(discoverySpinner);
      discoverySpinner.succeed(`Found ${projects.length} Git repositories`);

      // Interactive configuration
      const interactiveService = new InteractiveConfigService({
        workingDir: process.cwd(),
      });

      const setupResult = await interactiveService.runSetup(projects);

      if (!setupResult) {
        console.log(chalk.yellow("Setup cancelled."));
        return;
      }

      // Generate configuration file
      const saveSpinner = ora("Generating configuration file...").start();

      if (options.format === "yaml" || options.format === "yml") {
        const yaml = require("js-yaml");
        const yamlContent = yaml.dump(setupResult.config, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          quotingType: '"',
        });

        const header = `# Git Portfolio Manager Configuration
# Generated on ${new Date().toISOString()}
# Installation directory: ${process.cwd()}
# Selected projects: ${setupResult.selectedProjects}
# TrackDown enabled: ${setupResult.hasTrackDown}
# GitHub enabled: ${setupResult.hasGitHub}

`;

        await fs.writeFile(configPath, header + yamlContent);
      } else {
        const jsContent = `// Git Portfolio Manager Configuration
// Generated on ${new Date().toISOString()}
// Installation directory: ${process.cwd()}
// Selected projects: ${setupResult.selectedProjects}
// TrackDown enabled: ${setupResult.hasTrackDown}
// GitHub enabled: ${setupResult.hasGitHub}

module.exports = ${JSON.stringify(setupResult.config, null, 2)};`;

        await fs.writeFile(configPath, jsContent);
      }

      saveSpinner.succeed("Configuration saved successfully!");

      // Show completion summary
      console.log(chalk.green.bold("\n🎉 Setup Complete!\n"));
      console.log(`${chalk.cyan("Configuration file:")} ${configPath}`);
      console.log(`${chalk.cyan("Projects selected:")} ${setupResult.selectedProjects}`);
      console.log(`${chalk.cyan("Dashboard port:")} ${setupResult.config.server.port}`);

      if (setupResult.hasTrackDown) {
        console.log(`${chalk.cyan("Integration:")} 📋 TrackDown enabled`);
      }
      if (setupResult.hasGitHub) {
        console.log(`${chalk.cyan("Integration:")} 🐙 GitHub Issues enabled`);
      }

      console.log(chalk.green.bold("\n🚀 Ready to start monitoring!"));
      console.log(chalk.gray(`Run: git-portfolio-manager start`));
    } catch (error) {
      discoverySpinner.fail("Setup failed");
      console.error(chalk.red(`Error: ${error.message}`));

      if (options.dev) {
        console.error(chalk.gray(error.stack));
      }

      process.exit(1);
    }
  });

// Dashboard-only command
program
  .command("dashboard")
  .description("Start dashboard server without monitoring (serves existing data)")
  .option("-p, --port <number>", "Dashboard port", Number.parseInt, 8080)
  .option("-h, --host <string>", "Dashboard host", "localhost")
  .option("--no-open", "Do not auto-open browser")
  .action(async (options) => {
    const spinner = ora("Starting dashboard server...").start();

    try {
      const monitor = new PortfolioMonitor({
        workingDir: process.cwd(),
        ...options,
        dashboardOnly: true,
      });

      const serverInfo = await monitor.startDashboard();

      spinner.succeed("Dashboard server started!");

      console.log(chalk.green.bold("\n📊 Portfolio Dashboard\n"));
      console.log(`${chalk.cyan("Dashboard URL:")} ${chalk.underline(serverInfo.url)}`);
      console.log(chalk.gray("Serving existing monitoring data"));
      console.log(chalk.gray("Press Ctrl+C to stop server"));

      if (options.open !== false) {
        console.log(chalk.gray("Opening dashboard in browser..."));
        setTimeout(() => {
          open(serverInfo.url).catch(() => {
            console.log(chalk.gray("Could not auto-open browser. Please visit the URL manually."));
          });
        }, 1500);
      }
    } catch (error) {
      spinner.fail("Failed to start dashboard server");
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Info command
program
  .command("info")
  .description("Show portfolio monitoring information")
  .action(async () => {
    const monitor = new PortfolioMonitor({ workingDir: process.cwd() });

    console.log(chalk.green.bold("\n📊 Portfolio Monitor Information\n"));

    try {
      const info = await monitor.getInfo();

      console.log(`${chalk.cyan("Working Directory:")} ${info.workingDir}`);
      console.log(`${chalk.cyan("Projects Found:")} ${info.projectCount}`);
      console.log(`${chalk.cyan("Git Repositories:")} ${info.gitRepoCount}`);
      console.log(`${chalk.cyan("TrackDown Projects:")} ${info.trackdownCount}`);
      console.log(`${chalk.cyan("Data Directory:")} ${info.dataDir}`);
      console.log(`${chalk.cyan("Last Scan:")} ${info.lastScan || "Never"}`);

      if (info.projects.length > 0) {
        console.log(chalk.yellow("\n📁 Projects:"));
        for (const project of info.projects) {
          const status = project.health || "unknown";
          const statusIcon =
            status === "healthy"
              ? "✅"
              : status === "attention"
                ? "⚠️"
                : status === "critical"
                  ? "❌"
                  : "❓";
          console.log(`  ${statusIcon} ${project.name} (${project.type || "unknown"})`);
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse(process.argv);
} catch (err) {
  if (err.code === "commander.help") {
    process.exit(0);
  }
  if (err.code === "commander.version") {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
