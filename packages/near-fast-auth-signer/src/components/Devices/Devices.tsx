import { captureException } from '@sentry/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { Button } from '../../lib/Button';
import FirestoreController from '../../lib/firestoreController';
import { decodeIfTruthy, inIframe } from '../../utils';
import { basePath } from '../../utils/config';
import { onSignIn } from '../AuthCallback/AuthCallback';
import { StyledContainer } from '../Layout';

const DevicesWrapper = styled.div<{ inIframe?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  justify-content: center;
  align-items: center;
  width: 385px;
  margin: 16px auto;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #EEEEEC;
  box-sizing: border-box;
  height: 550px;

  @media (min-width: 768px) {
    max-width: 380px;
  }
  
  

  ${(props) => props.inIframe && 'margin: 0; border-bottom: none; box-shadow: none;'}

  @media screen and (max-width: 767px) {
  // Height and width will be controlled by iFrame
  ${(props) => props.inIframe && `
        width: 100%;
        height: 100vh;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      `}
}
`;
const Title = styled.h2`
  font-size: bolder;
`;

const Description = styled.p`
  font-size: 15px;
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
  width: 100%;
  align-items: flex-start;
  font-weight: 400;
`;

function Devices() {
  const [collections, setCollections] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
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
    setIsDeleted(true);
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
        setIsDeleted(false);
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
        setIsDeleted(false);
        console.log('Delete Failed', err);
      });
  };

  const deleteCollectionText = useMemo(() => {
    if (isDeleted) return 'Deleting...';
    if (isAddingKey) return 'Signing In...';
    return `Delete key${deleteCollections.length > 1 ? 's' : ''}`;
  }, [deleteCollections.length, isAddingKey, isDeleted]);

  return (
    <StyledContainer inIframe={inIframe()}>

      <DevicesWrapper inIframe={inIframe()}>
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
              {deleteCollectionText}
            </Button>
          )
        }
        {
          isVerifyEmailRequired && (
            <Button
              type="button"
              variant="secondary"
              onClick={redirectToSignin}
            >
              Redirect
            </Button>
          )
        }
      </DevicesWrapper>
    </StyledContainer>
  );
}

export default Devices;
