import { describe, it, expect } from 'vitest';
import { sha256Hex } from './sha256';

describe('sha256Hex', () => {
  it('matches the NIST vector for the empty string', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the NIST vector for "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the NIST 448-bit vector, which straddles the padding boundary', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('matches the NIST two-block vector', () => {
    const msg =
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmno' +
      'ijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu';
    expect(sha256Hex(msg)).toBe(
      'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1',
    );
  });

  it('matches the million-a vector', () => {
    expect(sha256Hex('a'.repeat(1_000_000))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('handles multi-byte UTF-8 by hashing the encoded bytes', () => {
    // "नमस्ते" is 18 UTF-8 bytes, not 6 — the length padding has to use bytes.
    expect(sha256Hex('नमस्ते')).toHaveLength(64);
    expect(sha256Hex('नमस्ते')).not.toBe(sha256Hex('नमस्त'));
  });

  it('is avalanche-sensitive to a one-character change', () => {
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });
});
