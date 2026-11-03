/**
 * Experiment 4.1 - File Operations Module: fileOps.js
 * Demonstrates:
 * 1. Checking file & directory existence and permissions (fs.access, fs.constants)
 * 2. Counting lines in a file
 * 3. Reading a file line-by-line using Node's readline module
 * 4. Benchmarking Blocking (fs.readFileSync) vs. Non-Blocking (fs.promises.readFile) I/O
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

/**
 * Checks file or directory existence and read/write permissions
 */
async function checkPathPermissions(targetPath) {
  try {
    await fs.promises.access(targetPath, fs.constants.F_OK);
    const exists = true;
    let readable = false;
    let writable = false;

    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
      readable = true;
    } catch {
      readable = false;
    }

    try {
      await fs.promises.access(targetPath, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }

    const stat = await fs.promises.stat(targetPath);

    return {
      path: targetPath,
      exists,
      readable,
      writable,
      isDirectory: stat.isDirectory(),
      sizeBytes: stat.size,
      lastModified: stat.mtime
    };
  } catch (error) {
    return {
      path: targetPath,
      exists: false,
      readable: false,
      writable: false,
      error: error.message
    };
  }
}

/**
 * Count total lines in a file using a streaming approach
 */
async function countLinesInFile(filePath) {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    rl.on('line', () => {
      lineCount++;
    });

    rl.on('close', () => {
      resolve(lineCount);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Reads a file line-by-line using readline and returns structured entries
 */
async function readAuditLogsLineByLine(filePath, maxLines = 100) {
  return new Promise((resolve, reject) => {
    const lines = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (lines.length < maxLines && line.trim().length > 0) {
        lines.push({
          lineIndex: lines.length + 1,
          content: line,
          timestamp: new Date().toISOString()
        });
      }
    });

    rl.on('close', () => {
      resolve({
        totalRead: lines.length,
        lines
      });
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Appends a log line to the audit log
 */
async function appendAuditLog(filePath, logMessage) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${logMessage}\n`;
  await fs.promises.appendFile(filePath, entry, 'utf-8');
}

/**
 * Experiment 4.1: Blocking vs Non-Blocking I/O Benchmark
 * Compares fs.readFileSync (synchronous) vs fs.promises.readFile (asynchronous)
 */
async function benchmarkIO(filePath, iterations = 50) {
  // 1. Synchronous (Blocking) Benchmark
  const syncStart = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fs.readFileSync(filePath, 'utf-8');
  }
  const syncEnd = process.hrtime.bigint();
  const syncTimeMs = Number(syncEnd - syncStart) / 1e6;

  // 2. Asynchronous (Non-Blocking) Benchmark
  const asyncStart = process.hrtime.bigint();
  const asyncPromises = [];
  for (let i = 0; i < iterations; i++) {
    asyncPromises.push(fs.promises.readFile(filePath, 'utf-8'));
  }
  await Promise.all(asyncPromises);
  const asyncEnd = process.hrtime.bigint();
  const asyncTimeMs = Number(asyncEnd - asyncStart) / 1e6;

  return {
    iterations,
    blockingSyncMs: Math.round(syncTimeMs * 100) / 100,
    nonBlockingAsyncMs: Math.round(asyncTimeMs * 100) / 100,
    speedup: Math.round((syncTimeMs / (asyncTimeMs || 1)) * 100) / 100,
    conclusion: syncTimeMs > asyncTimeMs 
      ? `Non-blocking asynchronous I/O finished concurrent reads faster by delegating to libuv event loop.`
      : `Synchronous I/O completely blocked the single thread for ${Math.round(syncTimeMs)}ms while async allowed event-loop concurrency.`
  };
}

module.exports = {
  checkPathPermissions,
  countLinesInFile,
  readAuditLogsLineByLine,
  appendAuditLog,
  benchmarkIO
};
