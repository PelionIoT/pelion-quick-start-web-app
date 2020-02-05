[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://spdx.org/licenses/Apache-2.0.html)

# Sample Pelion Web app for storing and visualising device data

## Deploy to a server with Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

- [Getting started](./GETTING_STARTED.md)
- [Demo deployment](https://pelion-quick-start-web-app.herokuapp.com/)
- [Architecture overview](./ARCHITECTURE.md)

## Run locally using Docker

To run locally and see how the components can store data in the postgres database, get an API key and follow these steps:

- Clone repo
- Replace `<APIKEY>` with your API key in the `.env` file
- Run `docker-compose up` in the command line
- Open browser to http://localhost:5000/ to view
