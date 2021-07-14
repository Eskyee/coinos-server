FROM node:slim

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

RUN apt-get update
RUN apt-get install git make gcc g++ python libzmq3-dev -y

COPY . /app
WORKDIR /app

RUN yarn install

ENV SHELL /bin/bash

CMD ["yarn", "start"]
