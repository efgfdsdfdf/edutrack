// --- Elements ---
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const newChatBtn = document.getElementById("new-chat-btn");
const micBtn = document.getElementById("mic-btn");
const loadingIndicator = document.getElementById("loading-indicator");

const uploadToggle = document.getElementById("uploadToggle");
const uploadMenu = document.getElementById("uploadMenu");
const cameraOption = document.getElementById("cameraOption");
const photoOption = document.getElementById("photoOption");
const fileOption = document.getElementById("fileOption");
const photoInput = document.getElementById("photoInput");
const fileInput = document.getElementById("fileInput");
const cameraStream = document.getElementById("cameraStream");
const photoCanvas = document.getElementById("photoCanvas");

const sidebar = document.getElementById("sidebar");
const toggleSidebar = document.getElementById("toggleSidebar");
const savedChatsContainer = document.getElementById("savedChatsContainer");

// Debug banner ID used to show quick runtime diagnostics when troubleshooting
const DEBUG_BANNER_ID = 'bb-debug-banner';

// --- User Info & Chat Memory ---
// Prefer `currentUser` key used by main app; fall back to legacy `username`.
const username = localStorage.getItem('currentUser') || localStorage.getItem('username') || 'User';
let chatHistory = JSON.parse(localStorage.getItem(`chatHistory_${username}`) || "[]");
let chatSessions = JSON.parse(localStorage.getItem(`chatSessions_${username}`) || "[]");
// currentSessionId tracks the active session stored in chatSessions (object with id/title/messages)
let currentSessionId = null;

// Normalize older-style sessions (arrays) to objects {id,title,messages}
function normalizeSessions() {
  chatSessions = (chatSessions || []).map(s => {
    if (Array.isArray(s)) {
      const firstUser = s.find(m => m.role === 'user');
      const title = firstUser ? (firstUser.text || '').slice(0,60) : ('Chat ' + new Date().toLocaleString());
      return { id: String(Date.now()) + Math.random().toString(36).slice(2,6), title, messages: s };
    }
    // already an object
    return s;
  });
  localStorage.setItem(`chatSessions_${username}`, JSON.stringify(chatSessions));
}

// Delete a saved session by id
function deleteSessionById(id) {
  if (!id) return;
  const idx = chatSessions.findIndex(s => String(s.id) === String(id));
  if (idx < 0) return;
  chatSessions.splice(idx, 1);
  localStorage.setItem(`chatSessions_${username}`, JSON.stringify(chatSessions));
  // if the deleted session was currently open, clear the chat window
  if (String(currentSessionId) === String(id)) {
    chatWindow.innerHTML = '';
    chatHistory = [];
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));
    currentSessionId = null;
    addMessage('ai', `🧠 Chat deleted. Start a new chat or open another saved chat.`);
  }
  renderSavedChats();
  try { showToast('Saved chat deleted'); } catch (e) { /* ignore */ }
}

// --- Helper: Render saved chat sessions under toggle ---
function renderSavedChats() {
  savedChatsContainer.innerHTML = "";
  if (!chatSessions || chatSessions.length === 0) {
    savedChatsContainer.innerHTML = "<p style='padding:12px;color:var(--muted-weak,#98a0b3)'>No saved chats</p>";
    return;
  }

  // Render each session as a card-like button with moderate spacing (ChatGPT-like)
  chatSessions.forEach((sessionObj, index) => {
    const session = sessionObj.messages || sessionObj; // legacy fallback
    const title = sessionObj.title || (session && session.length ? ((session.find(m=>m.role==='ai')?.text||session.find(m=>m.role==='user')?.text||'Untitled').slice(0,60)) : 'Untitled');

    const card = document.createElement('div');
    card.className = 'saved-chat-card';
    card.style.padding = '10px';
    card.style.margin = '8px';
    card.style.borderRadius = '8px';
    card.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
    card.style.cursor = 'pointer';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '6px';

    const h = document.createElement('div');
    h.textContent = title;
    h.style.fontWeight = '600';
    h.style.color = 'var(--muted-strong, #e6eef8)';
    h.style.fontSize = '13px';

    const meta = document.createElement('div');
    meta.textContent = `${(session && session.length) || 0} messages · ${new Date(Number(sessionObj.id) || Date.now()).toLocaleString()}`;
    meta.style.fontSize = '12px';
    meta.style.color = 'var(--muted-weak,#98a0b3)';

    card.appendChild(h);
    card.appendChild(meta);

    // delete button
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.title = 'Delete this chat';
    del.style.alignSelf = 'flex-end';
    del.style.padding = '6px 8px';
    del.style.borderRadius = '8px';
    del.style.border = 'none';
    del.style.background = 'transparent';
    del.style.color = '#ff9b9b';
    del.style.cursor = 'pointer';
    del.style.fontSize = '12px';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this saved chat?')) return;
      const id = sessionObj.id || null;
      if (!id) return;
      deleteSessionById(id);
    });
    card.appendChild(del);

    card.addEventListener('click', () => {
      // open this session
      chatWindow.innerHTML = '';
      chatHistory = (sessionObj.messages && Array.isArray(sessionObj.messages)) ? sessionObj.messages.slice() : (Array.isArray(sessionObj) ? sessionObj.slice() : (session || []).slice());
      chatHistory.forEach(msg => addMessage(msg.role, msg.text, msg.type));
      // set as current session
      currentSessionId = sessionObj.id || null;
    });

    savedChatsContainer.appendChild(card);
  });
}

