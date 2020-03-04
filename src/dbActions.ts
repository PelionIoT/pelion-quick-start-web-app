import moment from "moment";
import { Pool } from "pg";
import { NotificationData, Results } from "./types";
import { STORE_DATA } from "./utils";

console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_USE_SSL !== "false" ? true : false,
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
 * Notifications from Pelion Device management are related to
 * - DeviceID - the identifier of the device event has originated
 * - Path - Resource path in LwM2M URI format where the resource information originated on device e.g. /3303/0/5700
 * - Payload - Number or string value of the event from the device and resource.  Originates as base64 encoded string decoded in another handler
 * @param param0 Notification data to be stored
 */
export const notification = async ({ deviceId, path, payload }: NotificationData) => {
  if (isNaN(payload as number)) {
    return;
  }
  if (payload === "") {
    console.log(`${deviceId} ${path} - Empty Payload`);
    return;
  }
  const timestamp = Date.now();
  if (STORE_DATA) {
    const text =
      "INSERT INTO resource_values(device_id, path, time, value) VALUES($1, $2, to_timestamp($3 / 1000.0), $4) RETURNING *";
    const values = [deviceId, path, timestamp, payload];
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
  } else {
    console.log(`Data received for ${deviceId} - ${path} - ${payload} - Not Storing`);
  }
  try {
    await pool.query(
      `UPDATE devices SET first_update=to_timestamp($1 / 1000.0) WHERE device_id = $2 and (first_update is null or EXTRACT(epoch FROM age(to_timestamp($1 / 1000.0) , latest_update)) > 60 * 5);`,
      [timestamp, deviceId]
    );
    await pool.query(
      `UPDATE devices SET latest_value = $1, latest_update=to_timestamp($2 / 1000.0) WHERE device_id = $3;`,
      [payload, timestamp, deviceId]
    );
  } catch (err) {
    console.log(err.stack);
  }
};
