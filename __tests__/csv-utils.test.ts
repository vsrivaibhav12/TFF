import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { csvEscapeCell, convertToCsv } from '@/lib/csv-utils';

describe('csvEscapeCell()', () => {
  it('returns empty string for null/undefined', () => {
    assert.equal(csvEscapeCell(null), '');
    assert.equal(csvEscapeCell(undefined), '');
  });

  it('leaves plain text unchanged', () => {
    assert.equal(csvEscapeCell('hello'), 'hello');
    assert.equal(csvEscapeCell(123), '123');
  });

  it('wraps values containing commas, quotes or newlines', () => {
    assert.equal(csvEscapeCell('a,b'), '"a,b"');
    assert.equal(csvEscapeCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvEscapeCell('line1\nline2'), '"line1\nline2"');
  });

  it('prefixes formula-triggering characters with a tab', () => {
    assert.equal(csvEscapeCell('=SUM(A1)'), '\t=SUM(A1)');
    assert.equal(csvEscapeCell('+123'), '\t+123');
    assert.equal(csvEscapeCell('-42'), '\t-42');
    assert.equal(csvEscapeCell('@cmd'), '\t@cmd');
  });

  it('escapes both formula chars and quotes', () => {
    assert.equal(csvEscapeCell('=say "hi"'), '"\t=say ""hi"""');
  });
});

describe('convertToCsv()', () => {
  it('returns empty string for empty rows', () => {
    assert.equal(convertToCsv([]), '');
  });

  it('converts rows to CSV', () => {
    const csv = convertToCsv([
      { name: 'Acme', amount: 100 },
      { name: 'Globex', amount: 200 },
    ]);
    assert.equal(csv, 'name,amount\nAcme,100\nGlobex,200');
  });
});
