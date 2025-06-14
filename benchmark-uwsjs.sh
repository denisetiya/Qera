#!/bin/bash

# Run a benchmark comparison focusing on Node.js frameworks using uWebSockets.js

echo "This script runs performance benchmarks comparing uWebSockets.js based frameworks"
echo "========================================================================"
echo ""

# Ensure dependencies are installed
echo "Ensuring all dependencies are installed..."
pnpm install

# Run the build to make sure we have the latest version
echo "Building the Qera framework..."
pnpm build

# Clear any port conflicts
echo "Checking for processes using benchmark ports..."
for port in 3000 3005; do
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid using port $port"
    kill -9 $pid
  fi
done

# Create servers directory if it doesn't exist
mkdir -p benchmark/servers

# Make sure server files are up to date
echo "Copying Qera server for benchmarking..."
cp benchmark/benchmark-server.js benchmark/servers/qera-server.js

# Start the Qera server
echo -e "\nStarting Qera server..."
node benchmark/servers/qera-server.js &
QERA_PID=$!

# Give some time for the server to start
sleep 2

# Run benchmark against Qera
echo "Running benchmark against Qera..."
npx autocannon -c 100 -d 10 http://localhost:3000

# Stop the Qera server
kill $QERA_PID

# Start the Hyper Express server
echo -e "\nStarting Hyper Express server..."
node benchmark/servers/hyper-express-server.js &
HYPER_EXPRESS_PID=$!

# Give some time for the server to start
sleep 2

# Run benchmark against Hyper Express
echo "Running benchmark against Hyper Express..."
npx autocannon -c 100 -d 10 http://localhost:3005

# Stop the Hyper Express server
kill $HYPER_EXPRESS_PID

echo -e "\nBenchmark completed!"
echo "Both Qera and Hyper Express use the uWebSockets.js library under the hood."
echo "Compare their performance to see the overhead of each framework implementation."
HYPER_PID=$!

# Give some time for the server to start
sleep 2

# Run benchmark against Hyper Express
echo "Running benchmark against Hyper Express..."
npx autocannon -c 100 -d 10 http://localhost:3005

# Stop the Hyper Express server
kill $HYPER_PID

echo -e "\nBenchmark complete!"
