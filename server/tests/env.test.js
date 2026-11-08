import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import config, { validateEnv } from '../src/config/env.js';

describe('Server Environment Configuration', () => {
  it('should export a valid configuration object', () => {
    assert.ok(config);
    assert.equal(typeof config.port, 'number');
    assert.equal(typeof config.nodeEnv, 'string');
    assert.equal(typeof config.clientOrigin, 'string');
    assert.equal(typeof config.jwtExpiresIn, 'string');
  });

  it('should identify environment mode flags', () => {
    assert.equal(typeof config.isDev, 'boolean');
    assert.equal(typeof config.isProd, 'boolean');
  });

  it('should pass validateEnv() when required variables are present', () => {
    assert.doesNotThrow(() => {
      validateEnv();
    });
  });
});
