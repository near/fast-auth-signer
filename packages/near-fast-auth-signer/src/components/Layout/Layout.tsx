import * as React from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <div>
        <ul>
          <li>
            <Link data-test-id="layout-link-home" to="/">Home</Link>
          </li>
          <li>
            <Link data-test-id="layout-link-add-device" to="/add-device">Add Device</Link>
          </li>
          <li>
            <Link data-test-id="layout-link-create-account" to="/create-account">Create Account</Link>
          </li>
          <li>
            <Link data-test-id="layout-link-sign" to="/sign">Sign</Link>
          </li>
        </ul>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
