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
  win.on('maximize', () => {
    win.webContents.send('zmaximized');
  });
  win.on('unmaximize', () => {
    win.webContents.send('zunmaximized');
  });
  ipcMain.on('requestConfig', (event) => {
    win.webContents.send('setConfig', config);
  });
  ipcMain.on('saveConfig', (event, cfg) => {
    fs.writeFileSync(configFile, JSON.stringify(cfg), 'utf-8');
  });
  if (config.maximized) {
    win.maximize();
  }
  win.webContents.openDevTools(); // Debug
}

app.on('ready', createWindow)