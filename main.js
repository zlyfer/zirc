const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron');
const path = require('path');
const fs = require('fs');
const configFile = './config/config.json';
const defaultConfigFile = './config/default_config.json';
var config = require(defaultConfigFile);

if (fs.existsSync(configFile)) {
  var config = require(configFile);
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
  // win.webContents.openDevTools(); // Debug
}

app.on('ready', createWindow)