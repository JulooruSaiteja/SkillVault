import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabaseStatus, connectDatabase, disconnectDatabase } from '../src/config/database.js';

describe('Database Configuration', () => {
  after(async () => {
    await disconnectDatabase();
  });

  it('should expose database status helper', () => {
    const status = getDatabaseStatus();
    assert.equal(typeof status.isConnected, 'boolean');
    assert.equal(typeof status.uriConfigured, 'boolean');
    assert.equal(typeof status.readyState, 'number');
    assert.equal(status.uriConfigured, true);
  });

  it('should connect to MongoDB and update connection status', async () => {
    const connection = await connectDatabase();
    assert.ok(connection);
    const status = getDatabaseStatus();
    assert.equal(status.isConnected, true);
    assert.equal(status.readyState, 1);
  });

  it('should disconnect cleanly and update connection status', async () => {
    await disconnectDatabase();
    const status = getDatabaseStatus();
    assert.equal(status.isConnected, false);
    assert.equal(status.readyState, 0);
  });
});