// --- Small toast helper (non-blocking notifications) ---
function showToast(msg, opts = {}) {
  try {
    const id = 'bb-toast';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.right = '16px';
      el.style.bottom = '16px';
      el.style.zIndex = 999999;
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.gap = '8px';
      document.body.appendChild(el);
    }

    const node = document.createElement('div');
    node.textContent = msg;
    node.style.background = opts.error ? 'rgba(255,60,60,0.92)' : 'rgba(0,0,0,0.72)';
    node.style.color = '#fff';
    node.style.padding = '8px 12px';
    node.style.borderRadius = '8px';
    node.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
    node.style.fontSize = '13px';
    node.style.maxWidth = '320px';
    node.style.opacity = '0';
    node.style.transition = 'opacity 220ms ease, transform 220ms ease';
    node.style.transform = 'translateY(6px)';
    el.appendChild(node);
    // trigger entrance
    requestAnimationFrame(() => { node.style.opacity = '1'; node.style.transform = 'translateY(0)'; });

    const dismiss = opts.duration || 3000;
    setTimeout(() => {
      node.style.opacity = '0'; node.style.transform = 'translateY(6px)';
      setTimeout(() => { try { node.remove(); } catch (e) {} }, 260);
    }, dismiss);
  } catch (e) { console.warn('toast error', e); }
}

