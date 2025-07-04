#!/usr/bin/env node
export = DashboardServer;
declare class DashboardServer {
    constructor(options?: {});
    port: any;
    host: any;
    dashboardDir: any;
    reportsDir: any;
    dataDir: any;
    server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> | null;
    mimeTypes: {
        ".html": string;
        ".js": string;
        ".css": string;
        ".json": string;
        ".ico": string;
        ".png": string;
        ".jpg": string;
        ".gif": string;
        ".svg": string;
    };
    /**
     * Start the web server
     */
    start(): void;
    /**
     * Handle incoming HTTP requests
     */
    handleRequest(req: any, res: any): Promise<void>;
    /**
     * Handle API requests
     */
    handleApiRequest(req: any, res: any, pathname: any): Promise<void>;
    /**
     * Handle static file requests
     */
    handleStaticRequest(req: any, res: any, pathname: any): Promise<void>;
    /**
     * Handle summary API request
     */
    handleSummaryRequest(res: any): Promise<void>;
    /**
     * Handle projects API request
     */
    handleProjectsRequest(res: any): Promise<void>;
    /**
     * Handle git status API request
     */
    handleGitStatusRequest(res: any): Promise<void>;
    /**
     * Handle activity API request
     */
    handleActivityRequest(res: any): Promise<void>;
    /**
     * Handle health check request
     */
    handleHealthRequest(res: any): Promise<void>;
    /**
     * Handle project detail request
     */
    handleProjectDetailRequest(res: any, projectName: any): Promise<void>;
    /**
     * Aggregate project data from monitoring system
     */
    aggregateProjectData(): Promise<{
        name: string;
        priority: string;
        type: string;
        health: string;
        git: {
            currentBranch: string;
            commitsAhead: number;
            commitsBehind: number;
            branches: number;
            lastActivity: string;
            uncommittedChanges: number;
        };
        activity: {
            commits7d: number;
            linesAdded: number;
            linesRemoved: number;
        };
    }[] | {
        name: any;
        priority: any;
        type: string;
        health: any;
        git: {
            currentBranch: any;
            commitsAhead: any;
            commitsBehind: any;
            branches: any;
            lastActivity: string;
            uncommittedChanges: any;
        };
        activity: {
            commits7d: any;
            linesAdded: any;
            linesRemoved: number;
        };
        timestamp: any;
    }[]>;
    /**
     * Load latest project data from monitoring files
     */
    loadLatestProjectData(projectDir: any, projectName: any): Promise<{
        name: any;
        priority: any;
        type: string;
        health: any;
        git: {
            currentBranch: any;
            commitsAhead: any;
            commitsBehind: any;
            branches: any;
            lastActivity: string;
            uncommittedChanges: any;
        };
        activity: {
            commits7d: any;
            linesAdded: any;
            linesRemoved: number;
        };
        timestamp: any;
    } | null>;
    /**
     * Aggregate git status across all projects
     */
    aggregateGitStatus(): Promise<{
        totalBranches: number;
        activeBranches: number;
        staleBranches: number;
        behindMainCount: number;
        aheadMainCount: number;
        uncommittedCount: number;
        mergedThisWeek: number;
        pushesThisWeek: number;
    }>;
    /**
     * Aggregate activity data
     */
    aggregateActivityData(): Promise<{
        commitsToday: number;
        commitsThisWeek: number;
        linesAddedToday: number;
        linesRemovedToday: number;
        activeDevelopers: number;
        chartData: {
            commits7d: number[];
            lines7d: number[];
        };
    }>;
    /**
     * Generate summary data from real project data
     */
    generateRealSummary(): Promise<{
        timestamp: string;
        totalProjects: number;
        activeMonitors: number;
        healthStatus: {
            healthy: number;
            attention: number;
            critical: number;
            unknown: number;
        };
        activitySummary: {
            totalCommits: number;
            activeBranches: number;
            behindMain: number;
            pendingPushes: number;
            openPRs: number;
        };
    }>;
    /**
     * Generate mock project data
     */
    generateMockProjects(): {
        name: string;
        priority: string;
        type: string;
        health: string;
        git: {
            currentBranch: string;
            commitsAhead: number;
            commitsBehind: number;
            branches: number;
            lastActivity: string;
            uncommittedChanges: number;
        };
        activity: {
            commits7d: number;
            linesAdded: number;
            linesRemoved: number;
        };
    }[];
    /**
     * Send JSON response
     */
    sendJsonResponse(res: any, data: any): void;
    /**
     * Send error response
     */
    sendErrorResponse(res: any, statusCode: any, message: any): void;
    /**
     * Format timestamp to "X time ago" format
     */
    formatTimeAgo(dateString: any): string;
    /**
     * Parse TrackDown backlog markdown to extract issues
     */
    parseTrackDownBacklog(content: any): {
        id: any;
        description: any;
        status: string;
        type: string;
    }[];
}
import http = require("node:http");
//# sourceMappingURL=server.d.ts.map