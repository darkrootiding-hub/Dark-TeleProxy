// --- APP LOGIC ---
var OPENROUTER_API_KEY = null; 
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
let sessions = [], currentSessionId = null, conversationHistory = [], currentLang = 'html', currentModel = "deepseek/deepseek-chat";
let maxTokens = 4096; // Default to long responses
let aiTrainingText = "";
let dynamicButtons = [];
let currentRecognition = null;

// Check if first visit
if (!localStorage.getItem('thank_you_for_installing')) {
  setTimeout(() => {
    document.getElementById('welcomeOverlay').style.display = 'flex';
  }, 500);
}

function closeWelcome() {
  document.getElementById('welcomeOverlay').style.display = 'none';
  localStorage.setItem('thank_you_for_installing', 'true');
}

// --- MUSIC VARIABLES ---
const playlist = ["king.mp3", "lion.mp3", "Samjhawan(Suggested by Nischal).mp3", "NEFFEX - Suggested by Rabin.mp3", "SuggestedByManish.mp3", "SuggestedByManish1.mp3", "tiger.mp3", "hello.mp3"];
let currentTrackIndex = 0, isMusicPlaying = false;
const audioPlayer = document.getElementById('bg-music');

// Update track display
function updateTrackName() { 
  const trackName = document.getElementById('track-name');
  if (trackName) {
    trackName.innerText = "Track: " + playlist[currentTrackIndex]; 
  }
  
  if (audioPlayer) {
    audioPlayer.src = playlist[currentTrackIndex]; 
  }
}

// Toggle play/pause
function toggleMusic() {
  const playIcon = document.getElementById('play-icon');
  if (!playIcon) return;
  
  if(isMusicPlaying) { 
    if (audioPlayer) audioPlayer.pause(); 
    playIcon.classList.remove('fa-pause'); 
    playIcon.classList.add('fa-play'); 
  } else { 
    if (audioPlayer) {
      audioPlayer.play().catch(() => {
        console.warn("Music file not found:", playlist[currentTrackIndex]);
      }); 
    }
    playIcon.classList.remove('fa-play'); 
    playIcon.classList.add('fa-pause'); 
  }
  isMusicPlaying = !isMusicPlaying;
}

// Next track
function nextTrack() { 
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length; 
  updateTrackName(); 
  if(isMusicPlaying && audioPlayer) audioPlayer.play(); 
}

// Previous track
function prevTrack() { 
  currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length; 
  updateTrackName(); 
  if(isMusicPlaying && audioPlayer) audioPlayer.play(); 
}

// Sound effects
function playSound(type) { 
  const s = type === 'sent' ? document.getElementById('sfx-sent') : document.getElementById('sfx-click'); 
  if(s){
    s.currentTime = 0;
    s.play().catch(()=>{});
  } 
}

// ==================== FIXED: Load AI Training Text from Firebase ====================
async function loadAITraining() {
  try {
    // Check if Firebase is available
    if (!window.firestore || !window.fbDoc || !window.fbGetDoc) {
      console.warn("Firebase not ready yet, using default training");
      aiTrainingText = getDefaultTrainingText();
      return;
    }
    
    const docRef = window.fbDoc(window.firestore, "system", "ai_config");
    const docSnap = await window.fbGetDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      aiTrainingText = data.training_prompt || getDefaultTrainingText();
      console.log("✅ AI Training loaded from Firebase");
    } else {
      console.log("No AI training found in Firebase, using defaults");
      aiTrainingText = getDefaultTrainingText();
    }
  } catch (error) {
    console.error("Error loading AI training from Firebase:", error);
    aiTrainingText = getDefaultTrainingText();
  }
  
  // Update current conversation system prompt if it exists
  if (conversationHistory && conversationHistory.length > 0) {
    const systemIndex = conversationHistory.findIndex(m => m.role === 'system');
    if (systemIndex >= 0) {
      conversationHistory[systemIndex].content = aiTrainingText;
    }
  }
}

// ==================== FIXED: Load Dynamic Buttons from Firebase ====================
async function loadDynamicContent() {
  try {
    // Check if Firebase is available
    if (!window.firestore || !window.fbDoc || !window.fbGetDoc) {
      console.warn("Firebase not ready yet, using default buttons");
      dynamicButtons = getDefaultButtons();
      renderDynamicButtons();
      return;
    }
    
    const docRef = window.fbDoc(window.firestore, "system", "buttons_config");
    const docSnap = await window.fbGetDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      dynamicButtons = data.buttons || getDefaultButtons();
      console.log(`✅ Loaded ${dynamicButtons.length} buttons from Firebase`);
    } else {
      console.log("No buttons found in Firebase, using defaults");
      dynamicButtons = getDefaultButtons();
    }
    
    renderDynamicButtons();
  } catch(e) {
    console.error("Error loading dynamic buttons from Firebase:", e);
    dynamicButtons = getDefaultButtons();
    renderDynamicButtons();
  }
}

// Default training text
function getDefaultTrainingText() {
  return `You are DarkRoot AI, an advanced artificial intelligence assistant specialized in:
Cybersecurity
Ethical Hacking
Programming & Software Development
Technical Problem-Solving

Core Behavior
- Provide clear, structured, and in-depth responses
- Use proper Markdown formatting
- Apply syntax highlighting for all code blocks
- Be direct, precise, and technically accurate

Cybersecurity Rules (Strict)
- Discuss only legal and ethical cybersecurity practices
- Clearly warn against illegal actions
- Focus on defensive security, education, and best practices

Coding Rules
- Provide complete, runnable code examples
- Explain logic step-by-step when complexity is high
- Use clean, modern, and readable code
- Follow industry standards and best practices

Ethics Emphasis
- Always reinforce legal responsibility
- Promote learning, security awareness, and ethical development
- Never encourage harm, exploitation, or illegal access`;
}

// Default buttons
function getDefaultButtons() {
  return [
    {
      id: 'btn1',
      title: '🎯 Code Review Pro',
      prompt: 'Review this code for best practices and security issues:',
      icon: 'fa-code-review',
      color: '#8b5cf6',
      bgColor: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
      createdAt: Date.now(),
      isNew: true
    },
    {
      id: 'btn2',
      title: '🔐 Security Audit',
      prompt: 'Perform a security audit on this code:',
      icon: 'fa-shield-alt',
      color: '#ec4899',
      bgColor: 'linear-gradient(135deg, #ec4899, #f43f5e)',
      createdAt: Date.now(),
      isNew: true
    },
    {
      id: 'btn3',
      title: '🤖 DarkRoot AI Expert',
      prompt: 'Use DarkRoot AI to analyze:',
      icon: 'fa-brain',
      color: '#10b981',
      bgColor: 'linear-gradient(135deg, #10b981, #059669)',
      createdAt: Date.now(),
      isNew: true
    }
  ];
}

function renderDynamicButtons() {
  const container = document.getElementById('dynamic-buttons-container');
  const list = document.getElementById('dynamic-buttons-list');
  if(!container || !list) return;
  
  if(!dynamicButtons || dynamicButtons.length === 0) {
    container.classList.remove('has-buttons');
    return;
  }
  
  container.classList.add('has-buttons');
  
  let html = '';
  dynamicButtons.sort((a,b) => b.createdAt - a.createdAt).forEach(btn => {
    const isNew = btn.isNew || (Date.now() - btn.createdAt < 86400000);
    const newClass = isNew ? 'new' : '';
    const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '';
    
    html += `
      <button class="dynamic-btn ${newClass}" onclick="executeDynamicButton('${btn.id}')" 
              style="border-color: ${btn.color}; background: ${btn.bgColor || btn.color};">
        <i class="fas ${btn.icon || 'fa-star'}"></i>
        <span style="flex:1; text-align:left;">${btn.title}</span>
        ${newBadge}
      </button>
    `;
  });
  
  list.innerHTML = html;
}

