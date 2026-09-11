import * as Fs from 'fs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import rules from '../src/lib/RulesConfig';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import BlockchainRunner from '../src/engine/BlockchainRunner';
import { createScenarioResult, type ScenarioId, type ScenarioData } from '../src/lib/ScenarioResult';

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

{
  console.log('RUNNING COLLAPSE THEN RECOVER');
  const runner = new BlockchainRunner(rules);
  const data = runner.runCollapseThenRecover();
  save('collapseThenRecover', data);
}

{
  console.log('RUNNING COLLAPSING RECOVERY');
  const runner = new BlockchainRunner(rules);
  const data = runner.runCollapsingRecovery();
  save('collapsingRecovery', data);
}

{
  console.log('RUNNING COLLAPSED FOREVER');
  const runner = new BlockchainRunner(rules);
  const data = runner.runCollapsedForever();
  save('collapsedForever', data);
}

function save(name: ScenarioId, data: ScenarioData) {
  // Save scenario data to JSON file
  const dataStringified = JSON.stringify(createScenarioResult(name, rules, data), null, 2);
  const dataDir = new URL('../public/data/', import.meta.url);
  const dataPath = new URL(`${name}.json`, dataDir);

  if (!Fs.existsSync(dataDir)) {
    Fs.mkdirSync(dataDir, { recursive: true });
  }

  Fs.writeFileSync(dataPath, dataStringified);
}
