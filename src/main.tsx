import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';




const suppressGoogleMapsErrors = (msg) => {
  if (typeof msg === 'string' && (
    msg.includes('Google Maps') || 
    msg.includes('Maps Demo Key') ||
    msg.includes('ApiProjectMapError') ||
    msg.includes('InvalidKeyMapError') ||
    msg.includes('Script error.') ||
    msg.includes('google-translate') ||
    msg.includes('Translate')
  )) {
    return true;
  }
  return false;
};

const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && suppressGoogleMapsErrors(args[0])) return;
  if (args[0] && args[0].message && suppressGoogleMapsErrors(args[0].message)) return;
  originalError.apply(console, args);
};

window.addEventListener('error', (event) => {
  if (event.message && suppressGoogleMapsErrors(event.message)) {
    event.preventDefault(); // Prevent crash overlay
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && suppressGoogleMapsErrors(event.reason.message)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}, true);

// Suppress React error overlay in dev mode
window.addEventListener('vite:ws:disconnect', (event) => {
  event.preventDefault();
});

const originalWindowError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (typeof message === 'string' && suppressGoogleMapsErrors(message)) {
    return true; // suppresses the error
  }
  if (originalWindowError) {
    return originalWindowError(message, source, lineno, colno, error);
  }
  return false;
};

import './index.css';
createRoot(document.getElementById('root')!).render(
  
    <App />
  ,
);