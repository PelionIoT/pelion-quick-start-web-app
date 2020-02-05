FROM node:current-alpine

RUN mkdir /app

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install

WORKDIR /app
ADD . .

WORKDIR /app/client
RUN npm run build
RUN rm -rf node_modules

WORKDIR /app
RUN npm cache clean --force

EXPOSE 5000
CMD [ "./node_modules/.bin/ts-node", "index.ts" ]
