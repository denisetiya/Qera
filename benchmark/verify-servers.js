/**
 * Server Verification Utility for Benchmarks
 * 
 * This module provides utilities to verify that servers are actually running
 * before attempting to benchmark them. It helps prevent false results.
 */

const http = require('http');
const { promisify } = require('util');
const net = require('net');

/**
 * Checks if a port is open and accepting TCP connections
 * 
 * @param {number} port - The port to check
 * @param {string} host - The host to check (default: localhost)
 * @param {number} timeout - Timeout in ms (default: 1000)
 * @returns {Promise<boolean>} - True if the port is open, false otherwise
 */
function checkPortOpen(port, host = 'localhost', timeout = 1000) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    
    // Set timeout
    socket.setTimeout(timeout);
    
    // Handle connection events
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    // Attempt connection
    socket.connect(port, host);
  });
}

/**
 * Makes an HTTP request to verify a server is functioning
 * 
 * @param {number} port - The server port 
 * @param {string} path - The path to request (default: '/')
 * @param {string} host - The host (default: localhost)
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<{success: boolean, statusCode?: number, error?: Error}>}
 */
function checkHttpEndpoint(port, path = '/', host = 'localhost', timeout = 5000) {
  return new Promise(resolve => {
    const req = http.request({
      hostname: host,
      port,
      path,
      method: 'GET',
      timeout
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          data: data.substring(0, 100) // Just show first 100 chars of response
        });
      });
    });
    
    req.on('error', error => {
      resolve({ success: false, error });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: new Error('Request timed out') });
    });
    
    req.end();
  });
}

/**
 * Verifies a server is running by checking multiple endpoints
 * 
 * @param {Object} framework - The framework configuration object
 * @param {number} framework.port - The port to check
 * @param {string} framework.name - The name of the framework
 * @returns {Promise<boolean>} - True if server is verified, false otherwise
 */
async function verifyServer(framework) {
  const { port, name } = framework;
  console.log(`Verifying ${name} server on port ${port}...`);
  
  // First check if the port is open
  const portOpen = await checkPortOpen(port);
  if (!portOpen) {
    console.error(`❌ Port ${port} for ${name} is not open`);
    return false;
  }
  
  // Check the root endpoint
  const rootCheck = await checkHttpEndpoint(port, '/');
  if (!rootCheck.success) {
    console.error(`❌ Root endpoint for ${name} failed: ${rootCheck.error?.message || `Status code: ${rootCheck.statusCode}`}`);
    return false;
  }
  
  // Check a parameter endpoint
  const paramCheck = await checkHttpEndpoint(port, '/users/123');
  if (!paramCheck.success) {
    console.error(`⚠️ Parameter endpoint for ${name} failed: ${paramCheck.error?.message || `Status code: ${paramCheck.statusCode}`}`);
    // We'll still allow benchmarking if only this fails
  }
  
  console.log(`✅ ${name} server verified as running on port ${port}`);
  return true;
}

module.exports = {
  checkPortOpen,
  checkHttpEndpoint,
  verifyServer
};
