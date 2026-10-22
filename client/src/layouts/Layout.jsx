import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Root application layout providing global navigation,
 * accessible main landmark, and footer shell.
 */
export function Layout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main id="main-content" className="main-content" tabIndex="-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
