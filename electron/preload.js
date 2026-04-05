const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // You can expose functions to the renderer process here if needed in the future
});
