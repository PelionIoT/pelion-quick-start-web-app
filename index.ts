/**
 * Start up and run a webserver that connects to Pelion Device management
 * Webhooks and long polling supported in this example as well as periodic polling of current values for resources
 */
require("dotenv").config(); // Use a .env file to configure environment variables when running locally
import express from "express";
import moment from "moment";
import path from "path";
import fetch from "node-fetch";
import { Pool } from "pg";
import { handleNotification, setup } from "./src/setup";
import { AsyncRequest, NotificationData, Results } from "./src/types";
import { generateId, checkStatus } from "./src/utils";

const apiUrl = process.env.API_HOST || "https://api.us-east-1.mbedcloud.com/";
const apiKey = process.env.API_KEY;
const headers = { Authorization: `bearer ${apiKey}`, "Content-Type": "application/json" };

const deviceRequestUrl = new URL("/v2/device-requests", apiUrl);

console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);

export const LONG_POLLING_ENABLED: boolean = process.env.LONG_POLLING_ENABLED === "true";

const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Request simple database actions
 * @param query PostGres SQL statement
 */
export const getQuery = async (query = "select * from resource_values;", values: string[] = []) => {
  const results: Results = { results: [] };
  const client = await pool.connect();
  const result = await client.query(query, values);
  results.results = result ? result.rows : [];
  client.release();
  return results;
};

/**
 * Device-requests API requires client code to manage and store unique async-ids
 * for each request.  This is a basic list implementation to store this information
 * and provide device id and resource path context to each async response
 */
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

/**
 * Notifications from Pelion Device management are related to
 * - DeviceID - the identifier of the device event has originated
 * - Path - Resource path in LwM2M URI format where the resource information originated on device e.g. /3303/0/5700
 * - Payload - Number or string value of the event from the device and resource.  Originates as base64 encoded string decoded in another handler
 * @param param0 Notification data to be stored
 */
const notification = async ({ deviceId, path, payload }: NotificationData) => {
  if (isNaN(payload as number)) {
    return;
  }
  if (payload === "") {
    console.log(`${deviceId} ${path} - Empty Payload`);
    return;
  }
  const text =
    "INSERT INTO resource_values(device_id, path, time, value) VALUES($1, $2, to_timestamp($3 / 1000.0), $4) RETURNING *";
  const values = [deviceId, path, Date.now(), payload];
  try {
    const res = await pool.query(text, values);
    const { id, device_id, path, value, time } = res.rows[0];
    const t = moment(time)
      .format("lll")
      .toString();
    console.log(`${t} ${id} ${device_id} ${path} ${value}`);
  } catch (err) {
    console.log(err.stack);
  }
};

const sendRequest = async (deviceId: string, path: string, payload: string, post = false) => {
  const asyncId = generateId();
  const body = JSON.stringify({
    method: post ? "POST" : "PUT",
    uri: path,
    "payload-b64": new Buffer(payload).toString("base64"),
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

/**
 * Set up the Express server.
 * Always register the `/values` and `*` endpoints.
 * Only register the `/callback` endpoint if using webhooks and not long polling.
 */
const expressServer = express()
  .use(express.static(path.join(__dirname, "client/build")))
  .use(express.json())
  .use((_, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  })
  // Provides stored values to the react web app contained in /client folder
  .get("/values", async (_, res) => {
    const query = "select * from resource_values order by time desc limit 10000;";
    try {
      res.send(await getQuery(query));
    } catch (err) {
      res.send("Error" + err);
    }
  })
  .get("/reset-values", async (_, res) => {
    try {
      res.send(await getQuery("truncate resource_values;"));
    } catch (err) {
      res.send("Error" + err);
    }
  })
  .get("/devices", async (_, res) => {
    try {
      res.send(await getQuery("select * from devices where state='registered';"));
    } catch (err) {
      res.send("Error" + err);
    }
  })
  .put("/devices/:device_id/:obj/:inst/:resource", async (req, res) => {
    const { device_id, obj, inst, resource } = req.params;
    console.log(`PUT /devices/${device_id}/${obj}/${inst}/${resource} - ${req.body.payload}`);
    sendRequest(device_id, `/${obj}/${inst}/${resource}`, req.body.payload);
    res.sendStatus(204);
  })
  .post("/devices/:device_id/:obj/:inst/:resource", async (req, res) => {
    const { device_id, obj, inst, resource } = req.params;
    console.log(`POST /devices/${device_id}/${obj}/${inst}/${resource} - ${req.body.payload}`);
    sendRequest(device_id, `/${obj}/${inst}/${resource}`, req.body.payload, true);
    res.sendStatus(204);
  })
  // Serves the react web app in /client and built artifacts put into /client/build/
  .get("*", (_, res) => {
    res.sendFile(path.join(__dirname + "/client/build/index.html"));
  });

// If using webhooks, provide a callback endpoint on the server for notifications
if (!LONG_POLLING_ENABLED) {
  expressServer.all("/callback", async (req, res) => {
    try {
      handleNotification(req.body, notification);
    } catch (err) {
      console.log(err.stack);
    } finally {
      res.sendStatus(204);
    }
  });
}

expressServer
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
  .once("listening", () => {
    setup(pool, notification, LONG_POLLING_ENABLED);
  });
