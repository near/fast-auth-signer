import React from 'react';
import styled from 'styled-components';

import BinanceIcon from '../../Images/BinanceIcon';
import BitcoinIcon from '../../Images/BitcoinIcon';
import EthereumIcon from '../../Images/EthereumIcon';
import { assertNever } from '../../utils';
import { Chain, DerivationPathDeserialized } from '../SignMultichain/types';

const Container = styled.div`
  display: flex;
`;

const Content = styled.span`
  margin-left: 10px;
  font-weight: normal;
`;

interface TableRowProps {
  asset?: DerivationPathDeserialized['asset'];
  content?: string | React.ReactElement;
}

const getAssetIcon = ({ asset, height, width }: {
  asset: Chain;
  height: number;
  width: number;
}) => {
  switch (asset) {
    case 'ETH':
      return (
        <EthereumIcon height={height} width={width} />
      );
    case 'BTC':
      return (
        <BitcoinIcon height={height} width={width} />
      );
    case 'BNB':
      return (
        <BinanceIcon height={height} width={width} />
      );
    default:
      return assertNever(asset);
  }
};

export function TableRow({ asset, content }: TableRowProps) {
  return (
    <Container>
      {asset && getAssetIcon({ asset, height: 18, width: 18 })}
      <Content>
        {content}
      </Content>
    </Container>
  );
}
