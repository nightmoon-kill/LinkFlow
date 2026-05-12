// State Management
let keywords = JSON.parse(localStorage.getItem('linkflow_keywords')) || [];
let selectedLetter = 'All';
let currentSort = localStorage.getItem('linkflow_sort') || 'newest';

const THAI_ALPHABET = 'กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'.split('');
const ENG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// DOM Elements
const keywordForm = document.getElementById('keywordForm');
const keywordInput = document.getElementById('keywordInput');
const urlInput = document.getElementById('urlInput');
const titleInput = document.getElementById('titleInput');
const editIndex = document.getElementById('editIndex');
const keywordList = document.getElementById('keywordList');
const keywordCount = document.getElementById('keywordCount');
const searchInput = document.getElementById('searchInput');
const alphabetFilter = document.getElementById('alphabetFilter');
const submitBtn = keywordForm.querySelector('button[type="submit"]');
const themeToggle = document.getElementById('themeToggle');
const sortSelect = document.getElementById('sortSelect');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const csvFileInput = document.getElementById('csvFileInput');

// Modal Elements
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');
let pendingDeleteIndex = -1;

// Initialize
function init() {
    applyInitialTheme();
    if (sortSelect) sortSelect.value = currentSort;
    renderKeywords();
    renderAlphabet();
    setupEventListeners();
}

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('linkflow_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isLight) {
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    if (isLight) {
        icon.setAttribute('data-lucide', 'moon');
    } else {
        icon.setAttribute('data-lucide', 'sun');
    }
    if (window.lucide) lucide.createIcons();
}

// Render Keyword Grid (Compact List)
function renderKeywords(filterText = '') {
    keywordList.innerHTML = '';
    
    let filteredKeywords = keywords.filter(item => 
        item.keyword.toLowerCase().includes(filterText.toLowerCase()) ||
        item.url.toLowerCase().includes(filterText.toLowerCase()) ||
        (item.title && item.title.toLowerCase().includes(filterText.toLowerCase()))
    );

    // Apply Alphabet Filter
    if (selectedLetter === 'Favorites') {
        filteredKeywords = filteredKeywords.filter(item => item.favorite);
    } else if (selectedLetter !== 'All') {
        filteredKeywords = filteredKeywords.filter(item => {
            const text = item.keyword.trim();
            if (text.length === 0) return false;
            
            let firstChar = text.charAt(0).toUpperCase();
            const leadingVowels = ['เ', 'แ', 'โ', 'ใ', 'ไ'];
            
            // If it starts with a Thai leading vowel, use the second character for filtering
            if (leadingVowels.includes(firstChar) && text.length > 1) {
                firstChar = text.charAt(1).toUpperCase();
            }
            
            return firstChar === selectedLetter;
        });
    }

    // Apply Sorting
    if (currentSort === 'alpha') {
        filteredKeywords.sort((a, b) => a.keyword.localeCompare(b.keyword, 'th', { sensitivity: 'base' }));
    } else if (currentSort === 'newest') {
        filteredKeywords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    keywordCount.innerText = `${filteredKeywords.length} items`;

    filteredKeywords.forEach((item, index) => {
        // Find the actual index in the original array for actions
        const originalIndex = keywords.indexOf(item);
        
        const div = document.createElement('div');
        div.className = 'keyword-item';
        div.innerHTML = `
            <div class="keyword-info">
                <span class="keyword-name">${item.keyword}</span>
                <span class="keyword-url">${item.url}</span>
                ${item.title ? `<span class="keyword-tooltip">Tooltip: ${item.title}</span>` : ''}
            </div>
            <div class="keyword-actions">
                <button class="icon-btn action-favorite ${item.favorite ? 'active' : ''}" data-index="${originalIndex}" title="Toggle Favorite">
                    <i data-lucide="heart" style="width: 18px; ${item.favorite ? 'fill: #ff4b6b; color: #ff4b6b;' : ''}"></i>
                </button>
                <button class="icon-btn action-copy" data-index="${originalIndex}" title="Copy as Hyperlink">
                    <i data-lucide="copy" style="width: 18px;"></i>
                </button>
                <button class="icon-btn action-edit" data-index="${originalIndex}" title="Edit">
                    <i data-lucide="edit-3" style="width: 18px;"></i>
                </button>
                <button class="icon-btn delete action-delete" data-index="${originalIndex}" title="Delete">
                    <i data-lucide="trash-2" style="width: 18px;"></i>
                </button>
            </div>
        `;
        keywordList.appendChild(div);
    });
    
    if (window.lucide) lucide.createIcons();
}

// Render Alphabet Filter Buttons
function renderAlphabet() {
    alphabetFilter.innerHTML = `
        <button class="letter-btn fav ${selectedLetter === 'Favorites' ? 'active' : ''}" data-letter="Favorites" title="Favorites">
            <i data-lucide="heart" style="width: 18px; ${selectedLetter === 'Favorites' ? 'fill: white;' : ''}"></i>
        </button>
        <button class="letter-btn all ${selectedLetter === 'All' ? 'active' : ''}" data-letter="All">All</button>
    `;
    
    [...ENG_ALPHABET, ...THAI_ALPHABET].forEach(letter => {
        const btn = document.createElement('button');
        btn.className = `letter-btn ${selectedLetter === letter ? 'active' : ''}`;
        btn.dataset.letter = letter;
        btn.innerText = letter;
        alphabetFilter.appendChild(btn);
    });
    
    if (window.lucide) lucide.createIcons();
}

// Handle Actions via Event Delegation
keywordList.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const index = parseInt(target.dataset.index);
    
    if (target.classList.contains('action-delete')) {
        deleteKeyword(index);
    } else if (target.classList.contains('action-edit')) {
        editKeyword(index);
    } else if (target.classList.contains('action-copy')) {
        copySingleLink(target, index);
    } else if (target.classList.contains('action-favorite')) {
        toggleFavorite(index);
    }
});

