const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron');
const path = require('path');
const fs = require('fs');
const defaultConfigFile = './default_config.json';
const configFile = './config.json';

try {
  var config = require(configFile);
} catch (err) {
  console.log('Could not load config file. Trying to load default config instead.');
  try {
    var config = require(defaultConfigFile);
  } catch (err) {
    console.log('Could not load default config file either.');
  }
}

function createWindow() {
  win = new BrowserWindow({
    'minHeight': 576,
    'minWidth': 1024,
    width: config.windowWidth,
    height: config.windowHeight,
    frame: false,
    fullscreenable: false,
    icon: path.join(__dirname, './images/logo.png')
  })
  win.loadFile('index.html');
  win.on('maximize', (e) => {
    win.webContents.send('zmaximized');
  });
  win.on('unmaximize', (e) => {
    win.webContents.send('zunmaximized');
  });
  ipcMain.on('close', (e, cfg) => {
    fs.writeFileSync(configFile, JSON.stringify(cfg), 'utf-8');
    app.quit()
  })
  ipcMain.on('requestConfig', (e) => {
    win.webContents.send('setConfig', config);
  });
  ipcMain.on('close', (e, cfg) => {});
  if (config.maximized) {
    win.maximize();
  }
  win.webContents.openDevTools(); // Debug
}

// Doesn't seem to work.
// app.on('window-all-closed', () => {
//   app.quit();
// })

app.on('ready', createWindow)