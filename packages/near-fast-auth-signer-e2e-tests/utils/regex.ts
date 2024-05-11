export const cleanEmailFormat = (email: string) => email.replace(/=\n/g, '')
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const formatLink = (link: string): string => link
  .replace(/=3D/g, '=')
  .replace(/&amp;/g, '&');

export const extractLinkAndUIDLFromOnboardingEmail = (emailContent: string): {link: string, uidl: string } | null => {
  const link = emailContent.match(/href=3D'([^']+)'>Sign in to NEAR Onboarding/);
  const uidl = emailContent.match(/--([0-9a-zA-Z]+)--/);

  if (link && uidl) {
    return {
      link: formatLink(link[1]),
      uidl: uidl[1]
    };
  }

  return null;
};
