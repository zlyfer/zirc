const ircClient = require('node-irc');
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
    let client = new ircClient(server, port, username, realname);
    connections[server] = client;
    client.on('CHANMSG', (data) => {
      console.log(server, data);
      newMSG(server, data);
    });
    client.connect();
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
  connections[server].quit("Disconnected from server.");
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
  let content_frame = document.getElementById(`content_frame_server_${server}_`);
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
  if (server_list.children.length == 1) {
    entry.className += " first";
  }
  entry.id = id;
  let showid;
  if (type == 'server') {
    showid = `content_frame_server_${name}_`;
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
      showContentForm(showid);
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
  let content_frame = document.createElement('div');
  let join_channel_form = document.createElement('div');
  let join_channel_server = document.createElement('input');
  let join_channel_channel = document.createElement('input');
  let join_channel_button = document.createElement('input');
  content_frame.className = 'content_frame';
  content_frame.id = `content_frame_server_${server}_`;
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
  content_frame.append(join_channel_form);
  window_frame.append(content_frame);
}

function addChannelFrame(server, channel) {
  let window_frame = document.getElementById('window_frame');
  let content_frame = document.createElement('div');
  let content_chat = document.createElement('select');
  let content_chatbar = document.createElement('input');
  let content_send = document.createElement('input');
  content_frame.className = 'content_frame';
  content_frame.id = `content_frame_server_${server}_channel_${channel}_`;
  content_chat.className = "content_chat";
  content_chat.id = `content_chat_server_${server}_channel_${channel}_`;
  content_chat.multiple = true;
  content_chatbar.className = 'content_chatbar';
  content_chatbar.id = `content_chatbar_server_${server}_channel_${channel}_`;
  content_chatbar.type = 'text';
  content_chatbar.placeholder = `Type here to chat with ${channel}..`;
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
      newMSG(server, {
        receiver: channel,
        sender: connections[server].nickname,
        message: message
      })
    }
  });
  content_frame.append(content_chat);
  content_frame.append(content_chatbar);
  content_frame.append(content_send);
  window_frame.append(content_frame);
}

function newMSG(server, data) {
  let content_chat = document.getElementById(`content_chat_server_${server}_channel_${data.receiver}_`);
  let option = document.createElement('option');
  option.innerHTML = `${data.sender}: ${data.message}`;
  content_chat.append(option);
}

function showContentForm(id) {
  cleanWindowFrame();
  let content_frame = document.getElementById(id);
  content_frame.style.display = 'block';
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