// --- Add message to chat ---
function addMessage(role, text, type = "text") {
  const msg = document.createElement("div");
  msg.classList.add("message", role);

  if (type === "image") {
    msg.innerHTML = `<p>${text}</p>`;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  if (role === "user") {
    msg.innerHTML = `<p>${text}</p>`;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  // AI typing animation
  msg.innerHTML = `<p></p>`;
  chatWindow.appendChild(msg);
  const p = msg.querySelector("p");
  let i = 0;

  function typeChar() {
    if (i < text.length) {
      p.textContent += text.charAt(i);
      i++;
      chatWindow.scrollTop = chatWindow.scrollHeight;
      setTimeout(typeChar, 25);
    }
  }

  setTimeout(typeChar, 700); // slight pause before typing
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- Initial Load ---
window.addEventListener("DOMContentLoaded", () => {
  try { normalizeSessions(); } catch (e) { /* ignore */ }
  if (chatHistory.length === 0) {
    addMessage("ai", `👋 Hey ${username}, I’m Black — your smart study assistant. How can I help today?`);
  } else {
    chatHistory.forEach(msg => addMessage(msg.role, msg.text, msg.type));
  }
  renderSavedChats();
  // Insert AI sidebar search UI into the sidebar header so it is inside the toggled area
  try { insertAISidebarSearch(); } catch (e) { /* ignore if insertion fails */ }

  // create a small debug banner so the user can see whether this JS executed
  try {
    createDebugBanner();
    updateDebugBanner('blackbot.js loaded');
  } catch (e) {
    console.warn('debug banner creation failed', e);
  }

  // Insert a compact toggle button labelled 'Ask AI Note' inside the sidebar header
  try {
    const sbHeader = (sidebar && sidebar.querySelector('.sidebar-header')) || sidebar;
    if (sbHeader && !document.getElementById('ask-ai-note-btn')) {
      const askBtn = document.createElement('button');
      askBtn.id = 'ask-ai-note-btn';
      askBtn.textContent = 'Ask AI Note';
      askBtn.style.marginLeft = '8px';
      askBtn.style.padding = '6px 8px';
      askBtn.style.borderRadius = '8px';
      askBtn.style.border = 'none';
      askBtn.style.cursor = 'pointer';
      askBtn.className = 'ask-ai-note-btn';
      askBtn.setAttribute('aria-expanded', 'false');
      askBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Ensure aiSidebarSearch exists and is hidden by default
        try { if (!document.getElementById('aiSidebarSearch')) insertAISidebarSearch(); } catch (err) { /* ignore */ }
        const aiSearch = document.getElementById('aiSidebarSearch');
        if (!aiSearch) return;

        // If sidebar is collapsed on desktop, expand it; on mobile toggle .show
        if (window.innerWidth <= 700) {
          sidebar.classList.toggle('show');
        } else {
          if (sidebar.classList.contains('collapsed')) sidebar.classList.remove('collapsed');
        }

        // Toggle the AI search container visibility (acts like a toggle inside the sidebar)
        const isHidden = (aiSearch.style.display === 'none' || getComputedStyle(aiSearch).display === 'none');
        aiSearch.style.display = isHidden ? '' : 'none';
        askBtn.setAttribute('aria-expanded', String(isHidden));
        // focus the search input when shown
        if (isHidden) {
          const input = document.getElementById('aiSidebarSearchInput');
          try { input && input.focus(); } catch (err) {}
        }
      });

      // insert near the New Chat button if present, otherwise prepend to header
      if (newChatBtn && newChatBtn.parentNode) newChatBtn.parentNode.insertBefore(askBtn, newChatBtn.nextSibling);
      else sbHeader.insertBefore(askBtn, sbHeader.firstChild);
    }
  } catch (e) { /* ignore UI insertion errors */ }
});

// --- Handle Chat Submission ---
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = (userInput.value || '').trim();
  if (!message) return;

  // Immediately show and persist the user's message so Save Chat works even offline
  addMessage("user", message);
  userInput.value = "";
  try {
    chatHistory.push({ role: "user", text: message });
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));
  } catch (e) { /* ignore storage errors */ }

  try {
    if (loadingIndicator) loadingIndicator.style.display = "block";

    // ensure we are logged in (server expects a cookie JWT).
    await ensureLoggedIn();

    const res = await fetch("/api/ask", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      // try to extract server-provided message
      let text = await res.text().catch(() => "Server error");
      try { const parsed = JSON.parse(text); if (parsed && parsed.reply) text = parsed.reply; } catch (e) {}
      throw new Error(text || "Server error");
    }

    const data = await res.json();
    const reply = data.reply || data.text || "⚠️ No reply from AI.";

    addMessage("ai", reply);
    chatHistory.push({ role: "ai", text: reply });
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));

    // Auto-save/update session: create or update a session object with an AI-picked title
    try { await autoSaveSession(reply); } catch (e) { console.warn('autoSaveSession failed', e); }
    renderSavedChats();
  } catch (err) {
    // Store a helpful error reply locally so the conversation is preserved
    const errMsg = '⚠️ Connection error — AI unavailable.' + (err && err.message ? (' (' + err.message + ')') : '');
    addMessage("ai", errMsg);
    try {
      chatHistory.push({ role: 'ai', text: errMsg });
      localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));
      renderSavedChats();
    } catch (e) { /* ignore */ }
    try { showToast('AI request failed — reply saved locally', { error: true }); } catch (e) { /* ignore */ }
    console.error(err);
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
});

// --- Ensure logged in (acquire cookie from /api/login if needed) ---
async function ensureLoggedIn() {
  try {
    // try to fetch current user with credentials; server will return 401 if no cookie
    const check = await fetch('/api/user', { credentials: 'include' });
    if (check.ok) return; // already authenticated

    // if not authenticated, try to create a session using a stored username
    const stored = localStorage.getItem('username') || localStorage.getItem('currentUser') || 'student';
    await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: stored })
    });
    // ignore response; server sets cookie
  } catch (err) {
    console.warn('ensureLoggedIn failed', err);
  }
}

