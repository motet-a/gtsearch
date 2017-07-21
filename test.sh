#!/bin/sh -e

cd "$(dirname "$0")"

alias dc="docker-compose -p gtsearch -f docker-compose.test.yml"
dc build
alias exec="dc run --rm server"

dc up -d
dc exec server yarn run test || dc down
dc down
