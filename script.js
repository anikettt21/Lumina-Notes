/**
 * Lumina Web Notebook - Main Script
 * Handles state management, UI rendering, and user interactions.
 */

// --- State Management ---
let notes = [];
let categories = [];
let currentFilter = 'all'; // 'all', 'pinned', 'recent', 'category:XYZ'
let currentSearchQuery = '';
let editingNoteId = null;

// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const searchInput = document.getElementById('search-input');
const addNoteBtn = document.getElementById('add-note-btn');
const modal = document.getElementById('note-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const noteTitleInput = document.getElementById('note-title-input');
const noteBodyInput = document.getElementById('note-body-input');
const categorySelect = document.getElementById('category-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const pinNoteBtn = document.getElementById('pin-note-btn');
const downloadNoteBtn = document.getElementById('download-note-btn');
const wordCountSpan = document.getElementById('word-count');
const charCountSpan = document.getElementById('char-count');
const viewTitle = document.getElementById('view-title');
const notesCountSpan = document.getElementById('notes-count');
const themeToggleBtn = document.getElementById('theme-toggle');
const currentDateSpan = document.getElementById('current-date');
const navItems = document.querySelectorAll('.nav-item');

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadNotes();
    loadTheme();
    renderCategories();
    renderNotes();
    updateDate();
    initToolbar();
    initAddCategory();

    // Auto-save check every 30 seconds (optional feature)
    setInterval(() => {
        saveNotesToStorage();
    }, 30000);

    initMobileMenu();
});

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const appContainer = document.querySelector('.app-container');
    const navItems = document.querySelectorAll('.nav-item');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            appContainer.classList.toggle('menu-open');
        });
    }

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            appContainer.classList.remove('menu-open');
        }
    });

    // Close when nav item clicked
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                appContainer.classList.remove('menu-open');
            }
        });
    });
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateSpan.textContent = new Date().toLocaleDateString('en-US', options);
}

// --- Persistence (LocalStorage) ---

function saveNotesToStorage() {
    localStorage.setItem('lumina_notes', JSON.stringify(notes));
}

function loadNotes() {
    const savedNotes = localStorage.getItem('lumina_notes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
    }
}

function loadCategories() {
    const savedCats = localStorage.getItem('lumina_categories');
    if (savedCats) {
        categories = JSON.parse(savedCats);
    } else {
        categories = ['Ideas', 'Study', 'Personal', 'Startup'];
    }
}

function saveCategories() {
    localStorage.setItem('lumina_categories', JSON.stringify(categories));
}

function loadTheme() {
    const savedTheme = localStorage.getItem('lumina_theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="ri-sun-line"></i><span>Light Mode</span>';
    }
}

// --- Core Logic ---

function createNote() {
    editingNoteId = null;
    noteTitleInput.value = '';
    noteBodyInput.innerHTML = '';
    categorySelect.value = 'Uncategorized';
    updateStats();

    // Reset modal actions state
    pinNoteBtn.classList.remove('active'); // active style implies pinned
    document.getElementById('last-edited-info').textContent = 'New Note';

    openModal();
}

function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    editingNoteId = id;
    noteTitleInput.value = note.title;
    noteBodyInput.innerHTML = note.content;
    categorySelect.value = note.category || 'Uncategorized';

    document.getElementById('last-edited-info').textContent = `Last edited: ${new Date(note.lastEdited).toLocaleString()}`;

    updateStats();
    openModal();
}

function saveCurrentNote() {
    const title = noteTitleInput.value.trim() || 'Untitled Note';
    const content = noteBodyInput.innerHTML;
    const rawText = noteBodyInput.innerText; // For extraction if needed
    const category = categorySelect.value;
    const timestamp = Date.now();

    if (editingNoteId) {
        // Update existing
        const noteIndex = notes.findIndex(n => n.id === editingNoteId);
        if (noteIndex > -1) {
            notes[noteIndex] = {
                ...notes[noteIndex],
                title,
                content,
                category,
                lastEdited: timestamp
            };
        }
    } else {
        // Create new
        const newNote = {
            id: timestamp,
            title,
            content,
            category,
            isPinned: false,
            createdAt: timestamp,
            lastEdited: timestamp
        };
        notes.unshift(newNote); // Add to top
    }

    saveNotesToStorage();
    renderNotes();
    closeModal();
}

function deleteCurrentNote() {
    if (editingNoteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(n => n.id !== editingNoteId);
            saveNotesToStorage();
            renderNotes();
            closeModal();
        }
    } else {
        closeModal();
    }
}

function togglePinCurrent() {
    if (editingNoteId) {
        const note = notes.find(n => n.id === editingNoteId);
        if (note) {
            note.isPinned = !note.isPinned;
            saveNotesToStorage();
            renderNotes();
            // Visual feedback could be added here
            alert(note.isPinned ? 'Note Pinned' : 'Note Unpinned');
        }
    }
}

