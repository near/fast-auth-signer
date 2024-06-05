import { Chain, CovalentClient } from '@covalenthq/client-sdk';

export function fromWei(wei: string): number {
  return Number(BigInt(wei)) / 1e18;
}
//     `${(chain as string).replace('bnb', 'bsc')}` as Chain,
export async function fetchEVMWalletBalance(
  address: string,
  chain: Chain
): Promise<number> {
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

// API config
type WalletChain = 'sepolia' | 'bnb-testnet';

function getWalletChain(chain: string): WalletChain | null {
  switch (chain) {
    case 'eth':
      return 'sepolia';
    case 'bnb':
      return 'bnb-testnet';
    default:
      return null;
  }
}

export async function fillWallet(address: string, chain: string) {
  const walletChain = getWalletChain(chain);

  if (!walletChain) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  console.log(`Sending faucet request for address ${address}`);
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
    throw new Error(`HTTP error! status: ${response.statusText}`);
  }

  return response.json();
}
