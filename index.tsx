
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { dataService } from './services/api';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Ya no creamos el servicio aquí, lo importamos del singleton global
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App dataService={dataService} />
  </React.StrictMode>
);
