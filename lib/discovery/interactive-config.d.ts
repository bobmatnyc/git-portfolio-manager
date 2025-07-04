export = InteractiveConfigService;
declare class InteractiveConfigService {
    constructor(options?: {});
    workingDir: any;
    /**
     * Run complete interactive configuration setup
     */
    runSetup(discoveredProjects: any): Promise<{
        config: {
            server: {
                port: any;
                host: string;
                autoOpen: any;
            };
            directories: {
                scanCurrent: boolean;
                scanDepth: number;
                include: any;
                exclude: string[];
            };
            monitoring: {
                updateInterval: any;
                enableGitAnalysis: boolean;
                enableTrackDown: any;
                enableGitHubIssues: any;
                enableHealthChecks: boolean;
                staleThreshold: number;
                maxConcurrentScans: number;
            };
            dashboard: {
                theme: string;
                title: string;
                autoRefresh: boolean;
                showCharts: boolean;
                showTables: boolean;
            };
        };
        selectedProjects: any;
        hasTrackDown: any;
        hasGitHub: boolean;
    } | null>;
    /**
     * Interactive project selection
     */
    selectProjects(projects: any): Promise<any>;
    /**
     * Display project summary
     */
    displayProjectSummary(projects: any): void;
    /**
     * Select specific projects
     */
    selectSpecificProjects(projects: any): Promise<any>;
    /**
     * Select projects by type
     */
    selectByType(projects: any): Promise<any>;
    /**
     * Auto-select interesting projects
     */
    autoSelectProjects(projects: any): any;
    /**
     * Configure GitHub/TrackDown integration
     */
    configureIntegration(selectedProjects: any): Promise<{
        hasTrackDown: any;
        enableGitHub: boolean;
        githubToken: null;
    }>;
    /**
     * Configure basic settings
     */
    configureBasicSettings(): Promise<{
        serverPort: any;
        autoOpen: any;
        updateInterval: any;
    }>;
    /**
     * Generate final configuration object
     */
    generateConfiguration(selectedProjects: any, integrationConfig: any, basicConfig: any): {
        server: {
            port: any;
            host: string;
            autoOpen: any;
        };
        directories: {
            scanCurrent: boolean;
            scanDepth: number;
            include: any;
            exclude: string[];
        };
        monitoring: {
            updateInterval: any;
            enableGitAnalysis: boolean;
            enableTrackDown: any;
            enableGitHubIssues: any;
            enableHealthChecks: boolean;
            staleThreshold: number;
            maxConcurrentScans: number;
        };
        dashboard: {
            theme: string;
            title: string;
            autoRefresh: boolean;
            showCharts: boolean;
            showTables: boolean;
        };
    };
    /**
     * Format project for choice display
     */
    formatProjectChoice(project: any): string;
    /**
     * Get emoji for project type
     */
    getTypeEmoji(type: any): any;
    /**
     * Get color for project type
     */
    getTypeColor(type: any): any;
    /**
     * Get project summary statistics
     */
    getProjectSummary(projects: any): {
        total: any;
        byType: {};
        withTrackDown: number;
        withGitHub: number;
    };
}
//# sourceMappingURL=interactive-config.d.ts.map