// Toggle Favorite Status
function toggleFavorite(index) {
    keywords[index].favorite = !keywords[index].favorite;
    saveKeywords();
    renderKeywords(searchInput.value);
    renderAlphabet();
}

// Delete Keyword
function deleteKeyword(index) {
    pendingDeleteIndex = index;
    deleteModal.classList.add('active');
}

// Handle Modal Actions
confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteIndex !== -1) {
        keywords.splice(pendingDeleteIndex, 1);
        saveKeywords();
        renderKeywords();
        if (parseInt(editIndex.value) === pendingDeleteIndex) cancelEdit();
        closeModal();
    }
});

cancelDeleteBtn.addEventListener('click', closeModal);

function closeModal() {
    deleteModal.classList.remove('active');
    pendingDeleteIndex = -1;
}

// Edit Keyword
function editKeyword(index) {
    const item = keywords[index];
    keywordInput.value = item.keyword;
    urlInput.value = item.url;
    titleInput.value = item.title || '';
    editIndex.value = index;
    
    submitBtn.innerHTML = '<i data-lucide="save" style="width: 18px;"></i> Update';
    submitBtn.classList.add('btn-update');
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    keywordInput.focus();
}

function cancelEdit() {
    editIndex.value = "-1";
    keywordForm.reset();
    submitBtn.innerHTML = '<i data-lucide="plus" style="width: 18px;"></i> Add';
    submitBtn.classList.remove('btn-update');
    if (window.lucide) lucide.createIcons();
}

