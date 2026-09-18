import {User} from '@linkurious/rest-client';

export interface VendorContext {
  requestedAt: Date;
  user?: User;
}
