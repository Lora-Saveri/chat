const socket = new WebSocket(
    "ws://" + window.location.host + "/ws/chat/"
);


// static/etalks.js (WebSocket + UI logic)
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
let socket = null;
const currentUser = window.currentUser || { id: null, name: "Me" }; // set in template
const chatUsers = window.chatUsers || []; // list of {id, name, unread_count, last_message_text, last_message_at}

// --- Render sidebar users (with unread badge) ---
function renderUsers(users) {
  usersList.innerHTML = "";
  users.forEach(user => {
    const div = document.createElement("div");
    div.className = "sidebar-user";
    div.dataset.name = user.name.toLowerCase();
    div.dataset.userid = user.id;
    div.innerHTML = `
      <div class="user-icon">${user.name.charAt(0).toUpperCase()}</div>
      <div class="user-meta">
        <span class="user-name">${user.name}</span>
        <span class="last-message">${user.last_message_text || ''}</span>
      </div>
      <div class="unread-badge" style="display:${user.unread_count ? 'inline-block':'none'}">${user.unread_count || ''}</div>
    `;
    div.onclick = () => selectUser(user, div);
    usersList.appendChild(div);
  });
}

renderUsers(chatUsers);

// --- Select user and open WS room ---
function selectUser(user, div) {
  selectedUser = user;
  chatUsername.textContent = user.name;
  chatAvatar.textContent = user.name.charAt(0).toUpperCase();
  chatBody.innerHTML = "";

  document.querySelectorAll('.sidebar-user').forEach(el => el.classList.remove('selected'));
  div.classList.add('selected');

  // Move selected user to top (recent on top behavior)
  usersList.prepend(div);

  connectToRoom(user.id);
  // reset unread badge in UI (will be reset server-side on read receipt)
  const badge = div.querySelector('.unread-badge');
  if (badge) badge.style.display = 'none';
}

// --- Connect WebSocket for conversation (conversation_id expected to be numeric id) ---
function connectToRoom(conversationId) {
  // close previous socket if any
  if (socket) {
    try { socket.close(); } catch(e) {}
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${window.location.host}/ws/chat/${conversationId}/`);

  socket.onopen = () => {
    console.log("WS connected to conversation", conversationId);
    // Optionally fetch last messages via rendered HTML or separate fetch
  };

  socket.onmessage = (e) => {
    const payload = JSON.parse(e.data);
    if (payload.type === "chat.message") {
      const data = payload.data;
      const isOwn = data.sender_id === currentUser.id;
      // if message belongs to currently opened conversation show in chat
      appendMessage(isOwn ? "sent" : "received", data.sender_name, data.text);
      // Move conversation to top in sidebar
      reorderSidebarConversation(conversationId, data);
    } else if (payload.type === "webrtc") {
      console.log("WebRTC signal:", payload.data);
      // handle: offer/answer/ice in your call UI
    } else if (payload.type === "read.receipt") {
      // update unread badges if needed
      console.log("Read receipt:", payload.data);
    } else if (payload.type === "presence") {
      // presence (joined/left)
      // console.log(payload.data);
    }
  };

  socket.onclose = (e) => {
    console.log("WS closed", e.reason);
    // optionally try reconnect after delay
  };

  socket.onerror = (err) => {
    console.error("WS error", err);
  };
}

// --- Send message (optimistic UI) ---
function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || !selectedUser || !socket || socket.readyState !== WebSocket.OPEN) return;

  const tempId = `t-${Date.now()}`;
  const payload = {
    type: "chat.message",
    text: message,
    temp_id: tempId
  };

  // optimistic UI
  appendMessage("sent", currentUser.name, message);
  socket.send(JSON.stringify(payload));
  chatInput.value = "";
}

// --- Append message to chat body ---
function appendMessage(type, sender, message) {
  const div = document.createElement("div");
  div.className = `chat-bubble ${type}`;
  div.innerHTML = `<div class="sender-name">${sender}</div><div class="message-text">${message}</div>`;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// --- Move sidebar conversation to top and update last-message text/unread ---
function reorderSidebarConversation(conversationId, messageData) {
  const node = document.querySelector(`.sidebar-user[data-userid="${conversationId}"]`);
  if (node) {
    // update last message preview
    const lastMsgEl = node.querySelector('.last-message');
    if (lastMsgEl) lastMsgEl.textContent = messageData.text || '';
    // move to top
    usersList.prepend(node);
    // increment badge if not current conversation
    if (!selectedUser || String(selectedUser.id) !== String(conversationId)) {
      const badge = node.querySelector('.unread-badge');
      let count = parseInt(badge.textContent || "0") || 0;
      count += 1;
      badge.textContent = count;
      badge.style.display = 'inline-block';
    }
  }
}

// --- UI hooks ---
sendBtn.onclick = sendMessage;
chatInput.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

themeToggle.onclick = () => {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");
  const icon = themeToggle.querySelector('i');
  if(document.body.classList.contains('dark-theme')) icon.className = 'fa fa-sun';
  else icon.className = 'fa fa-moon';
};

menuToggle.onclick = () => { dropdown.style.display = dropdown.style.display === "block" ? "none" : "block"; };
clearChatBtn.onclick = () => { chatBody.innerHTML = ""; };

searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  document.querySelectorAll('.sidebar-user').forEach(user => {
    user.style.display = user.dataset.name.includes(term) ? "flex" : "none";
  });
});
