const socket = new WebSocket(
    "ws://" + window.location.host + "/ws/chat/"
);


const usersList = document.getElementById("users-list");
const chatBody = document.getElementById("chat-body");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const chatUsername = document.getElementById("chat-username");
const chatAvatar = document.getElementById("chat-username-avatar");
const themeToggle = document.getElementById("theme-toggle");
const menuToggle = document.getElementById("menu-toggle");
const dropdown = document.getElementById("dropdown");
const clearChatBtn = document.getElementById("clear-chat");
const searchInput = document.getElementById("search-input");

let selectedUser = null;
let currentUser = { id: "me", name: "Me" };

// WebSocket connection (global)
let socket = null;

// Connect to a user (room)
function connectToRoom(user) {
  if (socket) socket.close();

  socket = new WebSocket(
    "ws://" + window.location.host + "/ws/chat/" + user.id + "/"
  );

  socket.onopen = () => {
    console.log("Connected to room:", user.name);
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (selectedUser && data.sender !== currentUser.name) {
      appendMessage("received", data.sender, data.message);
    }
  };

  socket.onclose = () => {
    console.log("Disconnected from room");
  };
}

// Send message
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !selectedUser) return;

  const data = {
    message,
    sender: currentUser.name,
  };

  socket.send(JSON.stringify(data));
  appendMessage("sent", currentUser.name, message);
  chatInput.value = "";
}

// UI Hooks (your existing code with slight edits)

// Load users (from Django DB → rendered in template or via Channels, not fetch)
async function loadUsers() {
  // Example: preload users via Django template context instead of API
  const users = window.chatUsers || []; 
  renderUsers(users);
}
loadUsers();

// Render users in sidebar
function renderUsers(users) {
  usersList.innerHTML = "";
  users.forEach(user => {
    const div = document.createElement("div");
    div.className = "sidebar-user";
    div.dataset.name = user.name.toLowerCase();
    div.innerHTML = `
      <div class="user-icon">${user.name.charAt(0).toUpperCase()}</div>
      <span>${user.name}</span>
    `;
    div.onclick = () => selectUser(user, div);
    usersList.appendChild(div);
  });
}

// Select user and join their room
function selectUser(user, div) {
  selectedUser = user;
  chatUsername.textContent = user.name;
  chatAvatar.textContent = user.name.charAt(0).toUpperCase();
  chatBody.innerHTML = "";

  document.querySelectorAll('.sidebar-user').forEach(el => el.classList.remove('selected'));
  div.classList.add('selected');

  connectToRoom(user);
}

// Append message to chat
function appendMessage(type, sender, message) {
  const div = document.createElement("div");
  div.className = `chat-bubble ${type}`;
  div.innerHTML = `<div class="sender-name">${sender}</div>${message}`;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Keypress + Button
sendBtn.onclick = sendMessage;
chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

// Rest of your theme toggle, dropdown, clear chat, search logic stays SAME


function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !selectedUser) return;

  const data = {
    room: selectedUser.id,
    sender: currentUser.name,
    message
  };

  socket.emit("send_message", data);
  appendMessage("sent", currentUser.name, message);
  chatInput.value = "";
}

// Receive messages from socket
socket.on("receive_message", data => {
  if (selectedUser && data.room === selectedUser.id) {
    appendMessage("received", data.sender, data.message);
  }
});

// Append message to chat
function appendMessage(type, sender, message) {
  const div = document.createElement("div");
  div.className = `chat-bubble ${type}`;
  div.innerHTML = `<div class="sender-name">${sender}</div>${message}`;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Theme toggle
themeToggle.onclick = () => {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");
  const icon = themeToggle.querySelector('i');
  if(document.body.classList.contains('dark-theme')) icon.className = 'fa fa-sun';
  else icon.className = 'fa fa-moon';
};

// Dropdown menu toggle
menuToggle.onclick = () => {
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
};

// Clear chat (stays visible until refresh)
clearChatBtn.onclick = () => {
  chatBody.innerHTML = "";
};

// Search users
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  document.querySelectorAll('.sidebar-user').forEach(user => {
    user.style.display = user.dataset.name.includes(term) ? "flex" : "none";
  });
});
