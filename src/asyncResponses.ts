/**
 * Device-requests API requires client code to manage and store unique async-ids
 * for each request.  This is a basic list implementation to store this information
 * and provide device id and resource path context to each async response
 */

export interface AsyncRequest {
  deviceId: string;
  path: string;
  asyncId: string;
}

const asyncRequests: AsyncRequest[] = [];

export const storeAsync = (a: AsyncRequest) => {
  asyncRequests.push(a);
};

export const removeAsync = (a: string): AsyncRequest | void => {
  return asyncRequests.find((v, i, ar) => {
    if (v.asyncId === a) {
      asyncRequests.splice(i, 1);
      return v;
    }
  });
};

export const generateId = (): string =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`;