function exportCurrentNote() {
    const title = noteTitleInput.value.trim() || 'Untitled Note';
    const content = noteBodyInput.innerHTML;
    const date = document.getElementById('last-edited-info').textContent;

    // Create a temporary container for formatting the PDF content
    const element = document.createElement('div');
    element.className = 'pdf-content';

    // Inline styles to ensure accurate PDF rendering
    element.style.padding = '20px';
    element.style.fontFamily = "'Inter', sans-serif";
    element.style.color = '#2d3436';
    element.style.lineHeight = '1.6';

    // Construct the HTML content for the PDF
    element.innerHTML = `
        <h1 style="font-family: 'Outfit', sans-serif; font-size: 24pt; margin-bottom: 10px; color: #2d3436;">${title}</h1>
        <div style="font-size: 10pt; color: #636e72; margin-bottom: 30px; border-bottom: 2px solid #6c5ce7; padding-bottom: 10px;">
            ${date}
        </div>
        <div style="font-family: 'Merriweather', 'Inter', serif; font-size: 12pt;">
            ${content}
        </div>
    `;

    // PDF Options
    const opt = {
        margin: 1,
        filename: `${title}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generate PDF
    // Check if html2pdf is loaded
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        alert('PDF library not loaded. Please refresh the page.');
    }
}

// --- Categories & Toolbar ---

const categoryModal = document.getElementById('category-modal');
const newCategoryInput = document.getElementById('new-category-input');
const saveCategoryBtn = document.getElementById('save-category-btn');
const cancelCategoryBtn = document.getElementById('cancel-category-btn');
const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');

function renderCategories() {
    const list = document.getElementById('category-list');
    const select = document.getElementById('category-select');

    // Sidebar list
    list.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.dataset.category = cat;
        if (currentFilter === `category:${cat}`) btn.classList.add('active');

        // Icon mapping
        let iconClass = 'ri-bookmark-line';
        if (cat === 'Ideas') iconClass = 'ri-lightbulb-line';
        else if (cat === 'Study') iconClass = 'ri-book-open-line';
        else if (cat === 'Personal') iconClass = 'ri-user-heart-line';
        else if (cat === 'Startup') iconClass = 'ri-rocket-line';
        else if (cat === 'Work') iconClass = 'ri-briefcase-line';

        btn.innerHTML = `<i class="${iconClass}"></i> ${cat}`;
        list.appendChild(btn);
    });

    // Select dropdown
    const currentVal = select.value;
    select.innerHTML = '<option value="Uncategorized">No Category</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
    // Restore selection if valid, primarily for editing
    if (editingNoteId) {
        const note = notes.find(n => n.id === editingNoteId);
        if (note) select.value = note.category || 'Uncategorized';
    } else {
        select.value = currentVal; // Maintain user selection during adds if any
    }
}

function openCategoryModal() {
    categoryModal.style.display = 'flex';
    categoryModal.offsetHeight; // trigger reflow
    categoryModal.classList.add('active');
    newCategoryInput.value = '';
    newCategoryInput.focus();
}

function closeCategoryModal() {
    categoryModal.classList.remove('active');
    setTimeout(() => {
        categoryModal.style.display = 'none';
    }, 300);
}

function saveNewCategory() {
    const val = newCategoryInput.value.trim();
    if (val !== "") {
        if (!categories.includes(val)) {
            categories.push(val);
            saveCategories();
            renderCategories();
            closeCategoryModal();
        } else {
            alert("Category already exists!");
            newCategoryInput.focus();
        }
    } else {
        newCategoryInput.focus();
    }
}

function initAddCategory() {
    const btn = document.getElementById('add-category-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCategoryModal();
        });
    }

    // Modal Events
    if (saveCategoryBtn) saveCategoryBtn.addEventListener('click', saveNewCategory);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', closeCategoryModal);
    if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', closeCategoryModal);

    // Close on outside click
    if (categoryModal) {
        categoryModal.addEventListener('click', (e) => {
            if (e.target === categoryModal) closeCategoryModal();
        });
    }

    // Enter key support
    if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') saveNewCategory();
        });
    }
}

function initToolbar() {
    const btns = document.querySelectorAll('.toolbar-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cmd = btn.dataset.command;
            const val = btn.dataset.value || null;

            if (cmd === 'formatBlock') {
                document.execCommand(cmd, false, val);
            } else {
                document.execCommand(cmd, false, val);
            }
            updateToolbarState();
            noteBodyInput.focus();
        });
    });

    // Check state on interaction
    noteBodyInput.addEventListener('keyup', updateToolbarState);
    noteBodyInput.addEventListener('mouseup', updateToolbarState);
    noteBodyInput.addEventListener('click', updateToolbarState);
}

function updateToolbarState() {
    const btns = document.querySelectorAll('.toolbar-btn');
    btns.forEach(btn => {
        const cmd = btn.dataset.command;
        // formatBlock state check is tricky across browsers, skipping rigorous check for H tags for simplicity or implementing custom
        if (cmd !== 'formatBlock' && cmd !== 'insertUnorderedList' && cmd !== 'insertOrderedList') {
            try {
                if (document.queryCommandState(cmd)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            } catch (e) { }
        }
    });
}

// --- Rendering ---

function renderNotes() {
    notesGrid.innerHTML = '';

    let filteredNotes = notes;

    // Apply Search
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filteredNotes = filteredNotes.filter(note =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        );
    }

    // Apply Filters
    if (currentFilter === 'pinned') {
        filteredNotes = filteredNotes.filter(n => n.isPinned);
        viewTitle.textContent = 'Pinned Notes';
    } else if (currentFilter === 'recent') {
        // Sort by last edited (copy array to avoid mutating original order if we need it)
        filteredNotes = [...filteredNotes].sort((a, b) => b.lastEdited - a.lastEdited);
        viewTitle.textContent = 'Recently Edited';
    } else if (currentFilter.startsWith('category:')) {
        const category = currentFilter.split(':')[1];
        filteredNotes = filteredNotes.filter(n => n.category === category);
        viewTitle.textContent = `${category} Notes`;
    } else {
        viewTitle.textContent = 'All Notes';
        // Logic for 'all': Pinned first, then others by date
        filteredNotes.sort((a, b) => {
            if (a.isPinned === b.isPinned) {
                return b.lastEdited - a.lastEdited;
            }
            return a.isPinned ? -1 : 1;
        });
    }

    notesCountSpan.textContent = `${filteredNotes.length} notes`;

    if (filteredNotes.length === 0) {
        notesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">
                <i class="ri-file-search-line" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <p>No notes found.</p>
            </div>
        `;
        return;
    }

    filteredNotes.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = `note-card ${note.isPinned ? 'pinned' : ''}`;
        card.style.animationDelay = `${index * 0.1}s`; // Staggered animation
        card.onclick = () => editNote(note.id);

        // Strip HTML for preview
        const tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = note.content;
        const textPreview = tmpDiv.innerText.substring(0, 150) + (tmpDiv.innerText.length > 150 ? '...' : '');

        const dateStr = new Date(note.lastEdited).toLocaleDateString();

        card.innerHTML = `
            <div class="note-card-header">
                <div class="note-title">${note.title}</div>
                <i class="ri-pushpin-fill pin-icon"></i>
            </div>
            <div class="note-preview">${textPreview || 'No additional text'}</div>
            <div class="note-footer">
                <span class="note-date">${dateStr}</span>
                <span class="note-category">${note.category || 'Uncategorized'}</span>
            </div>
        `;

        notesGrid.appendChild(card);
    });
}

