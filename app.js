// Process scripture data into organized structure
function processScriptureData(rawData) {
    const organized = {
        "Old Testament": [],
        "New Testament": [],
        "Book of Mormon": [],
        "Doctrine and Covenants": [],
        "Pearl of Great Price": []
    };

    rawData.forEach((scripture, index) => {
        const ref = scripture.reference;
        let category = "";
        
        // Parse reference to get book, chapter, verse
        // Updated regex to handle D&C with ampersand
        const parts = ref.match(/^([\d\s]*[A-Za-z\s\.&—]+)\s+([\d:–]+)/);
        if (!parts) {
            console.warn('Could not parse reference:', ref);
            return;
        }
        
        const book = parts[1].trim();
        const verseRef = parts[2];
        
        // Parse chapter and verse
        let chapter, verse;
        if (verseRef.includes(':')) {
            const [ch, v] = verseRef.split(':');
            chapter = parseInt(ch);
            verse = v;
        } else {
            chapter = parseInt(verseRef);
            verse = verseRef;
        }
        
        // Categorize by book - check D&C first since it contains an ampersand
        if (ref.startsWith('D&C')) {
            category = "Doctrine and Covenants";
        } else if (['Gen', 'Ex', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', 
                '1 Sam', '2 Sam', '1 Kgs', '2 Kgs', '1 Chr', '2 Chr',
                'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song',
                'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hosea', 'Joel', 'Amos',
                'Obad', 'Jonah', 'Micah', 'Nahum', 'Hab', 'Zeph', 'Hag', 
                'Zech', 'Mal'].some(b => ref.startsWith(b))) {
            category = "Old Testament";
        } else if (['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', 
                    '1 Cor', '2 Cor', 'Gal', 'Eph', 'Philip', 'Col',
                    '1 Thes', '2 Thes', '1 Tim', '2 Tim', 'Titus', 'Philem',
                    'Heb', 'James', '1 Pet', '2 Pet', '1 Jn', '2 Jn', '3 Jn',
                    'Jude', 'Rev'].some(b => ref.startsWith(b))) {
            category = "New Testament";
        } else if (['1 Ne', '2 Ne', '3 Ne', '4 Ne', 'Jacob', 'Enos', 'Jarom',
                    'Omni', 'W of M', 'Mosiah', 'Alma', 'Hel', 'Morm', 'Ether',
                    'Moro'].some(b => ref.startsWith(b))) {
            category = "Book of Mormon";
        } else if (['Moses', 'Abr', 'JS—M', 'JS—H', 'A of F'].some(b => ref.startsWith(b))) {
            category = "Pearl of Great Price";
        }
        
        if (category) {
            organized[category].push({
                book: book,
                chapter: chapter,
                verse: verse,
                text: scripture.text,
                reference: scripture.reference,
                id: `scripture-${index}`
            });
        }
    });
    
    // Debug log to see what's being categorized
    console.log('Scripture categorization:');
    Object.entries(organized).forEach(([key, value]) => {
        console.log(`${key}: ${value.length} scriptures`);
    });
    
    return organized;
}

const scriptureData = processScriptureData(rawScriptureData);

// State management
let currentUser = null;
let readScriptures = new Set();

// Initialize app
function initApp() {
    // Set up Firebase auth state listener
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
            console.log('User signed in:', user.email);
        } else {
            console.log('User signed out or anonymous');
        }
        
        // Update UI and load data
        updateUserInfo();
        await loadUserData();
        renderScriptures();
        updateStats();
    });
    
    // Check if user has seen the welcome guide
    const hasSeenGuide = localStorage.getItem('hasSeenWelcomeGuide');
    
    if (!hasSeenGuide) {
        showWelcomeGuide();
    }

    const statsContent = document.getElementById('statsContent');
    if (statsContent) {
        // Must be done after all content is rendered to get correct scrollHeight
        statsContent.style.maxHeight = statsContent.scrollHeight + 'px';
    }
    
    // Close modal on click outside
    window.onclick = function(event) {
        const modal = document.getElementById('authModal');
        if (event.target === modal) {
            closeAuthModal();
        }
    }
}

