export = PortfolioDashboard;
/**
 * Portfolio Monitoring Dashboard - JavaScript
 *
 * Business Purpose: Interactive dashboard for portfolio project monitoring
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-014 Basic Web Dashboard Implementation
 */
declare class PortfolioDashboard {
    data: {
        projects: never[];
        summary: {};
        gitStatus: {};
        lastUpdate: null;
    };
    charts: {};
    refreshInterval: number;
    isLoading: boolean;
    selectedProject: any;
    /**
     * Initialize the dashboard
     */
    init(): Promise<void>;
    /**
     * Set up event listeners
     */
    setupEventListeners(): void;
    /**
     * Load data from monitoring system
     */
    loadData(forceRefresh?: boolean): Promise<void>;
    /**
     * Fetch executive summary data
     */
    fetchExecutiveSummary(): Promise<unknown>;
    /**
     * Fetch individual project data
     */
    fetchProjectData(): Promise<unknown>;
    /**
     * Fetch git status data
     */
    fetchGitStatusData(): Promise<unknown>;
    /**
     * Render the complete dashboard
     */
    renderDashboard(): void;
    /**
     * Update last update time
     */
    updateLastUpdateTime(): void;
    /**
     * Render executive summary cards
     */
    renderExecutiveSummary(): void;
    /**
     * Render portfolio-wide summary
     */
    renderPortfolioSummary(): void;
    /**
     * Render project-specific summary
     */
    renderProjectSpecificSummary(): void;
    /**
     * Render project list
     */
    renderProjectList(): void;
    /**
     * Render git status table
     */
    renderGitStatusTable(): void;
    /**
     * Render branch activity table
     */
    renderBranchActivityTable(): void;
    /**
     * Render issues tracking table
     */
    renderIssuesTable(): void;
    /**
     * Render charts
     */
    renderCharts(): void;
    /**
     * Render commits chart
     */
    renderCommitsChart(): void;
    /**
     * Render lines of code chart
     */
    renderLinesOfCodeChart(): void;
    /**
     * Helper functions
     */
    getHealthIcon(health: any): any;
    getHealthClass(health: any): any;
    getGitStatusBadge(git: any): string;
    updateElement(id: any, value: any): void;
    filterProjects(filter: any): void;
    setupAutoRefresh(): void;
    showLoadingState(): void;
    hideLoadingState(): void;
    showError(message: any): void;
    /**
     * Show detailed project information (stats only, no modal)
     */
    showProjectDetails(projectName: any): Promise<void>;
    /**
     * Load detailed project information for open branches and tickets
     */
    loadProjectDetails(projectName: any): Promise<void>;
    /**
     * Set selected project and update dashboard
     */
    setSelectedProject(projectName: any): void;
    /**
     * Clear selected project and return to portfolio view
     */
    clearSelectedProject(): void;
    /**
     * Update dashboard header title
     */
    updateDashboardHeader(title: any): void;
    /**
     * Generate weekly distribution from total commits
     */
    generateWeeklyDistribution(totalCommits: any): any[];
    /**
     * Show project details section with branches and tickets
     */
    showProjectDetailsSection(projectData: any): void;
    /**
     * Hide project details section
     */
    hideProjectDetailsSection(): void;
    /**
     * Render open branches list
     */
    renderOpenBranches(branches: any): void;
    /**
     * Render open tickets/issues list
     */
    renderOpenTickets(backlog: any): void;
}
//# sourceMappingURL=dashboard.d.ts.map