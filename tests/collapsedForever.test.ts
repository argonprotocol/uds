import { expect, test } from 'vitest';
import BlockchainRunner, { TERRA_COLLAPSE_DATE, TERRA_LAUNCH_DATE } from '../src/engine/BlockchainRunner';
import dayjs from 'dayjs';
import rules from './helpers/rules';
import Marker from '../src/engine/Marker';
import { IVaultMeta } from '../src/engine/Vault';

const vaultMetaBeforeRecovery: IVaultMeta = {
  bitcoinCount: 200_000,
  dollarsPerBitcoinLock: 30_000,
  dollarsPerBitcoinUnlock: 30_000,
  argonsBurnedPerBitcoinDollar: 1,
  argonBurnCapacity: 6_000_000_000,
  profitsToDate: 0,
  argonRatioPrice: 1.00,
  argonsMintedByBitcoins: 0,
}

test("test collapse forever", () => {
  const runner = new BlockchainRunner(rules);
  const { markers } = runner.runCollapsedForever();
  const lastMarker = markers[markers.length - 1];

  expect(lastMarker.startingPrice).toBe(0.001);
  expect(lastMarker.endingPrice).toBe(0.001);
});

