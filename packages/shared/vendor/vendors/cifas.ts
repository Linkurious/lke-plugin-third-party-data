import {Vendor} from '../vendor';

export class Cifas extends Vendor<CifasSearchQuery, CifasSearchResponse, CifasDetailsResponse> {
  constructor() {
    super({
      key: 'cifas',
      name: 'CIFAS',
      strategy: 'searchAndDetails',
      description: `Search the CIFAS National Fraud Database (NFD), see <a target="_blank" href="portal.cifas.org.uk/en-GB/Support/SearchDocumentation">details</a>`,
      adminFields: [
        {
          type: 'string',
          key: 'requestingInstitution',
          name: 'Requesting Institution',
          required: true
        },
        {
          type: 'string',
          key: 'owningMemberNumber',
          name: 'Owning Member Number',
          required: true
        },
        {
          type: 'string',
          key: 'managingMemberNumber',
          name: 'Managing Member Number',
          required: true
        },
        {
          type: 'file',
          key: 'pfxCertificate',
          name: 'PFX Certificate',
          required: true
        },
        {
          type: 'string',
          key: 'pfxCertificatePassphrase',
          name: 'PFX Certificate passphrase',
          required: true
        }
      ],
      searchQueryFields: {
        firstName: {type: 'string', required: false},
        surname: {type: 'string', required: false},
        birthDate: {type: 'string', required: false},
        homeTelephone: {type: 'string', required: false},
        mobileTelephone: {type: 'string', required: false},
        workTelephone: {type: 'string', required: false},
        employerTelephone: {type: 'string', required: false},
        emailAddress: {type: 'string', required: false},
        nationalInsuranceNumber: {type: 'string', required: false},
        vehicleIdentificationNumber: {type: 'string', required: false},
        vehicleRegistrationNumber: {type: 'string', required: false},
        deviceId: {type: 'string', required: false},
        ipAddress: {type: 'string', required: false},
        companyName: {type: 'string', required: false},
        companyNumber: {type: 'string', required: false},
        companyTelephone: {type: 'string', required: false},
        vatNumber: {type: 'string', required: false}
        // TODO add support for multiple addresses, financeDetails and documents
      },
      searchResponseFields: {
        caseId: {type: 'number', required: true},
        owningMember_referenceCode: {type: 'string', required: true},
        owningMember_description: {type: 'string', required: true},
        managingMember_referenceCode: {type: 'string', required: true},
        managingMember_description: {type: 'string', required: true},
        caseType_referenceCode: {type: 'string', required: true},
        caseType_description: {type: 'string', required: true},
        product_referenceCode: {type: 'string', required: true},
        product_description: {type: 'string', required: true},
        supplyDate: {type: 'string', required: false},
        applicationDate: {type: 'string', required: false},
        claimDate: {type: 'string', required: false}
      },
      detailsResponseFields: {
        caseId: {type: 'number', required: true},
        owningMember_referenceCode: {type: 'string', required: true},
        owningMember_description: {type: 'string', required: true},
        managingMember_referenceCode: {type: 'string', required: true},
        managingMember_description: {type: 'string', required: true},
        caseType_referenceCode: {type: 'string', required: true},
        caseType_description: {type: 'string', required: true},
        product_referenceCode: {type: 'string', required: true},
        product_description: {type: 'string', required: true},
        supplyDate: {type: 'string', required: false},
        applicationDate: {type: 'string', required: false},
        claimDate: {type: 'string', required: false},
        filingReasons: {type: 'string', required: true},
        deliveryChannel_referenceCode: {type: 'string', required: true},
        deliveryChannel_description: {type: 'string', required: true},
        facility_referenceCode: {type: 'string', required: true},
        facility_description: {type: 'string', required: true},
        ipAddress: {type: 'string', required: false},
        deviceId: {type: 'string', required: false}
      }
    });
  }
}

/**
 * Search inputs, see "SearchInputModel" in the NFD Search API v1 (POST /v1/NFD/Search).
 * Not supported yet: addresses, financeDetails, documents, productCode.
 */
export type CifasSearchQuery = {
  firstName?: string;
  surname?: string;
  birthDate?: string;
  homeTelephone?: string;
  mobileTelephone?: string;
  workTelephone?: string;
  employerTelephone?: string;
  emailAddress?: string;
  nationalInsuranceNumber?: string;
  vehicleIdentificationNumber?: string;
  vehicleRegistrationNumber?: string;
  deviceId?: string;
  ipAddress?: string;
  companyName?: string;
  companyNumber?: string;
  companyTelephone?: string;
  vatNumber?: string;
};

/** "BasicCaseOutputModel", flattened */
export type CifasSearchResponse = {
  caseId: number;
  owningMember_referenceCode: string;
  owningMember_description: string;
  managingMember_referenceCode: string;
  managingMember_description: string;
  caseType_referenceCode: string;
  caseType_description: string;
  product_referenceCode: string;
  product_description: string;
  supplyDate?: string;
  applicationDate?: string;
  claimDate?: string;
};

/** "Case" (GET /v1/NFD/Cases/{caseId}) without its subjects, flattened */
export type CifasDetailsResponse = CifasSearchResponse & {
  /** one "code - description" per line */
  filingReasons: string; // array > flatten
  deliveryChannel_referenceCode: string;
  deliveryChannel_description: string;
  facility_referenceCode: string;
  facility_description: string;
  ipAddress?: string;
  deviceId?: string;
  // subject: complex object => output as a node, is an array so multiple output neighbor nodes
};
