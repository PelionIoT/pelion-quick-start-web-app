# Building and deploying a web application using the Connect APIs

This tutorial shows you how to build and deploy a web application using the Device Management Connect APIs. We provide an [example application](https://github.com/ARMmbed/pelion-quick-start-web-app) that you can use.

## What this tutorial covers

This tutorial covers:

* Using API keys.
* Connecting a device to Device Management.
* How to subscribe to device resource changes through Pelion.
* How to store those values in a time-series database.
* A simple example of a web application front-end, which pulls data from a web service API to create a data visualization of the stored time-series data.

## Materials and prerequisites

This tutorial is aimed at web application developers who want to learn more about the Device Management APIs. It assumes you have:

* Basic familiarity with:
  * Web application front-end and back-end architecture.
  * Web development and security concerns.
  * Setting up web services and applications.
  * Javascript or typescript programming languages.
* Access to the internet (you might need access to various ports to interact with the web services).
* Authorization to modify settings on a local workstation or laptop.
* Programming tools such as text editors, Git, Docker, and so on.
* One or more IoT devices connected to your account.

## Create a Pelion Device Management account

First, create a Free Tier account, by following the instructions here. If you already have an account and have the credentials to hand, you can skip this step.

## App startup

For this tutorial, use webhooks (see [Config vars](#set-config-vars) below).

At startup the app will initialize the database table and set up a callback channel (webhook) with Pelion Device management.

1. Create the webhook (see setup.ts#L125):

```
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
```

The app then sends a request to initiate subscriptions to device resources.

1. Send an API request to set up the subscription, after building the header (see pollValues.ts#86):
// POST /v2/device-requests/{deviceID}?async-id={asyncId}
const url = `${deviceRequestUrl}/${device.id}?async-id=${asyncId}`;
await fetch(url, {
  method: "POST",
  headers,
  body,
})
.then(checkStatus)

## Device resource changes

When the resource value on a device changes, the client running on the device sends an event over the CoAP connection to Device Management. The notification channel is updated with this information, and an event is triggered using the webhook. 
The web app is listening for these notification events (see index.ts#L70):
// If using webhooks, provide a callback endpoint on the server for notifications
if (!LONG_POLLING_ENABLED) {
  expressServer.all("/callback", async (req, res) => {
    try {
      handleNotification(req.body);
    }

When a notification is received, the event is handled, and the payload from the notification is stored in the postgres database, which includes a timestamp of when the resource changed (see dbActions.ts#L39):
  const text =
    "INSERT INTO resource_values(device_id, path, time, value) VALUES($1, $2, to_timestamp($3 / 1000.0), $4) RETURNING *";
  const values = [deviceId, path, Date.now(), payload];
  try {
    const res = await pool.query(text, values);

## Visualizing Data

The react app periodically requests all data from the server for each device, and visualizes this using the Recharts library. The data was stored in the database as a time series, when the resource change events occurred. The graph library takes this data with time as the X-axis and plots a graph.

Note that there are different possible approaches to updating and refreshing the UI with the latest data, the example uses a simple polling approach. Also, if the resource data covers a long period of time at a high frequency, the web server could filter the results to provide a suitable number of data values for display based on the width of the UI elements on the rendering device. These considerations are out of scope of this example but you might consider these issues when you are designing your own application architecture. 

## Sending data vales to the device

Specific resources on a device may be assigned as writable resources, which means that the value can be modified by sending a PUT request. The example also allows you to do this. Consult your device firmware for details of which resources are able to be modified.
In the example application, the PUT request is a web service API provided by the web app to the web client running on the local browser. This request is handled and is converted into a call to Pelion Device Management REST APIs on the corresponding device.

## How to run the example application

The full instructions for running the demo can be found here. A summary of the steps follows, which cover the following stages:
1. Create a Pelion Device Management Free-Tier account
2. Purchase and connect your device to Pelion Device Management
3. Confirm the settings and environment variables needed to run the example application
4. Choose whether to deploy the application using a free Heroku account, or whether to deploy the application on your local development laptop
5. Take the next steps in your journey by modifying the example application and learning about additional APIs



### Connect your device to Pelion Device Management

There is a complete tutorial for connecting your device to Pelion Device Management, which is here, but in summary:

1. View a list of supported devices here, and purchase devices from approved distributors. Once you have received your device, select the board you have chosen from the tutorial front page – all of the remaining steps will now be customized for your specific board.
2. Select an example firmware application that corresponds to your device. This will have very basic connectivity enabled, and should have some Lwm2m resources defined.
3. Connect the online compiler to your new account, and then download a developer certificate. This will be used to identify the device to the cloud (note that developer certificates are not suitable for production deployment).
4. Finally you can check that your device is connected to Pelion Device Management.
When you have completed these steps, you will be ready to install and run the web application example. 

### Required information for the Web Application

Now that you have registered and set up your Mbed account and Pelion device management account, you will need two pieces of information at a minimum to get the example application running correctly.
* APIKEY - API Key from Pelion Device Management - https://portal.mbedcloud.com/
* APP_HOST - URL of the application to be deployed - https://<APP>.herokuapp.com/

### Option 1: Deploy from Github

Choose this to create an application in Heroku by cloning from an existing Git repository.

#### Set configuration variables

Heroku apps provide configuration options through environment variables. These are called configuration variables. Two are required for this app to be setup correctly. There are three more that are optional´.

* Start at the following location:  https://dashboard.heroku.com/apps/<APP>
* Now select: Manage App --> Settings --> Reveal Config Vars
See the detailed instructions for more details.

<span class="notes">**Note:** The default behavior <of what?> is to subscribe to notifications for resource change events on all devices connected to your account, and specifically to listen for changes to temperature sensor resources. This assumes that your device firmware is configured to report temperature data (and that your devices have temperature sensors. If your device has other hardware capabilities, you will need to modify your device firmware to send those values as resources and configure the settings above to listen to the correct Lwm2m resource path.</span>

#### Provision a Database

This app requires access to a Postgres database to store resource values. Heroku provides a free-tier access to hosted Postgres without requiring billing information

#### Check for issues

The Heroku app deploys into **dynos**, hosted containers running application code. The website provides application output and logs.

#### Check deployment and compare to reference version

The app is also available in a hosted version here: https://pelion-quick-start-web-app.herokuapp.com/ - so you can compare the existing application with your instance.

Inactive Heroku dynos go into a power-saving mode. The dyno can take 10-20 seconds to wake up when you return.

### Option 2: Run locally using Docker

To run locally and see how the components can store data in the postgres database:

* Generate an [API key]().
* Ensure that Docker Desktop is installed on your local machine.
* Clone the repository.
* Replace <api_key> with your API key in the .env file.
* Run `docker-compose` in the command line.
* Open your browser to http://localhost:5000/ to view.