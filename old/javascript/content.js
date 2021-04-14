const irc = require('irc');
const user_level_list = ['@', '%', '+', ''];
var connections = {};
var lastInputs = [];
var log;
var config;

// TODO: Logging // Done with channels and notices that go to channels. Foreign notices and PMs need to be recovered from log (they are already being saved!).
// TODO: Prevent user from sending a message if a channel is not actually joined yet.
// TODO: Commands: topic, kick, nick, invite, ban, ignore, unignore
// TODO: Settings Page, Topic for channels, Modes for channels
// TODO: Notify user when he disconnects/reconnects + auto-reconnect as optional setting.
// TODO: Events: motd, topic, kick, kill, selfMessage, nick, invite, (+mode & -mode for channel), error, raw
// TODO: Colors: irc.colors.codes, irc.colors.wrap
// TODO: Improve notices destinations.
// TODO: Commands extra: action, ctcp
// TODO: Events extra: action, ctcp, ctcp-notice, ctcp-privmsg, ctcp-version

function content_init() {
  document.getElementById('newserver').addEventListener('click', (e) => {
    showStartForm();
  });
  document.getElementById('connect_connect').addEventListener('click', (e) => {
    doJoinServer();
  });
  let join_server_form_input_list = ['connect_server', 'connect_port', 'connect_username', 'connect_realname'];
  for (let i = 0; i < join_server_form_input_list.length; i++) {
    let element = document.getElementById(join_server_form_input_list[i]);
    element.addEventListener('keydown', (e) => {
      if (e.keyCode == 13) {
        doJoinServer();
      }
    })
  }
}

function gettime() {
  let date = new Date();
  let hours = `-${date.getHours()}-`.replace(/-\d{1}-/g, `0${date.getHours()}`).replace(/-/g, '');
  let minutes = `-${date.getMinutes()}-`.replace(/-\d{1}-/g, `0${date.getMinutes()}`).replace(/-/g, '');
  let seconds = `-${date.getSeconds()}-`.replace(/-\d{1}-/g, `0${date.getSeconds()}`).replace(/-/g, '');
  return `${hours}:${minutes}:${seconds}`
}

function newClient(server, port, username, realname, channels = []) {
  let client = new irc.Client(server, username, {
    userName: username,
    realName: realname,
    port: port,
    channels: channels,
    stripColors: true
  });
  client.addListener('message#', (nick, to, text, message) => {
    newMSG(server, to, nick, text, 'message', false, 'channel', gettime(), false);
  });
  client.addListener('pm', (nick, text, message) => {
    if (!chatJoined(server, nick, 'pm')) {
      startPM(server, nick);
    }
    newMSG(server, nick, nick, text, 'message', false, 'pm', gettime(), false);
  });
  client.addListener('notice', (nick, receiver, text, message) => {
    if (nick == null) {
      nick = 'Server';
    }
    let to = getCurrentChatName(server);
    if (!(to)) {
      to = getLastChannelName(server);
    }
    if (to) {
      newMSG(server, to, `-${nick}-`, text, 'notice', false, 'channel', gettime(), false);
    } else {
      if (!chatJoined(server, 'NOTICE', 'notice')) {
        startNotice(server, 'NOTICE');
      }
      newMSG(server, 'NOTICE', `-${nick}-`, text, 'notice', false, 'notice', gettime(), false);
    }
  });
  client.addListener('names', (channel, nicks) => {
    genUserList(server, channel.toLowerCase(), nicks);
    changeUserName(server, channel.toLowerCase(), connections[server].nick);
  });
  client.addListener('+mode', (channel, by, mode, argument, message) => {
    changeUserLevels(server, channel.toLowerCase());
  });
  client.addListener('-mode', (channel, by, mode, argument, message) => {
    changeUserLevels(server, channel.toLowerCase());
  });
  client.addListener('join', (channel, nick, message) => {
    if (nick != client.nick) {
      addUserToUserList(server, channel.toLowerCase(), nick, client.chans[channel].users[nick]);
      newMSG(server, channel.toLowerCase(), nick, 'has joined the channel.', 'join', false, 'channel', gettime(), false);
    }
  });
  client.addListener('part', (channel, nick, reason, message) => {
    if (nick != client.nick) {
      removeUserFromUserList(server, channel.toLowerCase(), nick);
      newMSG(server, channel.toLowerCase(), nick, 'has left the channel.', 'leave', false, 'channel', gettime(), false);
    }
  });
  client.addListener('quit', (nick, reason, channels, message) => {
    if (nick != client.nick) {
      let rmessage = '';
      for (let i = 0; i < message.args.length; i++) {
        rmessage += `${message.args[i]} `;
      }
      rmessage = rmessage.slice(0, -1);
      for (let i = 0; i < channels.length; i++) {
        removeUserFromUserList(server, channels[i], nick);
        newMSG(server, channels[i], nick, 'has quit.', 'quit', rmessage, 'channel', gettime(), false);
      }
      if (chatJoined(server, nick, 'pm')) {
        newMSG(server, nick, nick, 'has quit.', 'quit', rmessage, 'pm', gettime(), false);
      }
    }
  });
  if (!config.servers[server]) {
    config.servers[server] = {
      host: server,
      port: port,
      username: username,
      realname: realname,
      channels: []
    };
  }
  connections[server] = client;
}

