const irc = require('irc');
var connections = {};

function content_init() {

  document.getElementById('newserver').addEventListener('click', (e) => {
    showConnectForm();
  });

  document.getElementById('connect_connect').addEventListener('click', (e) => {
    let server = document.getElementById('connect_server').value;
    let port = document.getElementById('connect_port').value;
    let username = document.getElementById('connect_username').value;
    let realname = document.getElementById('connect_realname').value;
    let client = new irc.Client(server, username, {
      userName: username,
      realName: realname,
      port: port
    })
    client.addListener('message', (nick, to, text, message) => {
      newMSG(server, to, nick, text);
    })
    client.addListener('names', (channel, nicks) => {
      genUserList(server, channel, nicks);
    })
    connections[server] = client;
    joinServer(server);
    document.getElementById('connect_server').value = '';
    document.getElementById('connect_port').value = '';
    document.getElementById('connect_username').value = '';
    document.getElementById('connect_realname').value = '';
  });
}

function joinServer(server) {
  cleanWindowFrame();
  addServerListEntry(server, 'server', `server_list_entry_server_${server}_`);
  addServerFrame(server);
}

function leaveServer(server) {
  removeAllChannelFrames(server);
  removeServerFrame(server);
  removeServerListEntry(server, 'server');
  connections[server].disconnect("Disconnected from server.");
  delete connections[server];
}

function joinChannel(server, channel) {
  cleanWindowFrame();
  addServerListEntry(channel, 'channel', `server_list_entry_server_${server}_channel_${channel}_`, server);
  addChannelFrame(server, channel);
  connections[server].join(channel);
}

function leaveChannel(server, channel) {
  removeServerListEntry(server, 'channel', channel);
  removeChannelFrame(server, channel);
  connections[server].part(channel);
}

function removeServerListEntry(name, type, channel = false) {
  let server_list_entry;
  if (type == 'server') {
    server_list_entry = document.getElementById(`server_list_entry_server_${name}_`);
  } else if (type == 'channel') {
    server_list_entry = document.getElementById(`server_list_entry_server_${name}_channel_${channel}_`);
  }
  server_list_entry.remove();
}

function removeServerFrame(server) {
  let content_frame = document.getElementById(`join_channel_form_server_${server}_`);
  content_frame.remove();
}

function removeAllChannelFrames(server) {
  let content_frames = document.getElementsByClassName('content_frame');
  for (let i = 0; i < content_frames.length; i++) {
    let content_frame = content_frames[i];
    if (content_frame.id.indexOf(`content_frame_server_${server}_channel_`) != -1) {
      content_frame.remove();
    }
  }
}

function removeChannelFrame(server, channel) {
  let content_frame = document.getElementById(`content_frame_server_${server}_channel_${channel}_`);
  content_frame.remove();
}

