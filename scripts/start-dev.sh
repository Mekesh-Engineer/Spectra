#!/usr/bin/env bash
set -e

echo "Starting Spectra development servers..."

# Start backend
npm run dev:server &
SERVER_PID=$!

# Start frontend
npm run dev &
CLIENT_PID=$!

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null" EXIT

wait
