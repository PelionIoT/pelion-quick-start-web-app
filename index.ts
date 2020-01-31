/**
 * Start up and run a webserver that connects to Pelion Device management
 * Webhooks and long polling supported in this example as well as periodic polling of current values for resources
 */
require("dotenv").config(); // Use a .env file to configure environment variables when running locally
import express from "express";
import moment from "moment";
import path from "path";
import { Pool } from "pg";
import { handleNotification, setup } from "./src/setup";
import { AsyncRequest, NotificationData, Results } from "./src/types";

export const LONG_POLLING_ENABLED: boolean = process.env.LONG_POLLING_ENABLED === "true";

const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

/**
 * Request simple database actions
 * @param query PostGres SQL statement
 */
const getQuery = async (query = "select * from resource_values;") => {
  const results: Results = { results: [] };
  const client = await pool.connect();
  const result = await client.query(query);
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
