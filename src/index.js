import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize the React app
const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />);

// Enable hot module replacement in development
if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(<NextApp />);
  });
}
