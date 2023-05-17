import styled from 'styled-components';

interface myButton {
  $buttonType?: string;
}

const StyledButton = styled.button
  .attrs<myButton>(({
    type = 'button',
    $buttonType = 'primary',
    disabled = false
  }) => {
    return {
      type,
      $buttonType,
      disabled,
    };
  })`
  border-radius: 40px;
  padding: 5px 32px;
  outline: none;
  font-size: 15px;
  height: 56px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
  background-color: ${(props) => (props.$buttonType === 'secondary' ? '#ffffff' : '#0072CE')};
  border: 2px solid ${(props) => (props.$buttonType === 'secondary' ? '#cccccc' : '#0072CE')};
  color: ${(props) => (props.$buttonType === 'secondary' ? '#888888' : 'white')};

  @media (min-width: 768px) {
    &:enabled {
      &:hover {
        background-color: ${(props) => (props.$buttonType === 'secondary' ? '#cccccc' : '#007fe6')};
        color: white;
      }
    }
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

export default StyledButton;
