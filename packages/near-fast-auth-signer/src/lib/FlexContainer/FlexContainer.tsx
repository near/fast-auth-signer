import styled from 'styled-components';

interface FlexContainerProps {
  $flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  $grow?: number;
  $gap?: number;
  $padding?: number;
  $margin?: number;
  $height?: number | string;
  $width?: number | string;
  $alignItems?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  $justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  $backgroundColor?: string;
}

const FlexContainer = styled.div<FlexContainerProps>`
  display: flex;
  flex-grow: ${({ $grow = 1 }) => $grow};
  flex-direction: ${({ $flexDirection = 'column' }) => $flexDirection};
  gap: ${({ $gap = 0 }) => $gap};
  padding: ${({ $padding = 0 }) => $padding};
  margin: ${({ $margin = 0 }) => $margin};
  height: ${({ $height = 'auto' }) => $height};
  width: ${({ $width = 'auto' }) => $width};
  align-items: ${({ $alignItems = 'stretch' }) => $alignItems};
  justify-content: ${({ $justifyContent = 'flex-start' }) => $justifyContent};
  background-color: ${({ $backgroundColor }) => $backgroundColor};
`;

export default FlexContainer;
