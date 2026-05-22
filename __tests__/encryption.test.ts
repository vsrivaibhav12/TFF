import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { encryptString, decryptString } from '../lib/services/encryption';

// Ensure key is present for tests.
if (!process.env.CREDENTIALS_KEY) {
  process.env.CREDENTIALS_KEY = Buffer.from(crypto.randomBytes(32)).toString('base64');
}

describe('AES-256-GCM encryption', () => {
  test('round-trip encrypt → decrypt', () => {
    const plaintext = 'my-secret-password-123';
    const ciphertext = encryptString(plaintext);
    assert.ok(ciphertext.startsWith('v1:'), 'ciphertext should use v1 format');
    const decrypted = decryptString(ciphertext);
    assert.equal(decrypted, plaintext);
  });

  test('empty string returns empty', () => {
    assert.equal(encryptString(''), '');
    assert.equal(decryptString(''), '');
    assert.equal(decryptString(null as any), '');
    assert.equal(decryptString(undefined), '');
  });

  test('different inputs produce different ciphertexts (IV randomness)', () => {
    const a = encryptString('same');
    const b = encryptString('same');
    assert.notEqual(a, b, 'random IVs should yield different ciphertexts');
  });

  test('tampered ciphertext throws', () => {
    const ct = encryptString('secret');
    const parts = ct.split(':');
    parts[3] = parts[3].slice(0, -4) + 'dead'; // corrupt last 4 chars
    const tampered = parts.join(':');
    assert.throws(() => decryptString(tampered), /Unsupported state or unable to authenticate data/);
  });

  test('invalid format throws', () => {
    assert.throws(() => decryptString('bad-data'), /Invalid ciphertext format/);
    assert.throws(() => decryptString('v2:a:b:c'), /Invalid ciphertext format/);
  });
});
