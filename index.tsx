import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HybridDataService } from './services/HybridDataService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Configuración de la URL de la API
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://10.1.0.250:8080';

// Inyección de Dependencias
const dataService = new HybridDataService(API_URL);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App dataService={dataService} />
  </React.StrictMode>
);
