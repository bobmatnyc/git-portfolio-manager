export = ProjectDiscoveryService;
declare class ProjectDiscoveryService {
    constructor(options?: {});
    workingDir: any;
    maxDepth: any;
    excludeDirs: any;
    /**
     * Discover all Git repositories starting from the working directory
     * Only scans subdirectories (never parent directories or external paths)
     */
    discoverGitRepositories(spinner?: null): Promise<any[]>;
    /**
     * Recursively scan directory for Git repositories
     */
    scanDirectoryForGit(dirPath: any, depth: any, projects: any, spinner?: null): Promise<void>;
    /**
     * Check if directory should be excluded from scanning
     */
    shouldExcludeDirectory(dirName: any): any;
    /**
     * Analyze a Git repository to extract metadata
     */
    analyzeGitRepository(repoPath: any): Promise<{
        name: string;
        path: any;
        relativePath: string;
        type: string;
        hasTrackDown: boolean;
        hasGitHubRemote: boolean;
        remoteUrl: null;
        lastCommit: null;
        branches: never[];
        packageManager: null;
        selected: boolean;
    } | {
        name: string;
        path: any;
        relativePath: string;
        type: string;
        hasTrackDown: boolean;
        hasGitHubRemote: boolean;
        selected: boolean;
    }>;
    /**
     * Determine project type based on files present
     */
    determineProjectType(repoPath: any): Promise<string>;
    /**
     * Check if repository has TrackDown files
     */
    hasTrackDownFiles(repoPath: any): Promise<boolean>;
    /**
     * Get Git repository information
     */
    getGitInformation(repoPath: any): Promise<{
        hasGitHubRemote: boolean;
        remoteUrl: null;
        lastCommit: null;
        branches: never[];
    }>;
    /**
     * Get summary statistics of discovered projects
     */
    getDiscoverySummary(projects: any): {
        total: any;
        byType: {};
        withTrackDown: number;
        withGitHub: number;
        selected: number;
    };
    /**
     * Format project for display in selection interface
     */
    formatProjectForDisplay(project: any): {
        name: string;
        value: any;
        short: any;
    };
}
//# sourceMappingURL=project-discovery.d.ts.map