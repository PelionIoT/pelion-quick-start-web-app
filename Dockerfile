FROM node:current-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

WORKDIR /usr/src/app/client

COPY client/package*.json ./

RUN npm ci

WORKDIR /usr/src/app

ADD . .

WORKDIR /usr/src/app/client

RUN npm run build

RUN rm -rf node_modules

WORKDIR /usr/src/app

RUN npm cache clean --force

EXPOSE 5000

CMD [ "npx", "ts-node", "index.ts" ]
