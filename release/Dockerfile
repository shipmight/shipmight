# Useful reference for those who edit this file:
# https://github.com/nodejs/docker-node/blob/5949af7/docs/BestPractices.md

FROM node:16-alpine as build
ARG SHIPMIGHT_VERSION
ARG SHIPMIGHT_COMMIT
WORKDIR /build
COPY package.json yarn.lock tsconfig.json /build/
RUN yarn
COPY src /build/src
COPY LICENSE /build/LICENSE
COPY release/dev-utils /build/release/dev-utils
RUN node release/dev-utils/build.js

FROM node:16-alpine as helm
WORKDIR /usr/app
RUN wget https://get.helm.sh/helm-v3.8.1-linux-amd64.tar.gz
RUN tar -zxvf helm-v3.8.1-linux-amd64.tar.gz
RUN mv linux-amd64/helm /usr/app/helm
RUN chmod +x /usr/app/helm

FROM node:16-alpine
ENV NODE_ENV production
WORKDIR /shipmight
RUN apk add --no-cache tini
COPY --from=helm /usr/app/helm /usr/bin/helm
COPY package.json yarn.lock /shipmight/
RUN yarn --production
COPY --from=build /build/dist /shipmight/dist
USER node
ENTRYPOINT [ "/sbin/tini", "--", "node", "/shipmight/dist/backend/cli/cli.js" ]
