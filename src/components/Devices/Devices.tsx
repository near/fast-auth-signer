import React, { useEffect, useState } from 'react';
import { styled } from 'styled-components';

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

function Devices({ controller }) {
  const [collections, setCollections] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeleted, setisDeleted] = useState(false);
  const [deleteCollections, setDeleteCollections] = useState([]);

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
      const deviceCollections = await controller.listCollections();
      setIsLoaded(false);
      setCollections(deviceCollections);
    };
    // TODO: rewrite this, currently userUid change does not proppergate to this component
    const interval = setInterval(() => {
      if (controller.userUid) {
        getCollection();
        clearInterval(interval);
      }
    }, 500);
  }, []);

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
    console.log('list', list);

    return controller.deleteCollections(deleteCollections)
      .then(() => {
        setisDeleted(false);
        setCollections(collections.filter((collection) => (!deleteCollections.includes(collection.id))));
        setDeleteCollections([]);
        console.log('Delete Success');
      }).catch((err) => {
        setisDeleted(false);
        console.log('Delete Failed', err);
      });
  };
  console.log('collections', collections);
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
    </>
  );
}

export default Devices;
