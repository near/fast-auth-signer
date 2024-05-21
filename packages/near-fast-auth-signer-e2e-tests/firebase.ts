import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

interface FirebaseAuthResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

async function createNewUser(email: string, password: string): Promise<admin.auth.UserRecord> {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password
    });
    return userRecord;
  } catch (error) {
    console.error('Error creating new user:', error);
    throw error;
  }
}

async function signInAndGetToken(email: string, password: string): Promise<string> {
  const apiKey = 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU';
  if (!apiKey) {
    throw new Error('Firebase API key is missing');
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const body = JSON.stringify({
    email,
    password,
    returnSecureToken: true
  });

  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    if (!response.ok) {
      throw new Error('Failed to sign in');
    }

    const data: FirebaseAuthResponse = await response.json();
    return data.idToken;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

export async function generateNewUserToken(email: string): Promise<string> {
  const password = 'securepassword';

  try {
    await createNewUser(email, password);
    const idToken = await signInAndGetToken(email, password);
    return idToken;
  } catch (error) {
    console.error('Error generating new user token:', error);
    throw error;
  }
}
