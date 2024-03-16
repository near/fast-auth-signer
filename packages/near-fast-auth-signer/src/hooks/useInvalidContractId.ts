import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useInvalidContractId = (invalidContract: string, error: string) => {
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contract_id');

  useEffect(() => {
    if (contractId && invalidContract === contractId) {
      window.parent.postMessage({
        type:    error,
        message: 'Invalid contract_id'
      }, '*');
    }
  }, [contractId, error, invalidContract]);
};
