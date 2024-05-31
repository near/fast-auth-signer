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
  padding: 20px;
  padding-bottom: 0;
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
const DevicesWrapperInner = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  align-items: center;
`;
const Title = styled.h2`
  font-weight: bolder;
`;

const Description = styled.p<{bold?: boolean}>`
  font-size: 15px;
  ${(props) => props.bold && 'font-weight: bold;'}
`;

export const StyledCheckbox = styled.input`
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

const DevicesBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #EEEEEC;
  width: 100%;
  height: 70px;
  margin: 5px 0;
`;

function Devices() {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isVerifyEmailRequired, setVerifyEmailRequired] = useState(false);
  const [deleteCollections, setDeleteCollections] = useState([]);
  if (!window.firestoreController) {
    window.firestoreController = new FirestoreController();
  }

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
      const deviceCollections = await window.firestoreController.listDevices();
      setIsLoading(false);
      setCollections(deviceCollections);
    };

    const getKeypairOrLogout = () => window.fastAuthController.findInKeyStores(`oidc_keypair_${window.firestoreController.getUserOidcToken()}`).then((keypair) => {
      if (keypair) {
        getCollection();
      } else {
        window.fastAuthController.clearUser().then(() => {
          setVerifyEmailRequired(true);
          setIsLoading(false);
        });
      }
    });
    setIsLoading(true);
    if (window.firestoreController.getUserOidcToken()) {
      getKeypairOrLogout();
    } else {
      (new Promise((resolve) => { setTimeout(resolve, 5000); }))
        .then(window.firestoreController.getUserOidcToken).then((token) => {
          if (!token) {
            setVerifyEmailRequired(true);
          } else {
            getKeypairOrLogout();
          }
        });
    }
  }, []);

  const redirectToSignin = () => {
    searchParams.append('forceNoPasskey', 'true');
    if (inIframe()) {
      window.parent.postMessage({
        type:   'method',
        method: 'query',
        id:     1234,
        params: {
          request_type: 'complete_authentication'
        }
      }, '*');
      window.open(`${window.location.origin}${basePath ? `/${basePath}` : ''}/login?${searchParams.toString()}`, '_parent');
    } else {
      navigate({
        pathname: '/login',
        search:   searchParams.toString(),
      });
    }
  };

  const onDeleteCollections = () => {
    setIsDeleting(true);
    const list = deleteCollections
      .map((id) => {
        const target = collections.find((collection) => collection.id === id);
        return {
          firebaseId: target.firebaseId,
          publicKeys: target.publicKeys,
        };
      });

    return window.firestoreController.deleteDeviceCollections(list)
      .then(async () => {
        setCollections(collections.filter((collection) => (!deleteCollections.includes(collection.id))));
        setDeleteCollections([]);
        const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
        if (contract_id && public_key_lak) {
          setIsAddingKey(true);

          const methodNames = decodeIfTruthy(searchParams.get('methodNames'));
          const success_url = decodeIfTruthy(searchParams.get('success_url'));
          const oidcToken = window.firestoreController.getUserOidcToken();
          setIsDeleting(false);
          const devicePageCallback = async () => {
            setIsAddingKey(false);
          };
          await onSignIn({
            accessToken:      oidcToken,
            publicKeyFak,
            public_key_lak,
            contract_id,
            methodNames,
            setStatusMessage: () => null,
            success_url,
            searchParams,
            navigate,
            gateway:          success_url,
            devicePageCallback,
          });
        }
      }).catch((err) => {
        setIsDeleting(false);
        captureException(err);
        console.log('Delete Failed', err);
      });
  };

  const deleteCollectionText = useMemo(() => {
    if (isDeleting) return 'Deleting...';
    if (isAddingKey) return 'Signing In...';
    return `Delete key${deleteCollections.length > 1 ? 's' : ''}`;
  }, [deleteCollections.length, isAddingKey, isDeleting]);

  return (
    <StyledContainer inIframe={inIframe()}>

      <DevicesWrapper inIframe={inIframe()}>
        <DevicesWrapperInner>
          <Title>Devices with Keys</Title>

          {isLoading && <div>Loading...</div>}

          {isVerifyEmailRequired ? (
            <>
              <Description>
                You need to verify your email address to use this feature.
              </Description>
              <Button
                type="button"
                onClick={redirectToSignin}
              >
                Redirect
              </Button>
            </>
          ) : (
            <>
              {collections.length > 0 && (
                <Description bold>
                  You have reached maximum number of keys. Please delete some keys to add new keys.
                </Description>
              )}

              {
                collections.map((collection) => (
                  <Row key={collection.id}>
                    <StyledCheckbox type="checkbox" id={collection.id} onChange={() => onClick(collection.id)} checked={deleteCollections.includes(collection.id)} />
                    <label htmlFor={collection.id} title={`Created At: ${collection.createdAt}`}>{collection.label}</label>
                  </Row>
                ))
              }
            </>
          )}
        </DevicesWrapperInner>
        {
          collections.length > 0 && (
            <DevicesBottom>

              <Button type="button" onClick={onDeleteCollections} disabled={!deleteCollections.length || isDeleting}>
                {deleteCollectionText}
              </Button>

            </DevicesBottom>
          )
        }
      </DevicesWrapper>
    </StyledContainer>
  );
}

export default Devices;
