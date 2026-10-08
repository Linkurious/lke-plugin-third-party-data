import {describe, it} from 'node:test';
import * as assert from 'node:assert';

import {
  buildCifasSearchBody,
  buildCifasSubjectId,
  CifasCaseBody,
  extractCifasSubjectNeighbors,
  toCaseProperties
} from '../services/vendor/driver/cifasDriver';

const REF = (referenceCode: string, description: string): Record<string, string> => ({
  referenceCode: referenceCode,
  description: description
});

const CASE: CifasCaseBody = {
  caseId: 8693212,
  owningMember: REF('555', 'Test member'),
  managingMember: REF('555', 'Test member'),
  caseType: REF('FA', 'False Application'),
  product: REF('CC', 'Pers - Credit Card'),
  supplyDate: '2025-11-10',
  filingReasons: [
    {referenceCode: 'FC', description: 'False Contact Details'},
    {referenceCode: 'XX', description: 'Other'}
  ],
  deliveryChannel: REF('ON', 'Online'),
  facility: REF('NF', 'New facility'),
  subjects: [
    {
      role: REF('BP', 'Bogus policyholder'),
      roleQualifier: REF('08', 'True identity'),
      firstName: 'Laura',
      surname: 'Smith',
      birthDate: '1985-04-01',
      emailAddress: 'test@evasionofpayment.com',
      withholdSubjectAccess: false
    }
  ]
};

void describe('CifasDriver', () => {
  void describe('buildCifasSubjectId', () => {
    void it('should build a deterministic subject id with normalized values', () => {
      const hash1 = buildCifasSubjectId(' Case-123 ', ' John ', ' DOE ', '2024-03-01T09:30:00Z');
      const hash2 = buildCifasSubjectId('case-123', 'john', 'doe', '2024-03-01');
      assert.strictEqual(hash1, hash2);
    });

    void it('should accept numeric case ids', () => {
      assert.strictEqual(
        buildCifasSubjectId(123, 'john', 'doe', '2024-03-01'),
        buildCifasSubjectId('123', 'john', 'doe', '2024-03-01')
      );
    });

    void it('should hash with empty strings for missing values', () => {
      const hash = buildCifasSubjectId(undefined, null, 'doe', 'invalid-date');
      assert.match(hash, /^[a-f0-9]{64}$/);
    });
  });

  void describe('buildCifasSearchBody', () => {
    void it('should build the search body and drop empty values', () => {
      const body = buildCifasSearchBody({
        firstName: ' Laura ',
        surname: 'Smith',
        birthDate: '1985-04-01',
        emailAddress: ''
      });
      assert.deepStrictEqual(body, {
        memberReferenceNumber: 'LinkuriousSearch',
        search: {firstName: 'Laura', surname: 'Smith', birthDate: '1985-04-01'}
      });
    });

    void it('should reject an empty search', () => {
      assert.throws(() => buildCifasSearchBody({}), /at least one search criterion/);
      assert.throws(() => buildCifasSearchBody({firstName: '  '}), /at least one search criterion/);
    });
  });

  void describe('toCaseProperties', () => {
    void it('should flatten the case without subjects', () => {
      const properties = toCaseProperties(CASE) as unknown as Record<string, unknown>;
      assert.strictEqual(properties.caseId, 8693212);
      assert.strictEqual(properties.caseType_referenceCode, 'FA');
      assert.strictEqual(properties.caseType_description, 'False Application');
      assert.strictEqual(properties.facility_referenceCode, 'NF');
      assert.strictEqual(properties.filingReasons, 'FC - False Contact Details\nXX - Other');
      assert.ok(!Object.keys(properties).some((k) => k.startsWith('subjects')));
    });
  });

  void describe('extractCifasSubjectNeighbors', () => {
    void it('should create a CIFAS_Subject neighbor for each subject', () => {
      const neighbors = extractCifasSubjectNeighbors(CASE);
      assert.strictEqual(neighbors.length, 1);
      const [subject] = neighbors;
      assert.strictEqual(subject.edgeType, 'HAS_SUBJECT');
      assert.strictEqual(subject.nodeCategory, 'CIFAS_Subject');
      assert.strictEqual(subject.keyProperty, 'subjectId');
      assert.strictEqual(
        subject.properties.subjectId,
        buildCifasSubjectId(8693212, 'Laura', 'Smith', '1985-04-01')
      );
      assert.strictEqual(subject.properties.role_referenceCode, 'BP');
      assert.strictEqual(subject.properties.surname, 'Smith');
    });

    void it('should return no neighbors when the case has no subjects', () => {
      assert.deepStrictEqual(extractCifasSubjectNeighbors({...CASE, subjects: undefined}), []);
    });
  });
});
