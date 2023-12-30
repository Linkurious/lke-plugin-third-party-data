import http from 'node:http';
import url from 'node:url';

import * as vite from 'vite';

export interface ApiMockResponse {
  status?: number;
  body: unknown;
}

export interface ApiMock {
  /**
   * Path prefix to match
   */
  match: string;
  /**
   * HTTP verb to match (default: GET)
   */
  verb?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  response: ApiMockResponse | ((url: url.UrlWithParsedQuery) => ApiMockResponse);
}

export class DevServer {
  private readonly frontendDevServerPort: number;
  private readonly serverApiMocks: ApiMock[];
  private readonly mockServerPort: number;
  // when undefined, forwards all queries to the serverApiMocks
  private readonly backendDevServerPort?: number;
  private readonly pluginUrlPrefix: string;

  constructor(
    readonly options: {
      frontendDevServerPort: number;
      serverApiMocks: ApiMock[];
      backendDevServerPort?: number;
      pluginUrlPrefix: string;
    }
  ) {
    this.frontendDevServerPort = options.frontendDevServerPort;
    this.serverApiMocks = options.serverApiMocks;
    this.backendDevServerPort = options.backendDevServerPort;
    this.pluginUrlPrefix = options.pluginUrlPrefix;
    this.mockServerPort = options.frontendDevServerPort + (Math.floor(Math.random() * 100) + 100);
  }

  public createViteConfig(): vite.UserConfig['server'] {
    const mockServer = this.createMockServer();
    const apiMockHandler: vite.ProxyOptions = {
      target: `http://localhost:${this.mockServerPort}`,
      changeOrigin: true,
      secure: false,
      configure: (proxy): void => {
        proxy.on('proxyRes', (_proxyRes, req, res) => {
          this.handleServerApiQuery(req, res);
        });
        proxy.on('close', () => mockServer.close());
      }
    };
    const backendApiHandler: vite.ProxyOptions =
      this.backendDevServerPort === undefined
        ? apiMockHandler
        : {
            target: `http://localhost:${this.backendDevServerPort}`,
            changeOrigin: true,
            secure: false,
            configure: (proxy): void => {
              proxy.on('proxyReq', (_proxyReq, req) => {
                console.log('Forwarding plugin API call: ' + req.url);
              });
            }
          };

    return {
      port: this.frontendDevServerPort,
      proxy: {
        '^/api/': apiMockHandler,
        [`^${this.pluginUrlPrefix}/api/`]: backendApiHandler
      }
    };
  }

  private createMockServer(): http.Server {
    return http
      .createServer(function (_req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end('{}');
      })
      .listen(this.mockServerPort);
  }

  private handleServerApiQuery(req: http.IncomingMessage, res: http.ServerResponse): void {
    console.log(`Dev proxy hit: ${req.method} ${req.url}`);
    const urlParts = url.parse(req.url ?? '', true);
    res.setHeader('Content-Type', 'application/json');

    const response = this.getMockResponse((req.method ?? 'GET').toUpperCase(), urlParts);
    if (response) {
      res.statusCode = response.status ?? 200;
      res.end(typeof response.body === 'string' ? response.body : JSON.stringify(response.body));
    } else {
      res.statusCode = 500;
      const message = 'Dev proxy - Unhandled API: ' + req.url;
      console.log(message);
      res.end(JSON.stringify({key: 'error', message: message}));
    }
  }

  private getMockResponse(
    method: string,
    url: url.UrlWithParsedQuery
  ): ApiMockResponse | undefined {
    for (const mock of this.serverApiMocks) {
      if (!mock.verb) {
        mock.verb = 'GET';
      }
      if (mock.verb === method && url.pathname?.startsWith(mock.match)) {
        return typeof mock.response === 'function' ? mock.response(url) : mock.response;
      }
    }
    return undefined;
  }
}
