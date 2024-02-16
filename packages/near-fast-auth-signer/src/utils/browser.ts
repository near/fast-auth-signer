import UAParser from 'ua-parser-js';

export const isSafariBrowser = () => {
  const parser = new UAParser();
  const browser = parser.getBrowser();
  return browser.name === 'Safari';
};