function joinServer(server) {
  cleanWindowFrame();
  addServerListEntry(server, 'server', `server_list_entry_server_${server}_`);
  addServerFrame(server);
  selectLastChat();
}

function leaveServer(server) {
  removeAllChannelFrames(server);
  removeServerFrame(server);
  removeServerListEntry(server, 'server');
  connections[server].disconnect("Disconnected from server.");
  delete connections[server];
}

function joinChannel(server, channel, connectClient = true, nick = false) {
  cleanWindowFrame();
  addServerListEntry(channel, 'channel', `server_list_entry_server_${server}_channel_${channel}_`, server);
  if (connectClient) {
    addChatFrame(server, channel, connections[server].nick, 'channel');
    connections[server].join(channel);
  } else {
    addChatFrame(server, channel, nick, 'channel');
  }
  selectLastChat();
}

function leaveChannel(server, channel) {
  removeServerListEntry(server, 'channel', channel);
  removeChatFrame(server, 'channel', channel);
  connections[server].part(channel);
}

function startPM(server, username) {
  cleanWindowFrame();
  addServerListEntry(username, 'pm', `server_list_entry_server_${server}_pm_${username}_`, server);
  addChatFrame(server, username, connections[server].nick, 'pm');
  selectLastChat();
}

function startNotice(server, name) {
  cleanWindowFrame();
  addServerListEntry(name, 'notice', `server_list_entry_server_${server}_notice_${name}_`, server);
  addChatFrame(server, name, connections[server].nick, 'notice');
  selectLastChat();
}

function endChat(server, type, name) {
  removeServerListEntry(server, type, name);
  removeChatFrame(server, type, name);
}

function getLastChannelName(server) {
  let server_list_entry_server = document.getElementById(`server_list_entry_server_${server}_`);
  if (server_list_entry_server) {
    let children = server_list_entry_server.children;
    for (let i = children.length - 1; i >= 0; i--) {
      let child = children[i];
      if (child) {
        if (child.id.indexOf(`server_list_entry_server_${server}_channel_`) != -1) {
          let name = child.id.replace(`server_list_entry_server_${server}_channel_`, '');
          name = name.substr(0, name.length - 1);
          return name;
        }
      }
    }
    return false;
  } else {
    return false;
  }
}

function getCurrentChatName(server) { // Maybe move 'selected' from Class to ID so it can be easier found.
  let selected_list = document.getElementsByClassName('selected');
  for (let i = 0; i < selected_list.length; i++) {
    let selected = selected_list[i];
    if (selected) {
      if (selected.className.includes('server_list_entry_channel')) {
        let name = selected.id.replace(`server_list_entry_server_${server}_channel_`, '');
        name = name.substr(0, name.length - 1);
        return name;
      }
    }
  }
}

function removeServerListEntry(server, type, name = false) {
  let server_list_entry;
  switch (type) {
    case 'server':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_`);
      break;
    case 'channel':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_channel_${name}_`);
      break;
    case 'pm':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_pm_${name}_`);
      break;
    case 'notice':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_notice_${name}_`);
      break;
  }
  if (server_list_entry) {
    server_list_entry.remove();
  }
}

