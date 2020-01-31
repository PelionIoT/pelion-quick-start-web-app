import { Response } from "node-fetch";

export const checkStatus = async (res: Response) => {
  if (res.ok) {
    // res.status >= 200 && res.status < 300
    return res;
  } else {
    console.log(res.status, res.statusText, await res.text());
    return res;
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

export const generateId = (): string =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`;

export const resolveIn = (n: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, n);
  });
