import { useState, useEffect } from 'react';
import { storage } from 'wxt/storage';
import { Settings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial settings
    const init = async () => {
      const stored = await storage.getItem<Settings>('local:settings');
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...stored });
      }
      setLoading(false);
    };

    init();

    // Watch for changes
    const unwatch = storage.watch<Settings>('local:settings', (newSettings) => {
      if (newSettings) {
        setSettings(newSettings);
      }
    });

    return () => unwatch();
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await storage.setItem('local:settings', updated);
  };

  return { settings, updateSettings, loading };
}
