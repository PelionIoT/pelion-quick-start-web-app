## Building a web application using the Connect APIs

There is an example application that can be used as a simple introduction to creating web applications using the Pelion Device Management REST APIs. In this case, we focus on the Connect REST APIs, as getting data to and from your device is the first step in any IoT project.
https://github.com/ARMmbed/pelion-quick-start-web-app

### What you need to run this tutorial

This tutorial is aimed at web application developers who want to learn more about the Pelion Device Management APIs. It assumes you have the following knowledge:

* Basic knowledge of web application front end and back end architecture.
* Basic familiarity with setting up web services and applications.
* Basic familiarity with web development approach.
* Basic familiarity with web development security concerns.
* Familiarity with javascript / typescript programming language.
* Access to internet (access to various ports may be needed to interact with web services).
* Access to modify settings on a local workstation or laptop.
* Installation of basic programming tools such as text editors, git, docker, and so on.
* Free trial account to Pelion Device Management (instructions are given for how to set this up).
* One or more IoT devices connected to your account (instructions are given for how to purchase a device and get it connected).

### What you will learn by following this tutorial

Following the tutorial in this section, you will learn:

* Using API keys.
* Connecting devices to Device Management.
* How to subscribe to changes in resources for devices connected to Pelion.
* How to store those values in a [time-series database]().
* A simple example of a web application front-end, which pulls data from a web service API to create a data visualization of the stored time series data.

## Quick Start App Architecture

The main high level components of the example application are:

[]()

This example deployment consists of:

1. An express.js web server running on Heroku (other hosting options are possible).
1. A web application build using react.js, which is served to the user from the web server.
1. A postgres database to store data values from subscriptions to Pelion REST APIs.
1. A Pelion Device Management account.
1. An IoT dev board (in this example, a DISCO 475 board) connected to your account which generates resource value events.

NOTE that this example is intended as a learning example. It is not necessarily representative of the full application architecture that you might select in order to deploy a complex system, at scale, into an existing IT landscape. But the broad concepts and principles should map very easily onto other server architectures, database designs, application frameworks, and programming languages. 

### App startup

For this tutorial, we assume that the configuration option to use webhooks is used (see the section on setting Config Vars below).

At startup the app will initialize the database table and setup a callback channel (webhook) with Pelion Device management.

Here we create the webhook (see setup.ts#L125):
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

The app will then send a request to initiate subscriptions to device resources. A subscription is a way to register interest in a specific device or set of resources. This means that the application does not need to poll for changes in the device state, because an event will be generated every time a resource value actually changes. 

Here we make the request for the subscription, after building the header (see pollValues.ts#86):
// POST /v2/device-requests/{deviceID}?async-id={asyncId}
const url = `${deviceRequestUrl}/${device.id}?async-id=${asyncId}`;
await fetch(url, {
  method: "POST",
  headers,
  body,
})
.then(checkStatus)

### Device resource changes

When the resource value on a device changes, the Pelion Device Management client running on the device sends an event over the CoAP connection to the cloud service. The notification channel is updated with this information, and an event is triggered using the webhook. 
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


### Visualizing Data

The react app periodically requests all data from the server for each device, and visualizes this using the Recharts library. The data was stored in the database as a time series, when the resource change events occurred. The graph library takes this data with time as the X-axis and plots a graph.

Note that there are different possible approaches to updating and refreshing the UI with the latest data, the example uses a simple polling approach. Also, if the resource data covers a long period of time at a high frequency, the web server could filter the results to provide a suitable number of data values for display based on the width of the UI elements on the rendering device. These considerations are out of scope of this example but you might consider these issues when you are designing your own application architecture. 

### Sending data vales to the device

Specific resources on a device may be assigned as writable resources, which means that the value can be modified by sending a PUT request. The example also allows you to do this. Consult your device firmware for details of which resources are able to be modified.
In the example application, the PUT request is a web service API provided by the web app to the web client running on the local browser. This request is handled and is converted into a call to Pelion Device Management REST APIs on the corresponding device.

### How to run the example application?

The full instructions for running the demo can be found here. A summary of the steps follows, which cover the following stages:
1. Create a Pelion Device Management Free-Tier account
2. Purchase and connect your device to Pelion Device Management
3. Confirm the settings and environment variables needed to run the example application
4. Choose whether to deploy the application using a free Heroku account, or whether to deploy the application on your local development laptop
5. Take the next steps in your journey by modifying the example application and learning about additional APIs

### Create a Pelion Device Management account

First, create a Free Tier account, by following the instructions here. If you already have an account and have the credentials to hand, you can skip this step.

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

#### Option 1: Deploy from Github

For this option, you will create an app in Heroku by cloning from an existing Git repository. See the detailed instructions for more details.

##### Set Config Vars

Heroku apps provide configuration options through environment variables. These are called config vars. Two are required for this app to be setup correctly. There are three more that are optional´.

* Start at the following location:  https://dashboard.heroku.com/apps/<APP>
* Now select: Manage App --> Settings --> Reveal Config Vars
See the detailed instructions for more details.

NOTE that the default behaviour is to subscribe to notifications for resource change events on all devices connected to your account, and specifically to listen for changes to temperature sensor resources. This assumes that your device firmware is configured to report temperature data (and that your devices have temperature sensors. If your device has other hardware capabilities, you will need to modify your device firmware to send those values as resources and configure the settings above to listen to the correct Lwm2m resource path.

##### Provision a Database

This app requires access to a Postgres database to store resource values. Heroku provides a free-tier access to hosted Postgres without requiring billing information

##### Check for issues

The Heroku app deploys into dynos, which are hosted containers running application code. The website provides access to application output and logs.

##### Check deployment and compare to reference version

The app is also available in a hosted version here: https://pelion-quick-start-web-app.herokuapp.com/ - so you can compare the existing application with your instance.

Note that when Heroku dynos are not used for some time, they are suspended into a power saving mode. It can take 10-20 seconds to wake up out of this power saving state the next time you return. 

#### Option 2: Run locally using Docker

To run locally and see how the components can store data in the postgres database:

* Generate an [API key](). 
* Ensure that Docker Desktop is installed on your local machine.
* Clone the repository.
* Replace <api_key> with your API key in the .env file.
* Run `docker-compose` in the command line.
* Open browser to http://localhost:5000/ to view.

### What to do next

Once you have completed this tutorial, follow the quick start guide to [connect your device to Device Management]().