#!/usr/bin/env node
export = ProjectMonitor;
declare class ProjectMonitor {
    constructor(options: any);
    projectName: any;
    projectPath: any;
    priority: any;
    projectType: any;
    config: any;
    scanInterval: number;
    isRunning: boolean;
    scanTimer: NodeJS.Timeout | null;
    lastScanData: {};
    healthStatus: string;
    githubClient: GitHubClient | null;
    githubRepo: {
        owner: any;
        repo: any;
    } | null;
    /**
     * Get scan interval based on project priority
     */
    getScanInterval(): number;
    /**
     * Start monitoring this project
     */
    start(): Promise<void>;
    /**
     * Perform comprehensive project scan
     */
    performScan(): Promise<void>;
    /**
     * Analyze Git activity and status
     */
    analyzeGitActivity(): Promise<{
        hasGit: boolean;
        currentBranch: null;
        commitsAhead: number;
        commitsBehind: number;
        uncommittedChanges: number;
        branches: never[];
        recentCommits: never[];
        lastCommitDate: null;
        remoteStatus: string;
    }>;
    /**
     * Get commits ahead/behind main branch
     */
    getCommitStatus(gitData: any): Promise<void>;
    /**
     * Get all branches with last activity
     */
    getBranches(gitData: any): Promise<void>;
    /**
     * Get recent commits (last 7 days)
     */
    getRecentCommits(gitData: any): Promise<void>;
    /**
     * Check remote synchronization status
     */
    checkRemoteStatus(gitData: any): Promise<void>;
    /**
     * Analyze file system for project activity
     */
    analyzeFileSystem(): Promise<{
        totalFiles: number;
        recentlyModified: number;
        hasPackageJson: boolean;
        hasPyprojectToml: boolean;
        hasTrackdown: boolean;
        hasClaude: boolean;
        lastModified: null;
    }>;
    /**
     * Count recently modified files
     */
    countRecentFiles(dir: any, since: any, count?: number): Promise<any>;
    /**
     * Analyze project documentation
     */
    analyzeDocumentation(): Promise<{
        hasReadme: boolean;
        hasClaude: boolean;
        hasTrackdownBacklog: boolean;
        hasProperStructure: boolean;
        documentationScore: number;
    }>;
    /**
     * Calculate documentation quality score
     */
    calculateDocumentationScore(docData: any): number;
    /**
     * Analyze GitHub Issues (if enabled and repository detected)
     */
    analyzeGitHubIssues(): Promise<{
        enabled: boolean;
        connected: boolean;
        repository: null;
        issues: never[];
        totalIssues: number;
        openIssues: number;
        closedIssues: number;
        lastUpdated: null;
        error: null;
    }>;
    /**
     * Detect GitHub repository from Git remote URLs
     */
    detectGitHubRepository(): Promise<void>;
    /**
     * Assess overall project health
     */
    assessProjectHealth(scanData: any): {
        status: string;
        score: number;
        issues: never[];
        recommendations: never[];
    };
    /**
     * Generate health improvement recommendations
     */
    generateHealthRecommendations(health: any, scanData: any): void;
    /**
     * Calculate business metrics
     */
    calculateBusinessMetrics(scanData: any): {
        priority: any;
        revenueImpact: string;
        daysSinceActivity: number | null;
        velocityIndicator: string;
        businessRisk: string;
    };
    /**
     * Determine revenue impact category
     */
    getRevenueImpact(): "DIRECT_REVENUE" | "STRATEGIC_INVESTMENT" | "COST_SAVINGS";
    /**
     * Calculate velocity indicator
     */
    calculateVelocity(scanData: any): "HIGH" | "MEDIUM" | "LOW" | "NONE";
    /**
     * Assess business risk level
     */
    assessBusinessRisk(scanData: any): "HIGH" | "MEDIUM" | "LOW" | "NONE";
    /**
     * Check for alerts and notifications
     */
    checkForAlerts(scanData: any): Promise<void>;
    /**
     * Calculate days since a given date
     */
    calculateDaysSince(dateString: any): number;
    /**
     * Send message to master controller
     */
    sendMessage(type: any, data: any): void;
    /**
     * Handle messages from master controller
     */
    handleMessage(message: any): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Logging utility
     */
    log(message: any, level?: string): void;
}
import GitHubClient = require("../github/github-client");
//# sourceMappingURL=project-monitor.d.ts.map