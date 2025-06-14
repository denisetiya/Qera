# Qera Framework Benchmark Results

This document tracks the benchmark results for the Qera framework compared to other popular web frameworks.

## Benchmark Environment

- **Hardware**: Report your hardware specifications here
- **Operating System**: Linux
- **Node.js version**: 16.x or later recommended
- **Go version**: 1.21.0 or later recommended
- **Benchmark tool**: Autocannon with 100 connections, 10 second duration

## Latest Results

### Simple "Hello World" API Benchmark

| Framework      | Requests/sec | Latency (ms) | Throughput (MB/s) |
|---------------|--------------|--------------|-------------------|
| qera          | ?            | ?            | ?                 |
| hyper-express | ?            | ?            | ?                 |
| express       | ?            | ?            | ?                 |
| fastify       | ?            | ?            | ?                 |
| go-http       | ?            | ?            | ?                 |
| go-fasthttp   | ?            | ?            | ?                 |

## How to Run Benchmarks

To run benchmarks yourself:

```bash
# Ensure dependencies are installed
./setup-benchmark.sh

# Run full benchmark suite
./run-benchmark.sh

# Run only Go benchmarks
./benchmark-go.sh

# Run only uWebSockets.js-based frameworks
./benchmark-uwsjs.sh
```

## Benchmark Endpoints

All frameworks implement the same endpoints:

1. `GET /` - Returns a simple JSON message
2. `GET /users/:id` - Returns the provided ID as JSON
3. `POST /echo` - Returns the request body as JSON

## Notes

- Qera and Hyper Express are both built on uWebSockets.js
- Go implementations use both standard HTTP and FastHTTP libraries
- Results may vary based on hardware, OS, and environment configuration
