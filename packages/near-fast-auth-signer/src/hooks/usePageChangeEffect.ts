import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function usePageChangeEffect(effect: () => void) {
  const location = useLocation();

  useEffect(() => {
    effect();
  }, [effect, location]);
}

export default usePageChangeEffect;
