import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase';

// Fix for iframe environments (like AI Studio preview) where modals might be blocked
if (window.self !== window.top) {
  window.confirm = (message?: string) => {
    console.log(`[Confirm bypassed in iframe]: ${message}`);
    return true; 
  };
  window.alert = (message?: any) => {
    console.log(`[Alert bypassed in iframe]: ${message}`);
  };
}

testConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
