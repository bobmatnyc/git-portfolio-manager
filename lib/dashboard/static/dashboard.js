/**
 * Portfolio Monitoring Dashboard - JavaScript
 * 
 * Business Purpose: Interactive dashboard for portfolio project monitoring
 * Project Manager: Claude (AI Project Manager)
 * Epic: EP-002 Core Monitoring System
 * User Story: US-014 Basic Web Dashboard Implementation
 */

class PortfolioDashboard {
    constructor() {
        this.data = {
            projects: [],
            summary: {},
            gitStatus: {},
            lastUpdate: null
        };
        
        this.charts = {};
        this.refreshInterval = 30000; // 30 seconds
        this.isLoading = false;
        this.selectedProject = null; // Track currently selected project
        
        console.log('📊 Portfolio Dashboard initialized');
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadData();
            this.renderDashboard();
            this.setupAutoRefresh();
            await this.loadGitHubUsername();
            this.initializeNavigation();
            
            console.log('✅ Dashboard initialization complete');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Project filter
        const filterSelect = document.getElementById('projectFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterProjects(e.target.value);
            });
        }

        // Refresh button (if exists)
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData(true);
            });
        }

        // Time period selectors for charts
        document.querySelectorAll('[data-period]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                this.updateChartPeriod(period);
            });
        });
    }

    /**
     * Load data from monitoring system
     */
    async loadData(forceRefresh = false) {
        if (this.isLoading && !forceRefresh) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            // Load executive summary
            const summary = await this.fetchExecutiveSummary();
            
            // Load project data
            const projects = await this.fetchProjectData();
            
            // Load git status data
            const gitStatus = await this.fetchGitStatusData();
            
            // Update internal data
            this.data = {
                summary,
                projects,
                gitStatus,
                lastUpdate: new Date()
            };

            console.log('📊 Data loaded successfully:', this.data);
            
        } catch (error) {
            console.error('❌ Failed to load data:', error);
            this.showError('Failed to load monitoring data');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    /**
     * Fetch executive summary data
     */
    async fetchExecutiveSummary() {
        try {
            const response = await fetch('/api/summary');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Executive summary not available, using mock data');
        }
        
        // Return mock data for demonstration
        return {
            timestamp: new Date().toISOString(),
            totalProjects: 18,
            activeMonitors: 18,
            healthStatus: {
                healthy: 8,
                attention: 6,
                critical: 2,
                unknown: 2
            },
            activitySummary: {
                totalCommits: 142,
                activeBranches: 47,
                behindMain: 8,
                pendingPushes: 12,
                openPRs: 15
            }
        };
    }

    /**
     * Fetch individual project data
     */
    async fetchProjectData() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Project data not available, using mock data');
        }
        
        // Mock project data based on monitoring system output
        return [
            {
                name: 'ai-power-rankings',
                priority: 'HIGH',
                type: 'revenue',
                health: 'healthy',
                git: {
                    currentBranch: 'feature/rankings',
                    commitsAhead: 3,
                    commitsBehind: 0,
                    branches: 3,
                    lastActivity: '2 hours ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 15,
                    linesAdded: 847,
                    linesRemoved: 203
                }
            },
            {
                name: 'matsuoka-com',
                priority: 'HIGH',
                type: 'revenue',
                health: 'healthy',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 0,
                    commitsBehind: 0,
                    branches: 2,
                    lastActivity: '4 hours ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 8,
                    linesAdded: 423,
                    linesRemoved: 156
                }
            },
            {
                name: 'scraper-engine',
                priority: 'HIGH',
                type: 'revenue',
                health: 'attention',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 0,
                    commitsBehind: 5,
                    branches: 5,
                    lastActivity: '2 days ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 3,
                    linesAdded: 127,
                    linesRemoved: 89
                }
            },
            {
                name: 'eva-agent',
                priority: 'MEDIUM',
                type: 'strategic',
                health: 'attention',
                git: {
                    currentBranch: 'develop',
                    commitsAhead: 2,
                    commitsBehind: 0,
                    branches: 4,
                    lastActivity: '3 days ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 1,
                    linesAdded: 89,
                    linesRemoved: 23
                }
            },
            {
                name: 'hot-flash',
                priority: 'MEDIUM',
                type: 'revenue',
                health: 'critical',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 0,
                    commitsBehind: 8,
                    branches: 1,
                    lastActivity: '7 days ago',
                    uncommittedChanges: 5
                },
                activity: {
                    commits7d: 0,
                    linesAdded: 0,
                    linesRemoved: 0
                }
            },
            {
                name: 'ai-code-review',
                priority: 'MEDIUM',
                type: 'strategic',
                health: 'healthy',
                git: {
                    currentBranch: 'main',
                    commitsAhead: 1,
                    commitsBehind: 0,
                    branches: 2,
                    lastActivity: '1 day ago',
                    uncommittedChanges: 0
                },
                activity: {
                    commits7d: 5,
                    linesAdded: 234,
                    linesRemoved: 67
                }
            }
        ];
    }

    /**
     * Fetch git status data
     */
    async fetchGitStatusData() {
        try {
            const response = await fetch('/api/git-status');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Git status data not available, using mock data');
        }
        
        // Mock git status data
        return {
            totalBranches: 47,
            behindMainCount: 8,
            uncommittedCount: 12,
            mergedThisWeek: 12,
            pushesThisWeek: 89
        };
    }

    /**
     * Render the complete dashboard
     */
    renderDashboard() {
        this.updateLastUpdateTime();
        this.populateToolchainFilter();
        this.renderExecutiveSummary();
        this.renderProjectList();
        this.renderGitStatusTable();
        this.renderBranchActivityTable();
        this.renderIssuesTable();
        this.renderCharts();
    }

    /**
     * Populate toolchain filter with only available toolchains
     */
    populateToolchainFilter() {
        const filterSelect = document.getElementById('projectFilter');
        if (!filterSelect) return;

        const projects = this.data.projects || [];
        const availableToolchains = new Set();
        
        // Collect all unique toolchains from projects
        projects.forEach(project => {
            if (project.toolchain) {
                availableToolchains.add(project.toolchain);
            }
        });

        // Get current selection
        const currentValue = filterSelect.value;
        
        // Clear and repopulate options
        filterSelect.innerHTML = '<option value="all">All Toolchains</option>';
        
        // Add available toolchains
        Array.from(availableToolchains).sort().forEach(toolchain => {
            const option = document.createElement('option');
            option.value = toolchain.toLowerCase();
            option.textContent = toolchain;
            filterSelect.appendChild(option);
        });

        // Restore selection if it's still valid
        if (currentValue && Array.from(filterSelect.options).some(opt => opt.value === currentValue)) {
            filterSelect.value = currentValue;
        }
    }

    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement && this.data.lastUpdate) {
            const timeString = this.data.lastUpdate.toLocaleTimeString();
            lastUpdateElement.innerHTML = `Last Update: <span class="font-medium">${timeString}</span>`;
        }
    }

    /**
     * Render executive summary cards
     */
    renderExecutiveSummary() {
        if (this.selectedProject) {
            this.renderProjectSpecificSummary();
        } else {
            this.renderPortfolioSummary();
        }
    }
    
    /**
     * Render portfolio-wide summary
     */
    renderPortfolioSummary() {
        const { healthStatus, activitySummary } = this.data.summary;

        // Health status cards
        this.updateElement('healthyCount', healthStatus.healthy);
        this.updateElement('attentionCount', healthStatus.attention);
        this.updateElement('criticalCount', healthStatus.critical);
        
        // Activity summary
        this.updateElement('totalActivity', activitySummary.totalCommits);
        this.updateElement('activeBranches', activitySummary.activeBranches);
        this.updateElement('behindMain', activitySummary.behindMain);
        this.updateElement('pendingPushes', activitySummary.pendingPushes);
        this.updateElement('openPRs', activitySummary.openPRs);

        // Update trends (mock data)
        this.updateElement('healthyTrend', 'Portfolio view');
        this.updateElement('attentionTrend', 'All projects');
        this.updateElement('criticalTrend', 'Overall status');
        this.updateElement('activityTrend', 'Total activity');
        this.updateElement('newBranches', 'All branches');
        
        // Update header to show portfolio view
        this.updateDashboardHeader('Portfolio Overview');
    }
    
    /**
     * Render project-specific summary
     */
    renderProjectSpecificSummary() {
        const project = this.data.projects.find(p => p.name === this.selectedProject);
        if (!project) return;

        // Health status (show 1 or 0 for each category)
        this.updateElement('healthyCount', project.health === 'healthy' ? 1 : 0);
        this.updateElement('attentionCount', project.health === 'attention' ? 1 : 0);
        this.updateElement('criticalCount', project.health === 'critical' ? 1 : 0);
        
        // Activity summary for this project
        this.updateElement('totalActivity', project.activity.commits7d || 0);
        this.updateElement('activeBranches', project.git.branches || 0);
        this.updateElement('behindMain', project.git.commitsBehind > 0 ? 1 : 0);
        this.updateElement('pendingPushes', project.git.uncommittedChanges > 0 ? 1 : 0);
        this.updateElement('openPRs', Math.floor((project.git.branches || 0) * 0.3)); // Estimate

        // Update trends with project-specific info
        this.updateElement('healthyTrend', project.health);
        this.updateElement('attentionTrend', `${project.git.currentBranch}`);
        this.updateElement('criticalTrend', project.toolchain || 'Unknown');
        this.updateElement('activityTrend', project.git.lastActivity);
        this.updateElement('newBranches', `${project.git.commitsAhead}↑ ${project.git.commitsBehind}↓`);
        
        // Update header to show selected project
        this.updateDashboardHeader(`${this.selectedProject} - Project Details`);
    }

    /**
     * Render project list
     */
    renderProjectList() {
        const projectListElement = document.getElementById('projectList');
        if (!projectListElement) return;

        let projects = this.data.projects || [];
        
        // Apply toolchain filter if set
        if (this.currentFilter && this.currentFilter !== 'all') {
            projects = projects.filter(project => 
                project.toolchain && project.toolchain.toLowerCase() === this.currentFilter
            );
        }
        
        projectListElement.innerHTML = projects.map(project => {
            const healthIcon = this.getHealthIcon(project.health);
            const healthClass = this.getHealthClass(project.health);
            const isSelected = this.selectedProject === project.name;
            const selectedClass = isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : '';
            
            return `
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg ${healthClass} ${selectedClass} hover:shadow-md transition-all">
                    <div class="flex items-center space-x-3 cursor-pointer flex-1" onclick="window.dashboard.showProjectDetails('${project.name}')">
                        <div class="flex-shrink-0">
                            ${healthIcon}
                        </div>
                        <div>
                            <div class="flex items-center space-x-2">
                                <h3 class="font-medium text-gray-900">${project.name}</h3>
                                <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                    ${project.toolchain || 'Unknown'}
                                </span>
                                ${isSelected ? '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Selected</span>' : ''}
                            </div>
                            <div class="text-sm text-gray-600 mt-1">
                                Current: ${project.git.currentBranch} | 
                                ${project.git.branches} open branches | 
                                Last: ${project.git.lastActivity}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="text-right">
                            <div class="text-sm font-medium">
                                main ↑${project.git.commitsAhead} ↓${project.git.commitsBehind}
                            </div>
                            <div class="text-xs text-gray-500">
                                ${project.activity.commits7d} commits/week
                            </div>
                            <div class="text-xs ${isSelected ? 'text-blue-700' : 'text-blue-600'} font-medium mt-1">
                                ${isSelected ? '✓ Selected' : 'Click to select →'}
                            </div>
                        </div>
                        <button onclick="event.stopPropagation(); window.dashboard.removeProject('${project.name}')" 
                                class="flex items-center justify-center w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Remove project from portfolio">
                            <i data-lucide="trash-2" class="h-4 w-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render git status table
     */
    renderGitStatusTable() {
        const tableElement = document.getElementById('gitStatusTable');
        if (!tableElement) return;

        let projects = this.data.projects || [];
        
        // Filter to selected project if one is selected
        if (this.selectedProject) {
            projects = projects.filter(p => p.name === this.selectedProject);
        }
        
        tableElement.innerHTML = projects.map(project => {
            const statusBadge = this.getGitStatusBadge(project.git);
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="font-medium text-gray-900">${project.name}</div>
                            <div class="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                ${project.toolchain || 'Unknown'}
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${project.git.currentBranch}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        ↑${project.git.commitsAhead} ↓${project.git.commitsBehind}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${project.git.branches}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render branch activity table
     */
    renderBranchActivityTable() {
        const tableElement = document.getElementById('branchActivityTable');
        if (!tableElement) return;

        let projects = this.data.projects || [];
        
        // Filter to selected project if one is selected
        if (this.selectedProject) {
            projects = projects.filter(p => p.name === this.selectedProject);
        }
        
        tableElement.innerHTML = projects.map(project => {
            // Mock data for merged branches and pushes
            const mergedThisWeek = Math.floor(Math.random() * 3);
            const pushesThisWeek = Math.floor(Math.random() * 20);
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        ${project.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${project.git.branches}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${mergedThisWeek}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${pushesThisWeek}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${project.git.lastActivity}
                        <div class="text-xs text-gray-400">(${project.git.currentBranch})</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render issues tracking table
     */
    renderIssuesTable() {
        const tableElement = document.getElementById('issuesTable');
        if (!tableElement) return;

        let projects = this.data.projects || [];
        
        // Filter to selected project if one is selected
        if (this.selectedProject) {
            projects = projects.filter(p => p.name === this.selectedProject);
        } else {
            projects = projects.slice(0, 3); // Show top 3 for portfolio view
        }
        
        // Update summary stats based on filtered projects
        const totalOpen = projects.length * 5; // Estimated
        const totalClosed = projects.length * 20; // Estimated
        const velocity = projects.reduce((sum, p) => sum + (p.activity?.commits7d || 0), 0);
        
        this.updateElement('openIssues', totalOpen.toString());
        this.updateElement('closedIssues', totalClosed.toString());
        this.updateElement('weeklyVelocity', `+${velocity}`);
        
        tableElement.innerHTML = projects.map(project => {
            // Mock issue data
            const openIssues = Math.floor(Math.random() * 15) + 1;
            const closedThisWeek = Math.floor(Math.random() * 10);
            const trend = ['↗️', '↘️', '→'][Math.floor(Math.random() * 3)];
            
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        ${project.name}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${openIssues}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${closedThisWeek}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-lg">
                        ${trend}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render charts
     */
    renderCharts() {
        this.renderCommitsChart();
        this.renderLinesOfCodeChart();
    }

    /**
     * Render commits chart
     */
    renderCommitsChart() {
        const canvas = document.getElementById('commitsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.commits) {
            this.charts.commits.destroy();
        }

        // Get data based on selection
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let data, chartTitle;
        
        if (this.selectedProject) {
            const project = this.data.projects.find(p => p.name === this.selectedProject);
            if (project) {
                // Generate project-specific commit data
                const weeklyCommits = project.activity.commits7d || 0;
                data = this.generateWeeklyDistribution(weeklyCommits);
                chartTitle = `${this.selectedProject} - Weekly Commits`;
            } else {
                data = [0, 0, 0, 0, 0, 0, 0];
                chartTitle = 'No Data';
            }
        } else {
            // Portfolio-wide data
            data = [12, 19, 3, 5, 2, 3, 20];
            chartTitle = 'Portfolio Commits';
        }

        this.charts.commits = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: data,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: this.selectedProject ? 1 : 5
                        }
                    }
                }
            }
        });
    }

    /**
     * Render lines of code chart
     */
    renderLinesOfCodeChart() {
        const canvas = document.getElementById('locChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.loc) {
            this.charts.loc.destroy();
        }

        // Get data based on selection
        let projects, addedLines, removedLines;
        
        if (this.selectedProject) {
            const project = this.data.projects.find(p => p.name === this.selectedProject);
            if (project) {
                projects = [project.name];
                addedLines = [project.activity.linesAdded || 0];
                removedLines = [project.activity.linesRemoved || 0];
            } else {
                projects = ['No Data'];
                addedLines = [0];
                removedLines = [0];
            }
        } else {
            // Portfolio-wide data
            const topProjects = this.data.projects.slice(0, 3);
            projects = topProjects.map(p => p.name);
            addedLines = topProjects.map(p => p.activity.linesAdded || 0);
            removedLines = topProjects.map(p => p.activity.linesRemoved || 0);
        }

        this.charts.loc = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: projects,
                datasets: [{
                    label: 'Lines Added',
                    data: addedLines,
                    backgroundColor: 'rgb(34, 197, 94)'
                }, {
                    label: 'Lines Removed',
                    data: removedLines,
                    backgroundColor: 'rgb(239, 68, 68)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Helper functions
     */
    getHealthIcon(health) {
        const icons = {
            healthy: '<i data-lucide="check-circle" class="h-5 w-5 text-green-500"></i>',
            attention: '<i data-lucide="alert-triangle" class="h-5 w-5 text-yellow-500"></i>',
            critical: '<i data-lucide="alert-octagon" class="h-5 w-5 text-red-500"></i>',
            unknown: '<i data-lucide="help-circle" class="h-5 w-5 text-gray-400"></i>'
        };
        return icons[health] || icons.unknown;
    }

    getHealthClass(health) {
        const classes = {
            healthy: 'border-green-200 bg-green-50',
            attention: 'border-yellow-200 bg-yellow-50',
            critical: 'border-red-200 bg-red-50',
            unknown: 'border-gray-200 bg-gray-50'
        };
        return classes[health] || classes.unknown;
    }

    getGitStatusBadge(git) {
        if (git.uncommittedChanges > 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                🔴 Uncommitted (${git.uncommittedChanges})
            </span>`;
        }
        
        if (git.commitsBehind > 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                🟡 Behind
            </span>`;
        }
        
        if (git.commitsAhead > 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🟢 Ahead
            </span>`;
        }
        
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            🟢 Up to date
        </span>`;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    filterProjects(filter) {
        console.log('Filtering projects by:', filter);
        
        // Store the current filter
        this.currentFilter = filter;
        
        // Re-render dashboard with filtered data
        this.renderProjectList();
        this.renderGitStatusTable();
        this.renderBranchActivityTable();
        this.renderIssuesTable();
        this.renderCharts();
    }

    setupAutoRefresh() {
        setInterval(() => {
            this.loadData();
        }, this.refreshInterval);
    }

    showLoadingState() {
        // Add loading indicators
        console.log('Loading data...');
    }

    hideLoadingState() {
        // Remove loading indicators
        console.log('Loading complete');
    }

    showError(message) {
        console.error('Dashboard error:', message);
        // Could implement toast notifications here
    }
    
    /**
     * Show detailed project information (stats only, no modal)
     */
    async showProjectDetails(projectName) {
        try {
            console.log(`Selecting project: ${projectName}`);
            
            // Update dashboard to show project-specific stats
            this.setSelectedProject(projectName);
            
            // Load and display project details
            await this.loadProjectDetails(projectName);
            
        } catch (error) {
            console.error('Error selecting project:', error);
            this.showError(`Failed to select project ${projectName}`);
        }
    }
    
    /**
     * Load detailed project information for open branches and tickets
     */
    async loadProjectDetails(projectName) {
        try {
            // Fetch detailed project data
            const response = await fetch(`/api/projects/${projectName}`);
            if (!response.ok) {
                throw new Error('Failed to load project details');
            }
            
            const projectDetails = await response.json();
            console.log('Project details loaded:', projectDetails);
            
            // Show project details section
            this.showProjectDetailsSection(projectDetails);
            
        } catch (error) {
            console.error('Error loading project details:', error);
            this.hideProjectDetailsSection();
        }
    }
    
    /**
     * Set selected project and update dashboard
     */
    setSelectedProject(projectName) {
        this.selectedProject = projectName;
        this.renderDashboard();
    }
    
    /**
     * Clear selected project and return to portfolio view
     */
    clearSelectedProject() {
        this.selectedProject = null;
        this.hideProjectDetailsSection();
        this.renderDashboard();
    }

    /**
     * Remove project from portfolio
     */
    async removeProject(projectName) {
        if (!confirm(`Are you sure you want to remove "${projectName}" from the portfolio?\n\nThis will only remove it from monitoring, not delete the actual project files.`)) {
            return;
        }

        try {
            console.log(`🗑️ Removing project: ${projectName}`);
            
            const response = await fetch(`/api/projects/${encodeURIComponent(projectName)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to remove project: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Project removed:', result);

            // Show success message
            this.showNotification(`Project "${projectName}" removed from portfolio`, 'success');

            // Clear selection if this project was selected
            if (this.selectedProject === projectName) {
                this.clearSelectedProject();
            }

            // Refresh dashboard data
            await this.loadData(true);
            this.renderDashboard();

        } catch (error) {
            console.error('❌ Failed to remove project:', error);
            this.showNotification(`Failed to remove project "${projectName}": ${error.message}`, 'error');
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
    
    /**
     * Update dashboard header title
     */
    updateDashboardHeader(title) {
        const headerElement = document.querySelector('h1');
        if (headerElement) {
            headerElement.textContent = title;
        }
        
        // Show/hide clear selection button
        const clearBtn = document.getElementById('clearSelectionBtn');
        if (clearBtn) {
            clearBtn.style.display = this.selectedProject ? 'flex' : 'none';
        }
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Generate weekly distribution from total commits
     */
    generateWeeklyDistribution(totalCommits) {
        if (totalCommits === 0) return [0, 0, 0, 0, 0, 0, 0];
        
        // Distribute commits across the week with some randomness
        const distribution = [];
        let remaining = totalCommits;
        
        for (let i = 0; i < 6; i++) {
            const max = Math.max(1, Math.floor(remaining / (7 - i)));
            const commits = Math.floor(Math.random() * max);
            distribution.push(commits);
            remaining -= commits;
        }
        distribution.push(remaining); // Assign remaining to last day
        
        return distribution;
    }
    
    /**
     * Show project details section with branches and tickets
     */
    showProjectDetailsSection(projectData) {
        const section = document.getElementById('projectDetailsSection');
        if (!section) return;
        
        // Show the section
        section.style.display = 'block';
        
        // Render open branches
        this.renderOpenBranches(projectData.details?.branches || []);
        
        // Render open tickets
        this.renderOpenTickets(projectData.details?.backlog || []);
        
        // Re-initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Hide project details section
     */
    hideProjectDetailsSection() {
        const section = document.getElementById('projectDetailsSection');
        if (section) {
            section.style.display = 'none';
        }
    }
    
    /**
     * Render open branches list
     */
    renderOpenBranches(branches) {
        const container = document.getElementById('openBranchesList');
        if (!container) return;
        
        if (!branches || branches.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No branches found</p>';
            return;
        }
        
        container.innerHTML = branches.map(branch => {
            const isStale = branch.daysSinceActivity > 14;
            const isMain = branch.name === 'main' || branch.name === 'master';
            const staleClass = isStale ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50';
            const mainClass = isMain ? 'border-blue-200 bg-blue-50' : '';
            
            return `
                <div class="p-4 rounded-lg border ${isMain ? mainClass : staleClass}">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="git-branch" class="h-4 w-4 ${isMain ? 'text-blue-600' : isStale ? 'text-red-600' : 'text-green-600'}"></i>
                            <code class="font-mono text-sm font-medium">${branch.name}</code>
                            ${isMain ? '<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Main</span>' : ''}
                            ${isStale && !isMain ? '<span class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Stale</span>' : ''}
                        </div>
                        <span class="text-xs text-gray-500">${branch.daysSinceActivity}d ago</span>
                    </div>
                    <div class="text-sm text-gray-600">
                        <div class="flex items-center space-x-4">
                            <span>by ${branch.lastAuthor}</span>
                            <span>•</span>
                            <span>${branch.lastCommit}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render open tickets/issues list
     */
    renderOpenTickets(backlog) {
        const container = document.getElementById('openTicketsList');
        if (!container) return;
        
        if (!backlog || backlog.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No backlog items found</p>';
            return;
        }
        
        // Filter to only show open/pending items
        const openItems = backlog.filter(item => item.status !== 'completed');
        
        if (openItems.length === 0) {
            container.innerHTML = '<p class="text-green-600 text-sm">✅ All tickets completed!</p>';
            return;
        }
        
        container.innerHTML = openItems.map(issue => {
            const typeClass = issue.type === 'user_story' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
            const priorityClass = issue.priority === 'high' ? 'bg-red-100 text-red-700' : 
                                 issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                                 'bg-green-100 text-green-700';
            
            return `
                <div class="p-4 rounded-lg border border-gray-200 bg-white">
                    <div class="flex items-start space-x-3">
                        <i data-lucide="circle" class="h-4 w-4 mt-0.5 text-gray-400"></i>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <code class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">${issue.id}</code>
                                <span class="text-xs px-2 py-1 rounded ${typeClass}">${issue.type.replace('_', ' ')}</span>
                                ${issue.priority ? `<span class="text-xs px-2 py-1 rounded ${priorityClass}">${issue.priority}</span>` : ''}
                            </div>
                            <p class="text-sm text-gray-900 font-medium mb-1">${issue.description}</p>
                            <div class="text-xs text-gray-500">
                                Status: ${issue.status}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Discovery Management Methods
     */
    async triggerDiscovery() {
        const btn = document.getElementById('triggerDiscoveryBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i data-lucide="loader" class="h-4 w-4 animate-spin"></i><span>Running...</span>';
            btn.disabled = true;
            
            const response = await fetch('/api/discovery/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Discovery triggered successfully', 'success');
                // Refresh data after discovery
                setTimeout(() => this.loadData(), 2000);
            } else {
                this.showNotification(result.message || 'Discovery failed', 'error');
            }
        } catch (error) {
            console.error('Discovery trigger failed:', error);
            this.showNotification('Failed to trigger discovery', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            lucide.createIcons();
        }
    }

    async toggleAddSiteDropdown() {
        const dropdown = document.getElementById('addSiteDropdown');
        const isVisible = dropdown.style.display !== 'none';
        
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            // Load directories when opening dropdown
            await this.loadDirectories();
            dropdown.style.display = 'block';
        }
    }

    async loadDirectories() {
        const select = document.getElementById('directorySelect');
        
        try {
            const response = await fetch('/api/discovery/directories');
            const data = await response.json();
            
            select.innerHTML = '<option value="">Select a directory...</option>';
            
            // Group directories by source
            const tracked = data.directories.filter(d => d.tracked);
            const suggestions = data.directories.filter(d => !d.tracked);
            
            if (tracked.length > 0) {
                const trackedGroup = document.createElement('optgroup');
                trackedGroup.label = 'Currently Tracked';
                tracked.forEach(dir => {
                    const option = document.createElement('option');
                    option.value = dir.path;
                    option.textContent = `${dir.path} (tracked)`;
                    option.disabled = true;
                    trackedGroup.appendChild(option);
                });
                select.appendChild(trackedGroup);
            }
            
            if (suggestions.length > 0) {
                const suggestionsGroup = document.createElement('optgroup');
                suggestionsGroup.label = 'Available Directories';
                suggestions.forEach(dir => {
                    const option = document.createElement('option');
                    option.value = dir.path;
                    option.textContent = dir.path;
                    suggestionsGroup.appendChild(option);
                });
                select.appendChild(suggestionsGroup);
            }
            
        } catch (error) {
            console.error('Failed to load directories:', error);
            select.innerHTML = '<option value="">Error loading directories</option>';
        }
    }

    async addSelectedDirectory() {
        const select = document.getElementById('directorySelect');
        const directory = select.value;
        
        if (!directory) {
            this.showNotification('Please select a directory', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/projects/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', directory })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                this.toggleAddSiteDropdown(); // Close dropdown
                setTimeout(() => this.loadData(), 1000); // Refresh data
            } else {
                this.showNotification(result.message || 'Failed to add directory', 'error');
            }
        } catch (error) {
            console.error('Failed to add directory:', error);
            this.showNotification('Failed to add directory', 'error');
        }
    }

    async removeProject(projectName, projectPath) {
        if (!confirm(`Remove "${projectName}" from monitoring?\n\nThis will stop monitoring ${projectPath} but won't delete any files.`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/projects/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove', directory: projectPath })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                setTimeout(() => this.loadData(), 1000); // Refresh data
            } else {
                this.showNotification(result.message || 'Failed to remove project', 'error');
            }
        } catch (error) {
            console.error('Failed to remove project:', error);
            this.showNotification('Failed to remove project', 'error');
        }
    }

    /**
     * Configuration Management
     */
    async openConfigSettings() {
        const modal = document.getElementById('configModal');
        
        modal.style.display = 'block';
        
        try {
            // Load current configuration
            const response = await fetch('/api/config/raw');
            if (response.ok) {
                const configContent = await response.text();
                
                // Parse YAML configuration and populate form
                this.currentConfig = this.parseYamlConfig(configContent);
                this.populateConfigForm(this.currentConfig);
                
                // Also populate the YAML textarea
                const textarea = document.getElementById('configTextArea');
                textarea.value = configContent;
            } else {
                this.showNotification('Error loading configuration', 'error');
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.showNotification('Failed to load configuration', 'error');
        }
    }

    closeConfigModal() {
        document.getElementById('configModal').style.display = 'none';
    }

    async saveConfiguration() {
        const textarea = document.getElementById('configTextArea');
        const configContent = textarea.value;
        
        if (!configContent.trim()) {
            this.showNotification('Configuration cannot be empty', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/config/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configuration: configContent })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Configuration saved. Server restarting...', 'success');
                this.closeConfigModal();
                
                // Wait for server restart
                setTimeout(() => {
                    this.showNotification('Server restarted. Refreshing page...', 'info');
                    setTimeout(() => window.location.reload(), 2000);
                }, 3000);
            } else {
                this.showNotification(result.message || 'Failed to save configuration', 'error');
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showNotification('Failed to save configuration', 'error');
        }
    }

    async getConfigPath() {
        // Try to determine config path from server
        return null; // Server will find the config file
    }

    /**
     * Configuration Form Management
     */
    parseYamlConfig(yamlContent) {
        // Simple YAML parser for our configuration format
        const config = {};
        const lines = yamlContent.split('\n');
        let currentSection = null;
        let currentSubsection = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            if (trimmed.includes(':') && !trimmed.startsWith(' ') && !trimmed.startsWith('-')) {
                // Top-level section
                const [key, value] = trimmed.split(':').map(s => s.trim());
                if (value) {
                    config[key] = this.parseValue(value);
                } else {
                    config[key] = {};
                    currentSection = key;
                    currentSubsection = null;
                }
            } else if (trimmed.includes(':') && trimmed.startsWith(' ') && currentSection) {
                // Sub-section or property
                const [key, value] = trimmed.split(':').map(s => s.trim());
                if (value) {
                    if (currentSubsection) {
                        config[currentSection][currentSubsection][key] = this.parseValue(value);
                    } else {
                        config[currentSection][key] = this.parseValue(value);
                    }
                } else {
                    config[currentSection][key] = {};
                    currentSubsection = key;
                }
            } else if (trimmed.startsWith('- ') && currentSection) {
                // Array item
                const value = trimmed.substring(2).trim();
                if (currentSubsection) {
                    if (!Array.isArray(config[currentSection][currentSubsection])) {
                        config[currentSection][currentSubsection] = [];
                    }
                    config[currentSection][currentSubsection].push(value);
                } else {
                    if (!Array.isArray(config[currentSection])) {
                        config[currentSection] = [];
                    }
                    config[currentSection].push(value);
                }
            }
        }
        
        return config;
    }
    
    parseValue(value) {
        // Convert string values to appropriate types
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(value) && value !== '') return parseInt(value);
        return value;
    }
    
    populateConfigForm(config) {
        // Populate server settings
        this.setFormValue('config_server_port', config.server?.port);
        this.setFormValue('config_server_host', config.server?.host);
        this.setFormCheckbox('config_server_autoOpen', config.server?.autoOpen);
        
        // Populate directory settings
        this.setFormCheckbox('config_directories_scanCurrent', config.directories?.scanCurrent);
        this.setFormValue('config_directories_scanDepth', config.directories?.scanDepth);
        this.populateTrackedDirectories(config.directories?.tracked || []);
        
        // Populate monitoring settings
        this.setFormValue('config_monitoring_updateInterval', config.monitoring?.updateInterval ? config.monitoring.updateInterval / 1000 : 30);
        this.setFormValue('config_monitoring_staleThreshold', config.monitoring?.staleThreshold);
        this.setFormValue('config_monitoring_maxConcurrentScans', config.monitoring?.maxConcurrentScans);
        this.setFormCheckbox('config_monitoring_enableGitAnalysis', config.monitoring?.enableGitAnalysis);
        this.setFormCheckbox('config_monitoring_enableTrackDown', config.monitoring?.enableTrackDown);
        this.setFormCheckbox('config_monitoring_enableGitHubIssues', config.monitoring?.enableGitHubIssues);
        this.setFormCheckbox('config_monitoring_enableHealthChecks', config.monitoring?.enableHealthChecks);
        
        // Populate dashboard settings
        this.setFormValue('config_dashboard_theme', config.dashboard?.theme);
        this.setFormValue('config_dashboard_title', config.dashboard?.title);
        this.setFormCheckbox('config_dashboard_compactMode', config.dashboard?.compactMode);
        this.setFormCheckbox('config_dashboard_autoRefresh', config.dashboard?.autoRefresh);
        this.setFormCheckbox('config_dashboard_showCharts', config.dashboard?.showCharts);
        this.setFormCheckbox('config_dashboard_showTables', config.dashboard?.showTables);
        
        // Populate GitHub settings
        this.setFormValue('config_github_token', config.github?.token);
        this.setFormValue('config_github_owner', config.github?.owner);
        this.setFormValue('config_github_timeout', config.github?.timeout);
        this.setFormValue('config_github_userAgent', config.github?.userAgent);
    }
    
    setFormValue(id, value) {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            element.value = value;
        }
    }
    
    setFormCheckbox(id, value) {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            element.checked = !!value;
        }
    }
    
    populateTrackedDirectories(directories) {
        const container = document.getElementById('trackedDirectories');
        container.innerHTML = '';
        
        directories.forEach((dir, index) => {
            this.addTrackedDirectoryField(dir, index);
        });
    }
    
    addTrackedDirectory() {
        const container = document.getElementById('trackedDirectories');
        const index = container.children.length;
        this.addTrackedDirectoryField('', index);
    }
    
    addTrackedDirectoryField(value = '', index) {
        const container = document.getElementById('trackedDirectories');
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2';
        div.innerHTML = `
            <input type="text" class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2" 
                   placeholder="/path/to/directory" value="${value}" data-config="directories.tracked.${index}">
            <button type="button" onclick="this.parentElement.remove()" 
                    class="px-2 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200">
                <i data-lucide="trash-2" class="h-3 w-3"></i>
            </button>
        `;
        container.appendChild(div);
        
        // Re-initialize Lucide icons for the new button
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
    
    toggleConfigMode() {
        const formView = document.getElementById('configFormView');
        const yamlView = document.getElementById('configYamlView');
        const modeText = document.getElementById('configModeText');
        
        if (formView.classList.contains('hidden')) {
            // Switch to form mode
            formView.classList.remove('hidden');
            yamlView.classList.add('hidden');
            modeText.textContent = 'Advanced YAML';
            
            // Update form with current YAML content
            try {
                const yamlContent = document.getElementById('configTextArea').value;
                this.currentConfig = this.parseYamlConfig(yamlContent);
                this.populateConfigForm(this.currentConfig);
            } catch (error) {
                console.error('Error parsing YAML:', error);
            }
        } else {
            // Switch to YAML mode
            formView.classList.add('hidden');
            yamlView.classList.remove('hidden');
            modeText.textContent = 'Form Editor';
            
            // Update YAML with current form content
            this.updateYamlFromForm();
        }
    }
    
    updateYamlFromForm() {
        try {
            const config = this.collectFormData();
            const yamlContent = this.generateYamlFromConfig(config);
            document.getElementById('configTextArea').value = yamlContent;
        } catch (error) {
            console.error('Error updating YAML from form:', error);
        }
    }
    
    collectFormData() {
        const config = {
            server: {
                port: parseInt(document.getElementById('config_server_port').value) || 8180,
                host: document.getElementById('config_server_host').value || 'localhost',
                autoOpen: document.getElementById('config_server_autoOpen').checked
            },
            directories: {
                scanCurrent: document.getElementById('config_directories_scanCurrent').checked,
                scanDepth: parseInt(document.getElementById('config_directories_scanDepth').value) || 2,
                tracked: this.getTrackedDirectories()
            },
            monitoring: {
                updateInterval: (parseInt(document.getElementById('config_monitoring_updateInterval').value) || 30) * 1000,
                enableGitAnalysis: document.getElementById('config_monitoring_enableGitAnalysis').checked,
                enableTrackDown: document.getElementById('config_monitoring_enableTrackDown').checked,
                enableGitHubIssues: document.getElementById('config_monitoring_enableGitHubIssues').checked,
                enableHealthChecks: document.getElementById('config_monitoring_enableHealthChecks').checked,
                staleThreshold: parseInt(document.getElementById('config_monitoring_staleThreshold').value) || 14,
                maxConcurrentScans: parseInt(document.getElementById('config_monitoring_maxConcurrentScans').value) || 5
            },
            dashboard: {
                theme: document.getElementById('config_dashboard_theme').value || 'light',
                title: document.getElementById('config_dashboard_title').value || 'Portfolio Monitor',
                autoRefresh: document.getElementById('config_dashboard_autoRefresh').checked,
                showCharts: document.getElementById('config_dashboard_showCharts').checked,
                showTables: document.getElementById('config_dashboard_showTables').checked,
                compactMode: document.getElementById('config_dashboard_compactMode').checked
            },
            github: {
                token: document.getElementById('config_github_token').value || '',
                owner: document.getElementById('config_github_owner').value || '',
                timeout: parseInt(document.getElementById('config_github_timeout').value) || 10000,
                userAgent: document.getElementById('config_github_userAgent').value || 'portfolio-monitor'
            }
        };
        
        return config;
    }
    
    getTrackedDirectories() {
        const container = document.getElementById('trackedDirectories');
        const inputs = container.querySelectorAll('input[type="text"]');
        return Array.from(inputs).map(input => input.value.trim()).filter(value => value);
    }
    
    generateYamlFromConfig(config) {
        let yaml = '';
        
        // Server section
        yaml += 'server:\n';
        yaml += `  port: ${config.server.port}\n`;
        yaml += `  host: ${config.server.host}\n`;
        yaml += `  autoOpen: ${config.server.autoOpen}\n\n`;
        
        // Directories section
        yaml += 'directories:\n';
        yaml += `  scanCurrent: ${config.directories.scanCurrent}\n`;
        yaml += `  scanDepth: ${config.directories.scanDepth}\n`;
        if (config.directories.tracked.length > 0) {
            yaml += '  tracked:\n';
            config.directories.tracked.forEach(dir => {
                yaml += `    - ${dir}\n`;
            });
        } else {
            yaml += '  tracked:\n';
        }
        yaml += '\ninclude:\n\nexclude:\n\n';
        
        // Monitoring section
        yaml += 'monitoring:\n';
        yaml += `  updateInterval: ${config.monitoring.updateInterval}\n`;
        yaml += `  enableGitAnalysis: ${config.monitoring.enableGitAnalysis}\n`;
        yaml += `  enableTrackDown: ${config.monitoring.enableTrackDown}\n`;
        yaml += `  enableGitHubIssues: ${config.monitoring.enableGitHubIssues}\n`;
        yaml += `  enableHealthChecks: ${config.monitoring.enableHealthChecks}\n`;
        yaml += `  staleThreshold: ${config.monitoring.staleThreshold}\n`;
        yaml += `  maxConcurrentScans: ${config.monitoring.maxConcurrentScans}\n\n`;
        
        // Dashboard section
        yaml += 'dashboard:\n';
        yaml += `  theme: ${config.dashboard.theme}\n`;
        yaml += `  title: "${config.dashboard.title}"\n`;
        yaml += `  autoRefresh: ${config.dashboard.autoRefresh}\n`;
        yaml += `  showCharts: ${config.dashboard.showCharts}\n`;
        yaml += `  showTables: ${config.dashboard.showTables}\n`;
        yaml += `  compactMode: ${config.dashboard.compactMode}\n\n`;
        
        // Add other sections with defaults
        yaml += 'business:\n\n';
        yaml += 'priorityMapping:\n';
        yaml += '  revenue: HIGH\n';
        yaml += '  strategic: MEDIUM\n';
        yaml += '  infrastructure: LOW\n\n';
        
        yaml += 'alertThresholds:\n';
        yaml += `  staleDays: ${config.monitoring.staleThreshold}\n`;
        yaml += '  criticalIssues: 3\n';
        yaml += '  uncommittedFiles: 10\n\n';
        
        yaml += 'git:\n';
        yaml += '  defaultBranch: main\n';
        yaml += '  remoteTimeout: 10000\n';
        yaml += '  enableRemoteCheck: true\n';
        yaml += '  analyzeCommitHistory: true\n';
        yaml += '  maxCommitHistory: 100\n\n';
        
        yaml += 'data:\n';
        yaml += '  directory: data\n';
        yaml += '  retentionDays: 30\n';
        yaml += '  compressionEnabled: true\n\n';
        
        // GitHub section
        if (config.github.token || config.github.owner) {
            yaml += 'github:\n';
            if (config.github.token) yaml += `  token: ${config.github.token}\n`;
            if (config.github.owner) yaml += `  owner: ${config.github.owner}\n`;
            yaml += '  baseUrl: https://api.github.com\n';
            yaml += `  userAgent: ${config.github.userAgent}\n`;
            yaml += `  timeout: ${config.github.timeout}\n\n`;
            
            yaml += 'rateLimit:\n';
            yaml += '  requests: 60\n';
            yaml += '  retryAfter: 60000\n\n';
            
            yaml += 'issuesOptions:\n';
            yaml += '  state: open\n';
            yaml += '  labels: []\n';
            yaml += '  sort: updated\n';
            yaml += '  direction: desc\n';
            yaml += '  perPage: 30\n\n';
        }
        
        yaml += 'logging:\n';
        yaml += '  level: info\n';
        yaml += '  console: true\n';
        
        return yaml;
    }
    
    validateConfigForm() {
        const errors = [];
        
        // Validate server port
        const port = parseInt(document.getElementById('config_server_port').value);
        if (!port || port < 1000 || port > 65535) {
            errors.push('Server port must be between 1000 and 65535');
        }
        
        // Validate server host
        const host = document.getElementById('config_server_host').value.trim();
        if (!host) {
            errors.push('Server host cannot be empty');
        }
        
        // Validate scan depth
        const scanDepth = parseInt(document.getElementById('config_directories_scanDepth').value);
        if (!scanDepth || scanDepth < 1 || scanDepth > 5) {
            errors.push('Scan depth must be between 1 and 5');
        }
        
        // Validate update interval
        const updateInterval = parseInt(document.getElementById('config_monitoring_updateInterval').value);
        if (!updateInterval || updateInterval < 5 || updateInterval > 3600) {
            errors.push('Update interval must be between 5 and 3600 seconds');
        }
        
        // Validate stale threshold
        const staleThreshold = parseInt(document.getElementById('config_monitoring_staleThreshold').value);
        if (!staleThreshold || staleThreshold < 1 || staleThreshold > 365) {
            errors.push('Stale threshold must be between 1 and 365 days');
        }
        
        // Validate max concurrent scans
        const maxScans = parseInt(document.getElementById('config_monitoring_maxConcurrentScans').value);
        if (!maxScans || maxScans < 1 || maxScans > 20) {
            errors.push('Max concurrent scans must be between 1 and 20');
        }
        
        // Validate dashboard title
        const title = document.getElementById('config_dashboard_title').value.trim();
        if (!title) {
            errors.push('Dashboard title cannot be empty');
        }
        
        // Validate GitHub timeout if provided
        const githubTimeout = document.getElementById('config_github_timeout').value;
        if (githubTimeout) {
            const timeout = parseInt(githubTimeout);
            if (!timeout || timeout < 1000 || timeout > 60000) {
                errors.push('GitHub timeout must be between 1000 and 60000 milliseconds');
            }
        }
        
        // Validate tracked directories
        const trackedDirs = this.getTrackedDirectories();
        for (const dir of trackedDirs) {
            if (!dir.startsWith('/') && !dir.match(/^[A-Za-z]:/)) {
                errors.push(`Directory "${dir}" must be an absolute path`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    async saveConfigurationFromForm() {
        try {
            // Validate form inputs
            const validation = this.validateConfigForm();
            if (!validation.isValid) {
                this.showNotification(`Configuration validation failed: ${validation.errors.join(', ')}`, 'error');
                return;
            }
            
            const config = this.collectFormData();
            const yamlContent = this.generateYamlFromConfig(config);
            
            const response = await fetch('/api/config/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: yamlContent })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Configuration saved. Server restarting...', 'success');
                this.closeConfigModal();
                
                // Wait for server restart
                setTimeout(() => {
                    this.showNotification('Server restarted. Refreshing page...', 'info');
                    setTimeout(() => window.location.reload(), 2000);
                }, 3000);
            } else {
                this.showNotification(result.message || 'Failed to save configuration', 'error');
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showNotification('Failed to save configuration', 'error');
        }
    }
    
    saveConfigurationSmart() {
        const formView = document.getElementById('configFormView');
        const yamlView = document.getElementById('configYamlView');
        
        if (formView.classList.contains('hidden')) {
            // Currently in YAML mode, use YAML save
            this.saveConfiguration();
        } else {
            // Currently in form mode, use form save
            this.saveConfigurationFromForm();
        }
    }

    /**
     * GitHub username detection
     */
    async loadGitHubUsername() {
        try {
            // Try to get from configuration
            const response = await fetch('/api/config/raw');
            if (response.ok) {
                const configText = await response.text();
                const ownerMatch = configText.match(/owner:\s*(\w+)/);
                if (ownerMatch) {
                    document.getElementById('githubUsername').textContent = ownerMatch[1];
                    return;
                }
            }
            
            // Fallback to default
            document.getElementById('githubUsername').textContent = 'Not configured';
        } catch (error) {
            document.getElementById('githubUsername').textContent = 'Not configured';
        }
    }

    /**
     * Tab Navigation Methods
     */
    switchTab(tabName) {
        console.log(`Switching to tab: ${tabName}`);
        
        // Update tab buttons
        const tabs = ['portfolio', 'trackdown', 'actions', 'analytics'];
        tabs.forEach(tab => {
            const tabButton = document.getElementById(`${tab}Tab`);
            const panel = document.getElementById(`${tab}Panel`);
            
            if (tab === tabName) {
                // Activate selected tab
                if (tabButton) {
                    tabButton.className = 'py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600 focus:outline-none focus:border-blue-700';
                    tabButton.setAttribute('aria-selected', 'true');
                }
                if (panel) {
                    panel.style.display = 'block';
                }
            } else {
                // Deactivate other tabs
                if (tabButton) {
                    tabButton.className = 'py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300';
                    tabButton.setAttribute('aria-selected', 'false');
                }
                if (panel) {
                    panel.style.display = 'none';
                }
            }
        });
        
        // Handle specific tab content
        if (tabName === 'trackdown') {
            this.loadTrackDownInterface();
        } else if (tabName === 'analytics') {
            this.renderAnalyticsPanel();
        }
        
        // Store current tab for refresh persistence
        localStorage.setItem('currentTab', tabName);
    }
    
    /**
     * Load TrackDown interface in iframe
     */
    loadTrackDownInterface() {
        const iframe = document.getElementById('trackdownIframe');
        if (iframe && !iframe.src) {
            iframe.src = '/trackdown.html';
            console.log('TrackDown interface loaded');
        }
    }
    
    /**
     * Render analytics panel content
     */
    renderAnalyticsPanel() {
        const content = document.getElementById('analyticsContent');
        if (!content) return;
        
        // Simple analytics content for now
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Velocity Trends</h3>
                    <div class="text-3xl font-bold text-blue-600">+15%</div>
                    <p class="text-sm text-gray-500">vs last month</p>
                </div>
                <div class="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Code Quality</h3>
                    <div class="text-3xl font-bold text-green-600">94%</div>
                    <p class="text-sm text-gray-500">test coverage</p>
                </div>
                <div class="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Technical Debt</h3>
                    <div class="text-3xl font-bold text-yellow-600">12hrs</div>
                    <p class="text-sm text-gray-500">estimated</p>
                </div>
            </div>
            <div class="mt-8 bg-white p-6 rounded-lg border border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Portfolio Health Over Time</h3>
                <p class="text-gray-500">Chart visualization coming soon...</p>
            </div>
        `;
    }
    
    /**
     * Initialize secondary navigation on page load
     */
    initializeNavigation() {
        // Ensure portfolioPanel is visible by default
        const portfolioPanel = document.getElementById('portfolioPanel');
        if (portfolioPanel) {
            portfolioPanel.style.display = 'block';
        }
        
        // Restore last selected tab or default to portfolio
        const savedTab = localStorage.getItem('currentTab') || 'portfolio';
        this.switchTab(savedTab);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg ${
            type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
            type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
            type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
            'bg-blue-100 border border-blue-400 text-blue-700'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="h-4 w-4"></i>
                <span class="text-sm">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-xs opacity-70 hover:opacity-100">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        lucide.createIcons();
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Global functions
function initializeDashboard() {
    window.dashboard = new PortfolioDashboard();
    window.dashboard.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioDashboard;
}