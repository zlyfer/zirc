const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron')
const path = require('path')

function createWindow() {
  win = new BrowserWindow({
    'minHeight': 576,
    'minWidth': 1024,
    width: 1280,
    height: 720,
    frame: false,
    fullscreenable: false,
    icon: path.join(__dirname, './images/logo.png')
  })
  win.on('maximize', () => {
    win.webContents.send('zmaximized');
  });
  win.on('unmaximize', () => {
    win.webContents.send('zunmaximized');
  });
  win.loadFile('index.html')
  win.webContents.openDevTools() // Debug
}

app.on('ready', createWindow)