function removeServerFrame(server) {
  let join_channel_form = document.getElementById(`join_channel_form_server_${server}_`);
  let new_pm_form = document.getElementById(`new_pm_form_server_${server}_`);
  join_channel_form.remove();
  new_pm_form.remove();
}

function removeAllChannelFrames(server) {
  let content_frames = document.getElementsByClassName('content_frame');
  for (let i = 0; i < content_frames.length; i++) {
    let content_frame = content_frames[i];
    if (content_frame.id.indexOf(`content_frame_server_${server}_channel_`) != -1 || content_frame.id.indexOf(`content_frame_server_${server}_pm_`) != -1) {
      content_frame.remove();
    }
  }
}

function removeChatFrame(server, type, name) {
  let content_frame = document.getElementById(`content_frame_server_${server}_${type}_${name}_`);
  content_frame.remove();
}

function addServerListEntry(name, type, id, server = false) {
  let span = document.createElement('span');
  let server_list_entry;
  switch (type) {
    case 'server':
      let server_list = document.getElementById('server_list');
      let entry = document.createElement('div');
      entry.id = `server_list_entry_server_${name}_`;
      span.className = 'server_list_entry server_list_entry_server';
      span.innerHTML = name;
      span.addEventListener('click', (e) => {
        if (e.target.innerHTML == name) {
          cleanWindowFrame();
          deselectServerListEntries();
          span.className += ' selected';
          showElement(`join_channel_form_server_${name}_`);
          showElement(`new_pm_form_server_${name}_`);
        }
      });
      span.addEventListener('contextmenu', (e) => {
        if (e.target.innerHTML == name) {
          leaveServer(name);
          selectLastChat();
        }
      });
      entry.append(span);
      server_list.append(entry);
      break;
    case 'channel':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_`);
      span.id = `server_list_entry_server_${server}_channel_${name}_`;
      span.className = 'server_list_entry server_list_entry_channel';
      span.innerHTML = name;
      span.addEventListener('mouseover', (e) => {
        if (e.target.innerHTML == name) {
          let content_frame = document.getElementById(`content_frame_server_${server}_channel_${name}_`);
          let server_list_entry = getServerListEntryFromOtherId(content_frame, 'content_frame');
          server_list_entry.className = server_list_entry.className.replace(' newmsg', '');
        }
      });
      span.addEventListener('click', (e) => {
        if (e.target.innerHTML == name) {
          cleanWindowFrame();
          deselectServerListEntries();
          span.className += ' selected';
          showElement(`content_frame_server_${server}_channel_${name}_`);
        }
      });
      span.addEventListener('contextmenu', (e) => {
        if (e.target.innerHTML == name) {
          leaveChannel(server, name);
          selectLastChat();
        }
      });
      server_list_entry.append(span);
      break;
    case 'pm':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_`);
      span.id = `server_list_entry_server_${server}_pm_${name}_`;
      span.className = 'server_list_entry server_list_entry_pm';
      span.innerHTML = name;
      span.addEventListener('mouseover', (e) => {
        if (e.target.innerHTML == name) {
          let content_frame = document.getElementById(`content_frame_server_${server}_pm_${name}_`);
          let server_list_entry = getServerListEntryFromOtherId(content_frame, 'content_frame');
          server_list_entry.className = server_list_entry.className.replace(' newmsg', '');
        }
      });
      span.addEventListener('click', (e) => {
        if (e.target.innerHTML == name) {
          cleanWindowFrame();
          deselectServerListEntries();
          span.className += ' selected';
          showElement(`content_frame_server_${server}_pm_${name}_`);
        }
      });
      span.addEventListener('contextmenu', (e) => {
        if (e.target.innerHTML == name) {
          endChat(server, 'pm', name);
          selectLastChat();
        }
      });
      server_list_entry.append(span);
      break;
    case 'notice':
      server_list_entry = document.getElementById(`server_list_entry_server_${server}_`);
      span.id = `server_list_entry_server_${server}_notice_${name}_`;
      span.className = 'server_list_entry server_list_entry_notice';
      span.innerHTML = name;
      span.addEventListener('click', (e) => {
        if (e.target.innerHTML == name) {
          cleanWindowFrame();
          deselectServerListEntries();
          span.className += ' selected';
          showElement(`content_frame_server_${server}_notice_${name}_`);
        }
      });
      span.addEventListener('contextmenu', (e) => {
        if (e.target.innerHTML == name) {
          endChat(server, 'notice', name);
          selectLastChat();
        }
      });
      server_list_entry.append(span);
      break;
  }
}

