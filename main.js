// jshint esversion: 6

// TODO: Remove
//  { "host": "irc.gamesurge.net", "port": "6667", "realname": "Frederik Shull", "username": "zirc", "channels": ["#zirc", "#hfe"] }

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const configFile = "./config.json";

try {
  var config = require(configFile);
} catch (err) {
  console.log(
    "Could not load configuration file. Using default configuration."
  );
  config = {};
}

function createWindow() {
  win = new BrowserWindow({
    minHeight: 576,
    minWidth: 1024,
    height: config._.height,
    width: config._.width,
    frame: false,
    fullscreenable: false,
    icon: path.join(__dirname, "./images/logo.png")
  });
  win.loadFile("index.html");
  win.on("maximize", e => {
    win.webContents.send("got_uMax");
  });
  win.on("unmaximize", e => {
    win.webContents.send("got_uMax");
  });
  ipcMain.on("close", (e, data) => {
    fs.writeFileSync(configFile, JSON.stringify(data), "utf-8");
    app.quit();
  });
  ipcMain.on("requestConfig", e => {
    win.webContents.send("setConfig", config);
  });
  ipcMain.on("resize", (e, data) => {
    win.setSize(data.w, data.h);
  });
  win.webContents.openDevTools(); // Debug
}

app.on("ready", createWindow);
