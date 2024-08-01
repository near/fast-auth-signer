export const clearEmailFormatting = (email: string) => email.replace(/=\n/g, '')
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const formatLink = (link: string): string => link
  .replace(/=3D/g, '=')
  .replace(/&amp;/g, '&');

export const extractOTPFromEmail = (
  emailContent: string
): {
    otp: string;
  } | null => {
  const otpMatch = emailContent.match(/use this code:\s*(\d{6})/);

  if (otpMatch) {
    return {
      otp:  otpMatch[1],
    };
  }
  return null;
};
