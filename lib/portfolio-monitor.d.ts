export = PortfolioMonitor;
declare class PortfolioMonitor {
    constructor(options?: {});
    workingDir: any;
    options: {};
    config: any;
    masterController: MasterController | null;
    dashboardServer: DashboardServer | null;
    isRunning: boolean;
    /**
     * Initialize the portfolio monitor
     */
    initialize(): Promise<void>;
    /**
     * Merge CLI options with configuration
     */
    mergeCliOptions(): void;
    /**
     * Scan for projects
     */
    scanProjects(): Promise<any[]>;
    /**
     * Start the dashboard server
     */
    startDashboard(): Promise<{
        url: string;
        port: any;
        host: any;
    }>;
    /**
     * Start the monitoring system
     */
    startMonitoring(): Promise<void>;
    monitoringInterval: NodeJS.Timeout | undefined;
    /**
     * Get portfolio information
     */
    getInfo(): Promise<{
        workingDir: any;
        projectCount: number;
        gitRepoCount: number;
        trackdownCount: number;
        dataDir: any;
        lastScan: string;
        projects: {
            name: any;
            type: any;
            health: any;
            hasGit: any;
            hasTrackdown: any;
        }[];
    }>;
    /**
     * Find an available port starting from the specified port
     */
    findAvailablePort(startPort: any): Promise<any>;
    /**
     * Stop monitoring
     */
    stop(): Promise<void>;
}
import MasterController = require("./monitor/master-controller");
import DashboardServer = require("./dashboard/server");
//# sourceMappingURL=portfolio-monitor.d.ts.map