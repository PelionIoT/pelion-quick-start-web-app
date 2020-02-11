import fetch from "node-fetch";
import { generateId, storeAsync } from "./asyncResponses";
import { getQuery } from "./dbActions";
import { DeviceResource, RegisteredDevicesResponse } from "./types";
import {
  checkStatus,
  deviceDirectoryUrl,
  deviceRequestUrl,
  endpointsUrl,
  headers,
  matchWithWildcard,
  resolveIn,
  deviceId,
  resourcePaths,
} from "./utils";

const POLLING_INTERVAL = 1000 * 60 * 5;

/**
 * Poll for values of resources we are interested in.
 * Subscriptions are good for when the resource value changees.
 * This does not guarantee that we always know what the resource value is for each device.
 * This routine calls each active device matching DEVICE and does a GET request on each matching RESOURCE
 * Wait five minutes and do it again
 */
export const getValues = async () => {
  console.log("Getting latest resource values");
  console.log("Getting registered devices");
  // GET /v3/devices?state__eq=registered
  const registeredDevices = (await fetch(deviceDirectoryUrl, { headers })
    .then(checkStatus)
    .then(res => res.json())) as RegisteredDevicesResponse;

  registeredDevices.data
    // Filter for matching DEVICE
    .filter(device => deviceId.reduce<boolean>((prev, curr) => prev || matchWithWildcard(curr, device.id), false))
    .forEach(async device => {
      console.log(`Update db for device: ${device.id} ${device.name}`);
      await getQuery(
        `
        INSERT INTO devices(device_id, name, state, resources) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (device_id)
        DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state;`,
        [device.id, device.name, device.state, ""]
      );
      if (device.state !== "registered") {
        return;
      }
      console.log(`Looking for resources on ${device.id}`);
      // Collect resources on each device GET /v2/endpoints/{deviceID}
      const resources = (await fetch(`${endpointsUrl}/${device.id}`, { headers })
        .then(checkStatus)
        .then(r => r.json())) as DeviceResource[];

      await getQuery(
        `
          UPDATE devices
          SET resources = $2
          WHERE device_id = $1;`,
        [device.id, JSON.stringify(resources)]
      );

      // Filter for matching RESOURCE
      const matchedRes = resources.filter(resource =>
        resourcePaths.reduce<boolean>((prev, curr) => prev || matchWithWildcard(curr, resource.uri), false)
      );

      /**
       * Use a synchronous loop to request resource values
       * POST /v2/device-requests add requests to a queue for each device.
       * The queue max-length is 20 so it could easily be overrun on devices with many resources
       * Use a simple setTimeout of 100ms to slow down the requests.
       */
      for (const resource of matchedRes) {
        console.log(`Requesting resource ${resource.uri}`);
        /**
         * Use pseudo random number generator to create AsyncID.
         * This will appear in notification channel when response comes back from the device
         */
        const asyncId = generateId();
        const body = JSON.stringify({
          method: "GET",
          uri: resource.uri,
        });
        // POST /v2/device-requests/{deviceID}?async-id={asyncId}
        const url = `${deviceRequestUrl}/${device.id}?async-id=${asyncId}`;
        await fetch(url, {
          method: "POST",
          headers,
          body,
        })
          .then(checkStatus)
          .then(res => {
            if (!res.ok) console.log(resource.uri);
          });
        /**
         * Store the AsyncID, DeviceID and resourcePath somewhere to handle notifications later
         */
        storeAsync({ asyncId, deviceId: device.id, path: resource.uri });

        await resolveIn(500);
      }
    });
  console.log(`Resource values requested, going to sleep for ${POLLING_INTERVAL / (1000 * 60)} minute(s)`);
  setTimeout(() => getValues(), POLLING_INTERVAL);
};
