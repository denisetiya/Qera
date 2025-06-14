#!/usr/bin/env node
/**
 * Enhanced benchmark script for Qera framework comparison
 */
const http = require('http');
const autocannon = require('autocannon');
const { fork, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Import server verification utility
const verifyServerModule = require('./verify-servers');

// The frameworks to compare
const frameworks = [
  { name: 'qera', port: 3000, script: path.join(__dirname, 'servers/qera-server.js') },
  { name: 'express', port: 3001, script: path.join(__dirname, 'servers/express-server.js') },
  { name: 'fastify', port: 3002, script: path.join(__dirname, 'servers/fastify-server.js') },
];

// Add Go implementations to benchmarks if not specifically skipped
if (process.env.SKIP_GO_BENCHMARK !== 'true') {
  frameworks.push(
    { name: 'go-http', port: 3003, isGoServer: true, goFile: path.join(__dirname, 'servers/go-simple-server.go') },
    { name: 'go-fasthttp', port: 3004, isGoServer: true, goFile: path.join(__dirname, 'servers/go-simple-fasthttp.go') }
  );
}

// Results storage
const results = {};
let currentServer = null;

// Helper function to kill server
function killServer(server, isGoServer = false) {
  if (!server) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      if (isGoServer) {
        console.log(`Killing Go server process...`);
        try { 
          const treeKill = require('tree-kill');
          treeKill(server.pid, 'SIGTERM', (err) => {
            if (err) console.error(`Error killing Go server process: ${err}`);
            resolve();
          });
        } catch (e) {
          console.error(`Error killing Go server: ${e.message}`);
          resolve();
        }
      } else {
        console.log(`Killing Node.js server process...`);
        server.kill('SIGTERM');
        server.on('exit', () => {
          resolve();
        });
        
        // Force kill after 2 seconds if it doesn't exit cleanly
        setTimeout(() => {
          try { server.kill('SIGKILL'); } catch (e) {}
          resolve();
        }, 2000);
      }
    } catch (err) {
      console.error(`Error killing server: ${err.message}`);
      resolve();
    }
  });
}

// Run benchmark against a specific framework
async function benchmarkFramework(framework) {
  console.log(`\n${'-'.repeat(50)}`);
  console.log(`Starting ${framework.name} server...`);
  
  // Special handling for Go server
  if (framework.isGoServer) {
    const goServerPath = framework.goFile || path.join(__dirname, 'servers/go-server.go');
    
    // Check if Go server file exists
    if (!fs.existsSync(goServerPath)) {
      console.error(`❌ Error: Go server file not found: ${goServerPath}`);
      return; // Skip this framework
    }
    
    // Start Go server
    try {
      console.log(`Starting ${framework.name} server with: go run ${goServerPath}`);
      currentServer = exec(`cd ${path.dirname(goServerPath)} && go run ${path.basename(goServerPath)}`);
      
      // Wait for Go server to start
      await sleep(3000);
    } catch (err) {
      console.error(`❌ Error starting Go server:`, err.message);
      return; // Skip this framework
    }
  } 
  // For Node.js servers
  else {
    // Check if the script file exists
    if (!fs.existsSync(framework.script)) {
      console.error(`❌ Error: Script file not found for ${framework.name}: ${framework.script}`);
      return; // Skip this framework
    }
    
    // Start the server with error handling
    try {
      currentServer = fork(framework.script, [], { stdio: 'inherit' });
      
      // Wait for server to start
      await sleep(2000);
    } catch (err) {
      console.error(`❌ Error starting ${framework.name} server:`, err.message);
      return; // Skip this framework
    }
  }

  try {
    // Verify server is running properly
    console.log(`Verifying ${framework.name} server on port ${framework.port}...`);
    
    // Check if server is accepting connections
    const isPortOpen = await verifyServerModule.checkPortOpen(framework.port);
    
    if (!isPortOpen) {
      console.error(`❌ ${framework.name} server is not accepting connections on port ${framework.port}`);
      await killServer(currentServer, framework.isGoServer);
      return; // Skip this framework
    }
    
    // Check if server responds to HTTP requests
    const rootCheck = await verifyServerModule.checkHttpEndpoint(framework.port);
    
    if (!rootCheck.success) {
      console.error(`⚠️ ${framework.name} server is not responding to HTTP requests properly`);
      console.log(`Attempting to run benchmark anyway...`);
    } else {
      console.log(`✅ ${framework.name} server verified as running correctly`);
    }
    
    // Run benchmark
    console.log(`Running benchmark against ${framework.name}...`);
    
    // Get the result from autocannon
    const result = await new Promise((resolve) => {
      autocannon({
        url: `http://localhost:${framework.port}`,
        connections: 100,
        pipelining: 1,
        duration: 10,
        title: `${framework.name} Benchmark`,
      }, (err, result) => {
        if (err) {
          console.error(`⚠️ Benchmark error for ${framework.name}:`, err.message);
          resolve(null);
          return;
        }
        resolve(result);
      });
    });
    
    // Process results if available
    if (result) {
      results[framework.name] = {
        requests: Math.round(result.requests.average),
        latency: result.latency.average.toFixed(2),
        throughput: (result.throughput.average / 1024 / 1024).toFixed(2)
      };
      
      console.log(`✅ ${framework.name} benchmark completed:`);
      console.log(`   - Requests/sec: ${results[framework.name].requests}`);
      console.log(`   - Latency: ${results[framework.name].latency} ms`);
      console.log(`   - Throughput: ${results[framework.name].throughput} MB/s`);
    } else {
      console.error(`❌ Failed to get benchmark results for ${framework.name}`);
    }
  } finally {
    // Always kill the server when done
    await killServer(currentServer, framework.isGoServer);
    currentServer = null;
  }
}

// Run all benchmarks in sequence
async function runAllBenchmarks() {
  console.log('Starting benchmark comparison...\n');
  
  for (const framework of frameworks) {
    try {
      await benchmarkFramework(framework);
    } catch (err) {
      console.error(`❌ Failed to benchmark ${framework.name}:`, err);
    }
  }
  
  // Print final results table
  console.log('\n\n📊 Benchmark Results:\n');
  console.log('Framework    | Requests/sec | Latency (ms) | Throughput (MB/s)');
  console.log('-------------|--------------|--------------|------------------');
  
  for (const framework of frameworks) {
    const result = results[framework.name] || { requests: 'N/A', latency: 'N/A', throughput: 'N/A' };
    console.log(
      `${framework.name.padEnd(12)} | ` +
      `${String(result.requests).padEnd(12)} | ` +
      `${String(result.latency).padEnd(12)} | ` +
      `${String(result.throughput).padEnd(18)}`
    );
  }
  
  console.log('\n🏁 Benchmark complete!');
}

// Handle exit
process.on('SIGINT', async () => {
  console.log('\n⚠️ Shutting down...');
  if (currentServer) {
    await killServer(currentServer);
  }
  process.exit();
});

// Run the benchmarks
runAllBenchmarks().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
