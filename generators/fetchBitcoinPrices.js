import { writeFileSync } from 'node:fs';

// API endpoint for fetching Bitcoin price data
const BASE_URL = 'https://api.blockchain.info/charts/market-price';
const START_DATE = '2010-07-18'; // First known price date
const TODAY = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

async function fetchBitcoinData() {
  try {
    // Make API request to fetch Bitcoin price data
    const url = new URL(BASE_URL);
    url.search = new URLSearchParams({
      timespan: 'all',
      start: START_DATE,
      end: TODAY,
      format: 'json',
      sampled: 'false',
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const { values } = await response.json();

    const data = [];
    
    // Process each data point
    values.forEach(item => {
      // Skip the first item if it has no price (y value)
      if (data.length === 0 && !item.y) return;
      
      // Convert Unix timestamp to Date object and format as YYYY-MM-DD
      const date = new Date((item.x - 3600) * 1000) // Subtract 1 hour to adjust for timezone
      const dateStr = date.toISOString().split('T')[0];
      
      // Add formatted row to data record
      data.push({
        millis: item.x,
        date: dateStr,
        price: item.y,
      });
    });

    if (data.length === 0) throw new Error('No Bitcoin prices returned');
    const filePath = new URL('../src/data/bitcoinPrices.json', import.meta.url);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('Data saved to src/data/bitcoinPrices.json');
  } catch (error) {
    console.error('Error fetching data:', error.message);
    process.exitCode = 1;
  }
}

// Execute the function
fetchBitcoinData();
