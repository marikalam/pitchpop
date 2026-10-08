import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import EmailHandoff from './EmailHandoff.jsx';
import SoundNotices from './SoundNotices.jsx';
import { keepPortrait } from './orientation.js';
import { playOpeningSound } from './openingSound.js';
// Fonts ship with the app (rather than loading from Google Fonts) so the
// iOS app looks right offline and doesn't contact a third party on launch.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import './App.css';
// Click sound disabled

keepPortrait();
playOpeningSound();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <EmailHandoff />
    <SoundNotices />
  </React.StrictMode>
);
