import { createKey } from '@near-js/biometric-ed25519';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import './CreateAccount.css';

function CreateAccount() {
  const [searchParams] = useSearchParams();

  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');

  React.useEffect(() => {
    console.log(searchParams.get('publicKey'));
    console.log(searchParams.get('redirectUrl'));
  }, []);

  async function onSubmitHandler(e) {
    e.preventDefault();
    console.log('asdasdasd', email, username);
    const key = await createKey(username);
    console.log(key);
  }

  return (
    <div className="modal">
      <div className="modal-header">
        <h1>Create Account</h1>
        <p>Use this account to sign in everywhere on NEAR, no password required.</p>
      </div>
      <form onSubmit={onSubmitHandler}>
        <div>
          <p className="label">Email</p>
          <input type="email" name="email" id="email" placeholder="user_name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <p className="label">Account ID</p>
          <input type="text" name="account-id" id="account-id" placeholder="user_name.near" value={username} onChange={(e) => setUsername(e.target.value)} />
          <p className="label label-bottom">Use a suggested ID or customize your own.</p>
        </div>
        <button type="submit">Continue</button>
      </form>
      <div className="modal-footer">
        <p>
          <span>Already have an account?</span>
          {' '}
          <a href="https://www.near.org/signin">Sign In</a>
        </p>
      </div>
    </div>
  );
}

export default CreateAccount;
