import {describe, it} from 'node:test';
import {deepStrictEqual} from 'node:assert';

import {CifasSearchResult, fetchWithClientCertificate} from '../services/vendor/baseSearchDriver';

void describe('Http test', () => {
  void it('Should return a 200 response', async () => {
    const r = await fetchWithClientCertificate(
      '/v1/NFD/Search',
      {},
      {
        memberReferenceNumber: 'ExamplePerson',
        search: {
          firstName: 'John',
          surname: 'Doe'
        }
      },
      'POST'
    );
    deepStrictEqual(r.status, 200);
    const response = (await r.json()) as CifasSearchResult;
    deepStrictEqual(response.caseSearchResult.casesMatched, 0);
    console.log(JSON.stringify(response, null, 2));
  });
});
