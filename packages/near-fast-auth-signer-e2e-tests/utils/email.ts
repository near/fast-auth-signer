import POP3Client from 'mailpop3';

class MailPop3Box {
  private client: POP3Client;

  private user: string;

  private password: string;

  private host: string;

  private port: number;

  private tls: boolean;

  public isConnected: boolean = false;

  public isLoggedIn: boolean = false;

  constructor(config: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  }) {
    const {
      user, password
    } = config;
    this.user = user;
    this.password = password;
    this.client = null;
    this.host = config.host;
    this.port = config.port;
    this.tls = config.tls;
  }

  public async establishConnection(): Promise<void> {
    this.client = new POP3Client(this.port, this.host, {
      tlserrs:   false,
      enabletls: this.tls,
      debug:     false
    });

    this.setupEventHandlers();
    return new Promise((resolve, reject) => {
      this.client.on('connect', () => {
        console.log('CONNECT success');
        this.isConnected = true;

        this.client.on('login', (status) => {
          if (status) {
            console.log('LOGIN/PASS success');
            this.isLoggedIn = true;
            resolve();
          } else {
            console.log('LOGIN/PASS failed');
            this.client.quit();
            reject(new Error('Login failed.'));
          }
        });

        this.client.login(this.user, this.password);
      });
      this.client.on('error', (err: Error) => {
        console.error('Error:', err);
        reject(err);
      });
    });
  }

  private setupEventHandlers(): void {
    this.client.on('quit', this.handleQuit);
  }

  // eslint-disable-next-line class-methods-use-this
  private handleQuit = (status: boolean): void => {
    if (status) {
      console.log('QUIT success');
    } else {
      console.log('QUIT failed');
    }
  };

  public async getLastEmail(): Promise<string> {
    return new Promise<string | undefined>((resolve, reject) => {
      if (!this.isLoggedIn) {
        reject(new Error('Not logged in to server.'));
        return;
      }

      const checkEmails = () => {
        this.client.list();
      };

      this.client.on('list', (status, msgcount) => {
        if (!status) {
          reject(new Error('LIST command failed.'));
          return;
        }
        if (msgcount === 0) {
          resolve(undefined);
        } else {
          this.client.retr(1);
        }
      });

      this.client.on('retr', (status, msgnumber, data) => {
        if (!status) {
          reject(new Error('Failed to retrieve message.'));
        } else {
          this.client.dele(msgnumber);
          resolve(data
            .replace(/=\n/g, '')
            .replace(/\n/g, '')
            .replace(/\s+/g, ' ')
            .trim());
        }
      });

      this.client.on('dele', (status) => {
        if (!status) {
          console.error('Failed to delete message.');
        }
      });

      this.client.on('error', (err) => {
        reject(err);
      });

      checkEmails();
    });
  }
}

export default MailPop3Box;
