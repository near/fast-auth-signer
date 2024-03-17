import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useInvalidContractId = (invalidContract: string, error: string) => {
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contract_id');

  // TODO: we probably need a better security method. This contracts should e blacklisted from the BE side
  // On the current implementation the user can bypass it simply disabling this check from the dev console
  useEffect(() => {
    if (contractId && invalidContract === contractId) {
      window.parent.postMessage({
        type:    error,
        message: 'Invalid contract_id'
      }, '*');
    }
  }, [contractId, error, invalidContract]);
};
