#!/bin/sh -e

cd "$(dirname "$0")"

rm -Rf build-output
docker build -t gtsearch-build -f Dockerfile.build .
docker run -d --name gtsearch-build-1 gtsearch-build /bin/sh
mkdir build-output
docker cp gtsearch-build-1:/gs build-output
docker stop gtsearch-build-1
docker rm gtsearch-build-1

docker build -t gtsearch .
