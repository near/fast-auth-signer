import POP3Client from 'mailpop3';
import { v4 as uuid } from 'uuid';

import { clearEmailFormatting, extractOTPFromEmail } from './regex';

export function checkAllEmails(
  config: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  },
  isTargetEmail: (_emailBody: string) => boolean
): Promise<{ content: string } | undefined> {
  return new Promise((resolve, reject) => {
    const {
      user, password, host, port, tls
    } = config;
    let count = 0;

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
        count = msgcount;
        client.retr(1);
      }
    });

    client.on('retr', (status: boolean, msgnumber: number, data: string) => {
      if (!status) {
        reject(new Error('Failed to retrieve message.'));
      } else {
        count -= 1;
        const cleanEmail = clearEmailFormatting(data);
        if (isTargetEmail(cleanEmail)) {
          client.quit();
          resolve({ content: cleanEmail });
        } else if (count === 0) {
          client.quit();
          resolve(undefined);
        } else {
          client.retr(msgnumber + 1);
        }
      }
    });
  });
}

type EmailOTP = {
  otp: string;
}

export const getFirebaseAuthOtp = async (email: string, readOTPs: string[], config: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}) => new Promise<EmailOTP | null>((resolve, reject) => {
  let retry = 3;
  // Wait 5 seconds before start checking e-mails
  setTimeout(() => {
    const interval = setInterval(async () => {
      let emailOTP: EmailOTP | null = null;
      const targetEmail = await checkAllEmails(config, (content: string) => {
        emailOTP = extractOTPFromEmail(content);
        if (emailOTP) {
          const ret = content.includes(email) && !readOTPs.includes(emailOTP.otp);
          readOTPs.push(emailOTP.otp);
          return ret;
        }
        return false;
      });
      if (targetEmail) {
        clearInterval(interval);
        resolve(emailOTP);
      }
      if (retry === 0) {
        clearInterval(interval);
        reject(new Error('OTP email not found'));
      }
      retry -= 1;
    }, 5000);
  }, 5000);
});

export const getRandomEmailAndAccountId = (): {email: string, accountId: string} => {
  const randomPart = uuid();
  return {
    email:     `${process.env.MAILTRAP_EMAIL}+${randomPart}@inbox.mailtrap.io`,
    accountId: randomPart
  };
};
