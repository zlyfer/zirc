// jshint esversion: 6

function irc_init(vapp) {
  vapp.config.Servers.entries.forEach(server => {
    joinServer(vapp, server);
  });
}

function getTime(time = false) {
  if (!time) time = new Date();
  return dateformat(
    time,
    `${app.config.Appearance.settings.timeformat.value ? "HH" : "hh"}:MM:ss`
  );
}

function joinServer(vapp, server) {
  let ircC = new irc.Client(server.host, server.username, {
    userName: server.username,
    realName: server.realname,
    port: server.port,
    autoConnect: server.autoconnect,
    channels: []
  });
  ircC.on("error", e => {
    console.log(e);
  });
  ircC.on("raw", message => {
    console.log(message);
  });
  ircC.on("registered", e => {
    server.channels.forEach(c => {
      joinChannel(ircC, c);
    });
    vapp.changeState("busy", server.host, false);
  });
  ircC.on("join", (channel, nick, message) => {
    addMessage(server.host, channel, "joined", nick, "joined the channel.");
  });
  ircC.on("message", (nick, to, text, message) => {
    addMessage(server.host, to, "message", nick, text);
  });
  ircC.on("selfMessage", (to, text) => {
    addMessage(server.host, to, "message", server.username, text);
  });
  vapp.connections[server.host] = {
    alias: server.name,
    client: ircC,
    logs: {}
  };
  vapp.changeState("busy", server.host, true);
  vapp.$forceUpdate();
}

function joinChannel(ircC, channel) {
  ircC.join(channel);
}

function addMessage(server, channel, type, user, message) {
  if (app.connections[server].logs[channel] === undefined)
    app.connections[server].logs[channel] = [];
  app.connections[server].logs[channel].push({
    author: user,
    text: message,
    time: new Date().getTime(),
    type
  });
  app.changeState("news", `${channel}@${server}`, true);
  app.$forceUpdate();
}