// Show welcome guide
function showWelcomeGuide() {
    Swal.fire({
        title: 'Welcome to President Nelson\'s Scripture Challenge!',
        html: `
            <div class="guide-list">
                <div class="guide-item">
                    <span class="guide-icon">
                        <i class="fas fa-save"></i>
                    </span>
                    <div class="guide-text">
                        <strong>Save Your Progress:</strong><br>
                        Stay logged out to save progress only on this device, or sign in to sync across multiple devices.
                    </div>
                </div>
                <div class="guide-item">
                    <span class="guide-icon">
                        <i class="fa-solid fa-book"></i>
                    </span>
                    <div class="guide-text">
                        <strong>Track Your Reading:</strong><br>
                        Tap any scripture to mark it as read.
                    </div>
                </div>
                <div class="guide-item">
                    <span class="guide-icon">
                        <i class="fa-solid fa-link"></i>
                    </span>
                    <div class="guide-text">
                        <strong>Read on Church Website:</strong><br>
                        Double tap/click any scripture to open it in the Gospel Library or on the Church's website.
                    </div>
                </div>
                <div class="guide-item">
                    <span class="guide-icon"
                        <i class="fa-solid fa-repeat"></i>
                    </span>
                    <div class="guide-text">
                        <strong>Start Fresh:</strong><br>
                        Restart button is at the bottom.
                    </div>
                </div>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Let\'s Get Started!',
        width: '600px',
        confirmButtonColor: '#007da5',
        didClose: () => {
            localStorage.setItem('hasSeenWelcomeGuide', 'true');
        }
    });
}

// Confirm restart challenge
function confirmRestart() {
    Swal.fire({
        title: 'Are you sure you want to restart?',
        text: 'This will reset all your progress and mark all scriptures as unread.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, restart!',
        cancelButtonText: 'Cancel',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            restartChallenge();
        }
    });
}

// Restart challenge
async function restartChallenge() {
    // Clear the read scriptures
    readScriptures.clear();
    
    if (currentUser) {
        // Clear Firebase data for logged-in user
        try {
            await db.collection('users').doc(currentUser.uid).update({
                readScriptures: [],
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Cleared Firestore data for user:', currentUser.uid);
        } catch (error) {
            console.error('Error clearing Firestore data:', error);
        }
        
        // Clear local storage for logged-in user
        localStorage.removeItem(`scriptures_${currentUser.uid}`);
        localStorage.removeItem(`streak_${currentUser.uid}`);
        localStorage.removeItem(`lastRead_${currentUser.uid}`);
    } else {
        // Clear anonymous user data
        localStorage.removeItem('scriptures_anonymous');
        localStorage.removeItem('streak_anonymous');
        localStorage.removeItem('lastRead_anonymous');
    }
    
    // Re-render everything
    renderScriptures();
    updateStats();
    
    // Show success message
    Swal.fire({
        title: 'Challenge Restarted!',
        text: 'Your progress has been reset. Time for a fresh start!',
        icon: 'success',
        confirmButtonColor: '#007da5',
        confirmButtonText: 'Let\'s Go!',
        timer: 3000,
        timerProgressBar: true
    });
}

// Show auth modal
function showAuthModal() {
    document.getElementById('authModal').classList.add('show');
}

// Close auth modal
function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
}

// Handle OAuth login with Google
async function handleLogin(provider) {
    try {
        let authProvider;
        
        // For now, we'll only implement Google OAuth since it's most commonly used
        // You can add other providers later following similar pattern
        if (provider === 'google') {
            authProvider = new firebase.auth.GoogleAuthProvider();
        } else {
            // For other providers, show a message
            showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login coming soon! Please use Google for now.`);
            return;
        }
        
        // Sign in with popup
        const result = await auth.signInWithPopup(authProvider);
        
        // User is signed in - auth state listener will handle the rest
        closeAuthModal();
        showToast(`Successfully signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error codes
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Sign in cancelled');
        } else if (error.code === 'auth/network-request-failed') {
            showToast('Network error. Please check your connection.');
        } else {
            showToast('Sign in failed. Please try again.');
        }
    }
}

// Handle logout
async function handleLogout() {
    try {
        // Save data before logout
        await saveUserData();
        
        // Sign out from Firebase
        await auth.signOut();
        
        // currentUser will be set to null by auth state listener
        showToast("Successfully signed out!");
    } catch (error) {
        console.error('Logout error:', error);
        showToast("Error signing out. Please try again.");
    }
}

// Update user info display
function updateUserInfo() {
    const userInfo = document.getElementById('userInfo');
    
    if (currentUser) {
        // Get first letter of display name or email
        const initial = (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase();
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        
        userInfo.innerHTML = `
            <div class="user-avatar">${initial}</div>
            <span style="color: white; font-weight: 500;">${displayName}</span>
            <button class="logout-btn" onclick="handleLogout()">Sign Out</button>
        `;
    } else {
        userInfo.innerHTML = `
            <button class="login-btn" onclick="showAuthModal()">Sign In</button>
        `;
    }
    
    // Show the user info section
    userInfo.style.display = 'flex';
}

// Load user data with fallback to localStorage
async function loadUserData() {
    if (currentUser) {
        // Load from Firestore for logged-in users
        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                readScriptures = new Set(data.readScriptures || []);
                console.log('Loaded from Firestore:', readScriptures.size, 'scriptures');
            } else {
                // First time user - create document
                await db.collection('users').doc(currentUser.uid).set({
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    readScriptures: [],
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                readScriptures = new Set();
                console.log('Created new Firestore document for user');
            }
        } catch (error) {
            console.error('Error loading from Firestore:', error);
            // Fallback to localStorage if Firestore fails
            loadFromLocalStorage();
        }
    } else {
        // Load from localStorage for anonymous users
        loadFromLocalStorage();
    }
}

// Load from localStorage
function loadFromLocalStorage() {
    // Load for current user or anonymous
    const storageKey = currentUser ? `scriptures_${currentUser.uid}` : 'scriptures_anonymous';
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        readScriptures = new Set(JSON.parse(savedData));
    }
}

// Save user data with fallback to localStorage
async function saveUserData() {
    if (currentUser) {
        // Save to Firestore for logged-in users
        try {
            await db.collection('users').doc(currentUser.uid).update({
                readScriptures: Array.from(readScriptures),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Saved to Firestore:', readScriptures.size, 'scriptures');
            // Also save to localStorage as backup
            saveToLocalStorage();
        } catch (error) {
            console.error('Error saving to Firestore:', error);
            // Fallback to localStorage if Firestore fails
            saveToLocalStorage();
        }
    } else {
        // Save to localStorage for anonymous users
        saveToLocalStorage();
    }
}

// Save to localStorage
function saveToLocalStorage() {
    const storageKey = currentUser ? `scriptures_${currentUser.uid}` : 'scriptures_anonymous';
    localStorage.setItem(storageKey, JSON.stringify(Array.from(readScriptures)));
}

function renderScriptures() {
    const container = document.getElementById('scriptureBooks');
    container.innerHTML = '';
    
    Object.entries(scriptureData).forEach(([bookName, scriptures]) => {
        if (scriptures.length > 0) {
            const bookSection = createBookSection(bookName, scriptures);
            container.appendChild(bookSection);
        }
    });
}

// Create a book section
function createBookSection(bookName, scriptures) {
    const section = document.createElement('div');
    section.className = 'book-section';
    section.id = bookName.replace(/\s+/g, '-');
    
    const header = document.createElement('div');
    header.className = 'book-header';
    header.onclick = () => toggleBook(section);
    
    const readCount = scriptures.filter(s => readScriptures.has(s.id)).length;
    const percentage = Math.round((readCount / scriptures.length) * 100);
    
    header.innerHTML = `
        <div>
            <div class="book-title">${bookName}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 5px;">
                ${readCount} / ${scriptures.length} read (${percentage}%)
            </div>
        </div>
        <span class="expand-icon">
            <i class="fas fa-chevron-right"></i>
        </span>
    `;
    
    const scripturesContainer = document.createElement('div');
    scripturesContainer.className = 'scriptures-container';
    
    scriptures.forEach(scripture => {
        const card = createScriptureCard(scripture, bookName);
        scripturesContainer.appendChild(card);
    });
    
    section.appendChild(header);
    section.appendChild(scripturesContainer);
    
    return section;
}

// 🔽 NEW/UPDATED: Toggle book expansion and minimize all others
function toggleBook(section) {
    const isExpanding = !section.classList.contains('expanded');

    // 1. Collapse ALL sections first
    document.querySelectorAll('.book-section').forEach(s => {
        s.classList.remove('expanded');
        s.querySelector('.scriptures-container').style.maxHeight = '0';
    });

    // 2. Collapse the Stats section
    const statsSection = document.getElementById('statsSection');
    const statsContent = document.getElementById('statsContent');
    const statsIcon = document.getElementById('statsExpandIcon');
    
    if (!statsSection.classList.contains('collapsed')) {
        statsSection.classList.add('collapsed');
        statsContent.style.maxHeight = '0';
        statsIcon.textContent = '▶';
    }

    // 3. If a book was clicked, expand it (after everything else is collapsed)
    if (isExpanding) {
        section.classList.add('expanded');
        const container = section.querySelector('.scriptures-container');
        // Set max-height for smooth transition
        container.style.maxHeight = container.scrollHeight + 'px'; 
    }
}

// 🔽 UPDATED: Toggle stats function (must now keep track of max-height)
function toggleStats() {
    const statsSection = document.getElementById('statsSection');
    const content = document.getElementById('statsContent');
    const iconSpan = document.getElementById('statsExpandIcon');
    const icon = iconSpan.querySelector('i'); // Target the <i> element
    
    // If stats is currently collapsed and we are expanding it
    if (statsSection.classList.contains('collapsed')) {
        // Expand
        statsSection.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.classList.remove('fa-chevron-right'); // Collapsed icon
        icon.classList.add('fa-chevron-down'); // Expanded icon
    } else {
        // Collapse
        statsSection.classList.add('collapsed');
        content.style.maxHeight = '0';
        icon.classList.remove('fa-chevron-down'); // Expanded icon
        icon.classList.add('fa-chevron-right'); // Collapsed icon
    }
    
    // Collapse ALL book sections when stats is toggled 
    document.querySelectorAll('.book-section.expanded').forEach(s => {
        s.classList.remove('expanded');
        s.querySelector('.scriptures-container').style.maxHeight = '0';
        // Collapse book icon
        s.querySelector('.expand-icon i').classList.remove('fa-chevron-down');
        s.querySelector('.expand-icon i').classList.add('fa-chevron-right');
    });
}

// Create a scripture card
function createScriptureCard(scripture, bookSection) {
    const card = document.createElement('div');
    card.className = `scripture-card ${readScriptures.has(scripture.id) ? 'read' : 'unread'}`;
    
    card.innerHTML = `
        <div class="scripture-reference">
            <span>${scripture.reference}</span>
            ${readScriptures.has(scripture.id) ? '<div class="check-mark">✓</div>' : ''}
        </div>
        <div class="scripture-text">${scripture.text}</div>
    `;
    
    // Track clicks for double-click/double-tap detection
    let lastClickTime = 0;
    const doubleClickDelay = 300; // milliseconds
    
    // Handle click events (single click marks as read, double click opens website)
    card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastClickTime;
        
        if (timeDiff < doubleClickDelay && timeDiff > 0) {
            // Double click detected
            openScriptureOnWebsite(scripture, bookSection);
            lastClickTime = 0; // Reset to prevent triple-click issues
        } else {
            // Single click - mark as read
            lastClickTime = currentTime;
            setTimeout(() => {
                if (lastClickTime === currentTime) {
                    toggleScriptureRead(scripture.id);
                }
            }, doubleClickDelay);
        }
    });
    
    return card;
}

// Toggle scripture read status
function toggleScriptureRead(scriptureId) {
    if (readScriptures.has(scriptureId)) {
        readScriptures.delete(scriptureId);
        // showToast("Scripture marked as unread");
    } else {
        readScriptures.add(scriptureId);
        // showToast("Scripture marked as read! 🎉");
    }
    
    // Save immediately after toggle
    saveUserData();
    
    // Log to verify localStorage is working
    console.log('Scripture toggled:', scriptureId);
    console.log('Total read:', readScriptures.size);
    console.log('localStorage key:', currentUser ? `scriptures_${currentUser.uid}` : 'scriptures_anonymous');
    console.log('Saved data:', localStorage.getItem(currentUser ? `scriptures_${currentUser.uid}` : 'scriptures_anonymous'));
    
    // Update just the specific card instead of re-rendering everything
    const allCards = document.querySelectorAll('.scripture-card');
    allCards.forEach(card => {
        const reference = card.querySelector('.scripture-reference span').textContent;
        const scripture = findScriptureById(scriptureId);
        if (scripture && reference === scripture.reference) {
            if (readScriptures.has(scriptureId)) {
                card.classList.remove('unread');
                card.classList.add('read');
                if (!card.querySelector('.check-mark')) {
                    card.querySelector('.scripture-reference').innerHTML += '<div class="check-mark">✓</div>';
                }
            } else {
                card.classList.remove('read');
                card.classList.add('unread');
                const checkMark = card.querySelector('.check-mark');
                if (checkMark) checkMark.remove();
            }
        }
    });
    
    updateStats();
    updateBookHeaders();
}

// Find scripture by ID
function findScriptureById(id) {
    for (const [bookName, scriptures] of Object.entries(scriptureData)) {
        const scripture = scriptures.find(s => s.id === id);
        if (scripture) return scripture;
    }
    return null;
}

// Update book headers without closing them
function updateBookHeaders() {
    Object.entries(scriptureData).forEach(([bookName, scriptures]) => {
        const section = document.getElementById(bookName.replace(/\s+/g, '-'));
        if (section) {
            const header = section.querySelector('.book-header');
            const readCount = scriptures.filter(s => readScriptures.has(s.id)).length;
            const percentage = Math.round((readCount / scriptures.length) * 100);
            
            // Update only the text content, not the entire HTML
            const titleDiv = header.querySelector('.book-title').parentElement;
            titleDiv.querySelector('div:last-child').textContent = `${readCount} / ${scriptures.length} read (${percentage}%)`;
        }
    });
}

// Open scripture on church website
function openScriptureOnWebsite(scripture, bookSection) {
    let url = '';
    // Clean the book name - remove periods and handle spaces
    const book = scripture.book.replace(/\.$/, ''); // Remove trailing period
    const urlBook = scriptureUrlMap[book] || scriptureUrlMap[scripture.book] || 
                    book.toLowerCase()
                        .replace(/\./g, '') // Remove all periods
                        .replace(/\s+/g, '-') // Replace spaces with dashes
                        .replace(/—/g, '-'); // Replace em dashes with regular dashes
    
    const chapter = scripture.chapter;
    const verse = scripture.verse.split('–')[0]; // Get first verse if it's a range
    
    // Map book sections to URL patterns
    if (bookSection === 'Old Testament') {
        url = `https://www.churchofjesuschrist.org/study/scriptures/ot/${urlBook}/${chapter}?lang=eng&id=p${verse}#p${verse}`;
    } else if (bookSection === 'New Testament') {
        url = `https://www.churchofjesuschrist.org/study/scriptures/nt/${urlBook}/${chapter}?lang=eng&id=p${verse}#p${verse}`;
    } else if (bookSection === 'Book of Mormon') {
        url = `https://www.churchofjesuschrist.org/study/scriptures/bofm/${urlBook}/${chapter}?lang=eng&id=p${verse}#p${verse}`;
    } else if (bookSection === 'Doctrine and Covenants') {
        url = `https://www.churchofjesuschrist.org/study/scriptures/dc-testament/dc/${chapter}?lang=eng&id=p${verse}#p${verse}`;
    } else if (bookSection === 'Pearl of Great Price') {
        url = `https://www.churchofjesuschrist.org/study/scriptures/pgp/${urlBook}/${chapter}?lang=eng&id=p${verse}#p${verse}`;
    }
    
    console.log('Opening URL:', url); // Debug log
    window.open(url, '_blank');
    showToast("Opening scripture on Church website...");
}

