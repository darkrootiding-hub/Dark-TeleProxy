  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
  import { getDatabase, ref, child, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

  const firebaseConfig = { 
    apiKey: "AIzaSyBw9l9Zc0sUosH2Vtx1BgY9sqQOFtoQmmI", 
    authDomain: "darkroot-ai.firebaseapp.com", 
    databaseURL: "https://darkroot-ai-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "darkroot-ai", 
    storageBucket: "darkroot-ai.firebasestorage.app", 
    messagingSenderId: "996214418394", 
    appId: "1:996214418394:web:24d0fc6457b491eb43aee3" 
  };
  
  let app, auth, db, rtdb, currentUser, userData = {};
  let autoLoginAttempted = false;

  async function initFirebase() {
    try {
      app = initializeApp(firebaseConfig); 
      auth = getAuth(app); 
      db = getFirestore(app); 
      rtdb = getDatabase(app);
      
      // Make Firebase services available globally
      window.firebaseAuth = auth;
      window.firestore = db;
      window.rtdb = rtdb;
      window.fbDoc = doc;
      window.fbGetDoc = getDoc;
      window.fbSetDoc = setDoc;
      window.fbCollection = collection;
      window.fbAddDoc = addDoc;
      window.fbGetDocs = getDocs;
      window.fbDeleteDoc = deleteDoc;
      window.fbQuery = query;
      window.fbWhere = where;
      
      // Set persistence for auto-login
      await setPersistence(auth, browserLocalPersistence);
      
      console.log("Firebase Online - DarkRoot AI");
      
      // Load API Key
      const dbRef = ref(rtdb);
      try {
        const snap = await get(child(dbRef, `config/api_key`));
        if (snap.exists()) { 
          window.OPENROUTER_API_KEY = snap.val(); 
          console.log("OpenRouter API Key Loaded"); 
        } else {
          console.warn("API key not found in database");
        }
      } catch (err) { 
        console.warn("Key Fetch Error", err); 
      }
      
      setupAuth();
      loadCustomPrompts();
      attemptAutoLogin();
      
      // Load dynamic content after Firebase is ready
      setTimeout(() => {
        if (window.loadDynamicContent) window.loadDynamicContent();
        if (window.loadAITraining) window.loadAITraining();
      }, 1000);
      
    } catch (e) { 
      console.error("Firebase Error", e); 
    }
  }

  function setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      const authStatus = document.getElementById('auth-status');
      const loginBtn = document.getElementById('login-btn');
      const logoutBtn = document.getElementById('logout-btn');
      const userPanel = document.getElementById('user-panel');
      const userDisplayName = document.getElementById('user-display-name');
      const userDisplayEmail = document.getElementById('user-display-email');
      const userAvatar = document.getElementById('user-avatar');
      
      if (user) {
        currentUser = user; 
        if (authStatus) authStatus.innerText = user.email || "User";
        
        if (loginBtn) loginBtn.style.display = 'none'; 
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        // Show user panel
        if (userPanel) userPanel.style.display = 'flex';
        if (userDisplayName) userDisplayName.innerText = user.displayName || user.email.split('@')[0] || "User";
        if (userDisplayEmail) userDisplayEmail.innerText = user.email || "";
        if (userAvatar) userAvatar.innerText = (user.displayName || user.email || "U")[0].toUpperCase();
        
        // Load user sessions
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists() && docSnap.data().sessions) { 
            window.sessions = JSON.parse(JSON.stringify(docSnap.data().sessions)); 
            if (window.renderHistoryList) window.renderHistoryList();
          }
          userData = docSnap.exists() ? docSnap.data() : {};
        } catch(e) {
          console.error("Error loading user data:", e);
        }
      } else {
        if (authStatus) authStatus.innerText = "Guest Mode";
        if (loginBtn) loginBtn.style.display = 'block'; 
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userPanel) userPanel.style.display = 'none';
      }
    });
  }

  // Auto-login function
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

  // EXPORTED FUNCTIONS
  window.openAuthModal = () => { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'flex'; 
    window.toggleSidebar(false); 
  }
  
  window.closeAuthModal = () => { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none'; 
    
    const nameInput = document.getElementById('auth-name');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
  }
  
  window.toggleAuthMode = () => { 
    window.isSignUp = !window.isSignUp; 
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit');
    const authSwitchText = document.getElementById('auth-switch-text');
    
    if (authTitle) authTitle.innerText = window.isSignUp ? "Create Account" : "Login"; 
    if (authSubmit) authSubmit.innerText = window.isSignUp ? "Sign Up" : "Login"; 
    if (authSwitchText) authSwitchText.innerText = window.isSignUp ? "Already have an account? Login" : "Don't have an account? Sign up";
  }
  
  window.isSignUp = false;
  
  window.handleAuth = async () => {
    const name = document.getElementById('auth-name')?.value?.trim() || "";
    const email = document.getElementById('auth-email')?.value?.trim() || "";
    const password = document.getElementById('auth-password')?.value || "";
    const rememberMe = document.getElementById('remember-me')?.checked || false;
    
    if (!name && window.isSignUp) {
      alert("Please enter your name");
      return;
    }
    
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    
    try { 
      if(window.isSignUp) {
        // Create user with email/password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update profile with name
        await updateProfile(userCredential.user, { displayName: name });
        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: name,
          email: email,
          createdAt: new Date().toISOString(),
          sessions: [],
          preferences: {
            theme: 'dark',
            autoLogin: rememberMe,
            defaultModel: 'deepseek/deepseek-chat'
          }
        });
        
        if (rememberMe) {
          localStorage.setItem('darkroot_remember_email', email);
          localStorage.setItem('darkroot_remember_password', password);
          localStorage.setItem('darkroot_remember_me', 'true');
        }
        
        alert("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        
        if (rememberMe) {
          localStorage.setItem('darkroot_remember_email', email);
          localStorage.setItem('darkroot_remember_password', password);
          localStorage.setItem('darkroot_remember_me', 'true');
        } else {
          localStorage.removeItem('darkroot_remember_email');
          localStorage.removeItem('darkroot_remember_password');
          localStorage.setItem('darkroot_remember_me', 'false');
        }
      }
      window.closeAuthModal();
    } catch(err) { 
      alert("Authentication Error: " + err.message); 
    }
  }
  
  window.logout = () => { 
    localStorage.removeItem('darkroot_remember_email');
    localStorage.removeItem('darkroot_remember_password');
    localStorage.setItem('darkroot_remember_me', 'false');
    
    signOut(auth).then(() => { 
      if (window.sessions) window.sessions = []; 
      localStorage.removeItem('darkroot_sessions'); 
      if (window.startNewChat) window.startNewChat(); 
      if (window.renderHistoryList) window.renderHistoryList(); 
      alert("Logged out successfully");
    }); 
  }
  
  // Save sessions to Firestore
  const oldSave = window.saveCurrentSession;
  window.saveCurrentSession = function() { 
    if (oldSave) oldSave(); 
    if(currentUser && window.sessions) {
      try { 
        setDoc(doc(db, "users", currentUser.uid), { 
          sessions: window.sessions,
          lastActive: new Date().toISOString()
        }, { merge: true }); 
      } catch(e){
        console.error("Error saving session:", e);
      }
    }
  }
  
  // Custom Prompts Functions
  window.customPrompts = [];
  
  async function loadCustomPrompts() {
    try {
      let promptsRef;
      if (currentUser) {
        // Load user's prompts
        promptsRef = query(collection(db, "custom_prompts"), where("createdBy", "==", currentUser.uid));
      } else {
        // Load public prompts
        promptsRef = query(collection(db, "custom_prompts"), where("isPublic", "==", true));
      }
      
      const snapshot = await getDocs(promptsRef);
      window.customPrompts = [];
      snapshot.forEach(doc => {
        window.customPrompts.push({ id: doc.id, ...doc.data() });
      });
      console.log("Loaded custom prompts:", window.customPrompts.length);
      
      // Update UI
      updatePromptSuggestions();
    } catch (error) {
      console.error("Error loading prompts:", error);
      window.customPrompts = [];
    }
  }
  
  window.addCustomPrompt = async function() {
    const title = document.getElementById('new-prompt-title')?.value?.trim() || "";
    const content = document.getElementById('new-prompt-content')?.value?.trim() || "";
    
    if (!title || !content) {
      alert("Please enter both title and content");
      return;
    }
    
    try {
      await addDoc(collection(db, "custom_prompts"), {
        title: title,
        content: content,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.uid : "guest",
        isPublic: false
      });
      
      const titleInput = document.getElementById('new-prompt-title');
      const contentInput = document.getElementById('new-prompt-content');
      if (titleInput) titleInput.value = '';
      if (contentInput) contentInput.value = '';
      
      await loadCustomPrompts();
      alert("Prompt added successfully!");
    } catch (error) {
      console.error("Error adding prompt:", error);
      alert("Error adding prompt. Please Sign In First.");
    }
  }
  
  window.deleteCustomPrompt = async function(id) {
    if (!confirm("Delete this prompt?")) return;
    
    try {
      await deleteDoc(doc(db, "custom_prompts", id));
      await loadCustomPrompts();
      window.openPromptManager();
    } catch (error) {
      console.error("Error deleting prompt:", error);
      alert("Error deleting prompt: " + error.message);
    }
  }
  
  window.openPromptManager = function() {
    const modal = document.getElementById('prompt-modal');
    const list = document.getElementById('prompt-list');
    toggleSidebar(false);
    
    if (!modal || !list) {
      console.error("Prompt modal elements not found");
      return;
    }
    
    list.innerHTML = '<h4>Saved Prompts</h4>';
    
    if (!window.customPrompts || window.customPrompts.length === 0) {
      list.innerHTML += '<div style="color:var(--text-secondary); padding:20px; text-align:center; border:1px dashed var(--border-color); border-radius:12px;">No custom prompts yet. Add your first prompt below!</div>';
    } else {
      window.customPrompts.forEach(prompt => {
        const div = document.createElement('div');
        div.className = 'prompt-suggestion';
        div.style.marginBottom = '12px';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="flex:1;">
              <strong style="color:var(--text-primary);">${prompt.title || 'Untitled'}</strong>
              <div style="margin-top:5px; font-size:0.9rem; color:var(--text-secondary);">${(prompt.content || '').substring(0, 100)}${prompt.content.length > 100 ? '...' : ''}</div>
            </div>
            <button onclick="deleteCustomPrompt('${prompt.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; padding:5px 10px; border-radius:6px;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        div.onclick = (e) => {
          if (!e.target.closest('button')) {
            const userInput = document.getElementById('user-input');
            if (userInput) {
              userInput.value = prompt.content || '';
              userInput.focus();
              userInput.style.height = 'auto';
              userInput.style.height = (userInput.scrollHeight) + 'px';
            }
            window.closePromptManager();
          }
        };
        list.appendChild(div);
      });
    }
    
    modal.style.display = 'flex';
  }
  
  window.closePromptManager = function() {
    const modal = document.getElementById('prompt-modal');
    if (modal) modal.style.display = 'none';
  }
  
  function updatePromptSuggestions() {
    const suggestionsDiv = document.getElementById('prompt-suggestions');
    if (!suggestionsDiv) return;
    
    suggestionsDiv.innerHTML = `
      <div style="margin-bottom:15px; color:var(--primary); font-size:0.9rem; font-weight:600;">
        <i class="fas fa-lightbulb"></i> Try these prompts:
      </div>
    `;
    
    // Default suggestions with DarkRoot AI focus
    const defaultPrompts = [
      "Explain how to perform ethical penetration testing on a web application",
      "Write a Python script to scan open ports on a network (educational purposes only)",
      "How does encryption work in modern cybersecurity?",
      "Create a secure login system with Python Flask and SQLAlchemy",
      "Explain the differences between symmetric and asymmetric encryption"
    ];
    
    // Add custom prompts if available (max 3)
    const customPrompts = window.customPrompts && window.customPrompts.length > 0 
      ? window.customPrompts.slice(0, 3).map(p => p.content || '').filter(p => p.length > 0)
      : [];
    
    const allPrompts = [...customPrompts, ...defaultPrompts].slice(0, 5);
    
    allPrompts.forEach(prompt => {
      const div = document.createElement('div');
      div.className = 'prompt-suggestion';
      div.textContent = prompt.length > 80 ? prompt.substring(0, 80) + '...' : prompt;
      div.onclick = () => {
        const userInput = document.getElementById('user-input');
        if (userInput) {
          userInput.value = prompt;
          userInput.focus();
          userInput.style.height = 'auto';
          userInput.style.height = (userInput.scrollHeight) + 'px';
        }
        suggestionsDiv.style.display = 'none';
      };
      suggestionsDiv.appendChild(div);
    });
  }
  
  window.showPromptSuggestions = function() {
    const suggestionsDiv = document.getElementById('prompt-suggestions');
    if (!suggestionsDiv) return;
    
    updatePromptSuggestions();
    suggestionsDiv.style.display = 'block';
    suggestionsDiv.scrollIntoView({ behavior: 'smooth' });
  };
  
  initFirebase();