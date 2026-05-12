// State Management
let keywords = JSON.parse(localStorage.getItem('linkflow_keywords')) || [];
let selectedLetter = 'All';

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

// Modal Elements
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');
let pendingDeleteIndex = -1;

// Initialize
function init() {
    renderKeywords();
    renderAlphabet();
    setupEventListeners();
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
    if (selectedLetter !== 'All') {
        filteredKeywords = filteredKeywords.filter(item => 
            item.keyword.trim().charAt(0).toUpperCase() === selectedLetter
        );
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
    alphabetFilter.innerHTML = `<button class="letter-btn all ${selectedLetter === 'All' ? 'active' : ''}" data-letter="All">All</button>`;
    
    [...ENG_ALPHABET, ...THAI_ALPHABET].forEach(letter => {
        const btn = document.createElement('button');
        btn.className = `letter-btn ${selectedLetter === letter ? 'active' : ''}`;
        btn.dataset.letter = letter;
        btn.innerText = letter;
        alphabetFilter.appendChild(btn);
    });
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
    }
});

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
            const newItem = { keyword, url, title };
            
            if (index === -1) {
                // Add new
                keywords.push(newItem);
            } else {
                // Update existing
                keywords[index] = newItem;
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
}

// Run Init
init();