// 🔽 UPDATED: Toggle book function to swap Font Awesome icons
function toggleBook(section) {
    const icon = section.querySelector('.expand-icon i'); // Target the <i> element
    const isExpanding = !section.classList.contains('expanded');

    // 1. Collapse ALL sections (books and stats)
    document.querySelectorAll('.book-section').forEach(s => {
        s.classList.remove('expanded');
        s.querySelector('.scriptures-container').style.maxHeight = '0';
        // Reset ALL book icons to right
        s.querySelector('.expand-icon i').classList.remove('fa-chevron-down');
        s.querySelector('.expand-icon i').classList.add('fa-chevron-right');
    });

    // 2. Collapse the Stats section
    const statsSection = document.getElementById('statsSection');
    const statsContent = document.getElementById('statsContent');
    const statsIcon = document.getElementById('statsExpandIcon').querySelector('i');
    
    if (!statsSection.classList.contains('collapsed')) {
        statsSection.classList.add('collapsed');
        statsContent.style.maxHeight = '0';
        // Collapse stats icon
        statsIcon.classList.remove('fa-chevron-down'); 
        statsIcon.classList.add('fa-chevron-right');
    }

    // 3. If a book was originally clicked, expand it 
    if (isExpanding) {
        section.classList.add('expanded');
        const container = section.querySelector('.scriptures-container');
        container.style.maxHeight = container.scrollHeight + 'px'; 
        // Set THIS book icon to down
        icon.classList.remove('fa-chevron-right'); 
        icon.classList.add('fa-chevron-down'); 
    }
}

