// PM2 ecosystem — gestor de procesos para el frontend Next.js en producción
// Uso: pm2 start ecosystem.config.js
//      pm2 save && pm2 startup   (para arrancar con el sistema)

module.exports = {
  apps: [
    {
      name: 'pokedex-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      instances: 1,          // 1 instancia — aumentar solo con DB de sesiones
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        // BACKEND_URL es leído SOLO por el servidor Next.js (route handler proxy)
        // El navegador nunca lo ve — no lleva NEXT_PUBLIC_
        BACKEND_URL: 'http://localhost:8000',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/pokedex-frontend-error.log',
      out_file:   '/var/log/pm2/pokedex-frontend-out.log',
      merge_logs: true,
    },
  ],
};