function addServerFrame(server) {
  let window_frame = document.getElementById('window_frame');
  let join_channel_form = document.createElement('div');
  let join_channel_server = document.createElement('input');
  let join_channel_channel = document.createElement('input');
  let join_channel_button = document.createElement('input');
  join_channel_form.className = 'join_channel_form';
  join_channel_form.id = `join_channel_form_server_${server}_`;
  join_channel_server.className = 'join_channel_server';
  join_channel_server.id = `join_channel_server_server_${server}_`;
  join_channel_server.type = 'text';
  join_channel_server.disabled = true;
  join_channel_server.value = 'Join Channel';
  join_channel_channel.className = 'join_channel_channel';
  join_channel_channel.id = `join_channel_channel_server_${server}_`;
  join_channel_channel.type = 'text';
  join_channel_channel.placeholder = '#channel';
  join_channel_channel.addEventListener('keydown', (e) => {
    if (e.keyCode == 13) {
      if (join_channel_channel.value != '') {
        doJoinChannel(server, join_channel_channel.value.toLowerCase());
        join_channel_channel.value = '';
      }
    }
  });
  join_channel_button.className = 'join_channel_button';
  join_channel_button.id = `join_channel_button_server_${server}_`;
  join_channel_button.type = 'button';
  join_channel_button.value = 'Join Channel';
  join_channel_button.addEventListener('click', (e) => {
    if (join_channel_channel.value != '') {
      doJoinChannel(server, join_channel_channel.value.toLowerCase());
      join_channel_channel.value = '';
    }
  });
  join_channel_form.append(join_channel_server);
  join_channel_form.append(join_channel_channel);
  join_channel_form.append(join_channel_button);
  let new_pm_form = document.createElement('div');
  let new_pm_pm = document.createElement('input');
  let new_pm_user = document.createElement('input');
  let new_pm_open = document.createElement('input');
  new_pm_form.className = 'new_pm_form';
  new_pm_form.id = `new_pm_form_server_${server}_`;
  new_pm_pm.className = 'new_pm_pm';
  new_pm_pm.id = `new_pm_pm_server_${server}_`;
  new_pm_pm.type = 'text';
  new_pm_pm.disabled = true;
  new_pm_pm.value = 'New PM';
  new_pm_user.className = 'new_pm_user';
  new_pm_user.id = `new_pm_user_server_${server}_`;
  new_pm_user.type = 'text';
  new_pm_user.placeholder = 'Username';
  new_pm_user.addEventListener('keydown', (e) => {
    if (e.keyCode == 13) {
      if (new_pm_user.value != '') {
        doStartNewPM(server, new_pm_user.value);
        new_pm_user.value = '';
      }
    }
  });
  new_pm_open.className = 'new_pm_open';
  new_pm_open.id = `new_pm_open_server_${server}_`;
  new_pm_open.type = 'button';
  new_pm_open.value = 'Open Chat';
  new_pm_open.addEventListener('click', (e) => {
    if (new_pm_user.value != '') {
      doStartNewPM(server, new_pm_user.value);
      new_pm_user.value = '';
    }
  });
  new_pm_form.append(new_pm_pm);
  new_pm_form.append(new_pm_user);
  new_pm_form.append(new_pm_open);
  window_frame.append(join_channel_form);
  window_frame.append(new_pm_form);
  join_channel_channel.focus();
}

