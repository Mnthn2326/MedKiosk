import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export function useHealthCheck() {
  const [health, setHealth] = useState({
    frontend: true,
    backend: false,
    database: false,
    loading: true,
    error: null,
    raw: null,
  });

  const checkHealth = useCallback(async () => {
    try {
      const data = await api.get('/health');
      setHealth({
        frontend: true,
        backend: true,
        database: data.database === 'connected',
        loading: false,
        error: null,
        raw: data,
      });
    } catch (error) {
      setHealth({
        frontend: true,
        backend: false,
        database: false,
        loading: false,
        error: error.message,
        raw: null,
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { ...health, refetch: checkHealth };
}

export default useHealthCheck;
