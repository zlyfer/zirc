const irc = require('irc');
const user_level_list = ['@', '%', '+', ''];
var connections = {};
var config;

// TODO: Settings Page, Commands
// TODO: Actions: notice, whois
// TODO: Events: motd, topic, kick, kill, selfMessage, nick, invite, (+mode & -mode for channel), whois, action, error, raw
// TODO: Actions extra: action, ctcp
// TODO: Events extra: ctcp, ctcp-notice, ctcp-privmsg, ctcp-version
// TOOD: Colors: irc.colors.codes, irc.colors.wrap

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
    element.addEventListener('keyup', (e) => {
      if (e.keyCode == 13) {
        doJoinServer();
      }
    })
  }
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
    newMSG(server, to, nick, text, 'message', false, 'channel');
  });
  client.addListener('pm', (nick, text, message) => {
    if (!pmJoined(server, nick)) {
      startPM(server, nick);
    }
    newMSG(server, nick, nick, text, 'message', false, 'pm');
  });
  client.addListener('notice', (nick, to, text, message) => {
    if (nick == null) {
      nick = '*';
    }
    to = getLastChannelName(server);
    if (to) {
      newMSG(server, to, nick, text, 'notice', false, 'channel');
    } else {
      if (!pmJoined(server, nick)) {
        startPM(server, nick);
      }
      newMSG(server, nick, nick, text, 'notice', false, 'pm');
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
      newMSG(server, channel.toLowerCase(), nick, 'has joined the channel.', 'join', false, 'channel');
    }
  });
  client.addListener('part', (channel, nick, reason, message) => {
    if (nick != client.nick) {
      removeUserFromUserList(server, channel.toLowerCase(), nick);
      newMSG(server, channel.toLowerCase(), nick, 'has left the channel.', 'leave', false, 'channel');
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
        newMSG(server, channels[i], nick, 'has quit.', 'quit', rmessage, 'channel');
      }
      if (pmJoined(server, nick)) {
        newMSG(server, nick, nick, 'has quit.', 'quit', rmessage, 'pm');
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
  removeChannelFrame(server, channel);
  connections[server].part(channel);
}

function startPM(server, username) {
  cleanWindowFrame();
  addServerListEntry(username, 'pm', `server_list_entry_server_${server}_pm_${username}_`, server);
  addChatFrame(server, username, connections[server].nick, 'pm');
  selectLastChat();
}

function endPM(server, username) {
  removeServerListEntry(server, 'pm', username);
  removePMFrame(server, username);
}

function getLastChannelName(server) {
  let server_list_entry_server = document.getElementById(`server_list_entry_server_${server}_`);
  if (server_list_entry_server) {
    let children = server_list_entry_server.children;
    console.log(children);
    for (let i = children.length - 1; i >= 0; i--) {
      console.log(children[i]);
      let child = children[i];
      if (child) {
        if (child.id.indexOf(`server_list_entry_server_${server}_channel_`) != -1) {
          let id = child.id.replace(`server_list_entry_server_${server}_channel_`, '');
          id = id.substr(0, id.length - 1);
          return id;
        }
      }
    }
    return false;
  } else {
    return false;
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

function removeChannelFrame(server, channel) {
  let content_frame = document.getElementById(`content_frame_server_${server}_channel_${channel}_`);
  content_frame.remove();
}

function removePMFrame(server, username) {
  let content_frame = document.getElementById(`content_frame_server_${server}_pm_${username}_`);
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
          endPM(server, name);
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
  join_channel_channel.addEventListener('keyup', (e) => {
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
  new_pm_user.addEventListener('keyup', (e) => {
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
  if (!pmJoined(server, username)) {
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
  content_chatuser.className = 'content_chatuser';
  content_chatuser.id = `content_chatuser_server_${server}_${type}_${chatName}_`;
  content_chatuser.type = 'text';
  content_chatuser.disabled = true;
  content_chatuser.value = nick;
  content_chatbar.className = `content_chatbar content_chatbar_type_${type}_`;
  content_chatbar.id = `content_chatbar_server_${server}_${type}_${chatName}_`;
  content_chatbar.type = 'text';
  content_chatbar.placeholder = `Chat with ${chatName}..`;
  content_chatbar.addEventListener('keyup', (e) => {
    if (e.keyCode == 13) {
      let content_chatbar = document.getElementById(`content_chatbar_server_${server}_${type}_${chatName}_`);
      let message = content_chatbar.value;
      if (message != '') {
        content_chatbar.value = '';
        connections[server].say(chatName, message);
        newMSG(server, chatName, connections[server].nick, message, 'message', false, type);
      }
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
      connections[server].say(chatName, message);
      newMSG(server, chatName, connections[server].nick, message, 'message', false, type);
    }
  });
  content_frame.append(content_chat);
  content_frame.append(content_chatuser);
  content_frame.append(content_chatbar);
  content_frame.append(content_send);
  window_frame.append(content_frame);
  content_chatbar.focus();
}

function newMSG(server, receiver, sender, message, mtype, rmessage, ctype) {
  let messages = message.match(/.{1,435}/g);
  for (let i = 0; i < messages.length; i++) {
    message = messages[i];
    let content_chat = document.getElementById(`content_chat_server_${server}_${ctype}_${receiver}_`);
    let server_list_entry = getServerListEntryFromOtherId(content_chat, 'content_chat');
    if (i == 0) {
      if (server_list_entry.className.indexOf('hidden') != -1) {
        server_list_entry.className += ' newmsg';
      }
    }
    let content_chat_message = document.createElement('div');
    let content_chat_message_sender = document.createElement('span');
    let content_chat_message_message = document.createElement('span');
    let content_chat_message_timestamp = document.createElement('span');
    let date = new Date();
    let hours = `-${date.getHours()}-`.replace(/-\d{1}-/g, `0${date.getHours()}`).replace(/-/g, '');
    let minutes = `-${date.getMinutes()}-`.replace(/-\d{1}-/g, `0${date.getMinutes()}`).replace(/-/g, '');
    content_chat_message.className = `content_chat_message message_from_${sender}_`;
    if (content_chat.lastChild) {
      if (content_chat.lastChild.className.indexOf(`message_from_${sender}_`) != -1 && content_chat.lastChild.children[1].className.indexOf(`message_type_${mtype}`) != -1) {
        sender = '';
      }
    }
    content_chat_message_sender.className = "content_chat_message_sender";
    content_chat_message_sender.innerHTML = sender;
    content_chat_message_message.className = `content_chat_message_message message_type_${mtype}`;
    // let link_regex = /[\s]?https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)[\s]?/ig;
    let link_regex = /[\s]?(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)[\s]?/ig;
    let marker = '!ifyouseethismarkerpleasereportit!';
    let marker_regex = new RegExp(marker, "g");
    let match;
    let links = [];
    while ((match = link_regex.exec(message)) !== null) {
      links.push(match[0]);
    }
    for (let i = 0; i < links.length; i++) {
      message = message.replace(links[i], `${links[i][0].replace(/[\S]/ig, '')}</span><a href="${links[i].replace(/[\s]/ig, '')}" class="content_chat_message_message_link">${marker}${links[i].replace(/[\s]/ig, '')}${marker}</a><span>${links[i][links[i].length-1].replace(/[\S]/ig, '')}`);
    }
    message = message.replace(marker_regex, '');
    content_chat_message_message.innerHTML = message;
    if (rmessage != false) {
      content_chat_message_message.innerHTML += ` (${rmessage})`;
    }
    content_chat_message_timestamp.className = 'content_chat_message_timestamp';
    content_chat_message_timestamp.innerHTML = `${hours}:${minutes}`;
    content_chat_message.append(content_chat_message_sender);
    content_chat_message.append(content_chat_message_message);
    content_chat_message.append(content_chat_message_timestamp);
    content_chat.append(content_chat_message);
    content_chat_message.scrollIntoView();
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

function pmJoined(server, username) {
  if (!connections[server]) {
    return false;
  } else {
    let server_list_entry = document.getElementById(`server_list_entry_server_${server}_pm_${username}_`);
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