function doJoinServer() {
  let server = document.getElementById('connect_server').value;
  if (!connections[server]) {
    let port = document.getElementById('connect_port').value;
    let username = document.getElementById('connect_username').value;
    let realname = document.getElementById('connect_realname').value;
    joinServer(server);
    newClient(server, port, username, realname);
    document.getElementById('connect_server').value = '';
    document.getElementById('connect_port').value = '';
    document.getElementById('connect_username').value = '';
    document.getElementById('connect_realname').value = '';
  } else {
    cleanWindowFrame();
    showElement(`join_channel_form_server_${server}_`);
  }
}

function doJoinChannel(server, channel) {
  if (!channelJoined(server, channel)) {
    joinChannel(server, channel);
    if (config.servers[server].channels.indexOf(channel) == -1) {
      config.servers[server].channels.push(channel);
    }
  } else {
    cleanWindowFrame();
    showElement(`content_frame_server_${server}_channel_${channel}_`);
  }
}

function doStartNewPM(server, username) {
  if (!chatJoined(server, username, 'pm')) {
    startPM(server, username);
  } else {
    cleanWindowFrame();
    showElement(`content_frame_server_${server}_pm_${username}_`);
  }
}

function addChatFrame(server, chatName, nick, type) {
  let window_frame = document.getElementById('window_frame');
  let content_frame = document.createElement('div');
  let content_chat = document.createElement('div');
  let content_chatuser = document.createElement('input');
  let content_chatbar = document.createElement('input');
  let content_send = document.createElement('input');
  content_frame.className = `content_frame content_frame_type_${type}_`;
  content_frame.id = `content_frame_server_${server}_${type}_${chatName}_`;
  content_chat.className = `content_chat content_chat_type_${type}`;
  content_chat.id = `content_chat_server_${server}_${type}_${chatName}_`;
  if (type != 'notice') {
    content_chatuser.className = 'content_chatuser';
    content_chatuser.id = `content_chatuser_server_${server}_${type}_${chatName}_`;
    content_chatuser.type = 'text';
    content_chatuser.disabled = true;
    content_chatuser.value = nick;
    content_chatbar.className = `content_chatbar content_chatbar_type_${type}_`;
    content_chatbar.id = `content_chatbar_server_${server}_${type}_${chatName}_`;
    content_chatbar.type = 'text';
    content_chatbar.placeholder = `Chat with ${chatName}..`;
    content_chatbar.addEventListener('keydown', (e) => {
      let content_chatbar = document.getElementById(`content_chatbar_server_${server}_${type}_${chatName}_`);
      switch (e.keyCode) {
        case 13:
          let message = content_chatbar.value;
          addLastInput(message);
          if (message != '') {
            content_chatbar.value = '';
            if (message[0] == '/') {
              newCMD(server, chatName, connections[server].nick, message);
            } else {
              connections[server].say(chatName, message);
              newMSG(server, chatName, connections[server].nick, message, 'message', false, type, gettime(), false);
            }
          }
          break;
        case 38:
          content_chatbar.value = getLastInput(content_chatbar.value);
          break;
        case 40:
          content_chatbar.value = getNextLastInput(content_chatbar.value);
          break;
      }
    });
    content_send.className = `content_send content_send_type_${type}_`;
    content_send.id = `content_send_server_${server}_${type}_${chatName}_`;
    content_send.value = 'Send';
    content_send.type = 'button';
    content_send.addEventListener('click', (e) => {
      let content_chatbar = document.getElementById(`content_chatbar_server_${server}_${type}_${chatName}_`);
      let message = content_chatbar.value;
      if (message != '') {
        content_chatbar.value = '';
        if (message[0] == '/') {
          newCMD(server, chatName, connections[server].nick, message);
        } else {
          connections[server].say(chatName, message);
          newMSG(server, chatName, connections[server].nick, message, 'message', false, type, gettime(), false);
        }
      }
    });
    content_frame.append(content_chatuser);
    content_frame.append(content_chatbar);
    content_frame.append(content_send);
  }
  content_frame.append(content_chat);
  window_frame.append(content_frame);
  content_chatbar.focus();
}

