module.exports = {
  apps: [
    {
      name: 'portfolio-dashboard',
      script: 'lib/dashboard/server.js',
      args: '--port 3001',
      cwd: '/Users/masa/Projects/git-portfolio-manager',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      log_file: './logs/portfolio-dashboard.log',
      out_file: './logs/portfolio-dashboard-out.log',
      error_file: './logs/portfolio-dashboard-error.log',
      time: true,
      merge_logs: true
    }
  ]
};