// Insert a search box and topics list into the AI sidebar below the New Chat button
function insertAISidebarSearch() {
  if (!sidebar) return;
  console.log('insertAISidebarSearch running');
  const header = sidebar.querySelector('.sidebar-header') || sidebar;
  // avoid duplicate
  if (header.querySelector('#aiSidebarSearch')) {
    console.log('aiSidebarSearch already present');
    return;
  }

  // container with clearer, high-contrast styling so it is visible on dark themes
  const container = document.createElement('div');
  container.id = 'aiSidebarSearch';
  container.className = 'ai-sidebar-search';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '8px';

  const label = document.createElement('div');
  label.textContent = 'Topics';
  label.style.fontSize = '13px';
  label.style.fontWeight = '600';
  label.style.color = 'var(--muted-strong, #e6eef8)';

  // Add 'New Topic' button so users can create topics directly from AI sidebar
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ New';
  addBtn.title = 'Create new topic';
  addBtn.style.marginLeft = '8px';
  addBtn.style.padding = '4px 8px';
  addBtn.style.fontSize = '12px';
  addBtn.style.borderRadius = '8px';
  addBtn.style.border = 'none';
  addBtn.style.cursor = 'pointer';
  addBtn.className = 'ai-add-topic-btn';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search topics...';
  input.id = 'aiSidebarSearchInput';
  input.className = 'ai-sidebar-search-input';

  const list = document.createElement('ul');
  list.id = 'aiTopicList';
  list.className = 'ai-topic-list';
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  list.style.maxHeight = '220px';
  list.style.overflow = 'auto';

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.alignItems = 'center';
  headerRow.appendChild(label);
  headerRow.appendChild(addBtn);
  container.appendChild(headerRow);
  container.appendChild(input);
  container.appendChild(list);

  // --- topic helpers: save/delete in localStorage notes array ---
  function saveTopicObj(topic) {
    // Prefer per-user notes storage and fall back to legacy 'notes'
    const current = localStorage.getItem('currentUser') || localStorage.getItem('username');
    if (current) {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (!users[current]) users[current] = { password:'', notes:[], timetable:[], gpa:[], profile:{}, notifications:[] };
      if (!Array.isArray(users[current].notes)) users[current].notes = [];
      const idx = users[current].notes.findIndex(n => String(n.id) === String(topic.id));
      if (idx >= 0) users[current].notes[idx] = topic; else users[current].notes.unshift(topic);
      localStorage.setItem('users', JSON.stringify(users));
    } else {
      const store = JSON.parse(localStorage.getItem('notes') || '[]');
      const idx = store.findIndex(n => String(n.id) === String(topic.id));
      if (idx >= 0) store[idx] = topic; else store.unshift(topic);
      localStorage.setItem('notes', JSON.stringify(store));
    }
    // re-render both sides
    renderTopics(input.value);
    try { showToast('Topic saved: ' + (topic.title || 'Untitled')); } catch (e) { /* ignore */ }
  }

  function deleteTopicById(id) {
    const current = localStorage.getItem('currentUser') || localStorage.getItem('username');
    if (current) {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (users[current] && Array.isArray(users[current].notes)) {
        users[current].notes = users[current].notes.filter(n => String(n.id) !== String(id));
        localStorage.setItem('users', JSON.stringify(users));
      }
    } else {
      let store = JSON.parse(localStorage.getItem('notes') || '[]');
      store = store.filter(n => String(n.id) !== String(id));
      localStorage.setItem('notes', JSON.stringify(store));
    }
    renderTopics(input.value);
  }

  addBtn.addEventListener('click', () => {
    const newNote = { id: String(Date.now()), title: 'New Topic', content: '' };
    saveTopicObj(newNote);
    // focus input so user can rename
    input.value = '';
    setTimeout(() => renderTopics(''), 50);
  });

  // Insert the search container inside the sidebar header so it is part
  // of the area controlled by the toggle button (ensures it shows/hides)
  try {
    const target = sidebar.querySelector('.sidebar-header') || sidebar;
    target.appendChild(container);
  } catch (err) {
    // final fallback
    header.appendChild(container);
  }

  // accessibility and visual cue: allow focusing and flash briefly so it is obvious
  container.tabIndex = 0;
  container.style.zIndex = '999';
  container.classList.add('ai-sidebar-search-flash');
  setTimeout(() => container.classList.remove('ai-sidebar-search-flash'), 1800);

  function getTopics() {
    const current = localStorage.getItem('currentUser') || localStorage.getItem('username');
    if (current) {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      return users[current]?.notes || [];
    }
    return JSON.parse(localStorage.getItem('notes') || '[]');
  }

  function renderTopics(filter) {
    const topics = getTopics();
    list.innerHTML = '';
    const q = (filter||'').toLowerCase();
    if (!topics || topics.length === 0) {
      list.innerHTML = '<li style="opacity:.85;color:var(--muted-weak, #98a0b3);padding:6px">No topics</li>';
      return;
    }
    topics.forEach(t => {
      const title = (typeof t === 'string') ? t : (t.title || t);
      if (q && !title.toLowerCase().includes(q) && !( (t.content||'').toLowerCase().includes(q) )) return;
      const li = document.createElement('li');
      li.style.padding = '6px';
      li.style.borderRadius = '8px';
      li.style.cursor = 'pointer';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.gap = '8px';

      const span = document.createElement('span');
      span.textContent = title;
      span.style.flex = '1';
      span.style.color = '#f1f5f9';
      span.style.fontSize = '13px';

  const btnGroup = document.createElement('div');
  btnGroup.style.display = 'flex';
  btnGroup.style.gap = '6px';

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Ask AI';
  sendBtn.title = 'Ask the AI about this topic';
    sendBtn.style.marginLeft = '8px';
    sendBtn.style.border = 'none';
    sendBtn.style.background = 'linear-gradient(90deg, rgba(96,165,250,0.14), rgba(147,197,253,0.08))';
    sendBtn.style.color = '#e6f0ff';
    sendBtn.style.padding = '6px 10px';
    sendBtn.style.borderRadius = '8px';
    sendBtn.style.cursor = 'pointer';
    sendBtn.style.fontWeight = '600';

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete';
  delBtn.title = 'Delete topic';
  delBtn.style.border = 'none';
  delBtn.style.background = 'transparent';
  delBtn.style.color = '#ff9b9b';
  delBtn.style.cursor = 'pointer';

  btnGroup.appendChild(sendBtn);
  btnGroup.appendChild(delBtn);
  li.appendChild(span);
  li.appendChild(btnGroup);
      list.appendChild(li);

      // click on title prefills input but doesn't send
      span.addEventListener('click', () => {
        userInput.value = title;
        userInput.focus();
      });

      // sendBtn pre-fills with the full topic content and submits the form
      sendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const full = (t && t.content) ? t.content : title;
        if (userInput) {
          userInput.value = full;
          try { userInput.focus(); } catch (err) { /* ignore */ }
        }
        // submit the chat form programmatically
        try {
          if (chatForm && typeof chatForm.requestSubmit === 'function') chatForm.requestSubmit();
          else if (chatForm) chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        } catch (err) { /* ignore */ }
        // close sidebar on mobile for better UX
        if (sidebar && sidebar.classList.contains('show')) sidebar.classList.remove('show');
      });

      // delete handler removes the topic (note) from storage
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this topic?')) return;
        deleteTopicById(t.id || t);
      });

      // double-click title => inline rename
      span.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const newTitle = prompt('Rename topic', title);
        if (newTitle === null) return;
        const topicObj = (typeof t === 'string') ? { id: String(Date.now()), title: newTitle, content: '' } : Object.assign({}, t, { title: newTitle });
        saveTopicObj(topicObj);
      });
    });
  }

  input.addEventListener('input', (e) => renderTopics(e.target.value));
  renderTopics();
}

