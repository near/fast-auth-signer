export const extractLinkFromOnboardingEmail = (emailContent: string): string | null => {
  const regex = /href=3D'([^']+)'>Sign in to NEAR Onboarding/;
  const match = emailContent.match(regex);

  if (match) {
    return match[1]
      .replace(/=3D/g, '=')
      .replace(/&amp;/g, '&');
  }

  return null;
};