// Update statistics
// Update statistics
function updateStats() {
    const totalScriptures = Object.values(scriptureData).flat().length;
    const readCount = readScriptures.size;
    const percentage = totalScriptures > 0 ? Math.round((readCount / totalScriptures) * 100) : 0;
    
    document.getElementById('totalRead').textContent = readCount;
    document.getElementById('totalScriptures').textContent = totalScriptures;
    document.getElementById('percentComplete').textContent = percentage + '%';
    
    // The two lines attempting to update the old progress bar have been removed.

    // Minimal Progress Bar Update (for collapsed state)
    document.getElementById('progressFillMinimal').style.width = percentage + '%';
    document.getElementById('progressFillMinimal').textContent = percentage + '%';
    
    // Calculate streak (mock implementation)
    const storageKey = currentUser ? `lastRead_${currentUser.uid}` : 'lastRead_anonymous';
    const streakKey = currentUser ? `streak_${currentUser.uid}` : 'streak_anonymous';
    
    const lastRead = localStorage.getItem(storageKey);
    const today = new Date().toDateString();
    let streak = 0;
    
    if (lastRead === today && readCount > 0) {
        streak = parseInt(localStorage.getItem(streakKey) || '1');
    } else if (readCount > 0) {
        streak = 1;
        localStorage.setItem(storageKey, today);
    }

    // Re-apply max-height after content update if it is expanded
    const statsSection = document.getElementById('statsSection');
    const content = document.getElementById('statsContent');
    if (!statsSection.classList.contains('collapsed')) {
        content.style.maxHeight = content.scrollHeight + 'px';
    }
    
    localStorage.setItem(streakKey, streak.toString());
    document.getElementById('streakDays').textContent = streak;
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Initialize the app on load
window.addEventListener('DOMContentLoaded', initApp);
