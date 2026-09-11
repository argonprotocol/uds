# Stabilization Analysis Model (SAM)

SAM is an educational simulation of a simplified Argon economy under a shock
patterned after Terra's 2022 collapse. It compares mechanisms enabled after the
collapse, always enabled, and never enabled. Results describe the assumptions in
this model; they are not predictions of mainnet prices or recovery times.

## Run locally and test

Use Node.js 22 or newer and the Yarn 4 version pinned in `package.json`.
Dependencies use a standard `node_modules` install.

```sh
yarn install
yarn dev
yarn test
yarn build
```

Run the focused correction and result-versioning tests with:

```sh
yarn test tests/engineCorrections.test.ts tests/streaming.test.ts tests/scenarioResult.test.ts
```

The full existing suite runs several multi-decade simulations and can take a few
minutes. `yarn build` builds the application; it does not run type-checking.
`yarn deploy` builds the application and then publishes it to GitHub Pages.

Update the historical Bitcoin price series with:

```sh
yarn update:bitcoin
```

This downloads prices into `src/data/bitcoinPrices.json`. After changing input
data, increment `MODEL_VERSION`, regenerate the bundled scenarios as described
below, and run the tests. Tests tied to historical data may need reviewed updates.

## Protocol comparison baseline

The reference is Argon runtime **158**, release **v1.4.12**, commit
[`f79ac75ee9f0da8a8177d772379897e194b70ff2`](https://github.com/argonprotocol/mainchain/tree/f79ac75ee9f0da8a8177d772379897e194b70ff2).
This is a fixed comparison baseline, not a claim that SAM implements the entire
runtime or that this release is still the latest deployed version.

The piecewise redemption curve in `src/engine/Vault.ts` uses the same coefficients
as the reference runtime. Its input is the Argon market-price/target-price ratio.
See the reference runtime's
[Bitcoin lock implementation](https://github.com/argonprotocol/mainchain/blob/f79ac75ee9f0da8a8177d772379897e194b70ff2/pallets/bitcoin_locks/src/lib.rs).

The surrounding economy remains simplified:

- Price is modeled capital divided by circulating tokens. There is no order book,
  slippage model, or independently calibrated participant response.
- Bitcoin capacity is a percentage of half of modeled circulation. This is not
  the runtime's complete vault collateral or minting-queue accounting.
- Ratcheting uses aggregate positions and pending-value bookkeeping. Treasury
  liquidity, issuance queues, and full collateral accounting are not simulated.
- Unlocking uses a BTC-volume throttle and assumed participant latency, not a
  simulation of Bitcoin confirmations and the runtime release lifecycle.
- Taxable activity and demand responding to tax burns are scenario assumptions.
  They are not guaranteed mainnet activity or profits.
- Expiration/replacement, supply growth, and reserve spending retain the original
  model's approximations. Circulation changes do not rescale the fixed Terra
  outflow dataset; avoid treating arbitrary circulation values as calibrated shocks.

Runtime 159's separate Fission lifecycle is not part of this model.

## Units and historical inputs

Existing numeric representations, rule names, and default values are preserved.

| Quantity or rule | Unit / interpretation |
| --- | --- |
| `circulation`, circulation changes | Modeled ARGN tokens |
| Marker price, `argonRatioPrice` | Market value divided by target value; target is 1.00 |
| Marker capital | Modeled target-value units, consistent with capital / circulation = price ratio |
| Bitcoin quantities | BTC, including fractional BTC |
| `btcPriceOverride`, Bitcoin price data | Historical/scenario USD per BTC; the engine uses a simplified $1 target conversion |
| Vault lock/unlock values and profits | Aggregate model values under that simplified conversion, not current-USD mainnet balances |
| `btcVaultCapacityPct`, `btcRatchetingPct`, `btcRatchetWhenPriceChangePct` | Percentage points: 100 means 100% |
| `dollarInflation` | Annual percentage points: 3.5 means 3.5% |
| `maxTransactionsAnnually` | Transactions per year |
| `maxMicropaymentsAnnually` | Annual micropayment value at target; treated as wage-protected value during a depeg |
| `btcMaxTxnsPerHour` | Despite the name, maximum BTC volume unlocked per hour; not transactions/hour |
| `unvaultLatencyInHours`, certainty/speculative latency bounds | Hours |
| `certaintyGreedLow/High` | Annualized percentage return thresholds attributed to tax burns |
| `speculativeGreedLow/High` | Percentage return thresholds over modeled marker intervals |
| `certaintyMaxDailyIncrease`, `speculativeMaxDailyIncrease` | Fractions of prior capital per day: **0.5 means 50%, not 0.5%** |

The 50% daily growth caps are strong behavioral assumptions, retained for
compatibility. They are not protocol parameters. `startDateOfTerraCollapse` and
`speculativeGreedWithinHours` remain legacy fields: the runner uses the fixed
Terra dates and speculative latency bounds, respectively.

The scenarios start October 1, 2020, with the collapse beginning May 9, 2022.
The normal ending date is December 31, 2025; slow-recovery simulations can extend
beyond it. The dollar comparison series uses historical CPI and an assumed
inflation rate after observations end. It is not the runtime's full target oracle.

| Input file | Last observation / behavior beyond coverage |
| --- | --- |
| `src/data/bitcoinPrices.json` | November 19, 2024; missing prices use the last stored BTC price |
| `src/data/bitcoinFeesPerTransaction.json` | November 22, 2024; this fee series is not used by the current runner |
| `src/data/cpi.json` | August 2024; missing months use `dollarInflation / 12` |
| `src/data/terraScenario.json` | Fixed May 8–June 9, 2022 shock |

## Result versions and regeneration

`src/lib/ScenarioResult.ts` defines one `MODEL_VERSION` and the protocol reference.
**Increment `MODEL_VERSION` whenever engine behavior or an input dataset changes.**
Changing the reference also invalidates previous results. Editing rule defaults
is detected by comparing the exact rules in each result.

Both bundled scenarios and browser-generated results contain:

```text
modelVersion, protocolReference, rules, scenarioId, markers, phases
```

A result is reused only when its model version, protocol reference, scenario,
rule keys, and rule values match the requested run. Rule property order does not
matter. Legacy unversioned results are ignored. Rules remain in session storage;
results remain in IndexedDB, but results from different settings cannot be reused
as though they matched. Reset waits for cache writes/deletions before rerunning
or reloading.

Regenerate the three bundled results after running tests:

```sh
yarn generate:scenarios
```

The generator writes `public/data/collapseThenRecover.json`,
`public/data/collapsingRecovery.json`, and `public/data/collapsedForever.json`.
Review numerical changes before committing those files. There are no live network
reads or generation timestamps in the result, so identical inputs on the same
Node.js runtime produce the same serialized output. Other JavaScript runtimes
can differ slightly in floating-point calculations.

## Model version 1 corrections

- Partial redemptions allocate pending ratchet value using the original BTC
  quantity; complete redemption clears the pending value.
- Valuation caches refresh when the simulation date changes, including dated
  profit totals and price-dependent unlock values. Profit dates use UTC, matching
  the simulation timeline regardless of the machine's local timezone.
- Speculative demand uses its own minimum latency rather than certainty latency.
- Streamed runs retain the history needed for the recovery stopping rule and emit
  markers only after their chart-point flag is final.

Public copy, full configuration/export, mobile presentation, and more faithful
protocol economics remain separate follow-up work.
