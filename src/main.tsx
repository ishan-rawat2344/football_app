import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { requestPersistentStorage } from './lib/storage';
import './styles/tokens.css';
import './styles/app.css';

// Ask once at startup. Silent on iPhone, never blocks rendering.
void requestPersistentStorage();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
