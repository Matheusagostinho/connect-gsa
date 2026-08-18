import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/tokens.css';

const container = document.getElementById('root');
if (!container) throw new Error('elemento #root não encontrado no index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