function newMSG(server, receiver, sender, message, mtype, rmessage, ctype, current_time, islog) {
  if (!(islog)) {
    addLog(server, receiver, ctype, sender, mtype, message, current_time);
  }
  let messages = message.match(/.{1,435}/g);
  for (let i = 0; i < messages.length; i++) {
    message = messages[i];
    let content_chat = document.getElementById(`content_chat_server_${server}_${ctype}_${receiver}_`);
    let server_list_entry = getServerListEntryFromOtherId(content_chat, 'content_chat');
    if (i == 0) {
      if (server_list_entry.className.indexOf('hidden') != -1 && !(islog)) {
        server_list_entry.className += ' newmsg';
      }
    }
    let content_chat_message = document.createElement('div');
    let content_chat_message_sender = document.createElement('span');
    let content_chat_message_message = document.createElement('span');
    let content_chat_message_timestamp = document.createElement('span');
    content_chat_message.className = `content_chat_message message_from_${sender}_`;
    if (content_chat.lastChild) {
      if (content_chat.lastChild.className.indexOf(`message_from_${sender}_`) != -1 && content_chat.lastChild.children[1].className.indexOf(`message_type_${mtype}`) != -1) {
        sender = '';
      }
    }
    content_chat_message_sender.className = "content_chat_message_sender";
    content_chat_message_sender.innerHTML = sender;
    content_chat_message_message.className = `content_chat_message_message message_type_${mtype}`;
    let link_regex = /[\s]?(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)[\s]?/ig;
    let protocol_regex = /https?:\/\//ig
    let marker = '!ifyouseethismarkerpleasereportit!';
    let marker_regex = new RegExp(marker, "g");
    let match;
    let links = {};
    while ((match = link_regex.exec(message)) !== null) {
      let cstring = match[0];
      if (!cstring.match(protocol_regex)) {
        if (cstring.startsWith(' ')) {
          cstring = cstring.substr(1, cstring.length);
          cstring = ` https://${cstring}`;
        } else {
          cstring = `https://${cstring}`;
        }
      }
      links[match[0]] = cstring;
    }
    for (let key in links) {
      message = message.replace(key, `${key[0].replace(/[\S]/ig, '')}</span><a href="${links[key].replace(/[\s]/ig, '')}" class="content_chat_message_message_link">${marker}${key.replace(/[\s]/ig, '')}${marker}</a><span>${key[key.length-1].replace(/[\S]/ig, '')}`);
    }
    message = message.replace(marker_regex, '');
    content_chat_message_message.innerHTML = message;
    if (rmessage != false) {
      content_chat_message_message.innerHTML += ` (${rmessage})`;
    }
    content_chat_message_timestamp.className = 'content_chat_message_timestamp';
    content_chat_message_timestamp.innerHTML = current_time;
    content_chat_message.append(content_chat_message_sender);
    content_chat_message.append(content_chat_message_message);
    content_chat_message.append(content_chat_message_timestamp);
    content_chat.append(content_chat_message);
    content_chat_message.scrollIntoView();
  }
}

function newCMD(server, chatName, nick, message) {
  message = message.substr(1, message.length);
  let command = message.split(' ')[0];
  message = message.replace(`${command} `, '');
  let username = message.split(' ')[0];
  message = message.replace(`${username} `, '');
  let currentChat = getCurrentChatName(server);
  switch (command) {
    case 'pm':
      if (command != username) {
        // if (!chatJoined(server, username, 'pm')) {
        //   startPM(server, username);
        // }
        connections[server].say(username, message);
        newMSG(server, currentChat, `&gt;${nick}&lt;`, message, 'message', false, 'channel', gettime(), false);
        // newMSG(server, username, nick, message, 'message', false, 'pm');
      }
      break;
    case 'notice':
      if (command != username) {
        newMSG(server, currentChat, `&gt;${username}&lt;`, message, 'notice', false, 'channel', gettime(), false);
        connections[server].notice(username, message);
      }
      break;
    case 'whois':
      if (command != username) {
        connections[server].whois(username, (whois) => {
          let channels = "";
          for (let i = 0; i < whois.channels.length; i++) {
            channels += ` ${whois.channels[i]}`;
          }
          newMSG(server, currentChat, '[WHOIS]', `${whois.nick} (${whois.user}@${whois.host}): ${whois.realname}`, 'whois', false, 'channel', gettime(), false);
          newMSG(server, currentChat, '[WHOIS]', `${whois.nick} ${whois.server}: ${whois.serverinfo}`, 'whois', false, 'channel', gettime(), false);
          newMSG(server, currentChat, '[WHOIS]', `${whois.nick} joined following channels: ${channels}.`, 'whois', false, 'channel', gettime(), false);
          newMSG(server, currentChat, '[WHOIS]', `${whois.nick} ${whois.accountinfo} ${whois.account}.`, 'whois', false, 'channel', gettime(), false);
        });
      }
      break;
  }
}

