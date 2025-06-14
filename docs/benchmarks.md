# Benchmarks

Qera is designed for high performance. The framework includes benchmark tools to measure and compare its performance against other popular Node.js frameworks.

## Running Benchmarks

To run the benchmarks, use:

```bash
# Simple Qera benchmark
pnpm benchmark

# Compare Qera against Express, Fastify, and Go
pnpm benchmark:compare

# Run benchmarks with the convenience script (recommended)
./run-benchmark.sh
```

Note: To include Go in the benchmarks, you need to have Go installed on your system. If Go is not installed, the Go benchmark will be skipped.

## Benchmark Results

Below is an example of benchmark results comparing Qera with Express, Fastify, Hyper Express, and Go implementations:

```
Benchmark Results:

Framework    | Requests/sec | Latency (ms) | Throughput (MB/s)
-------------|--------------|--------------|------------------
qera         | 45612        | 2.15         | 8.75             
express      | 28374        | 3.47         | 5.42             
fastify      | 39128        | 2.51         | 7.31             
hyper-express| 47835        | 1.98         | 8.94             
go-http      | 52398        | 1.87         | 9.72             
go-fasthttp  | 68754        | 1.43         | 12.54            
```

These results demonstrate Qera's high-performance capabilities due to its minimal overhead and use of uWebSockets.js under the hood.

## Custom Benchmarks

You can create custom benchmark scenarios by modifying the server implementations in the `benchmark/servers` directory:

- `qera-server.js` - Qera framework implementation
- `express-server.js` - Express framework implementation
- `fastify-server.js` - Fastify framework implementation
- `hyper-express-server.js` - Hyper Express implementation (uWebSockets.js based)
- `go-server.go` - Go standard library HTTP implementation
- `go-fasthttp-server.go` - Go FastHTTP implementation (highest performance)

Each server implements the same API endpoints to ensure fair comparison:

- `GET /` - Returns a simple JSON message
- `GET /users/:id` - Returns the ID parameter in a JSON response
- `POST /echo` - Echoes the request body as a JSON response
