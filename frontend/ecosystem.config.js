// ecosystem.config.js — Configuración PM2 para el frontend Next.js
// Uso:
//   pm2 start ecosystem.config.js          # inicia el proceso
//   pm2 reload ecosystem.config.js         # recarga sin downtime
//   pm2 save                               # persiste lista de procesos
//   pm2 startup                            # arranca PM2 al reiniciar el servidor

module.exports = {
  apps: [
    {
      name: "pokedex-frontend",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./",                    // directorio donde está el build (.next/)
      instances: 1,                 // aumentar a "max" para multi-core
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        // URL interna usada por el Route Handler /api/** del servidor Next.js.
        // El navegador solo llama al mismo origen; esta URL no se expone.
        BACKEND_URL: "http://127.0.0.1:4004",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
};
