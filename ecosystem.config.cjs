module.exports = {
  apps: [
    {
      name: 'event-ticketing',
      script: 'serve',
      args: '-s . -l 3000',
      cwd: '/var/www/event-ticketing',
      env: {
        PM2_SERVE_PATH: '/var/www/event-ticketing',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};