import {it, describe} from 'node:test';
import * as assert from 'node:assert';

import {ProxyClient} from '../services/vendor/baseSearchDriver';

void describe('Proxy Client', () => {
  void it.skip('should query without a proxy', async () => {
    const c = new ProxyClient();
    const response = await c['request'](new URL('https://echo.free.beeceptor.com'));
    assert.deepStrictEqual(response.status, 200);
    console.log(JSON.stringify(response.body));
  });

  // free httpx proxies die fast, if you want to test this, pick on here and be fast: https://spys.one/en/https-ssl-proxy/
  // to debug, you might need to use these env vars: NODE_OPTIONS='--tls-min-v1.0' NODE_DEBUG='tls,https'
  void it.skip('should query with a proxy', async () => {
    const c = new ProxyClient({HTTPS_PROXY: '179.189.120.146:3128'});
    const response = await c['request'](new URL('https://echo.free.beeceptor.com'));
    assert.deepStrictEqual(response.status, 200);
    console.log(JSON.stringify(response.body));
  });
});
//
