/**
 * main.jsx — React Application Entry Point
 *
 * Mounts the React app to the DOM.
 * This is the first file that runs in the renderer process.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);