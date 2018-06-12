const {
  app,
  BrowserWindow
} = require('electron')
const path = require('path')

function createWindow() {
  win = new BrowserWindow({
    'minHeight': 576,
    'minWidth': 1024,
    width: 1280,
    height: 720,
    frame: false,
    // icon: path.join(__dirname, './images/logo.png')
  })
  win.loadFile('index.html')
  //win.webContents.openDevTools() // Debug
}

app.on('ready', createWindow)