function executeDynamicButton(buttonId) {
  const button = dynamicButtons.find(b => b.id === buttonId);
  toggleSidebar(false);
  if(!button) return;
  
  if(button.prompt) {
    const userInput = document.getElementById('user-input');
    if(userInput) {
      userInput.value = button.prompt + ' ';
      userInput.focus();
      userInput.style.height = 'auto';
      userInput.style.height = (userInput.scrollHeight) + 'px';
      showNotification(`✨ Loaded: ${button.title}`);
    }
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--primary-gradient);
    color: white;
    padding: 12px 24px;
    border-radius: 50px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 9999;
    animation: slideInRight 0.3s ease;
    font-weight: 500;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// --- INIT (Updated to be async) ---
async function initApp() {
  try {
    // Load AI Training from Firebase first
    await loadAITraining();
    
    // Load dynamic buttons from Firebase
    await loadDynamicContent();
    
    // Load sessions
    const s = localStorage.getItem('darkroot_sessions'); 
    if(s) sessions = JSON.parse(s);
    
    // Load active session
    const aid = localStorage.getItem('darkroot_active_id'); 
    if(aid && sessions.find(x=>x.id===aid)) loadSession(aid); 
    else startNewChat();
    
    renderHistoryList();
    
    // Load theme
    const theme = localStorage.getItem('theme');
    if(theme === 'light') { 
      document.body.classList.add('light-mode'); 
      const themeToggle = document.getElementById('theme-toggle');
      if (themeToggle) themeToggle.checked = false; 
    }
    
    // Load response length preference
    const savedLength = localStorage.getItem('response_length');
    if (savedLength) {
      maxTokens = parseInt(savedLength);
      const lengthSelect = document.getElementById('response-length');
      if (lengthSelect) lengthSelect.value = savedLength;
    }
    
    // Set DarkRoot AI as default in dropdown
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) modelSelect.value = 'deepseek/deepseek-chat';
    
    // Enhanced textarea handling
    const userInput = document.getElementById('user-input');
    if (userInput) {
      userInput.addEventListener('keydown', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) { 
          e.preventDefault(); 
          sendMessage(); 
        }
      });
      
      userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
          this.style.overflowY = 'auto';
        } else {
          this.style.overflowY = 'hidden';
        }
        
        // Hide suggestions when typing
        if (this.value.trim().length > 0) {
          const suggestionsDiv = document.getElementById('prompt-suggestions');
          if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        }
      });
      
      setTimeout(() => userInput.focus(), 500);
    }
    
    // Initialize music player
    if (audioPlayer) {
      audioPlayer.addEventListener('ended', nextTrack); 
    }
    updateTrackName();
    
    // Initialize gestures for IDE
    initGestures();
    
    // Show welcome message with prompt suggestions
    setTimeout(() => {
      if (userInput && userInput.value === '') {
        showPromptSuggestions();
      }
    }, 1500);
    
    console.log("DarkRoot AI initialized successfully with DarkRoot AI");
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

// --- GESTURE CONTROLS FOR IDE ---
function initGestures() {
  const editorPane = document.getElementById('editor-pane');
  if (!editorPane || typeof Hammer === 'undefined') return;
  
  const mc = new Hammer(editorPane);
  
  // Pinch to zoom
  mc.get('pinch').set({ enable: true });
  mc.on('pinch', function(e) {
    if (window.editor) {
      const currentSize = parseInt(window.editor.getFontSize());
      const newSize = Math.max(10, Math.min(30, currentSize + (e.scale > 1 ? 1 : -1)));
      window.editor.setFontSize(newSize + "px");
      showGestureFeedback(`Font size: ${newSize}px`);
    }
  });
  
  // Two-finger scroll
  mc.on('pan', function(e) {
    if (e.pointers.length === 2) {
      if (window.editor) {
        const scrollTop = window.editor.session.getScrollTop();
        window.editor.session.setScrollTop(scrollTop - (e.deltaY * 2));
      }
    }
  });
}