// --- New Chat ---
newChatBtn.addEventListener("click", () => {
  // Save current chat to sessions (as object) before starting new
  try {
    if (chatHistory && chatHistory.length > 0) {
      const messagesCopy = chatHistory.slice();
      const sig = JSON.stringify(messagesCopy);
      // check for an existing identical session to avoid duplicates
      const existingIdx = chatSessions.findIndex(s => {
        const msgs = s.messages || s;
        try { return JSON.stringify(msgs) === sig; } catch (e) { return false; }
      });
      if (existingIdx >= 0) {
        // already saved; set as current and move to front
        const existing = chatSessions.splice(existingIdx, 1)[0];
        chatSessions.unshift(existing);
        currentSessionId = existing.id || null;
      } else {
        const firstUser = chatHistory.find(m => m.role === 'user');
        const title = firstUser ? (firstUser.text || '').slice(0,80) : ('Chat ' + new Date().toLocaleString());
        const sessionObj = { id: String(Date.now()), title, messages: messagesCopy };
        chatSessions.unshift(sessionObj);
        currentSessionId = sessionObj.id;
      }
      localStorage.setItem(`chatSessions_${username}`, JSON.stringify(chatSessions));
    }
  } catch (e) { console.warn('save session failed', e); }

  chatWindow.innerHTML = "";
  chatHistory = [];
  currentSessionId = null;
  localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));
  addMessage("ai", `🧠 New chat started, ${username}. What would you like to discuss today?`);
  renderSavedChats();
});

