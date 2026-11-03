import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import { AppProvider } from './state.jsx';
import { Overlay } from './ui.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
      <Overlay />
    </AppProvider>
  </React.StrictMode>
);
