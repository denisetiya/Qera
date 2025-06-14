const autocannon = require('autocannon');
const { fork } = require('child_process');
const path = require('path');

// Autocannon is already included in package.json

// Start the test server
console.log('Starting test server...');
const server = fork(path.join(__dirname, 'benchmark-server.js'), [], { 
  stdio: 'inherit',
  timeout: 10000 // 10 second timeout for server start
});

let serverStartTimeout;
let benchmarkTimeout;

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  clearTimeout(serverStartTimeout);
  clearTimeout(benchmarkTimeout);
  try { server.kill('SIGTERM'); } catch (e) {}
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    clearTimeout(serverStartTimeout);
    clearTimeout(benchmarkTimeout);
    process.exit(1);
  }
});

// Give the server some time to start
serverStartTimeout = setTimeout(() => {
  console.log('\nRunning benchmarks...');
  
  // Set a timeout for the benchmark
  benchmarkTimeout = setTimeout(() => {
    console.error('Benchmark timed out after 30 seconds');
    try { server.kill('SIGTERM'); } catch (e) {}
    process.exit(1);
  }, 30000); // 30 second timeout for benchmark
  
  // Run the benchmark
  autocannon({
    url: 'http://localhost:3000',
    connections: 100, // Default of 10
    pipelining: 1, // Default of 1
    duration: 10, // Default of 10
    title: 'Qera Framework Basic Benchmark'
  }, (err, results) => {
    clearTimeout(benchmarkTimeout);
    
    if (err) {
      console.error('Benchmark error:', err);
      try { server.kill('SIGTERM'); } catch (e) {}
      process.exit(1);
    }
    
    console.log('\nBenchmark Results:');
    
    // Print the results
    console.log(`Requests/sec: ${Math.round(results.requests.average)}`);
    console.log(`Latency: ${results.latency.average.toFixed(2)}ms`);
    console.log(`Throughput: ${(results.throughput.average / 1024 / 1024).toFixed(2)}MB/sec`);
    
    // Kill the server gracefully
    try { server.kill('SIGTERM'); } catch (e) {}
    
    // Wait a bit before exiting to allow the server to shut down properly
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });
  
}, 3000); // Give more time (3 seconds) for the server to start

// Handle exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  clearTimeout(serverStartTimeout);
  clearTimeout(benchmarkTimeout);
  try { server.kill('SIGTERM'); } catch (e) {}
  
  // Wait a bit before exiting to allow the server to shut down properly
  setTimeout(() => {
    process.exit(0);
  }, 500);
});
