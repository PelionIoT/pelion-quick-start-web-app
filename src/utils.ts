import { Response } from "node-fetch";

const apiUrl = process.env.API_HOST || "https://api.us-east-1.mbedcloud.com/";
const apiKey = process.env.API_KEY;
export const headers = { Authorization: `bearer ${apiKey}`, "Content-Type": "application/json" };

export const deviceDirectoryUrl = new URL("/v3/devices", apiUrl);
export const deviceRequestUrl = new URL("/v2/device-requests", apiUrl);
export const endpointsUrl = new URL("/v2/endpoints", apiUrl);
export const longPollUrl = new URL("/v2/notification/pull", apiUrl);
export const subscriptionsUrl = new URL("/v2/subscriptions", apiUrl);
export const webhookUrl = new URL("/v2/notification/callback", apiUrl);

export const resourcePaths = (process.env.RESOURCE || "*").split(",");
export const deviceId = (process.env.DEVICE_ID || "*").split(",");
export const hostName = process.env.APP_HOST || "https://localhost";
export const webhookURI = new URL("callback", hostName).toString();

export const LONG_POLLING_ENABLED: boolean = process.env.LONG_POLLING_ENABLED === "true";

export const checkStatus = async (res: Response) => {
  if (res.ok) {
    // res.status >= 200 && res.status < 300
    return res;
  } else {
    console.log(res.status, res.statusText, await res.text());
    throw new Error(res.statusText);
  }
};

/**
 * Internal function
 * @ignore
 */
export const matchWithWildcard = (input: string, matchWith: string): boolean => {
  // if we have nothing to match with, return false
  if (matchWith === null || matchWith === undefined || matchWith === "") {
    return false;
  }

  // if input is empty or * then we're listening to everything so return true
  if (input === null || input === undefined || input === "" || input === "*") {
    return true;
  }

  // if wildcard used, match on begining of string
  if (input.endsWith("*")) {
    return matchWith.startsWith(input.slice(0, -1));
  }

  // no wildcard so match strings explicitly
  return input === matchWith;
};

export const resolveIn = (n: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, n);
  });
