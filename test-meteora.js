const fetch = require('node-fetch');

async function testMeteora() {
  console.log('Testing Meteora API with SOL/USDC pair...');
  
  const tokenAMint = 'So11111111111111111111111111111111111111112';
  const tokenBMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  
  const params = new URLSearchParams();
  const tokenPair1 = `${tokenAMint}-${tokenBMint}`;
  const tokenPair2 = `${tokenBMint}-${tokenAMint}`;
  params.append('include_pool_token_pairs', `${tokenPair1},${tokenPair2}`);
  
  const baseUrl = 'https://dlmm-api.meteora.ag/pair/all_by_groups';
  const url = `${baseUrl}?${params.toString()}`;
  
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Response groups:', data.groups?.length || 0);
    
    let relevantPools = [];
    if (data && data.groups && Array.isArray(data.groups)) {
      for (const group of data.groups) {
        if (group.pairs && Array.isArray(group.pairs)) {
          relevantPools.push(...group.pairs);
        }
      }
    }
    
    console.log('Total pools found:', relevantPools.length);
    
    if (relevantPools.length > 0) {
      console.log('First pool sample:');
      console.log('- Address:', relevantPools[0].address);
      console.log('- Price:', relevantPools[0].current_price);
      console.log('- Liquidity:', relevantPools[0].liquidity);
      console.log('- Mint X:', relevantPools[0].mint_x);
      console.log('- Mint Y:', relevantPools[0].mint_y);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMeteora(); 