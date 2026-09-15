// pm2 config for the docs site. From this directory:
//
//   pm2 start ecosystem.config.cjs
//
// APP_KEY and PORT come from .env next to this file (see .env.example).
module.exports = {
  apps: [
    {
      name: 'nestjs-mvc-docs',
      cwd: __dirname,
      script: 'src/main.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
