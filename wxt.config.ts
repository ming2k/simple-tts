import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: [
      'storage',
      'contextMenus',
      'notifications',
      'activeTab',
      'scripting'
    ],
    action: {
      default_title: '__MSG_extName__',
    },
    host_permissions: ['<all_urls>'],
  },
});
