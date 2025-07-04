module.exports = {
  apps: [
    {
      name: 'trackdown-dashboard',
      script: 'lib/dashboard/server.js',
      args: '--port 3000',
      cwd: '/Users/masa/Projects/git-portfolio-manager',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      log_file: './logs/trackdown-dashboard.log',
      out_file: './logs/trackdown-dashboard-out.log',
      error_file: './logs/trackdown-dashboard-error.log',
      time: true,
      merge_logs: true
    }
  ]
};