// Copy Single Keyword as Hyperlink
async function copySingleLink(btn, index) {
    const item = keywords[index];
    const titleAttr = item.title ? ` title="${item.title}"` : '';
    const htmlContent = `<a href="${item.url}"${titleAttr} target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: underline;">${item.keyword}</a>`;

    try {
        if (navigator.clipboard && window.ClipboardItem) {
            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
            const blobText = new Blob([item.keyword], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
            await navigator.clipboard.write(data);
        } else {
            const tempEl = document.createElement('span');
            tempEl.innerHTML = htmlContent;
            tempEl.style.position = 'fixed';
            tempEl.style.opacity = '0';
            document.body.appendChild(tempEl);
            const range = document.createRange();
            range.selectNode(tempEl);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
            selection.removeAllRanges();
            document.body.removeChild(tempEl);
        }
        
        // Success feedback
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" style="width: 18px; color: var(--success);"></i>';
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
            btn.innerHTML = originalIcon;
            if (window.lucide) lucide.createIcons();
        }, 1500);
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

// Save Keywords to LocalStorage
function saveKeywords() {
    localStorage.setItem('linkflow_keywords', JSON.stringify(keywords));
}

// Export to CSV
function exportToCSV() {
    if (keywords.length === 0) {
        alert('No keywords to export.');
        return;
    }

    const headers = ['Keyword', 'URL', 'Title', 'Favorite', 'CreatedAt'];
    const csvRows = [headers.join(',')];

    keywords.forEach(item => {
        const row = [
            `"${(item.keyword || '').replace(/"/g, '""')}"`,
            `"${(item.url || '').replace(/"/g, '""')}"`,
            `"${(item.title || '').replace(/"/g, '""')}"`,
            item.favorite ? '1' : '0',
            item.createdAt || 0
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `linkflow_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Import from CSV
function importFromCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            if (lines.length < 2) return;

            const newKeywords = [];
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                // Simple CSV parser handling quotes
                const row = parseCSVRow(lines[i]);
                if (row.length >= 2) {
                    newKeywords.push({
                        keyword: row[0],
                        url: row[1],
                        title: row[2] || '',
                        favorite: row[3] === '1',
                        createdAt: parseInt(row[4]) || Date.now()
                    });
                }
            }

            if (newKeywords.length > 0) {
                // Merge logic: avoid exact duplicates (keyword + url)
                newKeywords.forEach(newItem => {
                    const exists = keywords.some(k => k.keyword === newItem.keyword && k.url === newItem.url);
                    if (!exists) keywords.push(newItem);
                });
                
                saveKeywords();
                renderKeywords();
                alert(`Successfully imported ${newKeywords.length} keywords.`);
            }
        } catch (err) {
            console.error('Import failed:', err);
            alert('Failed to import CSV. Please check the file format.');
        }
    };
    reader.readAsText(file);
}

function parseCSVRow(text) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Event Listeners
function setupEventListeners() {
    // Handle Form Submit (Add or Update)
    keywordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyword = keywordInput.value.trim();
        const url = urlInput.value.trim();
        const title = titleInput.value.trim();
        const index = parseInt(editIndex.value);

        if (keyword && url) {
            if (index === -1) {
                // Add new
                const newItem = { 
                    keyword, 
                    url, 
                    title, 
                    createdAt: Date.now(),
                    favorite: false
                };
                keywords.push(newItem);
            } else {
                // Update existing - preserve createdAt and favorite if they exist
                keywords[index] = { 
                    ...keywords[index],
                    keyword, 
                    url, 
                    title 
                };
            }
            
            saveKeywords();
            renderKeywords(searchInput.value);
            cancelEdit();
        }
    });

    // Handle Search
    searchInput.addEventListener('input', (e) => {
        renderKeywords(e.target.value);
    });

    // Handle Alphabet Filter
    alphabetFilter.addEventListener('click', (e) => {
        const btn = e.target.closest('.letter-btn');
        if (!btn) return;

        const clickedLetter = btn.dataset.letter;
        
        // Toggle logic: If clicking the same letter, reset to 'All'
        if (selectedLetter === clickedLetter) {
            selectedLetter = 'All';
        } else {
            selectedLetter = clickedLetter;
        }

        renderAlphabet(); // Update active state
        renderKeywords(searchInput.value);
    });

    // Handle Theme Toggle
    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('linkflow_theme', isLight ? 'light' : 'dark');
        updateThemeIcon(isLight);
    });

    // Handle Sort Change
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        localStorage.setItem('linkflow_sort', currentSort);
        renderKeywords(searchInput.value);
    });

    // Handle Export
    exportBtn.addEventListener('click', exportToCSV);

    // Handle Import
    importBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importFromCSV(e.target.files[0]);
            e.target.value = ''; // Reset for same file re-import
        }
    });
}

// Run Init
init();
