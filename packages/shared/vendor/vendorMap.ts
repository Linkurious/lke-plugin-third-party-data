import {VendorField} from './vendorModel';
export const VENDOR_MAP = {
  'dnb-company': {
    name: 'Dun & Bradstreet - Company',
    description:
      'Search for companies! see <a target="_blank" href="https://google.com">details</a>',
    searchQueryFields: [
      {key: 'name', type: 'string', required: true},
      {key: 'legalType', type: 'string', required: false},
      {key: 'address', type: 'string'}
    ] as VendorField[],
    searchResponseFields: [
      {key: 'blacklisted', type: 'boolean'},
      {key: 'legalType', type: 'string'},
      {key: 'yearCreated', type: 'number'},
      {key: 'address', type: 'string'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    detailsResponseFields: [
      {key: 'blacklisted', type: 'boolean'},
      {key: 'legalType', type: 'string'},
      {key: 'yearCreated', type: 'number'},
      {key: 'address', type: 'string'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    adminFields: [
      {key: 'apiKey', name: 'API key', required: true},
      {key: 'test1', name: 'test lol', required: true, enum: ['a', 'b', 'c']}
    ]
  },
  dnb: {
    name: 'Dun & Bradstreet - People',
    description:
      'Search for people in the DnB "people" API, see <a target="_blank" href="https://google.com">details</a>',
    searchQueryFields: [
      {key: 'firstName', type: 'string', required: true},
      {key: 'lastName', type: 'string', required: true},
      {key: 'address', type: 'string'},
      {key: 'age', type: 'number'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    searchResponseFields: [
      {key: 'firstName', type: 'string'},
      {key: 'lastName', type: 'string'},
      {key: 'address', type: 'string'},
      {key: 'age', type: 'number'},
      {key: 'suspicious', type: 'boolean'}
    ] as VendorField[],
    detailsResponseFields: [
      {key: 'citizenship', type: 'string'},
      {key: 'fullName', type: 'string'},
      {key: 'address', type: 'string'},
      {key: 'listed', type: 'boolean'},
      {key: 'income', type: 'number'}
    ] as VendorField[],
    adminFields: [
      {key: 'apiKey', name: 'API key', required: true},
      {key: 'test1', name: 'test value', required: false},
      {key: 'test2', name: 'test choice', required: true, enum: ['yes', 'no']},
      {key: 'test3', name: 'test preference', required: false, enum: ['a', 'b', 'c']}
    ]
  }
};
