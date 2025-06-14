#!/bin/bash

# Run a benchmark comparison focusing only on Go implementations

echo "This script runs performance benchmarks comparing only Go HTTP implementations"
echo "========================================================================"
echo ""

# Ensure Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed."
    echo "Please install Go from https://golang.org/doc/install"
    exit 1
fi

# Install FastHTTP dependency
echo "Installing FastHTTP dependency..."
go get -u github.com/valyala/fasthttp

# Clear any port conflicts
echo "Checking for processes using benchmark ports..."
for port in 3003 3004; do
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid using port $port"
    kill -9 $pid
  fi
done

# Create servers directory if it doesn't exist
mkdir -p benchmark/servers

# Benchmark the standard Go HTTP server
echo -e "\nStarting Go HTTP server benchmark..."
go run benchmark/servers/go-server.go &
GO_HTTP_PID=$!

# Give it time to start
sleep 2

echo "Running benchmark against Go HTTP..."
npx autocannon -c 100 -d 10 http://localhost:3003

# Kill the server
kill $GO_HTTP_PID

# Benchmark the Go FastHTTP server
echo -e "\nStarting Go FastHTTP server benchmark..."
go run benchmark/servers/go-fasthttp-server.go &
GO_FASTHTTP_PID=$!

# Give it time to start
sleep 2

echo "Running benchmark against Go FastHTTP..."
npx autocannon -c 100 -d 10 http://localhost:3004

# Kill the server
kill $GO_FASTHTTP_PID

echo -e "\nBenchmark completed!"
echo "Compare the performance between standard Go HTTP and FastHTTP implementations."
echo "FastHTTP is typically faster but may have different capabilities."

# Give it time to start
sleep 2

echo "Running benchmark against Go FastHTTP..."
npx autocannon -c 100 -d 10 http://localhost:3004

# Kill the server
kill $GO_FASTHTTP_PID

echo -e "\nBenchmarks complete!"
