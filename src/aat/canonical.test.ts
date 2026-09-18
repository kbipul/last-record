import { describe, it, expect } from 'vitest';
import { canonicalize } from './canonical';

describe('canonicalize', () => {
  it('sorts object keys so field order cannot change the hash', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ a: 2, b: 1 })).toBe(canonicalize({ b: 1, a: 2 }));
  });

  it('sorts nested objects too', () => {
    expect(canonicalize({ z: { y: 1, x: 2 } })).toBe('{"z":{"x":2,"y":1}}');
  });

  it('preserves array order, which is significant', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('emits no insignificant whitespace', () => {
    expect(canonicalize({ a: [1, { b: 2 }] })).toBe('{"a":[1,{"b":2}]}');
  });

  it('escapes strings', () => {
    expect(canonicalize({ a: 'x"y' })).toBe('{"a":"x\\"y"}');
  });

  it('handles null and booleans', () => {
    expect(canonicalize({ a: null, b: true, c: false })).toBe('{"a":null,"b":true,"c":false}');
  });

  it('rejects non-finite numbers rather than emitting invalid JSON', () => {
    expect(() => canonicalize({ a: Infinity })).toThrow(/non-finite/);
    expect(() => canonicalize({ a: NaN })).toThrow(/non-finite/);
  });
});
