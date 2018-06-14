const {
  ipcRenderer,
  remote
} = require('electron');

window.onload = () => {
  la(true);
  index_init();
  content_init();
  ipcRenderer.send('requestConfig');
  la(false);
};

function index_init() {
  document.getElementById('minimize').addEventListener('click', e => {
    remote.getCurrentWindow().minimize();
  });
  document.getElementById('maximize').addEventListener('click', e => {
    if (!remote.getCurrentWindow().isMaximized()) {
      remote.getCurrentWindow().maximize();
    } else {
      remote.getCurrentWindow().unmaximize();
    }
  });
  document.getElementById('close').addEventListener('click', e => {
    for (let server in connections) {
      connections[server].disconnect("Client closed.");
    }
    saveConfig();
    remote.getCurrentWindow().close();
  });
  ipcRenderer.on('zmaximized', (event) => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/win.svg)';
  });
  ipcRenderer.on('zunmaximized', (event) => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/max.svg)';
  });
}

ipcRenderer.on('setConfig', (event, cfg) => {
  config = cfg;
  for (let key in config.servers) {
    joinServer(config.servers[key].host);
    for (let i = 0; i < config.servers[key].channels.length; i++) {
      joinChannel(config.servers[key].host, config.servers[key].channels[i], false, config.servers[key].username);
    }
    newClient(config.servers[key].host, config.servers[key].port, config.servers[key].username, config.servers[key].realname, config.servers[key].channels);
  }
});

function saveConfig() {
  ipcRenderer.send('saveConfig', config);
};

function la(toggle) {
  let logo = document.getElementById('logo');
  if (toggle) {
    logo.style.backgroundImage = 'url(./images/load.svg)';
  } else {
    logo.style.backgroundImage = 'url(./images/logo.svg)';
  }
}