import type * as Stitches from '@stitches/react';
import { createStitches } from '@stitches/react';

export const {
  config,
  createTheme,
  css,
  getCssText,
  globalCss,
  keyframes,
  styled,
  theme,
} = createStitches({
  theme: {
    // Base colors
    colors: {
      black100: '#737373',
      black200: '#595959',
      black300: '#404040',
      black400: '#262626',
      black500: '#0E0E0E',

      white100: '#FFFFFF',

      grey100: '#F9F9F9',
      grey200: '#EDEDED',
      grey300: '#C9D1D1',
      grey400: '#B7C2C1',
      grey500: '#A5B3B2',

      lime100: '#F8FFE5',
      lime200: '#F2FFCC',
      lime300: '#E5FF9B',
      lime400: '#D7FF66',
      lime500: '#CAFF33',

      orange100: '#FCE9DE',
      orange200: '#F8CAB0',
      orange300: '#F3AA81',
      orange400: '#EF8B52',
      orange500: '#EB6C25',

      purple100: '#C39BFF',

      red: '#EB2525',

      // Utility colors
      bgColor: '$white100',

      bgLightColor: '$grey100',
      fgColor:      '$black400',

      textDark:  '$black500',
      textLight: '$black300',

      btnPrimaryBg: '$black500',
      btnPrimaryFg: '$white100',

      borderBgColor: '$grey200',

      lightGray: '#F3F4F6',
    },
    space: {
      1:  '4px',
      2:  '8px',
      3:  '16px',
      4:  '24px',
      5:  '32px',
      6:  '40px',
      7:  '48px',
      8:  '56px',
      9:  '64px',
      10: '72px',
      11: '80px',
      12: '88px',
      13: '96px',
      14: '104px',
      15: '112px',
      16: '120px',
    },
    sizes: {
      1:  '4px',
      2:  '8px',
      3:  '16px',
      4:  '24px',
      5:  '32px',
      6:  '40px',
      7:  '48px',
      8:  '56px',
      9:  '64px',
      10: '72px',
      11: '80px',
      12: '88px',
      13: '96px',
      14: '104px',
      15: '112px',
      16: '120px',
    },
    fontSizes: {
      display1: '62px',
      display2: '45px',
      display3: '32px',
      heading1: '28px',
      heading2: '24px',
      heading3: '20px',
      heading4: '18px',
      heading5: '16px',
      heading6: '14px',
      body1:    '18px',
      body2:    '16px',
      body3:    '14px',
    },
    fontWeights:    {},
    letterSpacings: {},
    borderWidths:   {},
    borderStyles:   {},
    shadows:        {},
    radii:          {
      1:     '4px',
      2:     '8px',
      3:     '16px',
      4:     '24px',
      round: '50%',
      pill:  '9999px',
    },
    zIndices: {
      1:   '100',
      2:   '200',
      3:   '300',
      4:   '400',
      max: '999',
    },
    transitions: {},
  },
  media: {
    bp1:    '(min-width: 520px)',
    bp11:   '(min-width: 720px)',
    bp2:    '(min-width: 900px)',
    bp3:    '(min-width: 1200px)',
    bp4:    '(min-width: 1800px)',
    motion: '(prefers-reduced-motion)',
    hover:  '(any-hover: hover)',
    dark:   '(prefers-color-scheme: dark)',
    light:  '(prefers-color-scheme: light)',
  },
  utils: {}
});

export type CSS = Stitches.CSS<typeof config>;

export const darkTheme = createTheme('dark-theme', {
  colors: {
    black:      '#222524',
    lightBlack: '#666666',
    white:      '#ffffff',

    bgColor:      '#151515',
    bgLightColor: '#191919',
    fgColor:      '$white',

    btnPrimaryBg: '$white',
    btnPrimaryFg: '$black',

    borderBgColor: '#202022',
  },
});
