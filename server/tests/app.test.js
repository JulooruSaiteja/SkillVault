import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

describe('Express Application Setup', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      // Bind to an ephemeral port
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('should return 404 with standardized error envelope for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Route not found/);
  });

  it('should include Helmet security headers', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('should return 404 for health check route as specified in Phase 3 rules', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 404);
  });
});
