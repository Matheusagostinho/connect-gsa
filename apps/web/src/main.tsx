import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { applyStoredThemeEagerly } from './lib/theme.js';
import { registrarServiceWorker } from './lib/serviceworker.js';
import './styles/tokens.css';

// Antes do primeiro quadro: sem isto, quem escolheu o tema escuro leva um
// clarão branco a cada carregamento.
applyStoredThemeEagerly();

const container = document.getElementById('root');
if (!container) throw new Error('elemento #root não encontrado no index.html');

// Depois de montar, não antes: o registro do worker não pode competir com o
// primeiro desenho da tela.
registrarServiceWorker();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