function showGestureFeedback(message) {
  const feedback = document.createElement('div');
  feedback.textContent = message;
  feedback.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8); color: white; padding: 10px 20px;
    border-radius: 20px; z-index: 10000; font-size: 14px;
    animation: fadeOut 1s 0.5s forwards;
  `;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 1500);
}

// --- UI UTILS ---
function openSettings() { 
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'flex'; 
  toggleSidebar(false); 
}
function closeSettings() { 
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none'; 
}

function openStudyModal() {
  const modal = document.getElementById('study-modal');
  if (modal) modal.style.display = 'flex'; 
  toggleSidebar(false);
}

function closeStudyModal() {
  const modal = document.getElementById('study-modal');
  if (modal) modal.style.display = 'none'; 
}

function openAbout() { 
  const modal = document.getElementById('about-modal');
  if (modal) modal.style.display = 'flex'; 
  toggleSidebar(false); 
}
function closeAbout() { 
  const modal = document.getElementById('about-modal');
  if (modal) modal.style.display = 'none'; 
}

function toggleSidebar(f) {
  const s = document.getElementById('sidebar');
  const o = document.getElementById('overlay');
  
  if (!s || !o) return;
  
  if(f !== undefined) { 
    if(f){
      s.classList.add('open');
      o.classList.add('active');
    } else {
      s.classList.remove('open');
      o.classList.remove('active');
    } 
  } else { 
    s.classList.toggle('open'); 
    o.classList.toggle('active'); 
  }
}

function toggleTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  const light = !themeToggle.checked;
  if(light) { 
    document.body.classList.add('light-mode'); 
    localStorage.setItem('theme', 'light'); 
    if(window.editor) window.editor.setTheme("ace/theme/chrome"); 
  } else { 
    document.body.classList.remove('light-mode'); 
    localStorage.setItem('theme', 'dark'); 
    if(window.editor) window.editor.setTheme("ace/theme/dracula"); 
  }
}

// --- CHAT & SESSION ---
window.saveCurrentSession = function() {
  if(!currentSessionId) return;
  const idx = sessions.findIndex(s => s.id === currentSessionId);
  let title = "New Chat";
  if(conversationHistory.length > 1) { 
    const m = conversationHistory.find(x=>x.role==='user'); 
    if(m) title = m.content.substring(0, 40) + (m.content.length > 40 ? "..." : ""); 
  }
  const data = { 
    id: currentSessionId, 
    title: title, 
    messages: conversationHistory, 
    timestamp: Date.now(),
    model: currentModel
  };
  if(idx >= 0) sessions[idx] = data; 
  else sessions.unshift(data);
  
  // Keep only last 50 sessions
  if (sessions.length > 50) {
    sessions = sessions.slice(0, 50);
  }
  
  localStorage.setItem('darkroot_sessions', JSON.stringify(sessions));
  localStorage.setItem('darkroot_active_id', currentSessionId);
  renderHistoryList();
}

function startNewChat() {
  currentSessionId = Date.now().toString();
  conversationHistory = [{ 
    role: "system", 
    content: aiTrainingText
  }];
  
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    chatContainer.innerHTML = '';
    
    // Re-add typing indicator
    const ind = document.createElement('div'); 
    ind.id = 'typing-indicator'; 
    ind.className = 'typing-indicator';
    ind.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatContainer.appendChild(ind);
    
    appendMessage(`<strong><span class="cyber-text">DarkRoot AI</span> Online</strong><br>
    Advanced AI assistant ready for cybersecurity, coding, and technical problem-solving. 
    Features include gesture-controlled IDE, legal hacking courses, DarkRoot AI integration, and enhanced prompt management.
    <div style="margin-top:10px; font-size:0.85rem; color:var(--text-secondary);">
      <i class="fas fa-star"></i> Try: <code>/hack</code> for cybersecurity | <code>/code</code> for programming | <code>/darkroot</code> for DarkRoot AI | <code>/study</code> for courses
    </div>
    <div style="margin-top:10px; padding:10px; background:rgba(0, 216, 167, 0.1); border-radius:8px; border-left:3px solid var(--deepseek-green);">
      <i class="fas fa-check-circle" style="color:var(--deepseek-green);"></i> DarkRoot AI is <strong>enabled by default</strong> for superior performance!
    </div>`, "ai", false);
  }
  
  window.saveCurrentSession();
  if(window.innerWidth < 768) toggleSidebar(false);
  
  // Show prompt suggestions for new chat
  setTimeout(() => {
    showPromptSuggestions();
  }, 1000);
}

// ==================== FEEDBACK FUNCTIONS ====================
function openFeedbackModal() {
  document.getElementById('feedback-modal').style.display = 'flex';
  toggleSidebar(false);
}

function closeFeedbackModal() {
  document.getElementById('feedback-modal').style.display = 'none';
  selectedFeedbackType = null;
  document.querySelectorAll('.feedback-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.getElementById('feedback-message').value = '';
}

function selectFeedback(type) {
  selectedFeedbackType = type;
  document.querySelectorAll('.feedback-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.getElementById(`feedback-${type}`).classList.add('selected');
}

async function submitFeedback() {
  if (!selectedFeedbackType) {
    alert('Please select a feedback type');
    return;
  }
  
  const message = document.getElementById('feedback-message').value.trim();
  
  try {
    // Try to save to Firebase if available
    if (window.firestore && window.fbAddDoc && window.fbCollection) {
      const currentUser = window.currentUser || null;
      await window.fbAddDoc(window.fbCollection(window.firestore, "feedback"), {
        type: selectedFeedbackType,
        message: message || 'No additional message',
        userId: currentUser?.uid || 'guest',
        userEmail: currentUser?.email || 'guest',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      showNotification('✅ Thank you for your feedback!');
    } else {
      // Fallback to console
      console.log('Feedback (offline):', { 
        type: selectedFeedbackType, 
        message: message || 'No message',
        timestamp: new Date().toISOString()
      });
      showNotification('✅ Feedback received (offline mode)');
    }
    
    closeFeedbackModal();
  } catch (error) {
    console.error('Error submitting feedback:', error);
    showNotification('❌ Failed to submit feedback');
  }
}


function loadSession(id) {
  const s = sessions.find(x=>x.id===id); 
  if(!s) return;
  
  currentSessionId = id; 
  conversationHistory = s.messages; 
  localStorage.setItem('darkroot_active_id', id);
  
  const chatContainer = document.getElementById('chat-container');
  if (chatContainer) {
    chatContainer.innerHTML = '';
    
    const ind = document.createElement('div'); 
    ind.id='typing-indicator'; 
    ind.className='typing-indicator';
    ind.innerHTML='<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatContainer.appendChild(ind);
    
    conversationHistory.forEach(m => { 
      if(m.role!=='system') appendMessage(m.content, m.role==='assistant'?'ai':'user', false); 
    });
  }
  
  renderHistoryList();
  if(window.innerWidth < 768) toggleSidebar(false);
}

function deleteSession(id, e) {
  if (e) e.stopPropagation(); 
  if(!confirm("Delete this chat permanently?")) return;
  
  sessions = sessions.filter(x=>x.id!==id); 
  localStorage.setItem('darkroot_sessions', JSON.stringify(sessions));
  
  if(id===currentSessionId) { 
    if(sessions.length>0) loadSession(sessions[0].id); 
    else startNewChat(); 
  } else renderHistoryList();
}

function renderHistoryList() {
  const l = document.getElementById('history-list'); 
  if (!l) return;
  
  l.innerHTML = '';
  
  if (sessions.length === 0) {
    l.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-secondary);">
        <i class="fas fa-comments" style="font-size:2.5rem; margin-bottom:15px; opacity:0.5;"></i>
        <p style="font-weight:500; margin-bottom:8px;">No chat history yet</p>
        <p style="font-size:0.85rem;">Start a new chat to begin your conversation</p>
      </div>
    `;
    return;
  }
  
  sessions.sort((a,b)=>b.timestamp-a.timestamp).forEach(s => {
    const d = document.createElement('div'); 
    d.className = `history-item ${s.id===currentSessionId?'active':''}`;
    d.onclick = () => loadSession(s.id);
    
    // Format date
    const date = new Date(s.timestamp);
    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const dateStr = date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    
    // Add model indicator
    const modelIndicator = s.model === 'deepseek/deepseek-chat' ? '<span style="color:var(--deepseek-green); margin-left:8px;"><i class="fas fa-brain"></i></span>' : '';
    
    d.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:500; margin-bottom:4px; display:flex; align-items:center;">
          ${s.title || 'Untitled Chat'} ${modelIndicator}
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${dateStr} • ${timeStr}</div>
      </div>
      <button class="delete-chat-btn" onclick="deleteSession('${s.id}', event)">
        <i class="fas fa-trash"></i>
      </button>
    `;
    l.appendChild(d);
  });
}

// --- ENHANCED MESSAGE HANDLING ---
async function sendMessage() {
  const inp = document.getElementById("user-input"); 
  const text = inp ? inp.value.trim() : ""; 
  if(!text) return;
  
  // Hide prompt suggestions
  const promptSuggestions = document.getElementById('prompt-suggestions');
  if (promptSuggestions) promptSuggestions.style.display = 'none';
  
  // Check for commands
  if (text.startsWith('/')) {
    handleCommand(text);
    if (inp) {
      inp.value = "";
      inp.style.height = "auto";
    }
    return;
  }
  
  appendMessage(text, "user"); 
  playSound('sent'); 
  
  if (inp) {
    inp.value = ""; 
    inp.style.height = "auto";
  }
  
  showTyping(true); 
  conversationHistory.push({ role: "user", content: text }); 
  window.saveCurrentSession();
  
  try {
    const modelSelect = document.getElementById('model-select');
    let model = modelSelect ? modelSelect.value : "deepseek/deepseek-chat";
    
    // Get response length preference
    const lengthSelect = document.getElementById('response-length');
    if (lengthSelect) {
      maxTokens = parseInt(lengthSelect.value);
      localStorage.setItem('response_length', maxTokens);
    }
    
    let apiUrl, headers, bodyData;
    
    if(!OPENROUTER_API_KEY) { 
      if(window.OPENROUTER_API_KEY) OPENROUTER_API_KEY = window.OPENROUTER_API_KEY; 
      else { 
        alert("Check Your Internet Connection"); 
        return; 
      }
    }
    
    apiUrl = OPENROUTER_API_URL;
    headers = { 
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`, 
      "Content-Type": "application/json", 
      "HTTP-Referer": window.location.href, 
      "X-Title": "DarkRoot AI" 
    };
    
    bodyData = {
      model: model,
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: false
    };
    
    console.log("Sending request to:", apiUrl);
    console.log("Using model:", model);
    
    const res = await fetch(apiUrl, {
      method: "POST", 
      headers: headers,
      body: JSON.stringify(bodyData)
    });
    
    if(!res.ok) {
      const errorText = await res.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    showTyping(false);
    const reply = data.choices[0].message.content;
    appendMessage(reply, "ai"); 
    conversationHistory.push({ role: "assistant", content: reply }); 
    window.saveCurrentSession();
  } catch(e) { 
    showTyping(false); 
    appendMessage(`Error: ${e.message}. Please check your API key or try again.`, "ai"); 
    console.error("API Error:", e);
  }
}

