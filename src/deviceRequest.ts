import fetch from "node-fetch";
import { generateId, storeAsync } from "./asyncResponses";
import { checkStatus, deviceRequestUrl, headers } from "./utils";

export const sendRequest = async (deviceId: string, path: string, payload: string, post = false) => {
  const asyncId = generateId();
  const body = JSON.stringify({
    method: post ? "POST" : "PUT",
    uri: path,
    "payload-b64": Buffer.from(payload, "utf-8").toString("base64"),
  });
  // POST /v2/device-requests/{deviceID}?async-id={asyncId}
  const url = `${deviceRequestUrl}/${deviceId}?async-id=${asyncId}`;
  console.log(url, body);
  await fetch(url, {
    method: "POST",
    headers,
    body,
  })
    .then(checkStatus)
    .then(res => {
      if (!res.ok) console.log(`PUT Request sent`);
    });
  /**
   * Store the AsyncID, DeviceID and resourcePath somewhere to handle notifications later
   */
  storeAsync({ asyncId, deviceId, path });
};
