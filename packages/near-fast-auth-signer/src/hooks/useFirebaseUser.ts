import { useState, useEffect } from 'react';

import { firebaseAuth } from '../utils/firebase';

function useFirebaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((data) => {
      setUser(data);
      setLoading(false);
    });

    return () => {
      unsubscribe(); // Cleanup the subscription when component unmounts
    };
  }, []);

  return { user, loading };
}

export default useFirebaseUser;
