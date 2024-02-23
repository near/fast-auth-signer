import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function RemoveTrailingSlash({ ...rest }) {
  const location = useLocation();

  // If the last character of the url is '/'
  if (location.pathname.match('/.*/$')) {
    return (
      <Navigate
        replace
        {...rest}
        to={{
          pathname: location.pathname.replace(/\/+$/, ''),
          search:   location.search
        }}
      />
    );
  } return null;
}

export default RemoveTrailingSlash;