function addServerListEntry(name, type, id, server = false) {
  let entry = document.createElement('div');
  let entry_name = document.createElement('span');
  entry.className = `entry ${type}`;
  if (server_list.children.length == 0) {
    entry.className += " first";
  }
  entry.id = id;
  let showid;
  if (type == 'server') {
    showid = `join_channel_form_server_${name}_`;
    entry.addEventListener('contextmenu', (e) => {
      if (e.target.innerHTML == name) {
        leaveServer(name);
      }
    });
  } else if (type == 'channel') {
    showid = `content_frame_server_${server}_channel_${name}_`;
    entry.addEventListener('contextmenu', (e) => {
      if (e.target.innerHTML == name) {
        leaveChannel(server, name);
      }
    });
  }
  entry.addEventListener('click', (e) => {
    if (e.target.innerHTML == name) {
      showElement(showid);
    }
  });
  entry_name.className = 'name';
  entry_name.innerHTML = name;
  entry.append(entry_name);
  if (server) {
    let server_list_entry = document.getElementById(`server_list_entry_server_${server}_`);
    server_list_entry.append(entry);
  } else {
    let server_list = document.getElementById('server_list');
    server_list.append(entry);
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
  join_channel_server.value = `Server: ${server}`;
  join_channel_channel.className = 'join_channel_channel';
  join_channel_channel.id = `join_channel_channel_server_${server}_`;
  join_channel_channel.type = 'text';
  join_channel_channel.placeholder = '#channel';
  join_channel_button.className = 'join_channel_button';
  join_channel_button.id = `join_channel_button_server_${server}_`;
  join_channel_button.type = 'button';
  join_channel_button.value = 'Join Channel';
  join_channel_button.addEventListener('click', (e) => {
    let channel_name = document.getElementById(`join_channel_channel_server_${server}_`).value;
    join_channel_channel.value = '';
    joinChannel(server, channel_name);
  });
  join_channel_form.append(join_channel_server);
  join_channel_form.append(join_channel_channel);
  join_channel_form.append(join_channel_button);
  window_frame.append(join_channel_form);
}

function addChannelFrame(server, channel) {
  let window_frame = document.getElementById('window_frame');
  let content_frame = document.createElement('div');
  let content_chat = document.createElement('div');
  let content_chatuser = document.createElement('input');
  let content_chatbar = document.createElement('input');
  let content_send = document.createElement('input');
  content_frame.className = 'content_frame';
  content_frame.id = `content_frame_server_${server}_channel_${channel}_`;
  content_chat.className = "content_chat";
  content_chat.id = `content_chat_server_${server}_channel_${channel}_`;
  content_chatuser.className = 'content_chatuser';
  content_chatuser.id = `content_chatuser_server_${server}_channel_${channel}_`;
  content_chatuser.type = 'text';
  content_chatuser.disabled = true;
  content_chatuser.value = connections[server].nick;
  content_chatbar.className = 'content_chatbar';
  content_chatbar.id = `content_chatbar_server_${server}_channel_${channel}_`;
  content_chatbar.type = 'text';
  content_chatbar.placeholder = `Chat with ${channel}..`;
  content_send.className = 'content_send';
  content_send.id = `content_send_server_${server}_channel_${channel}_`;
  content_send.value = 'Send';
  content_send.type = 'button';
  content_send.addEventListener('click', (e) => {
    let content_chatbar = document.getElementById(`content_chatbar_server_${server}_channel_${channel}_`);
    let message = content_chatbar.value;
    if (message != '') {
      content_chatbar.value = '';
      connections[server].say(channel, message);
      newMSG(server, channel, connections[server].nick, message);
    }
  });
  content_frame.append(content_chat);
  content_frame.append(content_chatuser);
  content_frame.append(content_chatbar);
  content_frame.append(content_send);
  window_frame.append(content_frame);
}

function newMSG(server, channel, sender, message) {
  let content_chat = document.getElementById(`content_chat_server_${server}_channel_${channel}_`);
  let content_chat_message = document.createElement('div');
  let content_chat_message_sender = document.createElement('span');
  let content_chat_message_message = document.createElement('span');
  let content_chat_message_timestamp = document.createElement('span');
  let date = new Date();
  content_chat_message.className = "content_chat_message";
  content_chat_message_sender.className = "content_chat_message_sender";
  content_chat_message_sender.innerHTML = sender;
  content_chat_message_message.className = "content_chat_message_message";
  content_chat_message_message.innerHTML = message;
  content_chat_message_timestamp.className = "content_chat_message_timestamp";
  content_chat_message_timestamp.innerHTML = `${date.getHours()}:${date.getMinutes()}`;
  content_chat_message.append(content_chat_message_sender);
  content_chat_message.append(content_chat_message_message);
  content_chat_message.append(content_chat_message_timestamp);
  content_chat.append(content_chat_message);
}

function genUserList(server, channel, nicks) {
  let content_frame = document.getElementById(`content_frame_server_${server}_channel_${channel}_`);
  let content_frame_userlist = document.createElement('div');
  content_frame_userlist.className = 'content_frame_userlist';
  content_frame_userlist.id = `content_frame_userlist_server_${server}_channel_${channel}_`;
  for (let key in nicks) {
    let content_frame_userlist_user = document.createElement('span');
    content_frame_userlist_user.className = `content_frame_userlist_user user_level_${nicks[key]}`;
    content_frame_userlist_user.id = `content_frame_userlist_user_server_${server}_channel_${channel}_user_${key}_`;
    content_frame_userlist_user.innerHTML = key;
    content_frame_userlist.append(content_frame_userlist_user);
  }
  content_frame.append(content_frame_userlist);
}

function showElement(id) {
  cleanWindowFrame();
  let element = document.getElementById(id);
  element.style.display = 'block';
}

function showConnectForm() {
  cleanWindowFrame();
  let connect_form = document.getElementById('connect_form');
  connect_form.style.display = 'block';
}

function cleanWindowFrame() {
  let window_frame = document.getElementById('window_frame');
  for (let i = 0; i < window_frame.children.length; i++) {
    let child = window_frame.children[i];
    child.style.display = 'none';
  }
}