import {describe, it} from 'node:test';
import * as assert from 'node:assert';

import {VendorIntegration} from '../../../shared/integration/vendorIntegration';
import {
  buildCifasSearchBody,
  CifasCaseBody,
  CifasDriver,
  CifasReference,
  extractCifasSubjectNeighbors
} from '../services/vendor/driver/cifasDriver';
import {CifasSubjectHelper} from '../services/vendor/driver/cifasSubject';

const INTEGRATION = {
  getAdminSettings: (key: string) =>
    key === 'managingMemberNumber' ? 'LinkuriousSearch' : undefined
} as unknown as VendorIntegration;

const REF = (referenceCode: string, description: string): CifasReference => ({
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
      const hash1 = CifasSubjectHelper.getId({
        caseId: 123,
        firstName: ' John ',
        surname: ' DOE ',
        birthDate: '2024-03-01T09:30:00Z'
      });
      const hash2 = CifasSubjectHelper.getId({
        caseId: 123,
        firstName: 'john',
        surname: 'doe',
        birthDate: '2024-03-01'
      });
      assert.strictEqual(hash1, hash2);
    });

    void it('should build different ids for different case ids', () => {
      assert.notStrictEqual(
        CifasSubjectHelper.getId({caseId: 123, firstName: 'john', surname: 'doe'}),
        CifasSubjectHelper.getId({caseId: 124, firstName: 'john', surname: 'doe'})
      );
    });

    void it('should hash with empty strings for missing values', () => {
      const hash = CifasSubjectHelper.getId({
        caseId: 123,
        surname: 'doe',
        birthDate: 'invalid-date'
      });
      assert.match(hash, /^[a-f0-9]{64}$/);
    });
  });

  void describe('buildCifasSearchBody', () => {
    void it('should build the search body and drop empty values', () => {
      const body = buildCifasSearchBody(
        {
          firstName: ' Laura ',
          surname: 'Smith',
          birthDate: '1985-04-01',
          emailAddress: ''
        },
        INTEGRATION
      );
      assert.deepStrictEqual(body, {
        memberReferenceNumber: 'LinkuriousSearch',
        search: {firstName: 'Laura', surname: 'Smith', birthDate: '1985-04-01'}
      });
    });

    void it('should keep neighbor association when some values are missing', () => {
      const body = buildCifasSearchBody(
        {town: ['London', 'Paris'], postcode: ['', '75000'], cardNumber: ['', '4111']},
        INTEGRATION
      );
      assert.deepStrictEqual(body.search, {
        addresses: [
          {format: 'structuredAddress', locationAlerts: false, town: 'London'},
          {format: 'structuredAddress', locationAlerts: false, town: 'Paris', postcode: '75000'}
        ],
        financeDetails: [{type: 'paymentCard', cardNumber: '4111'}]
      });
    });

    void it('should reject an empty search', () => {
      assert.throws(() => buildCifasSearchBody({}, INTEGRATION), /at least one search criterion/);
      assert.throws(
        () => buildCifasSearchBody({firstName: '  '}, INTEGRATION),
        /at least one search criterion/
      );
    });
  });

  void describe('toCaseProperties', () => {
    void it('should flatten the case without subjects', () => {
      const properties = CifasDriver.toCaseProperties(CASE) as unknown as Record<string, unknown>;
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
        CifasSubjectHelper.getId({
          caseId: 8693212,
          firstName: 'Laura',
          surname: 'Smith',
          birthDate: '1985-04-01'
        })
      );
      assert.strictEqual(subject.properties.role_referenceCode, 'BP');
      assert.strictEqual(subject.properties.surname, 'Smith');
    });

    void it('should return no neighbors when the case has no subjects', () => {
      assert.deepStrictEqual(extractCifasSubjectNeighbors({...CASE, subjects: undefined}), []);
    });
  });
});
