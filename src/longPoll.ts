import fetch from "node-fetch";
import { AsyncRequest, removeAsync } from "./asyncResponses";
import { notification } from "./dbActions";
import { NotificationResponse } from "./types";
import { checkStatus, headers, longPollUrl } from "./utils";

export const startLongPoll = () => {
  // Start long polling in an async thread
  setTimeout(() => longPoll(), 0);
};

const longPoll = async () => {
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
  setTimeout(() => longPoll(), delay);
  // Handle responses
  handleNotification(result);
};

export const handleNotification = (result: NotificationResponse) => {
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
