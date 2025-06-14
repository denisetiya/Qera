#!/usr/bin/env bash

# Setup script for Qera framework benchmarks
set -e

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHMARK_DIR="$SCRIPT_DIR/benchmark"

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up benchmark environment${NC}"
echo -e "${GREEN}===============================${NC}"

# Check for package manager (pnpm preferred, fallback to npm)
if command -v pnpm &> /dev/null; then
    NPM_CMD="pnpm"
elif command -v npm &> /dev/null; then
    NPM_CMD="npm"
    echo -e "${YELLOW}pnpm not found, using npm instead.${NC}"
else
    echo -e "${RED}Error: Neither pnpm nor npm found. Please install a Node.js package manager.${NC}"
    exit 1
fi

# Make sure all Node.js dependencies are installed
echo -e "${GREEN}Installing Node.js dependencies...${NC}"
$NPM_CMD install

# Make sure autocannon is installed
echo -e "${GREEN}Checking for autocannon installation...${NC}"
if ! $NPM_CMD list autocannon &> /dev/null; then
    echo -e "${GREEN}Installing autocannon...${NC}"
    $NPM_CMD add -D autocannon
fi

# Check if Hyper Express is installed
echo -e "${GREEN}Checking for Hyper Express installation...${NC}"
if ! $NPM_CMD list hyper-express &> /dev/null; then
    echo -e "${GREEN}Installing Hyper Express...${NC}"
    $NPM_CMD add -D hyper-express
fi

# Install tree-kill for process management
echo -e "${GREEN}Checking for tree-kill installation...${NC}"
if ! $NPM_CMD list tree-kill &> /dev/null; then
    echo -e "${GREEN}Installing tree-kill...${NC}"
    $NPM_CMD add -D tree-kill
fi

# Check for Go installation
if ! command -v go &> /dev/null; then
    echo -e "${YELLOW}Warning: Go is not installed. Go benchmarks will be skipped.${NC}"
    echo -e "${YELLOW}To include Go benchmarks, please install Go from https://golang.org/doc/install${NC}"
else
    echo -e "${GREEN}Setting up Go environment...${NC}"
    
    # Set up Go module structure
    cd $BENCHMARK_DIR/servers || mkdir -p $BENCHMARK_DIR/servers
    
    # Initialize Go module if needed
    if [ ! -f "go.mod" ]; then
        echo -e "${GREEN}Initializing Go module...${NC}"
        go mod init github.com/denisetiya/framework/benchmark
    fi
    
    # Install FastHTTP dependency
    echo -e "${GREEN}Installing Go FastHTTP dependency...${NC}"
    go get -u github.com/valyala/fasthttp
    go mod tidy
    
    cd $SCRIPT_DIR
    
    echo -e "${GREEN}Go setup completed.${NC}"
fi

# Build the Qera framework if build script exists
if [ -f "$SCRIPT_DIR/package.json" ]; then
    # Check if build script exists in package.json
    if $NPM_CMD run | grep -q build; then
        echo -e "${GREEN}Building the Qera framework...${NC}"
        $NPM_CMD run build
    fi
fi

# Clear any port conflicts
echo -e "${GREEN}Checking for processes using benchmark ports...${NC}"
for port in 3000 3001 3002 3003 3004 3005; do
    if command -v lsof &> /dev/null; then
        pid=$(lsof -t -i:$port 2>/dev/null)
        if [ ! -z "$pid" ]; then
            echo -e "${YELLOW}Killing process $pid using port $port${NC}"
            kill -9 $pid 2>/dev/null || true
        fi
    else
        echo -e "${YELLOW}lsof not available, unable to check for processes using port $port${NC}"
    fi
done

echo ""
echo -e "${GREEN}Setup complete! You can now run benchmarks with:${NC}"
echo -e "  ${GREEN}./run-benchmark.sh${NC}"
