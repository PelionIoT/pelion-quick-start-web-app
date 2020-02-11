/**
 * Start up and run a webserver that connects to Pelion Device management
 * Webhooks and long polling supported in this example as well as periodic polling of current values for resources
 */
require("dotenv").config(); // Use a .env file to configure environment variables when running locally
import express from "express";
import path from "path";
import { sendRequest } from "./src/deviceRequest";
import { handleNotification } from "./src/longPoll";
import { setup } from "./src/setup";
import { getQuery } from "./src/dbActions";
import { LONG_POLLING_ENABLED } from "./src/utils";

const PORT = process.env.PORT || 5000;

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
      handleNotification(req.body);
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
    setup();
  });
