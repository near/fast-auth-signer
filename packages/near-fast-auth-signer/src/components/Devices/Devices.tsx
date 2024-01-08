import { captureException } from '@sentry/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import FirestoreController from '../../lib/firestoreController';
import { decodeIfTruthy, inIframe } from '../../utils';
import { basePath } from '../../utils/config';
import { onSignIn } from '../AuthCallback/AuthCallback';

const Title = styled.h1`
  padding-bottom: 20px;
`;

const Description = styled.p`
  font-size: 16px;
  font-weight: bold;
`;

const StyledCheckbox = styled.input`
  width: 20px;
  height: 20px;
  background-color: initial;
  border: initial;
  appearance: auto;
  cursor: pointer;
  margin-top: 0;
  margin-right: 10px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  padding-bottom: 10px;
`;

const Button = styled.button`
  width: 100%;
  margin-top: 30px;
  outline: none;
  font-size: 20px;
`;

function Devices() {
  const [collections, setCollections] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleted, setisDeleted] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isVerifyEmailRequired, setVerifyEmailRequired] = useState(false);
  const [deleteCollections, setDeleteCollections] = useState([]);
  const controller = useMemo(() => new FirestoreController(), []);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const public_key_lak = decodeIfTruthy(searchParams.get('public_key_lak')) || decodeIfTruthy(searchParams.get('public_key'));
  const publicKeyFak = decodeIfTruthy(searchParams.get('publicKeyFak'));

  const onClick = (id) => {
    if (deleteCollections.includes(id)) {
      setDeleteCollections(deleteCollections.filter((item) => item !== id));
    } else {
      setDeleteCollections([...deleteCollections, id]);
    }
  };

  useEffect(() => {
    const getCollection = async () => {
      const deviceCollections = await controller.listDevices();
      setIsLoaded(false);
      setCollections(deviceCollections);
    };

    const getKeypairOrLogout = () => window.fastAuthController.findInKeyStores(`oidc_keypair_${controller.getUserOidcToken()}`).then((keypair) => {
      if (keypair) {
        getCollection();
      } else {
        window.fastAuthController.clearUser().then(() => {
          setVerifyEmailRequired(true);
          setIsLoaded(false);
        });
      }
    });
    setIsLoaded(true);
    if (controller.getUserOidcToken()) {
      getKeypairOrLogout();
    } else {
      (new Promise((resolve) => { setTimeout(resolve, 5000); })).then(controller.getUserOidcToken).then((token) => {
        if (!token) {
          setVerifyEmailRequired(true);
        } else {
          getKeypairOrLogout();
        }
      });
    }
  }, [controller]);

  const redirectToSignin = () => {
    if (inIframe()) {
      window.open(`${window.location.origin}${basePath ? `/${basePath}` : ''}/login?${searchParams.toString()}`, '_parent');
    } else {
      navigate({
        pathname: '/login',
        search:   searchParams.toString(),
      });
    }
  };

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
        const contract_id = decodeIfTruthy(searchParams.get('contract_id'));

        if (contract_id && public_key_lak) {
          setIsAddingKey(true);

          const email = window.localStorage.getItem('emailForSignIn');
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
            gateway:          success_url,
          });
          setIsAddingKey(false);
        }
      }).catch((err) => {
        captureException(err);
        setisDeleted(false);
        console.log('Delete Failed', err);
      });
  };

  return (
    <>
      <Title>Devices with Keys</Title>

      {isLoaded && <div>Loading...</div>}

      {collections.length > 0 && (
        <Description>
          You have reached maximum number of keys. Please delete some keys to add new keys.
        </Description>
      )}

      {
        isVerifyEmailRequired && (
          <Description>
            You need to verify your email address to use this feature
          </Description>
        )
      }
      {
        collections.map((collection) => (
          <Row key={collection.id}>
            <StyledCheckbox type="checkbox" id={collection.id} onChange={() => onClick(collection.id)} checked={deleteCollections.includes(collection.id)} />
            <label htmlFor={collection.id} title={`Created At: ${collection.createdAt}`}>{collection.label}</label>
          </Row>
        ))
      }
      {
        collections.length > 0 && (
          <Button type="button" onClick={onDeleteCollections} disabled={!deleteCollections.length || isDeleted}>
            {`Delete key${deleteCollections.length > 1 ? 's' : ''}`}
          </Button>
        )
      }
      {
        isVerifyEmailRequired && (
          <Button type="button" onClick={redirectToSignin}>
            Redirect
          </Button>
        )
      }
      {isDeleted && <div>Deleting...</div>}
      {isAddingKey && <div>Signing In...</div>}
    </>
  );
}

export default Devices;