function channelJoined(server, channel) {
  if (!connections[server]) {
    return false;
  } else {
    for (let key in connections[server].chans) {
      if (key == channel) {
        return true;
      }
    }
    return false;
  }
}

function chatJoined(server, username, type) {
  if (!connections[server]) {
    return false;
  } else {
    let server_list_entry = document.getElementById(`server_list_entry_server_${server}_${type}_${username}_`);
    if (server_list_entry) {
      return true;
    } else {
      return false;
    }
  }
}

function changeUserLevels(server, channel) {
  let users = connections[server].chans[channel].users;
  for (let key in users) {
    let content_frame_userlist_user = document.getElementById(`content_frame_userlist_user_server_${server}_channel_${channel}_user_${key}_`);
    content_frame_userlist_user.className = content_frame_userlist_user.className.replace(/user_level_[@%+]?_/g, `user_level_${users[key]}_`);
  }
  sortUserList(server, channel);
}

function genUserList(server, channel, nicks) {
  let content_frame_userlist = document.getElementById(`content_frame_userlist_server_${server}_channel_${channel}_`);
  if (content_frame_userlist) {
    content_frame_userlist.remove();
  }
  let content_frame = document.getElementById(`content_frame_server_${server}_channel_${channel}_`);
  content_frame_userlist = document.createElement('div');
  content_frame_userlist.className = 'content_frame_userlist';
  content_frame_userlist.id = `content_frame_userlist_server_${server}_channel_${channel}_`;
  content_frame.append(content_frame_userlist);
  for (let i = 0; i < user_level_list.length; i++) {
    for (let key in nicks) {
      if (nicks[key] == user_level_list[i]) {
        addUserToUserList(server, channel, key, nicks[key], false);
      }
    }
  }
  sortUserList(server, channel);
}

function addUserToUserList(server, channel, name, level, sort = true) {
  let content_frame_userlist = document.getElementById(`content_frame_userlist_server_${server}_channel_${channel}_`);
  let content_frame_userlist_user = document.createElement('span');
  content_frame_userlist_user.className = `content_frame_userlist_user user_level_${level}_`;
  content_frame_userlist_user.id = `content_frame_userlist_user_server_${server}_channel_${channel}_user_${name}_`;
  content_frame_userlist_user.innerHTML = name;
  content_frame_userlist.append(content_frame_userlist_user);
  if (sort) {
    sortUserList(server, channel);
  }
}

function removeUserFromUserList(server, channel, name) {
  let content_frame_userlist_user = document.getElementById(`content_frame_userlist_user_server_${server}_channel_${channel}_user_${name}_`);
  content_frame_userlist_user.remove();
}

function sortUserList(server, channel) {
  let content_frame_userlist = document.getElementById(`content_frame_userlist_server_${server}_channel_${channel}_`);
  let children = content_frame_userlist.children;
  let children_list = [];
  let names_list = [];
  for (let i = content_frame_userlist.children.length - 1; i >= 0; i--) {
    children_list.push(content_frame_userlist.children[i]);
    names_list.push(content_frame_userlist.children[i].id);
    content_frame_userlist.children[i].remove();
  }
  names_list.sort();
  for (let i = 0; i < user_level_list.length; i++) {
    for (let k = 0; k < names_list.length; k++) {
      for (let j = children_list.length - 1; j >= 0; j--) {
        if (children_list[j].className.indexOf(`user_level_${user_level_list[i]}_`) != -1 && children_list[j].id == names_list[k]) {
          content_frame_userlist.append(children_list[j]);
          children_list.splice(j, 1);
        }
      }
    }
  }
}

