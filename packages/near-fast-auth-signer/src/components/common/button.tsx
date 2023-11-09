import styled from 'styled-components';

/** *************************************** */
// THERE IS ANOTHER <Button /> COMPONENT  //
// THAT PROBABLY SHOULD BE USED INSTEAD ! //
//* ***************************************/
//
interface myButton {
  $buttonType?: string;
  size?: 's' | 'm' | 'l';
}

const handleButtonSize = (size: string) => {
  switch (size) {
    case 's':
      return '32px';
    case 'm':
      return '48px';
    case 'l':
      return '56px';
    default:
      return '56px';
  }
};

const handleBgColor = (color: string) => {
  switch (color) {
    case 'primary':
      return '#0072CE';
    case 'secondary':
      return '#ffffff';
    case 'third':
      return '#161615';
    case 'fourth':
      return '#FDFDFC';
    default:
      return '#ffffff';
  }
};

const handleBorder = (color: string) => {
  switch (color) {
    case 'primary':
      return '#0072CE';
    case 'secondary':
      return '#cccccc';
    case 'third':
      return '#161615';
    default:
      return '#ffffff';
  }
};

const handleColor = (color: string) => {
  switch (color) {
    case 'primary':
      return '#ffffff';
    case 'secondary':
      return '#888888';
    case 'third':
      return '#ffffff';
    case 'fourth':
      return 'black';
    default:
      return '#ffffff';
  }
};

const hoverBgColor = (color: string) => {
  switch (color) {
    case 'primary':
      return '#007fe6';
    case 'secondary':
      return '#cccccc';
    case 'third':
      return '#252523';
    case 'fourth':
      return '#f3f3f3';
    default:
      return '#ffffff';
  }
};

const hoverColor = (color: string) => {
  switch (color) {
    case 'primary':
      return '#007fe6';
    case 'secondary':
      return '#cccccc';
    case 'third':
      return '#e5e5e5';
    case 'fourth':
      return 'black';
    default:
      return '#ffffff';
  }
};

const StyledButton = styled.button.attrs<myButton>(
  ({
    type = 'button',
    $buttonType = 'primary',
    disabled = false,
    size = 'l',
  }) => {
    return {
      type,
      $buttonType,
      disabled,
      size,
    };
  }
)`
  border-radius: 40px;
  padding: 5px 32px;
  outline: none;
  font-size: 15px;
  height: ${({ size }) => handleButtonSize(size)};
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
  background-color: ${({ $buttonType }) => handleBgColor($buttonType)};
  border: 2px solid ${({ $buttonType }) => handleBorder($buttonType)};
  color: ${({ $buttonType }) => handleColor($buttonType)};

  @media (min-width: 768px) {
    &:enabled {
      &:hover {
        background-color: ${({ $buttonType }) => hoverBgColor($buttonType)};
        color: ${({ $buttonType }) => hoverColor($buttonType)};
      }
    }
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

export default StyledButton;
