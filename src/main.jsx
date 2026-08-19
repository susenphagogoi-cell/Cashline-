import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      const v = localStorage.getItem(key);
      return v !== null ? { key, value: v, shared: false } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    delete: async (key) => {
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    list: async (prefix) => {
      const keys = Object.keys(localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