function showElement(id) {
  let element = document.getElementById(id);
  element.style.display = 'block';
  if (element.className.indexOf('content_frame') != -1) {
    let server_list_entry = getServerListEntryFromOtherId(element, 'content_frame');
    let content_chatbar_id = server_list_entry.id.replace('server_list_entry', 'content_chatbar');
    let content_chatbar = document.getElementById(content_chatbar_id);
    if (content_chatbar) {
      content_chatbar.focus();
    }
    if (server_list_entry.className.indexOf(' hidden') != -1) {
      server_list_entry.className = server_list_entry.className.replace(' hidden', '');
    }
  } else if (element.className.indexOf('join_channel_form') != -1) {
    let join_channel_channel_id = element.id.replace('join_channel_form', 'join_channel_channel');
    let join_channel_channel = document.getElementById(join_channel_channel_id);
    if (join_channel_channel) {
      join_channel_channel.focus();
    }
  }
}

function showStartForm() {
  cleanWindowFrame();
  let connect_form = document.getElementById('connect_form');
  let connect_server = document.getElementById('connect_server');
  connect_form.style.display = 'block';
  connect_server.focus();
}

function cleanWindowFrame() {
  let window_frame = document.getElementById('window_frame');
  for (let i = 0; i < window_frame.children.length; i++) {
    let child = window_frame.children[i];
    child.style.display = 'none';
    if (child.className.indexOf('content_frame') != -1) {
      let server_list_entry = getServerListEntryFromOtherId(child, 'content_frame');
      if (server_list_entry) {
        if (server_list_entry.className.indexOf(' hidden') == -1) {
          server_list_entry.className += ' hidden';
        }
      }
    }
  }
}

function deselectServerListEntries() {
  let server_list = document.getElementById('server_list');
  for (let i = 0; i < server_list.children.length; i++) {
    let child = server_list.children[i];
    for (let j = 0; j < child.children.length; j++) {
      let childchild = child.children[j];
      childchild.className = childchild.className.replace(' selected', '');
    }
  }
}

function changeUserName(server, channel, nick) {
  let content_chatuser = document.getElementById(`content_chatuser_server_${server}_channel_${channel}_`);
  content_chatuser.value = nick;
}

function selectLastChat() {
  deselectServerListEntries();
  cleanWindowFrame();
  let server_list = document.getElementById('server_list');
  let lastChild = server_list.lastChild;
  if (lastChild) {
    lastChild.lastChild.className += ' selected';
    if (lastChild.children.length == 1) {
      showElement(lastChild.id.replace('server_list_entry', 'join_channel_form'));
      showElement(lastChild.id.replace('server_list_entry', 'new_pm_form'));
    } else {
      showElement(lastChild.lastChild.id.replace('server_list_entry', 'content_frame'));
    }
  } else {
    showStartForm();
  }
}

function getServerListEntryFromOtherId(element, id) {
  let server_list_entry_id = element.id.replace(id, 'server_list_entry');
  let server_list_entry = document.getElementById(server_list_entry_id);
  return server_list_entry;
}

function addLastInput(input) {
  lastInputs.push(input);
  let fIndex = lastInputs.indexOf(input);
  let lIndex = lastInputs.lastIndexOf(input);
  if (fIndex != -1 && lIndex != -1 && fIndex != lIndex) {
    lastInputs.splice(fIndex, 1);
  }
  if (lastInputs.length > config.inputHistory) {
    lastInputs = lastInputs.slice(1);
  }
}

function getLastInput(input) {
  if (input != '') {
    let index = lastInputs.indexOf(input);
    if (index == -1 || index == 0) {
      return input;
    } else {
      return lastInputs[index - 1];
    }
  } else {
    if (lastInputs.length > 0) {
      return lastInputs[lastInputs.length - 1];
    } else {
      return input;
    }
  }
}

function getNextLastInput(input) {
  if (input != '') {
    let index = lastInputs.indexOf(input);
    if (index == -1 || index == lastInputs.length - 1) {
      return input;
    } else {
      return lastInputs[index + 1];
    }
  } else {
    return input;
  }
}

function userInChannel(channel) {
  return true;
}