// Auto-save current chat session (create or update) and generate a short AI-picked title
async function autoSaveSession(lastAiReply) {
  try {
    normalizeSessions();
  } catch (e) { /* ignore */ }

  const now = Date.now();
  const messagesCopy = (chatHistory || []).slice();

  // Generate a short title: prefer AI reply's first sentence, else first user message
  let title = '';
  if (lastAiReply) {
    title = (lastAiReply.split(/\.|\n|\?|!/)[0] || '').trim();
  }
  if (!title) {
    const firstUser = messagesCopy.find(m => m.role === 'user');
    title = (firstUser && firstUser.text) ? firstUser.text.slice(0,80) : '';
  }
  if (!title) title = 'Untitled';
  if (title.length > 80) title = title.slice(0,77) + '...';

  // If we have a current session id, update it; else create new session object
  if (currentSessionId) {
    const idx = chatSessions.findIndex(s => String(s.id) === String(currentSessionId));
    if (idx >= 0) {
      chatSessions[idx].messages = messagesCopy;
      // Only update title if it was generic or empty
      if (!chatSessions[idx].title || chatSessions[idx].title === '' || chatSessions[idx].title.startsWith('Chat')) chatSessions[idx].title = title;
    } else {
      // session id not found; create new
      const newSession = { id: String(now), title, messages: messagesCopy };
      chatSessions.unshift(newSession);
      currentSessionId = newSession.id;
    }
  } else {
    // check for duplicate sessions (same message content)
    const sig = JSON.stringify(messagesCopy);
    const existingIdx = chatSessions.findIndex(s => {
      const msgs = s.messages || s;
      try { return JSON.stringify(msgs) === sig; } catch (e) { return false; }
    });
    if (existingIdx >= 0) {
      // update existing session and move to front
      const existing = chatSessions.splice(existingIdx, 1)[0];
      existing.messages = messagesCopy;
      if (!existing.title || existing.title.startsWith('Chat')) existing.title = title;
      chatSessions.unshift(existing);
      currentSessionId = existing.id;
    } else {
      const newSession = { id: String(now), title, messages: messagesCopy };
      chatSessions.unshift(newSession);
      currentSessionId = newSession.id;
    }
  }

  localStorage.setItem(`chatSessions_${username}`, JSON.stringify(chatSessions));
}

// --- Save current chat as a searchable Topic (note) ---
function saveCurrentChatAsTopic() {
  const currentUser = localStorage.getItem('currentUser') || localStorage.getItem('username') || username;
  if (!currentUser) return alert('No user found to save topic under.');

  // If in-memory chatHistory is empty, try to recover from localStorage (race conditions)
  if ((!chatHistory || chatHistory.length === 0)) {
    try {
      const stored = JSON.parse(localStorage.getItem(`chatHistory_${currentUser}`) || '[]');
      if (Array.isArray(stored) && stored.length) chatHistory = stored;
    } catch (e) { /* ignore parse errors */ }
  }

  if (!chatHistory || chatHistory.length === 0) return alert('No messages in this chat to save.');

  // Build a title from the first user message or timestamp
  const firstUserMsg = chatHistory.find(m => m.role === 'user');
  const title = firstUserMsg ? (`Chat: ${firstUserMsg.text.slice(0,60)}`) : (`Chat ${new Date().toLocaleString()}`);

  // Build content by concatenating messages
  const content = chatHistory.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n\n');

  // Load users and ensure structure (per-user notes)
  const users = JSON.parse(localStorage.getItem('users') || '{}');
  if (!users[currentUser]) users[currentUser] = { password:'', notes:[], timetable:[], gpa:[], profile:{}, notifications:[] };
  if (!Array.isArray(users[currentUser].notes)) users[currentUser].notes = [];

  const noteObj = { id: String(Date.now()), title: title, content: content };
  // Add to top of notes
  users[currentUser].notes.unshift(noteObj);
  localStorage.setItem('users', JSON.stringify(users));

  // Provide feedback and re-render topics if sidebar exists
  addMessage('ai', '💾 Chat saved as topic: "' + title + '"');
  try { showToast('Chat saved: ' + title); } catch (e) { /* ignore */ }
  // If aiSidebarSearch exists, re-render its topics list by dispatching input event
  const aiInput = document.getElementById('aiSidebarSearchInput');
  if (aiInput) {
    const ev = new Event('input', { bubbles: true });
    aiInput.dispatchEvent(ev);
  }
}

// Manual Save Chat button intentionally removed — chats are auto-saved after each AI reply.

