import { io } from "socket.io-client";

/**
 * Lazily create the socket so this module is safe to import in SSR/RSC contexts.
 * `autoConnect: false` means the socket won't attempt a connection until
 * `.connect()` is called explicitly — we do that inside the Canvas useEffect,
 * after the component mounts in the browser.
 *
 * Transports: omitted intentionally so Socket.IO uses its default upgrade path:
 *   HTTP long-polling → WebSocket
 * This is required on Railway (and most cloud proxies) because raw WebSocket
 * connections are only accepted after the initial HTTP handshake succeeds.
 * Locking to ["websocket"] skips that handshake and causes immediate failures.
 */
const URL = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!URL) {
    // Surface a clear error at boot rather than a cryptic WebSocket failure
    console.error(
        "[socket] NEXT_PUBLIC_BACKEND_URL is not set. " +
        "Add it to your Vercel environment variables and redeploy."
    );
}

export const socket = io(URL ?? "", {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});