function handleCommand(cmd) {
  const parts = cmd.split(' ');
  const command = parts[0].toLowerCase();
  
  switch(command) {
    case '/hack':
    case '/cyber':
      appendMessage("Switching to cybersecurity mode. I'll now focus on ethical hacking, network security, and penetration testing topics.", "ai");
      conversationHistory.push({ 
        role: "system", 
        content: "You are now in cybersecurity expert mode. Focus on ethical hacking, network security, penetration testing, and legal security practices. Provide detailed, educational information about security concepts, tools, and best practices. Always emphasize legality and ethics."
      });
      break;
      
    case '/code':
      appendMessage("Switching to programming mode. I'll now focus on code development, debugging, and technical problem-solving.", "ai");
      conversationHistory.push({ 
        role: "system", 
        content: "You are now in programming expert mode. Focus on code development, debugging, algorithms, data structures, and software architecture. Provide complete, runnable code examples with explanations. Cover multiple programming languages and best practices."
      });
      break;
      
    case '/study':
      openStudyModal();
      break;
      
    case '/clear':
      clearContext();
      break;
      
    case '/help':
      showCommands();
      break;
      
    case '/darkroot':
      activateDeepSeekAI();
      break;
      
    case '/openrouter':
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) modelSelect.value = "deepseek/deepseek-chat";
      currentModel = "deepseek/deepseek-chat";
      appendMessage("Switched to DarkRoot AI model (default).", "ai");
      break;
      
    default:
      appendMessage(`Unknown command: ${command}. Type /help for available commands.`, "ai");
  }
}

function showCommands() {
  const commands = [
    {cmd: '/hack', desc: 'Switch to cybersecurity mode'},
    {cmd: '/code', desc: 'Switch to programming mode'},
    {cmd: '/study', desc: 'Open legal hacking courses'},
    {cmd: '/darkroot', desc: 'Activate DarkRoot AI mode (default)'},
    {cmd: '/openrouter', desc: 'Switch to OpenRouter models'},
    {cmd: '/clear', desc: 'Clear conversation context'},
    {cmd: '/help', desc: 'Show this help message'}
  ];
  
  let message = "<strong>Available Commands:</strong><br>";
  commands.forEach(c => {
    message += `<code>${c.cmd}</code> - ${c.desc}<br>`;
  });
  
  appendMessage(message, "ai");
}

function appendMessage(text, role, anim=true) {
  const c = document.getElementById("chat-container"); 
  const ind = document.getElementById("typing-indicator");
  const d = document.createElement("div"); 
  d.className = `message-wrapper ${role}`;
  
  // Process text
  let processedText = text;
  if (role === 'user') {
    processedText = text.replace(/\n/g,'<br>');
  } else {
    // Use marked.js for AI responses
    processedText = marked.parse(text);
  }
  
  d.innerHTML = `<div class="bubble">${processedText}</div>`;
  
  if(ind && c && c.contains(ind)) c.insertBefore(d, ind); 
  else if (c) c.appendChild(d);
  
  // Apply syntax highlighting
  setTimeout(() => {
    if (d.querySelectorAll) {
      d.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
        
        // Add copy and run buttons
        const wrapper = block.closest('.code-block-wrapper');
        if (wrapper && !wrapper.querySelector('.code-actions')) {
          const lang = block.className.match(/language-(\w+)/)?.[1] || 'text';
          const header = document.createElement('div');
          header.className = 'code-header';
          header.innerHTML = `
            <span><i class="fas fa-code"></i> ${lang.toUpperCase()}</span>
            <div class="code-actions">
              <button class="btn-copy" onclick="copyCodeBlock(this)">
                <i class="fas fa-copy"></i> Copy
              </button>
              <button class="btn-run" onclick="runCodeBlock(this)">
                <i class="fas fa-play"></i> Run
              </button>
            </div>
          `;
          wrapper.insertBefore(header, wrapper.firstChild);
        }
      });
    }
  }, 10);
  
  if (c) {
    c.scrollTop = c.scrollHeight;
    // Auto-expand chat area if needed
    if (c.scrollHeight > c.clientHeight) {
      setTimeout(() => {
        c.scrollTop = c.scrollHeight;
      }, 100);
    }
  }
}

function copyCodeBlock(btn) {
  const wrapper = btn.closest('.code-block-wrapper');
  const code = wrapper.querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
      btn.innerHTML = original;
    }, 2000);
  }).catch(err => {
    console.error("Copy failed:", err);
    btn.innerHTML = '<i class="fas fa-times"></i> Error';
    setTimeout(() => {
      btn.innerHTML = original;
    }, 2000);
  });
}

function runCodeBlock(btn) {
  const wrapper = btn.closest('.code-block-wrapper');
  const code = wrapper.querySelector('code').textContent;
  const lang = wrapper.querySelector('.code-header span').textContent.trim().toLowerCase();
  
  // Detect language
  let mode = 'html';
  if (lang.includes('py')) mode = 'python';
  else if (lang.includes('c') || lang.includes('cpp')) mode = 'c_cpp';
  else if (lang.includes('js') || lang.includes('javascript')) mode = 'javascript';
  
  launchIde(code, mode);
}

function showTyping(s) { 
  const i = document.getElementById("typing-indicator"); 
  const c = document.getElementById("chat-container");
  
  if(i) { 
    i.style.display = s ? 'flex' : 'none'; 
    if (c) c.scrollTop = 99999; 
  } 
}

// --- ENHANCED IDE LOGIC (FROM 36.HTML) ---
let editor;
window.onload = function() {
  if(typeof ace !== 'undefined') {
    try {
      editor = ace.edit("ace-editor"); 
      editor.setTheme("ace/theme/dracula"); 
      editor.session.setMode("ace/mode/html");
      editor.setOptions({ 
        fontSize: "16px", 
        fontFamily: "'Fira Code', 'Monaco', 'Menlo', monospace", 
        showPrintMargin: false, 
        wrap: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        tabSize: 2,
        useSoftTabs: true
      });
      
      editor.session.on('change', updateStatusBar); 
      editor.selection.on('changeCursor', updateStatusBar);
      
      // Add keyboard shortcuts
      editor.commands.addCommand({
        name: "runCode",
        bindKey: {win: "Ctrl-Enter", mac: "Cmd-Enter"},
        exec: function() { runEditorCode(); }
      });
      
      editor.commands.addCommand({
        name: "saveCode",
        bindKey: {win: "Ctrl-S", mac: "Cmd-S"},
        exec: function() { downloadCode(); }
      });
      
      window.editor = editor;
    } catch (error) {
      console.error("Error initializing ACE editor:", error);
    }
  }
  
  initApp();
  
  // Check for login requirement
  if (localStorage.getItem('requireLogin') === 'true') {
    setTimeout(() => {
      openAuthModal();
      localStorage.removeItem('requireLogin');
    }, 1000);
  }
};

