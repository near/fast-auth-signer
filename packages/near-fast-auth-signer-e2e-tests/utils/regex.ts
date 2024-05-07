export const cleanEmailFormat = (email: string) => email.replace(/=\n/g, '')
  .replace(/\n/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const extractLinkAndUIDLFromOnboardingEmail = (emailContent: string): {link: string, uidl: string } | null => {
  const linkRegex = /href=3D'([^']+)'>Sign in to NEAR Onboarding/;
  const link = emailContent.match(linkRegex);

  const UIDLRegex = /--([0-9a-zA-Z]+)--/;
  const uidl = emailContent.match(UIDLRegex);

  if (link && uidl) {
    return {
      link: link[1]
        .replace(/=3D/g, '=')
        .replace(/&amp;/g, '&'),
      uidl: uidl[1]
    };
  }

  return null;
};
