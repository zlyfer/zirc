const {
  ipcRenderer,
  remote,
  shell
} = require('electron');

window.onload = () => {
  la(true);
  index_init();
  content_init();
  ipcRenderer.send('requestConfig');
  la(false);
};

window.onresize = (e) => {
  config.windowWidth = window.outerWidth;
  config.windowHeight = window.outerHeight;
}

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
    config.maximized = true;
  });
  ipcRenderer.on('zunmaximized', (event) => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/max.svg)';
    config.maximized = false;
  });
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.href.startsWith('http')) {
      e.preventDefault();
      shell.openExternal(e.target.href);
    }
  })
}

ipcRenderer.on('setConfig', (event, cfg) => {
  config = cfg;
  if (config.autojoin) {
    for (let key in config.servers) {
      if (!connections[config.servers[key].host]) {
        joinServer(config.servers[key].host);
        for (let i = 0; i < config.servers[key].channels.length; i++) {
          joinChannel(config.servers[key].host, config.servers[key].channels[i].toLowerCase(), false, config.servers[key].username);
        }
        let channels = config.servers[key].channels;
        let lower_channels = [];
        for (let i = 0; i < channels.length; i++) {
          lower_channels.push(channels[i].toLowerCase());
        }
        newClient(config.servers[key].host, config.servers[key].port, config.servers[key].username, config.servers[key].realname, lower_channels);
      }
    }
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