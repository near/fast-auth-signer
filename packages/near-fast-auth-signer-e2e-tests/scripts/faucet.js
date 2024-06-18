const { CovalentClient } = require('@covalenthq/client-sdk');

// Same addresses as the ones in constants.ts, they can't be imported here because this script is run by node.js
const ETH_PERSONAL_KEY_ADDRESS = '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
const BNB_DOMAIN_KEY_ADDRESS =  '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71';

function fromWei(wei) {
  return Number(BigInt(wei)) / 1e18;
}
async function fetchEVMWalletBalance(
  address,
  chain
) {
  const client = new CovalentClient(process.env.COVALENT_API_KEY);
  const response = await client.BalanceService.getTokenBalancesForWalletAddress(
    chain,
    address
  );

  if (response.error) {
    throw new Error(`Failed to fetch balance: ${response.error_message}`);
  }

  const { balance } = response.data.items[0];
  if (balance === null) return 0;
  // type: Response<BalancesResponse>
  return fromWei(BigInt(balance).toString());
}

function getWalletChain(chain) {
  switch (chain) {
    case 'eth':
      return 'sepolia';
    case 'bnb':
      return 'bnb-testnet';
    default:
      return null;
  }
}

async function fillWallet(address, chain) {
  const walletChain = getWalletChain(chain);

  if (!walletChain) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const apiUrl = `https://api.chainstack.com/v1/faucet/${walletChain}`;

  const response = await fetch(apiUrl, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.CHAINSTACK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    return response.text().then((text) => { throw new Error(text); });
  }

  console.log(`Testnet token request for ${chain} address ${address} successful`);

  return response.json();
}

async function requestTokensFromFaucet() {
  try {
    const [ethBalance, bnbBalance] = await Promise.all([
      fetchEVMWalletBalance(ETH_PERSONAL_KEY_ADDRESS, 'eth-sepolia'),
      fetchEVMWalletBalance(BNB_DOMAIN_KEY_ADDRESS, 'bsc-testnet')
    ]);

    const faucetRequests = [];
    if (ethBalance) faucetRequests.push(fillWallet(ETH_PERSONAL_KEY_ADDRESS, 'eth'));
    if (bnbBalance) faucetRequests.push(fillWallet(BNB_DOMAIN_KEY_ADDRESS, 'bnb'));

    if (faucetRequests.length) {
      await Promise.all(faucetRequests);
    }
  } catch (e) {
    console.log('Error requesting token from faucet ', e.message);
  }
}

requestTokensFromFaucet();
