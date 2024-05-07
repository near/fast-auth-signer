export const extractLinkFromOnboardingEmail = (emailContent: string): string | null => {
  const regex = /href=3D'([^']+)'>Sign in to NEAR Onboarding/;
  const match = emailContent.match(regex);

  if (match) {
    const linkAddress = match[1];
    return linkAddress;
  }

  return null;
};