// --- Microphone Input ---
micBtn.addEventListener("click", () => {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Speech recognition not supported in this browser.");
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false; // stop automatically after speaking

  const LISTENING_TIMEOUT_MS = 5000; // how long to wait for speech before timing out
  const FADE_MS = 300; // fade duration (should match CSS)

  let listeningIndicator = null;
  let listeningTimeout = null;
  let hasResult = false;

  const createIndicator = () => {
    listeningIndicator = document.createElement("div");
    listeningIndicator.classList.add("message", "ai", "listening-indicator");
    listeningIndicator.innerHTML = "<p>🎙 AI listening...</p>";
    chatWindow.appendChild(listeningIndicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  };

  const removeIndicator = () => {
    if (!listeningIndicator) return;
    listeningIndicator.classList.add("fade-out");
    setTimeout(() => {
      if (listeningIndicator && listeningIndicator.parentNode) listeningIndicator.parentNode.removeChild(listeningIndicator);
      listeningIndicator = null;
    }, FADE_MS + 20);
  };

  recognition.onstart = () => {
    hasResult = false;
    createIndicator();
    micBtn.classList.add("listening");
    micBtn.disabled = true;

    // if no speech/result within timeout, show mic error and stop recognition
    listeningTimeout = setTimeout(() => {
      if (hasResult) return;
      // stop recognition; onend will handle showing error if still no result
      try { recognition.stop(); } catch (e) { /* ignore */ }
      listeningTimeout = null;
    }, LISTENING_TIMEOUT_MS);
  };

  recognition.onerror = (e) => {
    if (listeningTimeout) { clearTimeout(listeningTimeout); listeningTimeout = null; }
    removeIndicator();
  };

  recognition.onresult = (e) => {
    hasResult = true;
    if (listeningTimeout) { clearTimeout(listeningTimeout); listeningTimeout = null; }
    removeIndicator();

    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    // show heard transcript and an explicit "AI listened" acknowledgement
    addMessage("ai", "AI listened");
  };

  recognition.onend = () => {
    if (listeningTimeout) { clearTimeout(listeningTimeout); listeningTimeout = null; }
    removeIndicator();
    micBtn.classList.remove("listening");
    micBtn.disabled = false;
    // if we ended without receiving a result, report mic error
    if (!hasResult) {
      addMessage("ai", "⚠ Internet Error.");
    }
    console.log("Speech recognition ended.");
  };

  recognition.start();
});
// --- Upload Toggle ---
uploadToggle.addEventListener("click", () => {
  uploadMenu.style.display = uploadMenu.style.display === "flex" ? "none" : "flex";
});

// --- Photo Upload ---
photoOption.addEventListener("click", () => {
  uploadMenu.style.display = "none";
  photoInput.click();
});
photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) previewImageBeforeSend(file);
});

// --- File Upload ---
fileOption.addEventListener("click", () => {
  uploadMenu.style.display = "none";
  fileInput.click();
});
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) sendFileToAI(file);
});

// --- Camera Capture ---
let cameraActive = false;
let cameraStreamObj = null;

cameraOption.addEventListener("click", async () => {
  if (cameraActive && cameraStreamObj) {
    const ctx = photoCanvas.getContext("2d");
    photoCanvas.width = cameraStream.videoWidth;
    photoCanvas.height = cameraStream.videoHeight;
    ctx.drawImage(cameraStream, 0, 0);

    cameraStreamObj.getTracks().forEach(track => track.stop());
    cameraStream.style.display = "none";
    cameraActive = false;

    photoCanvas.toBlob((blob) => previewImageBeforeSend(blob), "image/jpeg");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraStreamObj = stream;
    cameraStream.srcObject = stream;
    cameraStream.style.display = "block";
    cameraStream.width = 180;
    cameraStream.height = 120;
    cameraActive = true;

    addMessage("ai", "📸 Camera active — click again to capture photo.");
  } catch (err) {
    alert("❌ Camera access denied or unavailable.");
    cameraActive = false;
  }
});

// --- Preview image before sending ---
function previewImageBeforeSend(fileOrBlob) {
  const imgURL = URL.createObjectURL(fileOrBlob);
  const previewDiv = document.createElement("div");
  previewDiv.classList.add("preview-box");
  previewDiv.innerHTML = `
    <img src="${imgURL}" class="preview-image" />
    <div class="preview-actions">
      <button id="sendImgBtn" class="send-btn">Send</button>
      <button id="retakeImgBtn" class="retake-btn">Retake</button>
    </div>
  `;
  chatWindow.appendChild(previewDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  document.getElementById("sendImgBtn").addEventListener("click", () => {
    sendImageToAI(fileOrBlob);
    previewDiv.remove();
  });

  document.getElementById("retakeImgBtn").addEventListener("click", () => {
    previewDiv.remove();
  });
}

/* SEARCH logic: searches title AND content (case-insensitive) */
function searchNotes(term) {
  const q = (term || "").trim().toLowerCase();
  if (!q) {
    renderSearchResults(notes);
    return notes;
  }
  const results = notes.filter(n => {
    const inTitle = (n.title || "").toLowerCase().includes(q);
    const inContent = (n.content || "").toLowerCase().includes(q);
    return inTitle || inContent;
  });
  renderSearchResults(results);
  return results;
}


// --- Send image to AI ---
async function sendImageToAI(fileOrBlob) {
  const formData = new FormData();
  formData.append("image", fileOrBlob);

  addMessage("user", "🖼️ Sent an image...", "image");

  try {
    const response = await fetch("http://localhost:5501/analyze-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    addMessage("ai", data.text || "⚠️ No result from AI.");
    chatHistory.push({ role: "user", text: "🖼️ Sent an image...", type: "image" });
    chatHistory.push({ role: "ai", text: data.text || "⚠️ No result from AI." });
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));
    renderSavedChats();
  } catch (err) {
    addMessage("ai", "⚠️ Error analyzing image.");
    console.error(err);
  }
}

