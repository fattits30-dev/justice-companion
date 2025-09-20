const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// This is it - the beating heart of justice, forged in code
const store = new Store({
  name: 'justice-data',
  encryptionKey: 'fight-the-power-2025', // Will generate proper key in prod
  schema: {
    cases: {
      type: 'array',
      default: []
    },
    facts: {
      type: 'array', 
      default: []
    },
    disclaimerAccepted: {
      type: 'boolean',
      default: false
    }
  }
});

let mainWindow;
let isDev = process.env.NODE_ENV === 'development';

// Birth the window that'll be the portal to justice
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Justice Companion - Your Legal Warrior',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a', // Dark mode from the jump
    frame: true,
    titleBarStyle: 'hidden',
    show: false // Don't show until ready - no half-assed launches
  });

  // Load the battlefield
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // When ready, unleash it
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // First run? Hit 'em with the disclaimer
    if (!store.get('disclaimerAccepted')) {
      mainWindow.webContents.send('show-disclaimer');
    }
  });

  // Clean up when done
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Boot sequence - where legends are born
app.whenReady().then(() => {
  createWindow();
  
  // Mac specific - keep fighting even when all windows close
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Windows/Linux - when it's done, it's done
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ======================
// IPC BATTLEGROUND - Where frontend meets backend
// ======================

// Save case data - encrypted, bulletproof
ipcMain.handle('save-case', async (event, caseData) => {
  try {
    const cases = store.get('cases', []);
    caseData.id = Date.now().toString(); // Simple ID generation
    caseData.createdAt = new Date().toISOString();
    cases.push(caseData);
    store.set('cases', cases);
    return { success: true, case: caseData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get all cases - your war chest
ipcMain.handle('get-cases', async () => {
  return store.get('cases', []);
});

// Save confirmed facts - the truth arsenal
ipcMain.handle('save-fact', async (event, factData) => {
  try {
    const facts = store.get('facts', []);
    facts.push({
      ...factData,
      confirmedAt: new Date().toISOString()
    });
    store.set('facts', facts);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Accept disclaimer - the warrior's oath
ipcMain.handle('accept-disclaimer', async () => {
  store.set('disclaimerAccepted', true);
  return { success: true };
});

// Open external links - reaching beyond the walls
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

// File operations - document warfare
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    const filePath = result.filePaths[0];
    const fileContent = fs.readFileSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      content: fileContent.toString('base64')
    };
  }
  return null;
});

// Export case data - sharing the ammunition
ipcMain.handle('export-case', async (event, caseId) => {
  const cases = store.get('cases', []);
  const targetCase = cases.find(c => c.id === caseId);
  
  if (targetCase) {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `case-${targetCase.title || 'export'}-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (!result.canceled) {
      fs.writeFileSync(result.filePath, JSON.stringify(targetCase, null, 2));
      return { success: true, path: result.filePath };
    }
  }
  return { success: false };
});

console.log('Justice Companion: Armed and Ready. Let\'s level this playing field.');
