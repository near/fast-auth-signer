import { useState, useEffect } from 'react';

import { firebaseAuth } from '../utils/firebase';

// Custom hook to manage Firebase auth state
function useFirebaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Tracks the loading state

  useEffect(() => {
    // This function returns a promise that resolves once Firebase auth state is known
    const getAuthState = () => new Promise((resolve) => {
      const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
        resolve(user);
        unsubscribe(); // Cleanup the subscription
      });
    });

    // Call getAuthState and update the state based on its result
    getAuthState().then((user) => {
      setUser(user);
      setLoading(false); // Set loading to false once we have the auth state
    });
  }, []);

  return { user, loading };
}

export default useFirebaseUser;
