import fetch from "node-fetch";
import { Pool } from "pg";
import { removeAsync } from "../";
import { getValues } from "./pollValues";
import {
  AsyncRequest,
  DeviceResource,
  NotificationData,
  NotificationResponse,
  RegisteredDevicesResponse,
  SubscriptionBody,
} from "./types";
import { checkStatus, matchWithWildcard } from "./utils";

const hostName = process.env.APP_HOST || "https://localhost";
const webhookURI = new URL("callback", hostName).toString();
const resourcePaths = (process.env.RESOURCE || "/3303/*").split(",");
const deviceId = (process.env.DEVICE_ID || "*").split(",");
const apiUrl = process.env.API_HOST || "https://api.us-east-1.mbedcloud.com/";
const apiKey = process.env.API_KEY;
const headers = { Authorization: `bearer ${apiKey}` };

const subscriptionsUrl = new URL("/v2/subscriptions", apiUrl);
const deviceDirectoryUrl = new URL("/v3/devices", apiUrl);
const endpointsUrl = new URL("/v2/endpoints", apiUrl);
const longPollUrl = new URL("/v2/notification/pull", apiUrl);
const webhookUrl = new URL("/v2/notification/callback", apiUrl);

console.log(`APP_HOST=${hostName}`);
console.log(`RESOURCE=${resourcePaths.join(",")}`);
console.log(`DEVICE_ID=${deviceId.join(",")}`);
console.log(`LONG_POLLING_ENABLED=${process.env.LONG_POLLING_ENABLED}\n`);

/**
 * Setup the database, subscriptions, webhooks and / or long polling
 */
export const setup = async (pool: Pool, notification: (n: NotificationData) => void, longPolling: boolean = false) => {
  console.log("Updating table schema");
  try {
    const client = await pool.connect();
    const query =
      "create table if not exists resource_values ( id serial, device_id varchar(50), path varchar(50), time timestamp, value text );";
    await client.query(query);
    client.release();
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
    if (longPolling) {
      // Start long-polling via timeouts and repeated calls to /v2/notification/pull
      startLongPoll(notification);
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
  getValues(notification);
};

const startLongPoll = (notification: (n: NotificationData) => void) => {
  // Start long polling in an async thread
  setTimeout(() => longPoll(notification), 0);
};

const longPoll = async (notification: (n: NotificationData) => void) => {
  /**
   * Get notifications through long-polling channel
   * GET /v2/notification/pull
   */
  let delay = 500;
  const result = await fetch(longPollUrl, { headers })
    .then(checkStatus)
    .then(r => r.json())
    .catch(e => {
      // If errors start to occur, do another long poll but wait a few seconds to prevent rapid ramp-up if this is due to 409 conflicts
      delay *= 10;
    });
  /**
   * Do another long-poll.
   * Long-polling requires the client code to actively request notifications.
   * Empty responses occur if no event happens within 30 seconds.  Client code will need to handle 204 and request again.
   */
  setTimeout(() => longPoll(notification), delay);
  // Handle responses
  handleNotification(result, notification);
};

export const handleNotification = (result: NotificationResponse, notification: (n: NotificationData) => void) => {
  if (!result) {
    return;
  }
  const { notifications } = result;
  const asyncResponses = result["async-responses"];
  /**
   * Events come through several categories.  Here the code looks for notifications and async-responses
   * Notifications are for subscriptions and pre-subscriptions.
   * Each notification will contain information about the device and resource path plus the event data in base64 encoded string
   */
  if (notifications) {
    notifications.forEach(n =>
      notification({ deviceId: n.ep, path: n.path, payload: Buffer.from(n.payload, "base64").toString() })
    );
  }
  /**
   * Async responses are for device-requests. One-off requests to the device resource for GET, PUT or POST.
   * These responses match to async-id created by the client at the request time.
   * The client will need to know the context of each async-request and match the device id and resource path.
   */
  if (asyncResponses) {
    asyncResponses.forEach(n => {
      const async = removeAsync(n.id) as AsyncRequest;
      if (async) {
        notification({
          deviceId: async.deviceId,
          path: async.path,
          payload: Buffer.from(n.payload, "base64").toString(),
        });
      }
    });
  }
};
