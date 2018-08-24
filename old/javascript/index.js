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
  ipcRenderer.send('requestLog');
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
    ipcRenderer.send('updateLog', log);
    ipcRenderer.send('close', config);
    // remote.getCurrentWindow().close(); // As mentioned in main.js, doesn't seem  to work to close the whole app, when built.
  });
  ipcRenderer.on('zmaximized', (e) => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/win.svg)';
    config.maximized = true;
  });
  ipcRenderer.on('zunmaximized', (e) => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/max.svg)';
    config.maximized = false;
  });
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      if (e.target.href.startsWith('http')) {
        shell.openExternal(e.target.href);
      }
    }
  })
}

// newMSG(server, to, nick, text, 'message', false, 'channel');
ipcRenderer.on('setLog', (event, lg) => {
  log = lg;
  for (let server in log) {
    if (server in connections) {
      for (let receiver in log[server]) {
        if (log[server][receiver]['rtype'] == 'channel') { //test
          if (chatJoined(server, receiver, log[server][receiver]['rtype'])) {
            log[server][receiver]['messages'].forEach(msgobj => {
              newMSG(
                server,
                receiver,
                msgobj['sender'],
                msgobj['message'],
                msgobj['mtype'],
                false,
                log[server][receiver]['rtype'],
                msgobj['time'],
                true
              );
            });
          }
        } //test
      }
    }
  }
});

ipcRenderer.on('setConfig', (event, cfg) => {
  config = cfg;
  if (config.autojoin) {
    for (let key in config.servers) {
      if (!connections[config.servers[key].host]) {
        joinServer(config.servers[key].host);
        for (let i = 0; i < config.servers[key].channels.length; i++) {
          joinChannel(
            config.servers[key].host,
            config.servers[key].channels[i].toLowerCase(),
            false,
            config.servers[key].username
          );
        }
        let channels = config.servers[key].channels;
        let lower_channels = [];
        for (let i = 0; i < channels.length; i++) {
          lower_channels.push(channels[i].toLowerCase());
        }
        newClient(
          config.servers[key].host,
          config.servers[key].port,
          config.servers[key].username,
          config.servers[key].realname,
          lower_channels);
      }
    }
    selectLastChat();
  }
  la(false);
});

function addLog(server, receiver, rtype, sender, mtype, message, time) {
  if (!(server in log)) {
    log[server] = {};
  }
  if (!(receiver in log[server])) {
    log[server][receiver] = {};
    log[server][receiver]['rtype'] = rtype;
    log[server][receiver]['messages'] = [];
  }
  log[server][receiver]['messages'].push({
    'sender': sender,
    'mtype': mtype,
    'message': message,
    'time': time
  });
  ipcRenderer.send('updateLog', log);
}

function la(toggle) {
  let logo = document.getElementById('logo');
  if (toggle) {
    logo.style.backgroundImage = 'url(./images/load.svg)';
  } else {
    logo.style.backgroundImage = 'url(./images/logo.svg)';
  }
}