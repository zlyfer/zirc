const {
  ipcRenderer
} = require('electron');
const remote = require('electron').remote;

window.onload = () => {
  index_init();
  content_init();
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
      connections[server].quit("Client closed.");
    }
    remote.getCurrentWindow().close();
  });
  ipcRenderer.on('zmaximized', () => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/win.svg)';
  });
  ipcRenderer.on('zunmaximized', () => {
    document.getElementById('maximize').style.backgroundImage = 'url(./images/max.svg)';
  });

}

// function la(toggle) {
//   let loading_animation = document.getElementById('loading_animation');
//   if (toggle) {
//     loading_animation.style.display = 'block';
//   } else {
//     loading_animation.style.display = 'none';
//   }
// }