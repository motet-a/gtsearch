FROM node:8.1.3-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git grep \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

RUN mkdir -p /gs/client

COPY build-output/gs/client/dist /gs/client/dist
COPY client/index.html /gs/client/

COPY build-output/gs/server /gs/server
COPY server/src /gs/server/src

WORKDIR /gs/server

CMD ["node", "src/index.js"]
