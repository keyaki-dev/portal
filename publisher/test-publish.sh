#!/bin/bash
set -a
source "$(dirname "$0")/.env.test"
set +a
node "$(dirname "$0")/publish-note.js" "$@"
