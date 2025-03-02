import browser from 'webextension-polyfill';

/**
 * Gets Azure credentials from settings object, browser storage, or environment variables
 * @param {Object} settings - Settings object passed directly
 * @returns {Promise<{azureKey: string, azureRegion: string}>}
 */
export async function getAzureCredentials(settings = null) {
  // First try from passed settings object
  if (settings?.azureKey && settings?.azureRegion) {
    return {
      azureKey: settings.azureKey,
      azureRegion: settings.azureRegion
    };
  }

  // Then try from browser storage
  try {
    const { settings: storageSettings } = await browser.storage.local.get('settings');
    if (storageSettings?.azureKey && storageSettings?.azureRegion) {
      return {
        azureKey: storageSettings.azureKey,
        azureRegion: storageSettings.azureRegion
      };
    }
  } catch (error) {
    console.warn('Failed to get credentials from browser storage:', error);
  }

  // Finally fallback to environment variables
  return {
    azureKey: process.env.AZURE_SPEECH_KEY || '',
    azureRegion: process.env.AZURE_REGION || ''
  };
} 