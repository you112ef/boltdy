import { type Config } from '@remix-run/dev';
import netlify from '@remix-run/netlify';

const config: Config = {
  appDirectory: 'app',
  serverBuildDirectory: 'netlify/functions',
  publicPath: '/build/',
  ignoredRouteFiles: ['**/.*'],
  server: {
    adapter: netlify(),
    appBuild: 'build',
    serverBuildPath: 'netlify/functions/index.js',
  },
};

export default config;
