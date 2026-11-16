/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Local development only. On the phone the key is entered in Settings. */
  readonly VITE_YOUTUBE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Navigator {
  /** iOS Safari: true when the app was launched from the home screen. */
  readonly standalone?: boolean;
}
