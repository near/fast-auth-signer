import { KeyPairEd25519 } from '@near-js/crypto';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import FastAuthController from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import { useAuthState } from '../../lib/useAuthState';
import { decodeIfTruthy } from '../../utils';
import { networkId } from '../../utils/config';
import { onSignIn } from '../AuthCallback/AuthCallback';

const StyledCheckbox = styled.input`
  width: 20px;
  height: 20px;
  background-color: initial;
  border: initial;
  appearance: auto;
  cursor: pointer;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
`;

function Devices() {
  const [collections, setCollections] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleted, setisDeleted] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [deleteCollections, setDeleteCollections] = useState([]);
  const controller = useMemo(() => new FirestoreController(), []);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const public_key_lak = decodeURIComponent(searchParams.get('public_key_lak'));
  const publicKeyFak = decodeURIComponent(searchParams.get('publicKeyFak'));
  const { authenticated } = useAuthState();

  const onClick = (id) => {
    if (deleteCollections.includes(id)) {
      setDeleteCollections(deleteCollections.filter((item) => item !== id));
    } else {
      setDeleteCollections([...deleteCollections, id]);
    }
  };

  useEffect(() => {
    const getCollection = async () => {
      setIsLoaded(true);
      const privateKey = window.localStorage.getItem(`temp_fastauthflow_${publicKeyFak}`);
      const accountId = await controller.getAccountIdFromOidcToken();

      // claim the oidc token
      (window as any).fastAuthController = new FastAuthController({
        accountId,
        networkId
      });
      const keypair = new KeyPairEd25519(privateKey.split(':')[1]);
      await window.fastAuthController.setKey(keypair);

      const deviceCollections = await controller.listDevices();
      setIsLoaded(false);
      setCollections(deviceCollections);
    };
    if (authenticated) {
      getCollection();
    }
  }, [authenticated]);

  const onDeleteCollections = () => {
    setisDeleted(true);
    const list = deleteCollections
      .map((id) => {
        const target = collections.find((collection) => collection.id === id);
        return {
          firebaseId: target.firebaseId,
          publicKeys: target.publicKeys,
        };
      });

    return controller.deleteDeviceCollections(list)
      .then(async () => {
        setisDeleted(false);
        setCollections(collections.filter((collection) => (!deleteCollections.includes(collection.id))));
        setDeleteCollections([]);
        setIsAddingKey(true);

        const email = decodeIfTruthy(searchParams.get('email'));
        const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
        const methodNames = decodeIfTruthy(searchParams.get('methodNames'));
        const success_url = decodeIfTruthy(searchParams.get('success_url'));
        const oidcToken = await controller.getUserOidcToken();

        await onSignIn({
          accessToken:      oidcToken,
          publicKeyFak,
          public_key_lak,
          contract_id,
          methodNames,
          setStatusMessage: () => null,
          success_url,
          email,
          searchParams,
          navigate,
        });
        setIsAddingKey(false);
      }).catch((err) => {
        setisDeleted(false);
        console.log('Delete Failed', err);
      });
  };

  return (
    <>
      <div>Devices route</div>
      {isLoaded && <div>Loading...</div>}
      {
        collections.map((collection) => (
          <Row key={collection.id}>
            <StyledCheckbox type="checkbox" id={collection.id} onChange={() => onClick(collection.id)} checked={deleteCollections.includes(collection.id)} />
            <label htmlFor={collection.id}>{collection.label}</label>
          </Row>
        ))
      }
      {
        collections.length > 0 && (
          <button type="button" onClick={onDeleteCollections} disabled={!deleteCollections.length || isDeleted}>
            Delete collections
          </button>
        )
      }
      {isDeleted && <div>Deleting...</div>}
      {isAddingKey && <div>Signing In...</div>}
    </>
  );
}

export default Devices;