function updateStatusBar() {
  if (!editor) return;
  const c = editor.selection.getCursor();
  const totalLines = editor.session.getLength();
  const status = document.getElementById('ide-status');
  if (status) {
    status.innerText = `Ln ${c.row + 1}, Col ${c.column + 1} | ${totalLines} lines | ${currentLang.toUpperCase()}`;
  }
}

// Enhanced Markdown renderer
const renderer = new marked.Renderer();
renderer.code = function(code, language) {
  const valid = language && hljs.getLanguage(language) ? language : 'text';
  const high = hljs.highlight(code, { language: valid }).value;
  return `
    <div class="code-block-wrapper" data-lang="${valid}">
      <div class="code-header">
        <span><i class="fas fa-code"></i> ${valid.toUpperCase()}</span>
        <div class="code-actions">
          <button onclick="copyToClipboard(this)">
            <i class="fas fa-copy"></i> Copy
          </button>
          <button class="btn-run" onclick="openInIde(this)">
            <i class="fas fa-play"></i> Run
          </button>
        </div>
      </div>
      <pre><code class="hljs ${valid}">${high}</code></pre>
      <input type="hidden" class="raw-code" value="${encodeURIComponent(code)}">
    </div>
  `;
};

marked.setOptions({ 
  renderer: renderer,
  breaks: true,
  gfm: true
});

function openEmptyIde() {
  const modal = document.getElementById("ide-modal");
  if (!modal) return;
  
  modal.style.display = "flex";
  
  // Set default code based on language
  let defaultCode = "";
  if (currentLang === 'html') {
    defaultCode = `<!doctype html>
<html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" id="viewport" content="width=device-width, initial-scale=1">
      <title>David Shrestha</title>
      <!-- Google Fonts for better typography -->
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
      
      <style>
        /* General Reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Poppins', sans-serif;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #0f0c29;  /* fallback for old browsers */
            background: linear-gradient(to right, #24243e, #302b63, #0f0c29);
            overflow: hidden;
            color: #fff;
        }

        /* Background Moving Shapes Animation */
        .background-shapes div {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            z-index: -1;
            animation: float 10s infinite alternate;
        }

        .shape-1 {
            width: 300px;
            height: 300px;
            background: #ff0055;
            top: -50px;
            left: -50px;
        }

        .shape-2 {
            width: 400px;
            height: 400px;
            background: #00d2ff;
            bottom: -100px;
            right: -100px;
            animation-delay: 2s;
        }

        /* Main Glass Card */
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            width: 90%;
            animation: slideIn 1.5s ease-out;
            transform-style: preserve-3d;
        }

        /* "Hello World" Typing Effect */
        .hello-world {
            font-size: 1.2rem;
            color: #00d2ff;
            font-weight: 600;
            letter-spacing: 2px;
            margin-bottom: 10px;
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid #00d2ff;
            animation: typing 3.5s steps(30, end), blink-caret .75s step-end infinite;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            background: linear-gradient(to right, #fff, #bbb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p {
            font-size: 0.9rem;
            color: #ddd;
            margin-bottom: 30px;
            line-height: 1.5;
        }

        /* Buttons Container */
        .btn-group {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        /* Buttons Styling */
        .btn {
            text-decoration: none;
            padding: 15px 20px;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            text-transform: uppercase;
            font-size: 0.9rem;
        }

        /* Button 1: Ai Tricker */
        .btn-ai {
            background: linear-gradient(45deg, #ff0055, #ff5e62);
            color: white;
            box-shadow: 0 5px 15px rgba(255, 0, 85, 0.4);
        }

        .btn-ai:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 10px 25px rgba(255, 0, 85, 0.6);
        }

        /* Button 2: Sun-ley Coder */
        .btn-sun {
            background: linear-gradient(45deg, #FF9900, #F7B733); /* Sun colors */
            color: #fff;
            box-shadow: 0 5px 15px rgba(255, 153, 0, 0.4);
        }

        .btn-sun:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 10px 25px rgba(255, 153, 0, 0.6);
        }

        /* YouTube Icon (CSS only) */
        .yt-icon {
            width: 20px;
            height: 14px;
            background: white;
            border-radius: 4px;
            position: relative;
            display: inline-block;
        }
        .yt-icon::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-left: 6px solid #ff0055; /* Icon color for first btn */
            border-top: 4px solid transparent;
            border-bottom: 4px solid transparent;
        }
        
        .btn-sun .yt-icon::after {
            border-left-color: #FF9900; /* Icon color for second btn */
        }

        /* Footer text */
        .footer {
            margin-top: 20px;
            font-size: 0.7rem;
            opacity: 0.6;
        }

        /* Keyframe Animations */
        @keyframes float {
            0% { transform: translate(0, 0); }
            100% { transform: translate(20px, 40px); }
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes typing {
            from { width: 0 }
            to { width: 100% }
        }

        @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: #00d2ff; }
        }

      </style>
    </head>
    <body>

      <!-- Background Animated Blobs -->
      <div class="background-shapes">
          <div class="shape-1"></div>
          <div class="shape-2"></div>
      </div>

      <!-- Main Content Card -->
      <div class="card">
        <div class="hello-world">Hello World!</div>
        
        <h1>Welcome</h1>
        <p>Explore the world of AI & Coding.<br>Subscribe for amazing tutorials.</p>

        <div class="btn-group">
            <a href="https://youtube.com/@kingamernep?si=C3tvW0VJWXoxSk2n" target="_blank" class="btn btn-ai">
                <span class="yt-icon"></span> Subscribe David Shrestha
            </a>

            <a href="https://youtube.com/@kingamernep?si=C3tvW0VJWXoxSk2n" target="_blank" class="btn btn-sun">
                <span class="yt-icon"></span> Subscribe David Shrestha
            </a>
        </div>

        <div class="footer">Thank you for visiting!</div>
      </div>

    </body>
</html>
`;
  } else if (currentLang === 'python') {
    defaultCode = `# Python Code Editor - DarkRoot IDE
# Write your Python code here

def fibonacci(n):
    """Return the nth Fibonacci number."""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

def main():
    print("=== Python Code Runner ===")
    print("Fibonacci sequence:")
    
    for i in range(10):
        print(f"Fib({i}) = {fibonacci(i)}")
    
    # Example user input
    user_input = input("\\nEnter a number: ")
    try:
        num = int(user_input)
        print(f"Fibonacci of {num} is: {fibonacci(num)}")
    except ValueError:
        print("Please enter a valid number!")

if __name__ == "__main__":
    main()`;
  } else if (currentLang === 'c' || currentLang === 'cpp') {
    defaultCode = `// C/C++ Code Editor - DarkRoot IDE
#include <stdio.h>
#include <stdlib.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    printf("=== C/C++ Code Runner ===\\n");
    printf("Factorials from 1 to 10:\\n");
    
    for (int i = 1; i <= 10; i++) {
        printf("%d! = %d\\n", i, factorial(i));
    }
    
    // Simple input example
    int num;
    printf("\\nEnter a number: ");
    scanf("%d", &num);
    printf("Factorial of %d is: %d\\n", num, factorial(num));
    
    return 0;
}`;
  }
  
  if (editor) {
    editor.setValue(defaultCode, -1);
  }
  
  changeEditorLang();
  
  // For mobile, show editor tab by default
  if (window.innerWidth < 768) {
    switchTab('editor');
  }
}

