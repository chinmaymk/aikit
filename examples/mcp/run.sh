#!/bin/bash
# This script starts the MCP server and client for the AIKit demo.

# Change into the script's directory to ensure paths are resolved correctly.
cd "$(dirname "$0")"

# The `concurrently` command runs both processes in parallel.
# `--kill-others` ensures that if one process (like the client) exits,
# the other process (the server) is also terminated.
# `--success first` means the command will exit successfully as soon as
# the client finishes, without waiting for the server.

npx concurrently --kill-others --success first "npx tsx server.ts" "sleep 2 && npx tsx client.ts" 