import fetch from "node-fetch";
import { getQuery } from "./dbActions";
import { startLongPoll } from "./longPoll";
import { getValues } from "./pollValues";
import { DeviceResource, RegisteredDevicesResponse, SubscriptionBody } from "./types";
import {
  checkStatus,
  deviceDirectoryUrl,
  deviceId,
  endpointsUrl,
  headers,
  hostName,
  LONG_POLLING_ENABLED,
  matchWithWildcard,
  resourcePaths,
  subscriptionsUrl,
  webhookURI,
  webhookUrl,
} from "./utils";

console.log(`APP_HOST=${hostName}`);
console.log(`RESOURCE=${resourcePaths.join(",")}`);
console.log(`DEVICE_ID=${deviceId.join(",")}`);
console.log(`LONG_POLLING_ENABLED=${process.env.LONG_POLLING_ENABLED}\n`);

/**
 * Setup the database, subscriptions, webhooks and / or long polling
 */
export const setup = async () => {
  console.log("Updating table schema");
  try {
    await getQuery(
      `
    create table if not exists resource_values ( 
      id serial, 
      device_id varchar(50), 
      path varchar(50), 
      time timestamp, 
      value text 
      );
    `
    );
    await getQuery(
      `
      create table if not exists devices ( 
        id serial, 
        device_id varchar(50) unique, 
        name varchar(50), 
        state varchar(50),
        resources text
        );
      `
    );
  } catch (err) {
    console.error(err);
  }

  try {
    console.log("Updating subscriptions");
    // Remove any old subscriptions before setting new ones DELETE /v2/subscriptions
    await fetch(subscriptionsUrl, {
      method: "DELETE",
      headers,
    }).then(checkStatus);

    // Create new pre-subscriptions for devices and resources configured in DEVICE_ID and RESOURCE
    const subscriptionBody: SubscriptionBody[] = [];
    deviceId.forEach(d => subscriptionBody.push({ "endpoint-name": d, "resource-path": resourcePaths }));

    console.log("Setting pre-subscriptions");
    // PUT /v2/subscriptions
    await fetch(subscriptionsUrl, { method: "PUT", headers, body: JSON.stringify(subscriptionBody) }).then(checkStatus);

    /**
     *  Create subscriptions for currently registered devices.
     * 1. Get registered devices.
     * 2. Get resources for each device.
     * 3. Set subscription for matching resources
     */

    console.log("Setting subscriptions on registered devices");
    // Get registered devices GET /v3/devices?state_eq=registered ==> list of devices with deviceIDs
    const registeredDevices = (await fetch(`${deviceDirectoryUrl}?state__eq=registered`, { headers })
      .then(checkStatus)
      .then(res => res.json())) as RegisteredDevicesResponse;

    registeredDevices.data
      // Filter for matching DEVICE_ID
      .filter(device => deviceId.reduce<boolean>((prev, curr) => prev || matchWithWildcard(curr, device.id), false))
      .forEach(async device => {
        // Get resources on each matched device GET /v2/endpoints/{deviceID}
        const resources = (await fetch(`${endpointsUrl}/${device.id}`, { headers })
          .then(checkStatus)
          .then(r => r.json())) as DeviceResource[];
        resources
          // Filter for matching RESOURCE
          .filter(resource =>
            resourcePaths.reduce<boolean>((prev, curr) => prev || matchWithWildcard(curr, resource.uri), false)
          )
          .forEach(
            // Set subscription on each resource PUT /v2/subscriptions/{deviceID}/{resourcePath}
            async resource =>
              await fetch(`${subscriptionsUrl}/${device.id}/${resource.uri}`, { method: "PUT", headers }).then(
                checkStatus
              )
          );
      });
    console.log("Subscriptions updated");

    /**
     * Remove old webhook if exists so we can use long-polling or to set new one
     * DELETE /v2/notification/callback
     */
    await fetch(webhookUrl, { method: "DELETE", headers })
      .then(checkStatus)
      .catch(() => {});
    console.log("Deleted old webhook");

    // Notifications can come through long-polling (PULL) or via webhooks (PUSH)
    if (LONG_POLLING_ENABLED) {
      // Start long-polling via timeouts and repeated calls to /v2/notification/pull
      startLongPoll();
      console.log("Using long-polling");
    } else {
      // Create a webhook PUT /v2/notification/callback
      const webhookBody = {
        url: webhookURI,
        serialization: {
          type: "v2",
          cfg: {
            include_timestamp: true,
          },
        },
      };
      await fetch(webhookUrl, {
        headers: { ...headers, "content-type": "application/json" },
        method: "PUT",
        body: JSON.stringify(webhookBody),
      }).then(checkStatus);
      console.log(`Using Webhook "${webhookURI}"`);
    }
  } catch (err) {
    console.error(err);
  }

  // Get initial values for all targeted resources see pollValues.ts
  getValues();
};