function openInIde(btn) {
  if (!btn) return;
  
  const wrap = btn.closest('.code-block-wrapper');
  if (!wrap) return;
  
  const rawCode = wrap.querySelector('.raw-code');
  const langAttr = wrap.getAttribute('data-lang');
  
  if (!rawCode || !langAttr) return;
  
  const code = decodeURIComponent(rawCode.value);
  const lang = langAttr.toLowerCase();
  
  // Intelligent language detection
  let mode = 'html';
  if(lang.includes('py')) mode = 'python'; 
  else if(lang.includes('c') || lang.includes('cpp')) mode = 'c_cpp';
  else if(lang.includes('js') || lang.includes('javascript')) mode = 'html';
  else if(lang.includes('css')) mode = 'html';
  
  launchIde(code, mode);
}

function launchIde(code, mode) {
  const modal = document.getElementById("ide-modal");
  if (!modal) return;
  
  modal.style.display = "flex";
  
  let val = 'html'; 
  if(mode === 'python') val = 'python'; 
  if(mode === 'c_cpp') val = 'c';
  
  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = val;
  
  changeEditorLang();
  
  if (editor) {
    editor.setValue(code, -1);
  }
  
  const consoleLogs = document.getElementById('console-logs');
  if (consoleLogs) consoleLogs.innerHTML = '';
  
  // For mobile, show editor tab by default
  if (window.innerWidth < 768) {
    switchTab('editor');
  }
  
  // Auto-run if it's HTML
  if(mode === 'html') {
    setTimeout(() => runEditorCode(), 300);
  }
}

function changeEditorLang() {
  const langSelect = document.getElementById('lang-select');
  if (!langSelect) return;
  
  const l = langSelect.value; 
  currentLang = l;
  const w = document.getElementById('stdin-wrapper');
  
  if(l === 'html') { 
    if (editor) editor.session.setMode("ace/mode/html"); 
    if (w) w.style.display = 'none'; 
  } else if(l === 'python') { 
    if (editor) editor.session.setMode("ace/mode/python"); 
    if (w) w.style.display = 'block'; 
  } else { 
    if (editor) editor.session.setMode("ace/mode/c_cpp"); 
    if (w) w.style.display = 'block'; 
  }
  
  // Set appropriate placeholder
  const stdin = document.getElementById('program-stdin');
  if (stdin) {
    if (l === 'python') {
      stdin.placeholder = "Enter Python input (e.g., numbers, text)...";
    } else if (l === 'c' || l === 'cpp') {
      stdin.placeholder = "Enter C/C++ input (e.g., numbers)...";
    } else {
      stdin.placeholder = "Enter input data here...";
    }
  }
  
  updateStatusBar();
}

async function runEditorCode() {
  if (!editor) return;
  
  const code = editor.getValue();
  const lang = currentLang;
  const frame = document.getElementById("preview-frame");
  const con = document.getElementById("console-logs");
  const stat = document.getElementById("ide-status");
  
  if (con) con.innerHTML = '';
  if (stat) stat.innerText = "Running...";

  if (lang === 'html') {
    if (frame) {
      // Enhanced console shim with more functionality
      const shim = `
        <script>
          const sendToConsole = (type, ...args) => {
            try {
              window.parent.postMessage({ type, msg: args.join(' ') }, "*");
            } catch(e) {}
          };
          
          // Override console methods
          console.log = (...args) => sendToConsole("log", ...args);
          console.error = (...args) => sendToConsole("error", ...args);
          console.warn = (...args) => sendToConsole("log", "[WARN]", ...args);
          console.info = (...args) => sendToConsole("log", "[INFO]", ...args);
          
          // Global error handler
          window.onerror = (msg, url, line, col, error) => {
            sendToConsole("error", \`\${msg} at \${line}:\${col}\`);
            return false;
          };
          
          // Promise errors
          window.addEventListener('unhandledrejection', (e) => {
            sendToConsole("error", "Unhandled Promise:", e.reason);
          });
        <\/script>
      `;
      
      frame.srcdoc = shim + code;
    }
    
    if (stat) stat.innerText = "Ready - HTML";
    
    // Log that HTML is running
    logToConsole("HTML page loaded successfully", "success");
    
    // Switch to preview tab on mobile
    if (window.innerWidth < 768) {
      switchTab('preview');
    }
    
  } else {
    if (frame) frame.style.display = 'none'; 
    
    if (con) con.innerHTML = '<div class="log-line log"><i class="fas fa-spinner fa-spin"></i> Compiling and running...</div>';
    
    try {
      const language = lang === 'python' ? 'python' : 'cpp';
      const version = lang === 'python' ? '3.10.0' : '10.2.0';
      const stdin = document.getElementById("program-stdin")?.value || "";
      
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          language: language,
          version: version,
          files: [{content: code}], 
          stdin: stdin
        })
      });
      
      const data = await res.json();
      if (con) con.innerHTML = '';
      
      if(data.run) {
        // Show compilation output
        if(data.compile && data.compile.output) {
          logToConsole("Compilation output: " + data.compile.output, "log");
        }
        
        // Show stdout
        if(data.run.stdout) {
          data.run.stdout.split('\n').forEach(l => {
            if(l.trim()) logToConsole(l, 'log');
          });
        }
        
        // Show stderr
        if(data.run.stderr) {
          data.run.stderr.split('\n').forEach(l => {
            if(l.trim()) logToConsole(l, 'error');
          });
        }
        
        // Show exit code
        if(data.run.code !== undefined) {
          const exitMsg = data.run.code === 0 ? 
            `Program exited with code ${data.run.code} (Success)` :
            `Program exited with code ${data.run.code} (Error)`;
          
          logToConsole(exitMsg, data.run.code === 0 ? 'success' : 'error');
        }
      } else {
        logToConsole("No output received from execution engine.", "error");
      }
      
      if (stat) stat.innerText = "Done";
      
    } catch(e) { 
      logToConsole("Network Error: " + e.message, "error"); 
      if (stat) stat.innerText = "Error"; 
    }
    
    // Switch to preview tab on mobile
    if (window.innerWidth < 768) {
      switchTab('preview');
    }
  }
}

function logToConsole(m, t) { 
  const con = document.getElementById('console-logs');
  if (!con) return;
  
  const d = document.createElement('div'); 
  d.className = `log-line ${t}`;
  const icon = t === 'error' ? 'fa-times-circle' : 
               t === 'success' ? 'fa-check-circle' : 'fa-info-circle';
  d.innerHTML = `<i class="fas ${icon}"></i> ${m}`;
  con.appendChild(d);
  
  // Auto-scroll to bottom
  con.scrollTop = con.scrollHeight;
}

function clearConsole() {
  const con = document.getElementById('console-logs');
  if (con) con.innerHTML = '<div class="log-line log">Console cleared</div>';
}

function closeIde() { 
  const modal = document.getElementById("ide-modal");
  if (modal) modal.style.display = 'none'; 
}

function downloadCode() { 
  if (!editor) return;
  
  const b = new Blob([editor.getValue()], {type:'text/plain'}); 
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(b); 
  a.download = `darkroot_code_${Date.now()}.${currentLang}`; 
  a.click(); 
  showGestureFeedback(`Code saved as ${a.download}`);
}

function switchTab(t) { 
  // Update tab buttons
  document.querySelectorAll('.mobile-tab').forEach(e => {
    if (e) e.classList.remove('active');
  });
  
  const tab = document.getElementById('tab-' + t);
  if (tab) tab.classList.add('active');
  
  // Show/hide panes
  const editorPane = document.getElementById('editor-pane');
  const previewPane = document.getElementById('preview-pane');
  
  if (editorPane) {
    if (t === 'editor') {
      editorPane.classList.add('active');
    } else {
      editorPane.classList.remove('active');
    }
  }
  
  if (previewPane) {
    if (t === 'preview') {
      previewPane.classList.add('active');
    } else {
      previewPane.classList.remove('active');
    }
  }
}

