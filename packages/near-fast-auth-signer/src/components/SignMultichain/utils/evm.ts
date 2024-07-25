import { BigNumberish, ethers } from 'ethers';

// Interface IDs
const ERC721_INTERFACE_ID = '0x80ac58cd';
const ERC1155_INTERFACE_ID = '0xd9b67a26';

// ERC20 Interface
const erc20Interface = new ethers.Interface([
  'function transfer(address, uint256)',
  'function approve(address, uint256)',
  'function transferFrom(address, address, uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
]);

// ERC721 Interface
const erc721Interface = new ethers.Interface([
  'function safeTransferFrom(address, address, uint256, bytes)',
  'function safeTransferFrom(address, address, uint256)',
  'function transferFrom(address, address, uint256)',
  'function approve(address, uint256)',
  'function setApprovalForAll(address, bool)',
]);

// ERC1155 Interface
const erc1155Interface = new ethers.Interface([
  'function safeTransferFrom(address, address, uint256, uint256, bytes)',
  'function safeBatchTransferFrom(address, address, uint256[], uint256[], bytes)',
  'function setApprovalForAll(address, bool)',
]);

async function fetchTokenInfo(
  contractAddress: string,
  provider: ethers.Provider
): Promise<{
  ercStandard: string;
  name: string;
  symbol: string;
  decimals?: number;
}> {
  const tokenInterface = new ethers.Interface([
    'function supportsInterface(bytes4) view returns (bool)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
  ]);

  const contract = new ethers.Contract(contractAddress, tokenInterface, provider);

  try {
    const [isERC721, isERC1155, totalSupply, name, symbol, decimals] = await Promise.all([
      contract.supportsInterface(ERC721_INTERFACE_ID).catch(() => false),
      contract.supportsInterface(ERC1155_INTERFACE_ID).catch(() => false),
      contract.totalSupply().catch(() => null),
      contract.name().catch(() => 'Unknown'),
      contract.symbol().catch(() => '???'),
      contract.decimals().catch(() => undefined),
    ]);

    let ercStandard = 'Unknown';
    if (isERC721) ercStandard = 'ERC721';
    else if (isERC1155) ercStandard = 'ERC1155';
    else if (totalSupply !== null) ercStandard = 'ERC20';

    return {
      ercStandard,
      name,
      symbol,
      decimals: ercStandard === 'ERC20' ? (decimals ?? 18) : undefined,
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    return {
      ercStandard: 'Unknown',
      name:        'Unknown',
      symbol:      '???',
      decimals:    undefined,
    };
  }
}

export async function getEVMFunctionCallMessage(
  tx: {
    data: string;
    to: string;
    value?: BigNumberish;
  },
  provider: ethers.Provider
): Promise<string> {
  if (tx.to === null || tx.to === undefined || tx.to === '') {
    return 'You are deploying a new contract. Please verify the contract code carefully.';
  }

  const defaultMessage = 'You are calling a method on a contract that we couldn\'t identify. Please make sure you trust the receiver address and application.';

  const {
    ercStandard, decimals, symbol, name
  } = await fetchTokenInfo(
    tx.to,
    provider
  );

  let iface: ethers.Interface;
  switch (ercStandard) {
    case 'ERC20':
      iface = erc20Interface;
      break;
    case 'ERC721':
      iface = erc721Interface;
      break;
    case 'ERC1155':
      iface = erc1155Interface;
      break;
    default:
      return defaultMessage;
  }

  try {
    const decoded = iface.parseTransaction({ data: tx.data });
    if (decoded) {
      switch (decoded.name) {
        case 'transfer':
          if (ercStandard === 'ERC20') {
            return `Transferring ${ethers.formatUnits(decoded.args[1], decimals)} ${symbol} (${name}) to ${decoded.args[0]}.`;
          }
          return `Transferring ${name} token ID ${decoded.args[1]} to ${decoded.args[0]}.`;

        case 'approve':
          if (ercStandard === 'ERC20') {
            return `Approving ${decoded.args[0]} to manage up to ${ethers.formatUnits(decoded.args[1], decimals)} ${symbol} (${name}). This allows them to transfer this amount on your behalf.`;
          }
          return `Approving ${decoded.args[0]} to manage ${name} token ID ${decoded.args[1]}. This allows them to transfer this specific token on your behalf.`;

        case 'transferFrom':
          if (ercStandard === 'ERC20') {
            return `Transferring ${ethers.formatUnits(decoded.args[2], decimals)} ${symbol} (${name}) from ${decoded.args[0]} to ${decoded.args[1]}.`;
          }
          return `Transferring ${name} token ID ${decoded.args[2]} from ${decoded.args[0]} to ${decoded.args[1]}.`;

        case 'safeTransferFrom':
          if (ercStandard === 'ERC721') {
            return `Transferring ${name} token ID ${decoded.args[2]} from ${decoded.args[0]} to ${decoded.args[1]}.`;
          } if (ercStandard === 'ERC1155') {
            return `Transferring ${decoded.args[3]} of ${name} token ID ${decoded.args[2]} from ${decoded.args[0]} to ${decoded.args[1]}.`;
          }
          break;

        case 'setApprovalForAll':
          return `${decoded.args[1] ? 'Granting' : 'Revoking'} permission for ${decoded.args[0]} to manage ALL your ${name} (${ercStandard}) tokens. This is a powerful permission, use with caution.`;

        case 'safeBatchTransferFrom':
          return `Batch transferring ${decoded.args[3].length} ${name} (${ercStandard}) tokens (IDs: ${decoded.args[2].join(', ')}) from ${decoded.args[0]} to ${decoded.args[1]} with quantities: ${decoded.args[3].join(', ')}.`;

        default:
          return defaultMessage;
      }
    }
  } catch (error) {
    console.error(`Error parsing ${ercStandard} interface for ${name} (${symbol}):`, error);
  }

  return defaultMessage;
}
