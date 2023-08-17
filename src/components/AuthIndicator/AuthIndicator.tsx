import * as React from 'react';
import { useEffect, useState } from 'react';

import AuthIndicatorButton from './AuthIndicatorButton';

function AuthIndicator({ controller }) {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);

  useEffect(() => {
    async function fetchSignedInStatus() {
      const currentlySignedIn = await controller.isSignedIn();
      setTimeout(() => setIsSignedIn(currentlySignedIn), 300);
    }

    fetchSignedInStatus();
  }, [controller]);

  return (
    <AuthIndicatorButton $buttonType="secondary" $isSignedIn={isSignedIn}>
      {isSignedIn ? <p>signed in</p>
        : <p>not signed in</p>}
    </AuthIndicatorButton>
  );
}

export default AuthIndicator;
