// jshint esversion: 6
const { ipcRenderer, remote, shell } = require("electron");
const irc = require("irc");
const dateformat = require("dateformat");

const userLevels = ["@", "%", "+", ""];
var app;

// Request config from main.js upon window fully loaded:
window.onload = () => {
  ipcRenderer.send("requestConfig");
};

// Init UI, set config and init window upon getting config from main.js:
ipcRenderer.on("setConfig", (event, cfg) => {
  ui_init(cfg);
  window_init();
});

function window_init() {
  // Maximize window if set in config.
  if (app.configValue("Window", "maximized"))
    remote.getCurrentWindow().maximize();

  // Close all irc connections and send config to main.js upon closing zirc:
  $("#close").click(e => {
    Object.keys(app.connections).forEach(c => {
      try {
        app.connections[c].client.disconnect("Client closed.");
      } catch (error) {}
    });
    ipcRenderer.send("close", app.config);
  });
  ipcRenderer.on("got_uMax", e => {
    app.configValue(
      "Window",
      "maximized",
      remote.getCurrentWindow().isMaximized()
    );
  });

  // Open URL in default browser instead of electron window upon clicking a link:
  document.addEventListener("click", function(e) {
    if (e.target.tagName === "A") {
      e.preventDefault();
      if (e.target.href.startsWith("http")) {
        shell.openExternal(e.target.href);
      }
    }
  });

  // Save window size to config upon resize:
  window.onresize = e => {
    if (!remote.getCurrentWindow().isMaximized()) {
      app.config._.width = window.outerWidth;
      app.config._.height = window.outerHeight;
    }
  };
}

// Logic for minimizing and (un-)maximizing the window:
function eMinimize() {
  remote.getCurrentWindow().minimize();
}
function eMaximize() {
  if (!remote.getCurrentWindow().isMaximized()) {
    remote.getCurrentWindow().maximize();
  } else {
    remote.getCurrentWindow().unmaximize();
  }
}

function debugReload() {}
