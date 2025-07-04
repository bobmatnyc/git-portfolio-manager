#!/usr/bin/env node
export = PortfolioMasterController;
declare class PortfolioMasterController extends EventEmitter<[never]> {
    constructor(options?: {});
    workingDir: any;
    dataDir: any;
    fullConfig: any;
    config: {
        projectsRoot: any;
        scanInterval: any;
        maxProcesses: any;
        healthCheckInterval: number;
        reportGenerationInterval: number;
        logLevel: any;
        outputDir: string;
        dataDir: any;
        directories: any;
        monitoring: any;
    };
    projectMonitors: Map<any, any>;
    projectRegistry: Map<any, any>;
    isRunning: boolean;
    scanTimer: any;
    healthCheckTimer: NodeJS.Timeout | null;
    reportTimer: NodeJS.Timeout | null;
    /**
     * Start the master controller and begin monitoring
     */
    start(): Promise<void>;
    /**
     * Discover all software projects in the portfolio
     */
    discoverProjects(): Promise<any[]>;
    /**
     * Analyze individual project to determine monitoring requirements
     */
    analyzeProject(projectPath: any, projectName: any): Promise<{
        name: any;
        path: any;
        type: string;
        priority: string;
        hasGit: boolean;
        hasPackageJson: boolean;
        hasPyprojectToml: boolean;
        hasTrackdown: boolean;
        lastScan: null;
        health: string;
        monitor: null;
    } | null>;
    /**
     * Determine business priority based on project categorization
     */
    determinePriority(projectName: any, projectPath: any): "HIGH" | "MEDIUM" | "LOW";
    /**
     * Determine project type based on technical indicators
     */
    determineProjectType(projectName: any, hasPackageJson: any, hasPyprojectToml: any): "nodejs" | "python" | "web" | "general";
    /**
     * Start individual project monitors
     */
    startProjectMonitors(): Promise<void>;
    /**
     * Start monitoring process for individual project
     */
    startProjectMonitor(projectName: any, project: any): Promise<import("./project-monitor")>;
    /**
     * Handle messages from project monitor subprocesses
     */
    handleMonitorMessage(projectName: any, message: any): void;
    /**
     * Update project health status
     */
    updateProjectHealth(projectName: any, healthData: any): void;
    /**
     * Process activity report from project monitor
     */
    processActivityReport(projectName: any, activityData: any): void;
    /**
     * Handle alert from project monitor
     */
    handleProjectAlert(projectName: any, alertData: any): void;
    /**
     * Save project data to file system
     */
    saveProjectData(projectName: any, dataType: any, data: any): void;
    /**
     * Start periodic tasks (health checks, reports)
     */
    startPeriodicTasks(): void;
    /**
     * Perform health check on all project monitors
     */
    performHealthCheck(): void;
    /**
     * Generate consolidated reports
     */
    generateReports(): Promise<void>;
    /**
     * Generate executive summary report
     */
    generateExecutiveSummary(): Promise<void>;
    /**
     * Get portfolio health overview
     */
    getPortfolioHealth(): {
        healthy: number;
        attention: number;
        critical: number;
        unknown: number;
    };
    /**
     * Generate executive summary markdown
     */
    generateExecutiveMarkdown(summary: any): string;
    /**
     * Calculate overall portfolio health score
     */
    calculateHealthScore(healthStatus: any): number;
    /**
     * Restart a project monitor
     */
    restartProjectMonitor(projectName: any): Promise<void>;
    /**
     * Gracefully stop the master controller
     */
    stop(): Promise<void>;
    /**
     * Send critical alert notification
     */
    sendCriticalAlert(projectName: any, alertData: any): void;
    /**
     * Utility functions
     */
    sleep(ms: any): Promise<any>;
    log(message: any, level?: string): void;
}
import EventEmitter = require("events");
//# sourceMappingURL=master-controller.d.ts.map