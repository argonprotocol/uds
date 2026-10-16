import { expect, test } from 'vitest';
import { readUrlInputs } from '../src/lib/UrlInputs';

test('accepts quantities in ARGN and fractional BTC, including zero BTC', () => {
  expect(readUrlInputs('?circulation=2200000&bitcoinsInLiquidLocks=125.5'))
    .toEqual({ circulation: 2200000, bitcoinsInLiquidLocks: 125.5 });
  expect(readUrlInputs('?bitcoinsInLiquidLocks=0')).toEqual({ bitcoinsInLiquidLocks: 0 });
  expect(readUrlInputs('?circulation=2e9&bitcoinsInLiquidLocks=1e-8'))
    .toEqual({ circulation: 2_000_000_000, bitcoinsInLiquidLocks: 0.00000001 });
});

test('missing and invalid parameters do not override existing values', () => {
  for (const value of ['', '-1', 'NaN', 'Infinity', 'abc', '1,000', '0x10', '1e309']) {
    expect(readUrlInputs(`?circulation=${value}&bitcoinsInLiquidLocks=${value}`)).toEqual({});
  }
  expect(readUrlInputs('')).toEqual({});
  expect(readUrlInputs('?circulation=0&bitcoinsInLiquidLocks=1.25'))
    .toEqual({ bitcoinsInLiquidLocks: 1.25 });
});
