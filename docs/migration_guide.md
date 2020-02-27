# Moving from the Pelion Device Management SDKs to the APIs

You can still find the Pelion Device Management SDKs as [open-source code on Github](), but Pelion will no longer actively maintain or update the Device Management SDKs, effective March 2020.

## What are the APIs?

The Device Management APIs provide access to all Device Management services and the devices connected to them from your own web services. With the APIs, you can:

* Build and administer your own version of Device Management on top of the secure Pelion platform.
* Process data retrieved from your devices.
* Make frequent changes to your devices.
* Create your own subset of features, and extend to provide your own custom application.
* Combine data and device management with data from other services.
* Interact directly with devices instead of through Device Management Portal.
* Use Device Management without a graphical interface, for example, to automate routine operations.
* Integrate with other third party systems such as CRM, data analytics platforms, and other solutions.

## Do I need to change my integration?

We aren't removing any functionality: if you have an existing integration, it will work without modification. However, if you need to change your integration, are developing a new application, or want to use new Device Management features, use the APIs directly.

If you haven't used an API before and want to know more about the concepts involved, see our [introduction to the APIs](../service-api-references/using-the-apis.html).

## Example workflow

After a brief introduction to the application architecture, these tutorials guide you through building and deploying a web application using Heroku, then using the APIs to connect your device to Device Management.

## Quick Start application architecture

The main components of the example application are:

* An express.js web server running on Heroku. This works with other hosting services, but we've chosen Heroku because it's free.
* A web application build using react.js, which is served to the user from the web server.
* A Postgres database to store data values from subscriptions to Pelion REST APIs.
* A Pelion Device Management account.
* An IoT dev board (in the tutorial, a DISCO 475 board) connected to your account which generates resource value events.

<span class="notes">**Note:** This is an example only. Your own deployment and architecture may vary.</span>

### Building and deploying a web application

### Connect a device to Device Management through your web application

Follow the [Device Management Connect quick start]().

## What to do next

Now that you have completed the tutorial, there are a few steps that you might choose to take.

### Learning more about the APIs

The public documentation for the APIs can be found here. In the following sections, you can get a quick introduction to using the Connect REST APIs by following the [quick start web application tutorial]().

### Modify your example firmware

Depending on the hardware features enabled on your device, you may be able to implement additional functionality in your firmware.

To begin, consider the Basic Device Management Client example with Mbed OS which is the firmware that was used in the getting connected tutorial above. This is a good starting point for client development.

For example, you may be able to expose additional resource values, and then modify your web application parameters in order to observe those new resources and add them to the app database. The Pelion Device Management Client Lite documentation describes how to manage resources in more detail.

### Explore additional APIs

There are a number of different APIs which cover different aspects of device management:

* Device Directory API: Stores device information and lets you manage devices.
* Update Service API: Manages device firmware updates.
* Account Management API: Manages account access, authorization, communication, and branding.
* Connect CA API: Allows services to get device credentials.
* Connect API: Allows web applications to communicate with devices, as in the example tutorial above.
* Notification API: Allows web applications to register notification channels for devices, also covered above.
* Bootstrap API: Allows web applications to control the device bootstrapping process.
* Enrollment API: Allows users to claim ownership of a device that is not yet assigned to an account.
* Connect Statistics API: Provides statistics about services through defined counters.
* Customer's third party CA API: Defines a third-party bootstrap certificate provider.
* Certificate enrollment API: Allows management of certificate renewal on devices.
* Billing API: Allows users to retrieve billing reports and service package details.
* Secure Device Access API: Enables you to request an access token and to manage trust anchors.

<!-- Notes

* Who's this for? This is mostly aimed toward web app developers.
* Where will it go? Should go into the SDK intro area. Work into existing structure. Tutorial most likely ends up in integrating web app chapter.
* What will it tell me? How to make sense of the APIs when I've been working with the SDKs.
* Does it actually tell me that? Let's make sure. 
* Why's this important? The SDKs aren't being maintained anymore. Your choices for DM are either Portal or the APIs.
* What do I need to do with this information?
* What's the next step?

[Melinda W4]Let's make sure this is in sync with https://www.pelion.com/docs/device-management/current/service-api-references/index.html 
[Melinda W5]For instance, this says CRUDL, whereas the docs say CRUD.

We might be able to assume some standard background from developers (though that's dangerous in itself), but we should avoid claiming something is 'easy'. Makes it all the more frustrating when something goes wrong.
[Melinda W8]Full stop at the end of each entry in a bulleted list.
[Melinda W9]They require an initial investment in learning, but once you understand them, you know _exactly_ what you're asking the system to do. And that's ultimately simpler. 
[Melinda W10]The APIs change irrespective of your client version and app integration; it's the developer's responsibility to make sure they change their integration so it doesn't break.
[Melinda W11]Documentation is an area where we can make sure we put our money where our mouth is on this.
[Melinda W12]Is it that we won't maintain them, or that users won't be able to make PRs and change them going forward?
[Melinda W13]The flip side of this is that existing implementations *can't* change or they'll break?
[Melinda W14]https://www.pelion.com/docs/device-management/current/service-api-references/service-api-documentation.html for API docs
[Melinda W15]https://www.pelion.com/docs/device-management/current/service-api-references/service-api-documentation.html for API docs -->