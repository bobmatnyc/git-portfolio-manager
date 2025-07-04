export = ConfigLoader;
declare class ConfigLoader {
    constructor(options?: {});
    workingDir: any;
    configCache: any;
    /**
     * Load configuration from various sources
     */
    loadConfig(configPath?: null): Promise<any>;
    /**
     * Load configuration from file (YAML or JS)
     */
    loadConfigFile(configPath: any): Promise<any>;
    /**
     * Parse individual config file
     */
    parseConfigFile(filePath: any): Promise<any>;
    /**
     * Load configuration from environment variables
     */
    loadEnvironmentConfig(): {
        server: any;
        directories: any;
        monitoring: any;
        logging: {
            level: string;
        };
        github: {
            token: string;
        };
    };
    /**
     * Get default configuration
     */
    getDefaultConfig(): {
        server: {
            port: number;
            host: string;
            autoOpen: boolean;
        };
        directories: {
            scanCurrent: boolean;
            scanDepth: number;
            include: never[];
            exclude: string[];
        };
        monitoring: {
            updateInterval: number;
            enableGitAnalysis: boolean;
            enableTrackDown: boolean;
            enableGitHubIssues: boolean;
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
     * Deep merge configuration objects
     */
    mergeConfigs(base: any, override: any): any;
    /**
     * Post-process configuration (resolve paths, etc.)
     */
    postProcessConfig(config: any): any;
    /**
     * Create example configuration file
     */
    createExampleConfig(outputPath?: null): Promise<string>;
    /**
     * Clear configuration cache
     */
    clearCache(): void;
}
//# sourceMappingURL=config-loader.d.ts.map