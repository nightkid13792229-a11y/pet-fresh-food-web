export default {
  apps: [{
    name: 'petfresh-api',
    script: './src/server.js',
    cwd: '/root/web-admin/backend',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '/root/web-admin/backend/.env',
    error_file: '/root/web-admin/backend/logs/pm2-error.log',
    out_file: '/root/web-admin/backend/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};

