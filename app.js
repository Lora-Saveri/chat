const socket = io("http://localhost:3001");

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

// Load users from backend API
async function loadUsers() {
  const res = await fetch("http://localhost:3001/api/users");
  const users = await res.json();
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

// Select user and join room
function selectUser(user, div) {
  selectedUser = user;
  chatUsername.textContent = user.name;
  chatAvatar.textContent = user.name.charAt(0).toUpperCase();
  chatBody.innerHTML = "";
  
  // Highlight selected user
  document.querySelectorAll('.sidebar-user').forEach(el => el.classList.remove('selected'));
  div.classList.add('selected');

  socket.emit("join_room", user.id);
}

// Send message
sendBtn.onclick = sendMessage;
chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

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
function appendMessage(type, sender, message, messageId = null) {
  const div = document.createElement("div");
  div.className = `chat-bubble ${type}`;

  if(type === "sent") {
    div.innerHTML = `<div class="sender-name">${sender}</div>
                     <span class="message-text">${message}</span>
                     <span class="edit-btn">Edit</span>`;
    
    const editBtn = div.querySelector(".edit-btn");
    const messageText = div.querySelector(".message-text");

    editBtn.onclick = () => {
      const newMessage = prompt("Edit your message:", messageText.textContent);
      if(newMessage !== null && newMessage.trim() !== "") {
        messageText.textContent = newMessage;
        
        // Update the server if needed
        const data = {
          room: selectedUser.id,
          sender: currentUser.name,
          message: newMessage,
          edited: true
        };
        socket.emit("send_message", data);
      }
    };
  } else {
    div.innerHTML = `<div class="sender-name">${sender}</div>
                     <span class="message-text">${message}</span>`;
  }

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
