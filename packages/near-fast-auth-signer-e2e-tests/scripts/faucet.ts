const { ethers } = require('ethers');

interface WalletInfo {
  address: string;
  chain: string;
}

async function getProviderUrl(chain: string): Promise<string> {
  switch (chain) {
    case 'eth':
      return process.env.ETH_PROVIDER_URL_TESTNET;
    case 'bnb':
      return process.env.BNB_PROVIDER_URL_TESTNET;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

async function fetchEVMWalletBalance(address: string, chain: string): Promise<string> {
  const providerUrl = await getProviderUrl(chain);
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

function getWalletChain(chain: string): string | null {
  switch (chain) {
    case 'eth':
      return 'sepolia';
    case 'bnb':
      return 'bnb-testnet';
    default:
      return null;
  }
}

async function fillWallet(address: string, chain: string): Promise<any> {
  const walletChain = getWalletChain(chain);

  if (!walletChain) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const apiUrl = `https://api.chainstack.com/v1/faucet/${walletChain}`;

  const response = await fetch(apiUrl, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.CHAINSTACK_API_KEY as string}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  console.log(`Testnet token request for ${chain} address ${address} successful`);

  return response.json();
}

async function requestTokensFromFaucet(wallets: WalletInfo[]): Promise<void> {
  try {
    const balances = await Promise.all(
      wallets.map((wallet) => fetchEVMWalletBalance(wallet.address, wallet.chain))
    );

    const faucetRequests: Promise<any>[] = wallets.map((wallet, index) => {
      if (parseFloat(balances[index]) === 0) {
        return fillWallet(wallet.address, wallet.chain);
      }
      return Promise.resolve(null);
    }).filter((request) => request !== null);

    if (faucetRequests.length) {
      await Promise.all(faucetRequests);
    }
  } catch (e) {
    console.log('Error requesting token from faucet ', e.message);
  }
}

const wallets: WalletInfo[] = [
  { address: '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb', chain: 'eth' },
  { address: '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71', chain: 'bnb' }
];

requestTokensFromFaucet(wallets);
