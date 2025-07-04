export = GitHubClient;
declare class GitHubClient {
    constructor(config?: {});
    config: {
        token: any;
        baseUrl: any;
        userAgent: any;
        timeout: any;
        rateLimit: any;
        issuesOptions: any;
    };
    octokit: (import("@octokit/core").Octokit & {
        paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
    } & import("@octokit/plugin-rest-endpoint-methods/dist-types/generated/method-types").RestEndpointMethods & import("@octokit/plugin-rest-endpoint-methods").Api) | null;
    rateLimitRemaining: number | null;
    rateLimitResetTime: number | null;
    initialized: boolean;
    /**
     * Initialize the GitHub client
     */
    initialize(): Promise<void>;
    /**
     * Check if client is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Get rate limit status
     */
    getRateLimit(): Promise<{
        resources: {
            core: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            graphql?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            search: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            code_search?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            source_import?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            integration_manifest?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            code_scanning_upload?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            actions_runner_registration?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            scim?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            dependency_snapshots?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
            code_scanning_autofix?: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
        };
        rate: import("@octokit/openapi-types").components["schemas"]["rate-limit"];
    } | null>;
    /**
     * Parse GitHub repository from remote URL
     */
    parseRepositoryFromUrl(remoteUrl: any): {
        owner: any;
        repo: any;
    } | null;
    /**
     * Check if repository exists and is accessible
     */
    checkRepository(owner: any, repo: any): Promise<{
        exists: boolean;
        accessible: boolean;
        private: boolean;
        hasIssues: boolean;
        openIssues: number;
        repository: {
            id: number;
            node_id: string;
            name: string;
            full_name: string;
            owner: import("@octokit/openapi-types").components["schemas"]["simple-user"];
            private: boolean;
            html_url: string;
            description: string | null;
            fork: boolean;
            url: string;
            archive_url: string;
            assignees_url: string;
            blobs_url: string;
            branches_url: string;
            collaborators_url: string;
            comments_url: string;
            commits_url: string;
            compare_url: string;
            contents_url: string;
            contributors_url: string;
            deployments_url: string;
            downloads_url: string;
            events_url: string;
            forks_url: string;
            git_commits_url: string;
            git_refs_url: string;
            git_tags_url: string;
            git_url: string;
            issue_comment_url: string;
            issue_events_url: string;
            issues_url: string;
            keys_url: string;
            labels_url: string;
            languages_url: string;
            merges_url: string;
            milestones_url: string;
            notifications_url: string;
            pulls_url: string;
            releases_url: string;
            ssh_url: string;
            stargazers_url: string;
            statuses_url: string;
            subscribers_url: string;
            subscription_url: string;
            tags_url: string;
            teams_url: string;
            trees_url: string;
            clone_url: string;
            mirror_url: string | null;
            hooks_url: string;
            svn_url: string;
            homepage: string | null;
            language: string | null;
            forks_count: number;
            stargazers_count: number;
            watchers_count: number;
            size: number;
            default_branch: string;
            open_issues_count: number;
            is_template?: boolean;
            topics?: string[];
            has_issues: boolean;
            has_projects: boolean;
            has_wiki: boolean;
            has_pages: boolean;
            has_downloads?: boolean;
            has_discussions: boolean;
            archived: boolean;
            disabled: boolean;
            visibility?: string;
            pushed_at: string;
            created_at: string;
            updated_at: string;
            permissions?: {
                admin: boolean;
                maintain?: boolean;
                push: boolean;
                triage?: boolean;
                pull: boolean;
            };
            allow_rebase_merge?: boolean;
            template_repository?: import("@octokit/openapi-types").components["schemas"]["nullable-repository"];
            temp_clone_token?: string | null;
            allow_squash_merge?: boolean;
            allow_auto_merge?: boolean;
            delete_branch_on_merge?: boolean;
            allow_merge_commit?: boolean;
            allow_update_branch?: boolean;
            use_squash_pr_title_as_default?: boolean;
            squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
            squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
            merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
            merge_commit_message?: "PR_BODY" | "PR_TITLE" | "BLANK";
            allow_forking?: boolean;
            web_commit_signoff_required?: boolean;
            subscribers_count: number;
            network_count: number;
            license: import("@octokit/openapi-types").components["schemas"]["nullable-license-simple"];
            organization?: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"];
            parent?: import("@octokit/openapi-types").components["schemas"]["repository"];
            source?: import("@octokit/openapi-types").components["schemas"]["repository"];
            forks: number;
            master_branch?: string;
            open_issues: number;
            watchers: number;
            anonymous_access_enabled?: boolean;
            code_of_conduct?: import("@octokit/openapi-types").components["schemas"]["code-of-conduct-simple"];
            security_and_analysis?: import("@octokit/openapi-types").components["schemas"]["security-and-analysis"];
            custom_properties?: {
                [key: string]: unknown;
            };
        };
        error?: never;
    } | {
        exists: boolean;
        accessible: boolean;
        error: string;
        private?: never;
        hasIssues?: never;
        openIssues?: never;
        repository?: never;
    }>;
    /**
     * Fetch issues for a repository
     */
    getIssues(owner: any, repo: any, options?: {}): Promise<{
        success: boolean;
        issues: {
            id: any;
            number: any;
            title: any;
            body: any;
            state: any;
            labels: any;
            assignee: {
                login: any;
                avatar_url: any;
            } | null;
            assignees: any;
            milestone: {
                title: any;
                description: any;
                state: any;
                due_on: any;
            } | null;
            created_at: any;
            updated_at: any;
            closed_at: any;
            html_url: any;
            user: {
                login: any;
                avatar_url: any;
            };
            comments: any;
            isPullRequest: boolean;
        }[];
        pagination: {};
        rateLimit: {
            remaining: number | null;
            resetTime: number | null;
        };
        error?: never;
        status?: never;
    } | {
        success: boolean;
        error: any;
        status: any;
        issues: never[];
        pagination?: never;
        rateLimit?: never;
    }>;
    /**
     * Get all issues with pagination
     */
    getAllIssues(owner: any, repo: any, options?: {}): Promise<{
        success: boolean;
        issues: {
            id: any;
            number: any;
            title: any;
            body: any;
            state: any;
            labels: any;
            assignee: {
                login: any;
                avatar_url: any;
            } | null;
            assignees: any;
            milestone: {
                title: any;
                description: any;
                state: any;
                due_on: any;
            } | null;
            created_at: any;
            updated_at: any;
            closed_at: any;
            html_url: any;
            user: {
                login: any;
                avatar_url: any;
            };
            comments: any;
            isPullRequest: boolean;
        }[];
        pagination: {};
        rateLimit: {
            remaining: number | null;
            resetTime: number | null;
        };
        error?: never;
        status?: never;
    } | {
        success: boolean;
        error: any;
        status: any;
        issues: never[];
        pagination?: never;
        rateLimit?: never;
    } | {
        success: boolean;
        issues: {
            id: any;
            number: any;
            title: any;
            body: any;
            state: any;
            labels: any;
            assignee: {
                login: any;
                avatar_url: any;
            } | null;
            assignees: any;
            milestone: {
                title: any;
                description: any;
                state: any;
                due_on: any;
            } | null;
            created_at: any;
            updated_at: any;
            closed_at: any;
            html_url: any;
            user: {
                login: any;
                avatar_url: any;
            };
            comments: any;
            isPullRequest: boolean;
        }[];
        totalCount: number;
        rateLimit: {
            remaining: number | null;
            resetTime: number | null;
        };
    }>;
    /**
     * Format issue data for consistent structure
     */
    formatIssue(issue: any): {
        id: any;
        number: any;
        title: any;
        body: any;
        state: any;
        labels: any;
        assignee: {
            login: any;
            avatar_url: any;
        } | null;
        assignees: any;
        milestone: {
            title: any;
            description: any;
            state: any;
            due_on: any;
        } | null;
        created_at: any;
        updated_at: any;
        closed_at: any;
        html_url: any;
        user: {
            login: any;
            avatar_url: any;
        };
        comments: any;
        isPullRequest: boolean;
    };
    /**
     * Update rate limit information from response headers
     */
    updateRateLimitInfo(headers: any): void;
    /**
     * Extract pagination info from response headers
     */
    extractPaginationInfo(headers: any): {};
    /**
     * Check if rate limit is exhausted
     */
    isRateLimited(): boolean;
    /**
     * Get time until rate limit resets
     */
    getRateLimitResetTime(): number | null;
    /**
     * Wait for rate limit to reset
     */
    waitForRateLimit(): Promise<void>;
    /**
     * Get authentication status and user info
     */
    getAuthenticatedUser(): Promise<{
        authenticated: boolean;
        user: {
            login: string;
            name: string | null;
            email: string | null;
            avatar_url: string;
            type: string;
        };
        error?: never;
    } | {
        authenticated: boolean;
        error: any;
        user?: never;
    }>;
}
//# sourceMappingURL=github-client.d.ts.map