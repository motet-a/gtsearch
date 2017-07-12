#!/bin/sh -e

cd "$(dirname "$0")"

read -p 'New version number: ' new_version

sed -i "s/moteta\\/gtsearch:[0-9]*\\.[0-9]*/moteta\\/gtsearch:${new_version}/g" README.md

git commit -m "v${new_version}"
git tag -a "v${new_version}" -m "v${new_version}"

./build.sh
docker tag gtsearch:latest moteta/gtsearch:${new_version}
docker push moteta/gtsearch:${new_version}
