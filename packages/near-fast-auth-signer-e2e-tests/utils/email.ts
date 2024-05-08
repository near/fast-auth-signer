import POP3Client from 'mailpop3';

import { cleanEmailFormat, extractLinkAndUIDLFromOnboardingEmail } from './regex';

export function getLastEmail(config: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}): Promise<string | undefined> {
  const {
    user, password, host, port, tls
  } = config;

  let ret: string;

  return new Promise((resolve, reject) => {
    const client = new POP3Client(port, host, {
      tlserrs:   false,
      enabletls: tls,
      debug:     false
    });

    client.on('error', (err: Error) => reject(err));

    client.on('connect', () => {
      client.login(user, password);
    });

    client.on('login', (status: boolean) => {
      if (status) {
        client.list();
      } else {
        client.quit();
        reject(new Error('Login failed.'));
      }
    });

    client.on('list', (status: boolean, msgcount: number) => {
      if (!status) {
        reject(new Error('LIST command failed.'));
      } else if (msgcount === 0) {
        resolve(undefined);
      } else {
        client.retr(1);
      }
    });

    client.on('retr', (status: boolean, msgnumber: number, data: string) => {
      if (!status) {
        reject(new Error('Failed to retrieve message.'));
      } else {
        client.dele(msgnumber);
        ret = cleanEmailFormat(data);
      }
    });

    client.on('dele', (status: boolean) => {
      if (!status) {
        reject(new Error('Failed to delete message.'));
      } else {
        client.quit();
        resolve(ret);
      }
    });
  });
}

export const getFirebaseAuthLink = async (email: string, readUIDLs: string[], config: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}): Promise<{link: string, uidl: string } | null> => {
  let lastEmail = await getLastEmail(config);
  let { link, uidl } = extractLinkAndUIDLFromOnboardingEmail(lastEmail);

  while (!lastEmail?.includes(email) || readUIDLs.includes(uidl)) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => { setTimeout(resolve, 1000); });
    // eslint-disable-next-line no-await-in-loop
    lastEmail = await getLastEmail(config);
    ({ link, uidl } = extractLinkAndUIDLFromOnboardingEmail(lastEmail));
  }

  return { link, uidl };
};

export const getRandomEmailAndAccountId = (): {email: string, accountId: string} => {
  const randomPart = Math.random().toString(36).substring(2, 15);
  return {
    email:     `dded070de3-903595+${randomPart}@inbox.mailtrap.io`,
    accountId: randomPart
  };
};
