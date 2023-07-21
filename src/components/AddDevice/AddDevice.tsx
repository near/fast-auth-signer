import * as React from 'react';

function AddDevice({ controller }) {
  return (
    <>
      <div>AddDevice route</div>
      <button type="button" onClick={() => controller.addCollection()}>
        Click to add collection
      </button>
    </>
  );
}

export default AddDevice;
