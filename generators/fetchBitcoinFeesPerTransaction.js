import { writeFileSync } from 'node:fs';

const FEE_URL = 'https://api.blockchain.info/charts/transaction-fees';
const TX_COUNT_URL = 'https://api.blockchain.info/charts/n-transactions';
const START_DATE = '2010-07-18'; // First known price date
const TODAY = new Date().toISOString().split('T')[0];

async function fetchData(endpoint) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    timespan: 'all',
    start: START_DATE,
    end: TODAY,
    format: 'json',
    sampled: 'false',
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return (await response.json()).values;
}

async function fetchBitcoinFeeData() {
  try {
    const [feeData, txCountData] = await Promise.all([
      fetchData(FEE_URL),
      fetchData(TX_COUNT_URL)
    ]);

    const data = [];
    let lastNonZeroFee = 0;

    feeData.forEach((feeItem, index) => {
      const date = new Date(feeItem.x * 1000).toISOString().split('T')[0];
      let totalFeeBTC = feeItem.y;
      const txCount = txCountData[index].y;
      
      if (totalFeeBTC === 0 && lastNonZeroFee !== 0) {
        totalFeeBTC = lastNonZeroFee;
      } else if (totalFeeBTC !== 0) {
        lastNonZeroFee = totalFeeBTC;
      }

      const feePerTx = txCount > 0 ? totalFeeBTC / txCount : 0;
      data.push({
        date,
        feeInBitcoins: Number(feePerTx.toFixed(8)),
      });
    });

    if (data.length === 0) throw new Error('No Bitcoin fees returned');
    const filePath = new URL('../src/data/bitcoinFeesPerTransaction.json', import.meta.url);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('Data saved to src/data/bitcoinFeesPerTransaction.json');
  } catch (error) {
    console.error('Error fetching data:', error.message);
    process.exitCode = 1;
  }
}

fetchBitcoinFeeData();
