export function getCookieValue(cookieName: string) {
  const cookieArray = document.cookie.split(';');
  // eslint-disable-next-line no-restricted-syntax
  for (const cookie of cookieArray) {
    const [key, value] = cookie.trim().split('=');
    if (key === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null; // Return null if the cookie was not found
}

export function setCookie(name: string, value: string, daysToExpire: number) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expirationDate.toUTCString()}; path=/`;
}