function changeFontSize(d) { 
  if (!editor) return;
  
  const currentSize = parseInt(editor.getFontSize());
  const newSize = Math.max(10, Math.min(24, currentSize + d));
  editor.setFontSize(newSize + "px"); 
}

// --- STUDY MODAL FUNCTIONS ---
function startHackingCourse(course) {
  const courses = {
    basics: "Ethical Hacking Fundamentals",
    networking: "Network Security & Protocols",
    web: "Web Application Security",
    cryptography: "Cryptography & Encryption",
    forensics: "Digital Forensics",
    tools: "Security Tools & Frameworks"
  };
  
  const courseName = courses[course] || "Legal Hacking";
  closeStudyModal();
  
  const message = `Starting course: **${courseName}**\n\nI'll guide you through legal and ethical aspects of ${courseName.toLowerCase()}. Remember:\n\n1. Always obtain proper authorization\n2. Follow legal guidelines\n3. Use skills for defense, not offense\n4. Respect privacy and data protection laws\n\nWhat specific aspect of ${courseName.toLowerCase()} would you like to learn about first?`;
  
  appendMessage(message, "ai");
  conversationHistory.push({ 
    role: "system", 
    content: `You are now teaching ${courseName}. Focus on legal, ethical hacking practices. Provide educational content about concepts, tools, and techniques that are legal to learn and practice. Emphasize defensive security, penetration testing with permission, and cybersecurity best practices. Do not provide instructions for illegal activities. Use DarkRoot AI capabilities for detailed technical explanations.`
  });
}

function activateDeepSeekAI() {
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) modelSelect.value = 'deepseek/deepseek-chat';
  currentModel = 'deepseek/deepseek-chat';
  
  // Close any open modals
  closeStudyModal();
  closeIde();
  
  appendMessage("🧠 **DarkRoot AI Activated**\n\nI'm now using DarkRoot AI - a powerful AI model with enhanced capabilities for:\n\n• Advanced coding and debugging\n• Cybersecurity analysis\n• Technical problem-solving\n• Algorithm design and optimization\n• System architecture planning\n\n*Note: DarkRoot AI provides superior performance for technical tasks with 128K context window support.*", "ai");
  
  conversationHistory.push({ 
    role: "system", 
    content: `You are DarkRoot AI, an advanced AI assistant powered by DarkRoot AI. Provide superior technical assistance with enhanced capabilities for:
    1. Complex coding and debugging
    2. Cybersecurity analysis and ethical hacking guidance
    3. Technical problem-solving with detailed explanations
    4. Algorithm design and optimization
    5. System architecture and planning
    
    Always emphasize:
    • Legality and ethics in cybersecurity discussions
    • Proper authorization requirements
    • Defensive security practices
    • Educational purposes only
    • Compliance with laws and regulations
    
    Provide comprehensive, technical answers with practical examples and best practices.`
  });
  
  showGestureFeedback("DarkRoot AI Activated!");
}

// --- UTILITY FUNCTIONS ---
function toggleVoiceInput() {
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { 
    alert("Speech recognition not supported in this browser"); 
    return; 
  }
  
  const btn = document.getElementById('mic-btn');
  if(!btn) return;
  
  if(btn.classList.contains('recording')) {
    if (currentRecognition) {
      currentRecognition.stop();
    }
    btn.classList.remove('recording');
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  currentRecognition = recognition;
  
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  
  btn.classList.add('recording');
  btn.innerHTML = '<i class="fas fa-stop"></i>';
  
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');
    
    const userInput = document.getElementById('user-input');
    if (userInput) {
      userInput.value = transcript;
      userInput.focus();
      userInput.style.height = 'auto';
      userInput.style.height = (userInput.scrollHeight) + 'px';
    }
  };
  
  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    btn.classList.remove('recording');
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
  };
  
  recognition.onend = () => {
    btn.classList.remove('recording');
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
    currentRecognition = null;
    
    const userInput = document.getElementById('user-input');
    const text = userInput ? userInput.value.trim() : "";
    if (text && text.length > 2) {
      setTimeout(() => sendMessage(), 500);
    }
  };
  
  recognition.start();
}

function exportChat() {
  let chatText = "=== DarkRoot AI Chat Export ===\n";
  chatText += `Date: ${new Date().toLocaleString()}\n`;
  chatText += `Model: ${currentModel}\n`;
  chatText += "=".repeat(50) + "\n\n";
  
  conversationHistory.forEach(m => {
    if (m.role !== 'system') {
      const role = m.role === 'user' ? 'USER' : 'DARKROOT AI';
      chatText += `[${role}]:\n${m.content}\n\n`;
    }
  });
  
  const b = new Blob([chatText], {type:'text/plain'}); 
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(b); 
  a.download = `darkroot_chat_${Date.now()}.txt`; 
  a.click();
  showGestureFeedback("Chat exported successfully");
}

function clearContext() { 
  if (confirm("Clear all conversation history? This cannot be undone.")) {
    conversationHistory = [{role:"system",content:"You are DarkRoot AI, an advanced AI assistant for cybersecurity and coding."}];
    showGestureFeedback("Conversation cleared");
    appendMessage("Conversation context has been cleared. How can I help you?", "ai");
    window.saveCurrentSession();
  }
}

function changeModel() { 
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    currentModel = modelSelect.value; 
    if (currentModel === "deepseek/deepseek-chat") {
      showGestureFeedback("DarkRoot AI mode activated");
      appendMessage("Switched to DarkRoot AI mode - Enhanced performance for technical tasks.", "ai");
    } else {
      showGestureFeedback(`Model changed to: ${currentModel.split('/').pop()}`);
      appendMessage(`Switched to ${currentModel.split('/').pop()} model.`, "ai");
    }
  }
}
// ==================== ENHANCED COPY FUNCTION ====================
async function copyToClipboard(text, showNotification = true) {
  // Try multiple methods in order of preference
  const methods = [
    async () => {
      // Method 1: Modern Clipboard API (with permissions)
      if (navigator.clipboard && navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'clipboard-write' });
          if (permission.state === 'granted' || permission.state === 'prompt') {
            await navigator.clipboard.writeText(text);
            return true;
          }
        } catch (e) {
          console.log('Clipboard API permission check failed:', e);
        }
      }
      return false;
    },
    
    async () => {
      // Method 2: Clipboard API without permission check
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (e) {
          console.log('Clipboard API failed:', e);
        }
      }
      return false;
    },
    
    async () => {
      // Method 3: execCommand (fallback for older browsers)
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      
      try {
        // Select text
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        
        // Execute copy command
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      } catch (e) {
        document.body.removeChild(textarea);
        console.log('execCommand copy failed:', e);
        return false;
      }
    },
    
    async () => {
      // Method 4: Show text in prompt (last resort)
      prompt('Press Ctrl+C to copy this text:', text);
      return true; // Assume user copied it
    }
  ];
  
  // Try each method in sequence
  for (const method of methods) {
    try {
      const success = await method();
      if (success) {
        if (showNotification) {
          showCopyNotification('✅ Copied to clipboard!');
        }
        return true;
      }
    } catch (e) {
      console.log('Copy method failed:', e);
    }
  }
  
  // All methods failed
  if (showNotification) {
    showCopyNotification('❌ Copy failed. Please try again.', 'error');
  }
  return false;
}