// --- Send file to AI ---
async function sendFileToAI(file) {
  const formData = new FormData();
  formData.append("file", file);

  addMessage("user", `📎 Uploaded: ${file.name}`);

  try {
    const response = await fetch("http://localhost:5501/analyze-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    addMessage("ai", data.text || "⚠️ No result from AI.");
    chatHistory.push({ role: "user", text: `📎 Uploaded: ${file.name}` });
    chatHistory.push({ role: "ai", text: data.text || "⚠️ No result from AI." });
    localStorage.setItem(`chatHistory_${username}`, JSON.stringify(chatHistory));
    renderSavedChats();
  } catch (err) {
    addMessage("ai", "⚠️ Error analyzing file.");
    console.error(err);
  }
}

// --- Sidebar Toggle ---
// Mirror Notes toggle behavior: mobile => off-canvas (.show), desktop => collapse (.collapsed)
const mainContainer = document.querySelector('.ai-container');
if (toggleSidebar && sidebar) {
  toggleSidebar.addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.innerWidth <= 700) {
      // mobile: toggle off-canvas visibility
      sidebar.classList.toggle("show");
    } else {
      // desktop: collapse to zero width to give main area more space
      sidebar.classList.toggle("collapsed");
      if (mainContainer) mainContainer.classList.toggle('fullwidth', sidebar.classList.contains('collapsed'));
    }
  });

  // clicking outside on mobile hides the off-canvas sidebar
  document.addEventListener("click", (e) => {
    try {
      if (!sidebar || !toggleSidebar) return;
      // if click is outside both the sidebar and the toggle, hide/collapse
      if (!sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
        if (window.innerWidth <= 700) {
          // mobile: hide off-canvas
          sidebar.classList.remove('show');
        } else {
          // desktop: collapse sidebar to give main area focus
          sidebar.classList.add('collapsed');
          if (mainContainer) mainContainer.classList.toggle('fullwidth', sidebar.classList.contains('collapsed'));
        }
      }
    } catch (err) { /* ignore */ }
  });

  // on resize ensure state is reasonable
  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) {
      // remove mobile 'show' if present; keep collapsed state across resizes
      sidebar.classList.remove("show");
    }
  });
}

// --- Expand chat input ---
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = userInput.scrollHeight + "px";
});

// --- Debug helpers (appended) ---
function createDebugBanner(){
  const DEBUG_BANNER_ID = 'bb-debug-banner';
  if (document.getElementById(DEBUG_BANNER_ID)) return;
  const b = document.createElement('div');
  b.id = DEBUG_BANNER_ID;
  b.style.position = 'fixed';
  b.style.right = '12px';
  b.style.top = '12px';
  b.style.zIndex = 99999;
  b.style.background = 'rgba(0,0,0,0.72)';
  b.style.color = '#fff';
  b.style.padding = '8px 10px';
  b.style.borderRadius = '8px';
  b.style.fontSize = '12px';
  b.style.maxWidth = '320px';
  b.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';

  const text = document.createElement('div');
  text.id = DEBUG_BANNER_ID + '-text';
  text.textContent = 'debug';
  b.appendChild(text);

  const controls = document.createElement('div');
  controls.style.marginTop = '6px';
  controls.style.display = 'flex';
  controls.style.gap = '6px';


  controls.appendChild(retry);
  controls.appendChild(show);
  b.appendChild(controls);

  document.body.appendChild(b);
}

function updateDebugBanner(msg){
  const t = document.getElementById('bb-debug-banner-text');
  if(t) t.textContent = msg;
  const t2 = document.getElementById('bb-debug-banner-text');
  if(!t && document.getElementById('bb-debug-banner')){
    document.getElementById('bb-debug-banner').firstChild.textContent = msg;
  }
}
