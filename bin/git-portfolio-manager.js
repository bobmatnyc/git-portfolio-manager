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
const path = require("path");
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
      if (options.open !== false) {
        setTimeout(() => {
          open(serverInfo.url);
        }, 1000);
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

// Initialize command - create config file
program
  .command("init")
  .description("Initialize portfolio monitor configuration")
  .option("-f, --format <type>", "Configuration format (yaml|js)", "yaml")
  .option("-o, --output <file>", "Output file path")
  .option("--force", "Overwrite existing configuration")
  .action(async (options) => {
    const ConfigLoader = require("../lib/config/config-loader");
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

    const spinner = ora("Creating configuration file...").start();

    try {
      if (options.format === "yaml" || options.format === "yml") {
        await configLoader.createExampleConfig(configPath);
      } else {
        // Create JS config
        const defaultConfig = `module.exports = {
  // Server settings
  server: {
    port: 8080,
    host: 'localhost',
    autoOpen: true
  },
  
  // Directory tracking
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
      spinner.succeed("Configuration file created successfully!");

      console.log(chalk.green(`\n📄 Configuration created: ${configPath}`));
      console.log(chalk.cyan("Edit the file to customize your monitoring setup."));
      const configType = options.format === "js" ? "JS" : "YAML";
      console.log(chalk.gray(`Run: git-portfolio-manager start --config ${path.basename(configPath)}`));
      console.log(chalk.gray(`Format: ${configType} configuration`));
    } catch (error) {
      spinner.fail("Failed to create configuration file");
      console.error(chalk.red(`Error: ${error.message}`));
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
        setTimeout(() => {
          open(serverInfo.url);
        }, 1000);
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
        info.projects.forEach((project) => {
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
        });
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