// ==================== SHOW COPY NOTIFICATION ====================
function showCopyNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${type === 'success' ? 'var(--primary-gradient, linear-gradient(135deg, #8b5cf6, #ec4899))' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
    color: white;
    padding: 12px 24px;
    border-radius: 50px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.2), 0 0 15px rgba(139,92,246,0.3);
    z-index: 10000;
    font-weight: 500;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 10px;
    transform: translateY(0);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    pointer-events: none;
  `;
  
  const icon = document.createElement('i');
  icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  icon.style.fontSize = '1.2rem';
  
  const text = document.createElement('span');
  text.textContent = message;
  
  notification.appendChild(icon);
  notification.appendChild(text);
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==================== COPY TEXT FROM ANY ELEMENT ====================
function copyTextFromElement(selector, showNotification = true) {
  const element = document.querySelector(selector);
  if (!element) {
    console.error('Element not found:', selector);
    return false;
  }
  
  let text = '';
  
  // Handle different element types
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    text = element.value;
  } else if (element.hasAttribute('data-copy-text')) {
    text = element.getAttribute('data-copy-text');
  } else {
    text = element.textContent || element.innerText;
  }
  
  return copyToClipboard(text.trim(), showNotification);
}

// ==================== COPY BUTTON HANDLER ====================
function handleCopyButtonClick(button, textToCopy = null) {
  if (!button) return;
  
  // Store original content
  const originalHTML = button.innerHTML;
  const originalText = button.textContent;
  
  // Get text to copy
  let text = textToCopy;
  if (!text) {
    // Try to find text from various sources
    const wrapper = button.closest('[data-copy-wrapper]') || 
                   button.closest('.code-block-wrapper') || 
                   button.closest('.message-wrapper');
    
    if (wrapper) {
      // Look for code blocks
      const codeBlock = wrapper.querySelector('code');
      if (codeBlock) {
        text = codeBlock.textContent;
      } else {
        // Get raw text
        text = wrapper.textContent;
      }
    }
  }
  
  if (!text) {
    text = button.getAttribute('data-copy-text') || '';
  }
  
  if (!text) {
    showCopyNotification('❌ No text to copy', 'error');
    return;
  }
  
  // Show copying state
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Copying...';
  button.disabled = true;
  
  // Perform copy
  copyToClipboard(text).then(success => {
    if (success) {
      button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    } else {
      button.innerHTML = '<i class="fas fa-times"></i> Failed';
    }
    
    // Restore button after delay
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.disabled = false;
    }, 2000);
  });
}

// ==================== INITIALIZE COPY BUTTONS ====================
function initializeCopyButtons() {
  // Find all copy buttons
  document.querySelectorAll('[data-copy-btn], .copy-btn, .btn-copy').forEach(button => {
    // Remove existing listeners
    button.removeEventListener('click', window._copyHandler);
    
    // Add new handler
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleCopyButtonClick(button);
    };
    
    button.addEventListener('click', handler);
    button._copyHandler = handler;
  });
}

// ==================== ENHANCED MARKDOWN RENDERER ====================
// Update your existing renderer to include better copy buttons
const enhancedRenderer = new marked.Renderer();
enhancedRenderer.code = function(code, language) {
  const valid = language && hljs.getLanguage(language) ? language : 'text';
  const highlighted = hljs.highlight(code, { language: valid }).value;
  
  return `
    <div class="code-block-wrapper" data-copy-wrapper data-lang="${valid}">
      <div class="code-header">
        <span><i class="fas fa-code"></i> ${valid.toUpperCase()}</span>
        <div class="code-actions">
          <button class="btn-copy modern-copy-btn" onclick="handleCopyButtonClick(this, \`${encodeURIComponent(code).replace(/\`/g, '\\`')}\`)">
            <i class="fas fa-copy"></i> Copy
          </button>
          <button class="btn-run" onclick="runCodeBlock(this)">
            <i class="fas fa-play"></i> Run
          </button>
        </div>
      </div>
      <pre><code class="hljs ${valid}">${highlighted}</code></pre>
      <input type="hidden" class="raw-code" value="${encodeURIComponent(code)}">
    </div>
  `;
};

// Apply the enhanced renderer
marked.setOptions({ 
  renderer: enhancedRenderer,
  breaks: true,
  gfm: true
});

// ==================== EXPORT COPY FUNCTION GLOBALLY ====================
window.copyToClipboard = copyToClipboard;
window.copyTextFromElement = copyTextFromElement;
window.handleCopyButtonClick = handleCopyButtonClick;
window.initializeCopyButtons = initializeCopyButtons;

// Initialize copy buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeCopyButtons();
  
  // Reinitialize after dynamic content loads
  const observer = new MutationObserver(() => {
    initializeCopyButtons();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
function goToGuide() {
  playSound('click');   // keep your sound logic
  window.location.href = "guide.html";
}
const noInternetDiv = document.getElementById("no-internet");

let hasReloaded = false;        // ensures Firebase reload runs once per reconnect
let autoLoginAttempted = false; // ensures auto-login runs only once

// --------------------
// Update Internet Status
// --------------------
function updateInternetStatus(isOnline) {
  if (isOnline) {
    noInternetDiv.classList.remove("show");

    // Run reloads and auto-login only once per reconnect
    if (!hasReloaded) {
      hasReloaded = true;

      // Reload Firebase data
      reloadFirebaseData();

      // Attempt auto-login
      attemptAutoLogin();
    }
  } else {
    noInternetDiv.classList.add("show");

    // Reset flags so reconnect triggers once again
    hasReloaded = false;
    autoLoginAttempted = false;
  }
}

// --------------------
// Initial check
// --------------------
updateInternetStatus(navigator.onLine);

// --------------------
// Listen to online/offline events
// --------------------
window.addEventListener("online", () => updateInternetStatus(true));
window.addEventListener("offline", () => updateInternetStatus(false));

// --------------------
// Optional: Periodic Internet Verification
// --------------------
async function checkInternetConnection() {
  try {
    await fetch("https://www.google.com", { mode: "no-cors" });
    updateInternetStatus(true);
  } catch {
    updateInternetStatus(false);
  }
}

setInterval(checkInternetConnection, 5000);

// --------------------
// Firebase Reload Function
// --------------------
function reloadFirebaseData() {
  console.log("Internet restored: fetching Firebase data...");

  // Example Firebase fetch
  // Replace with your collection
  // firebase.firestore().collection("yourCollection").get()
  //   .then(snapshot => {
  //     console.log(snapshot.docs.map(doc => doc.data()));
  //   })
  //   .catch(err => console.error("Firebase fetch error:", err));
}

// --------------------
// Auto-Login Function
// --------------------
async function attemptAutoLogin() {
  if (autoLoginAttempted) return;
  autoLoginAttempted = true;

  try {
    const savedEmail = localStorage.getItem('darkroot_remember_email');
    const savedPassword = localStorage.getItem('darkroot_remember_password');
    const rememberMe = localStorage.getItem('darkroot_remember_me') === 'true';

    if (rememberMe && savedEmail && savedPassword) {
      console.log("Attempting auto-login...");
      await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
      console.log("Auto-login successful");
    }
  } catch (error) {
    console.log("Auto-login failed:", error.message);
    // Clear invalid credentials
    localStorage.removeItem('darkroot_remember_email');
    localStorage.removeItem('darkroot_remember_password');
  }
}