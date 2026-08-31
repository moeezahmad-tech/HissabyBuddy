import { useEffect, useState } from 'react';

// Render free tier sleeps after 15 minutes of inactivity.
// Pinging every 10 minutes ensures Render stays continuously awake.
const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const useServerKeepAlive = () => {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isServerReady, setIsServerReady] = useState(true);

  const pingServer = async (isInitial = false) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    // Skip Render wake-up banner during local development
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isInitial) {
      // If server doesn't respond within 2.5s, it is likely spinning up from Render cold sleep
      timeoutId = setTimeout(() => {
        setIsWakingUp(true);
        setIsServerReady(false);
      }, 2500);
    }

    try {
      const res = await fetch(`${apiUrl}/api/ping`, { credentials: 'omit' });
      if (res.ok) {
        if (timeoutId) clearTimeout(timeoutId);
        if (isWakingUp) {
          setIsWakingUp(false);
          setIsServerReady(true);
        }
      }
    } catch {
      // Ignore network failures during retry
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    // 1. Initial wake-up ping as soon as Vercel page loads
    pingServer(true);

    // 2. Periodic 10-minute heartbeat
    const interval = setInterval(() => {
      pingServer(false);
    }, KEEP_ALIVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return { isWakingUp, isServerReady };
};

export default useServerKeepAlive;
