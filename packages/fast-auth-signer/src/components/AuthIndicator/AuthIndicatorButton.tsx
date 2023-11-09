import styled from 'styled-components';

import Button from '../common/button';

interface AuthIndicatorButtonProps {
  $isSignedIn: boolean;
}

const AuthIndicatorButton = styled(Button)<AuthIndicatorButtonProps>`
  ${({ $isSignedIn }) => {
    if (!$isSignedIn) {
      return {
        'background-color': '#990000',
        color:              '#888888'
      };
    }

    return {
      'background-color': '#0072CE',
      color:              'white'
    };
  }}`;

export default AuthIndicatorButton;