// --- UI Interaction ---

// Modal
function openModal() {
    modal.style.display = 'flex';
    // Trigger reflow
    modal.offsetHeight;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

// Editor Stats
function updateStats() {
    const text = noteBodyInput.innerText || '';
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

    charCountSpan.textContent = `${charCount} chars`;
    wordCountSpan.textContent = `${wordCount} words`;
}

// Event Listeners
addNoteBtn.addEventListener('click', createNote);
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

saveNoteBtn.addEventListener('click', saveCurrentNote);
deleteNoteBtn.addEventListener('click', deleteCurrentNote);
pinNoteBtn.addEventListener('click', togglePinCurrent);
downloadNoteBtn.addEventListener('click', exportCurrentNote);

noteBodyInput.addEventListener('input', updateStats);

searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderNotes();
});

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('lumina_theme', 'light');
        themeToggleBtn.innerHTML = '<i class="ri-moon-line"></i><span>Dark Mode</span>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('lumina_theme', 'dark');
        themeToggleBtn.innerHTML = '<i class="ri-sun-line"></i><span>Light Mode</span>';
    }
});

// Sidebar Navigation
// Sidebar Navigation (Event Delegation)
document.querySelector('.nav-menu').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;

    // Reset all activities
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    if (item.dataset.filter) {
        currentFilter = item.dataset.filter;
    } else if (item.dataset.category) {
        currentFilter = `category:${item.dataset.category}`;
    }

    renderNotes();

    // Mobile menu closer logic integration
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const appContainer = document.querySelector('.app-container');
        sidebar.classList.remove('active');
        appContainer.classList.remove('menu-open');
    }
});

// Rich Text Shortcuts support (optional additional)
noteBodyInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                document.execCommand('bold');
                break;
            case 'i':
                e.preventDefault();
                document.execCommand('italic');
                break;
            case 'u':
                e.preventDefault();
                document.execCommand('underline');
                break;
        }
    }
});
