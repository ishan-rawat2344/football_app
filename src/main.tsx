import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { requestPersistentStorage } from './lib/storage';
import { maintainVideos } from './videos/store';
import './styles/tokens.css';
import './styles/app.css';

// Ask once at startup. Silent on iPhone, never blocks rendering.
void requestPersistentStorage();
// Keep saved videos fresh and delete YouTube data older than 30 days (YouTube's rules).
void maintainVideos();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
