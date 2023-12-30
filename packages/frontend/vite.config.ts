import * as vite from 'vite';

import {DevServer} from './src/dev/devServer.ts';
import {API_MOCKS} from './src/dev/apiMocks.ts';

/**
 * Specific settings
 */

const settings = {
  buildDir: '../../dist/frontend',
  devPluginUrlPrefix: '/plugins/3d',
  frontendDevServerPort: 4000,
  backendDevServerPort: undefined // set 3000 to proxy backend requests to localhost:3000
};

// noinspection JSUnusedGlobalSymbols
/**
 * Vite LKE-plugin boilerplate
 */
export default vite.defineConfig((env) => {
  const config: vite.UserConfig = {
    base: env.command === 'serve' ? `${settings.devPluginUrlPrefix}/` : './',
    build: {
      outDir: settings.buildDir,
      // needed because dist is outside the project root
      emptyOutDir: true
    }
  };
  if (env.command === 'serve') {
    // add mock APIs in dev mode
    const devServer = new DevServer({
      frontendDevServerPort: settings.frontendDevServerPort,
      serverApiMocks: API_MOCKS,
      backendDevServerPort: settings.backendDevServerPort,
      pluginUrlPrefix: settings.devPluginUrlPrefix
    });
    config.server = devServer.createViteConfig();

    // fix "base" tag in index.html in dev mode
    config.plugins = [
      {
        name: 'fix-index-base-url',
        transformIndexHtml: (html): string => {
          return html.replace('<base href="/">', `<base href="${settings.devPluginUrlPrefix}/">`);
        }
      }
    ];
  }
  return config;
});
