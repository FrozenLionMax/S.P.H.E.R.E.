const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { loadEnvFile } = require('process');

// Load environment configuration if present
try {
  if (typeof loadEnvFile === 'function') {
    loadEnvFile();
  }
} catch (e) {
  // Silent fallback
}

const PORT = process.env.NEXT_PUBLIC_WS_PORT || '8080';

describe('S.P.H.E.R.E. WebSocket Telemetry Server Smoke Tests', () => {
  let serverProcess;

  before(() => {
    return new Promise((resolve, reject) => {
      // Spawn server.js
      serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, NEXT_PUBLIC_WS_PORT: PORT },
        stdio: 'pipe'
      });

      let resolved = false;

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('WebSocket server running') && !resolved) {
          resolved = true;
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Stderr]: ${data.toString()}`);
      });

      serverProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 3000);
    });
  });

  after(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  test('Server accepts client connection and streams valid telemetry frame', () => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${PORT}`);

      client.on('open', () => {
        console.log(`[Smoke Test] Client linked to ws://localhost:${PORT}`);
      });

      client.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());

          // Schema validation assertions
          assert.ok(payload.timestamp, 'Payload must contain timestamp');
          assert.ok(typeof payload.heartRate === 'number', 'heartRate must be a number');
          assert.ok(typeof payload.spO2 === 'number', 'spO2 must be a number');
          assert.ok(typeof payload.cognitiveLatency === 'number', 'cognitiveLatency must be a number');
          assert.ok(typeof payload.isCrisisActive === 'boolean', 'isCrisisActive must be a boolean');
          assert.ok(typeof payload.activeTrack === 'string', 'activeTrack must be a string');

          client.close();
          resolve();
        } catch (err) {
          client.close();
          reject(err);
        }
      });

      client.on('error', (err) => {
        reject(err);
      });

      setTimeout(() => {
        client.close();
        reject(new Error('Connection timed out without receiving telemetry packet'));
      }, 5000);
    });
  });
});
