#!/bin/sh -e

cd "$(dirname "$0")"

alias dc="docker-compose -f docker-compose.dev.yml"
dc build
alias run="dc run --rm server"

run yarn run test
