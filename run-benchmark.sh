#!/usr/bin/env bash
# Main benchmark script for Qera framework

set -e

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARK_DIR="$SCRIPT_DIR/benchmark"

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command is available
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
check_port() {
  port=$1
  if command_exists nc; then
    if nc -z localhost "$port" >/dev/null 2>&1; then
      echo -e "${YELLOW}Port $port is already in use. Stopping process...${NC}"
      if command_exists lsof; then
        kill -9 "$(lsof -ti:"$port")" 2>/dev/null || true
      else
        echo -e "${YELLOW}lsof not found, manually free the port $port if needed${NC}"
      fi
      echo -e "${YELLOW}Waiting for port to free up...${NC}"
      sleep 2
    fi
  else
    echo -e "${YELLOW}Warning: nc command not found, skipping port check${NC}"
  fi
}

# Ensure all dependencies are installed
echo -e "${GREEN}Setting up benchmark environment...${NC}"

# Run the setup script if it exists
# if [ -f "$SCRIPT_DIR/setup-benchmark.sh" ]; then
#   echo -e "${GREEN}Running setup script...${NC}"
#   bash "$SCRIPT_DIR/setup-benchmark.sh"
# fi

# Check important ports
echo -e "${GREEN}Checking ports availability...${NC}"
check_port 3000  # Qera
check_port 3001  # Express
check_port 3002  # Fastify
check_port 3003  # Go HTTP
check_port 3004  # Go FastHTTP
check_port 3005  # Hyper Express

# Check if Go is installed for Go benchmarks
SKIP_GO=false
if ! command_exists go; then
  echo -e "${YELLOW}Go is not installed. Go benchmarks will be skipped.${NC}"
  echo -e "${YELLOW}Install Go to include Go servers in benchmark comparison.${NC}"
  SKIP_GO=true
fi

# Check if Go modules are properly set up
if [ "$SKIP_GO" = false ]; then
  echo -e "${GREEN}Checking Go dependencies...${NC}"
  (cd "$BENCHMARK_DIR/servers" && 
   go mod tidy && 
   go get github.com/valyala/fasthttp) || {
    echo -e "${RED}Failed to set up Go dependencies. Please check Go installation.${NC}"
    echo -e "${YELLOW}Will continue with Node.js benchmarks only.${NC}"
    SKIP_GO=true
  }
fi

# Run the benchmarks
echo -e "${GREEN}Starting benchmarks...${NC}"

if [ "$SKIP_GO" = true ]; then
  echo -e "${YELLOW}Running without Go benchmarks${NC}"
  SKIP_GO_BENCHMARK=true node "$BENCHMARK_DIR/enhanced-benchmark.js"
else
  echo -e "${GREEN}Running complete benchmark suite (including Go)${NC}"
  node "$BENCHMARK_DIR/enhanced-benchmark.js"
fi

echo -e "${GREEN}Benchmark completed!${NC}"