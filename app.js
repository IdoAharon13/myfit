// --- API Configuration ---
const LOCAL_API = 'http://localhost:8080/api';
const PROD_API = 'https://myfit-api.onrender.com/api'; // החלף בכתובת השרת האמיתית לאחר פריסה
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === "" || window.location.hostname.includes("github.io"))
    ? LOCAL_API
    : PROD_API;

const api = {
    async getTrainees() {
        const res = await fetch(`${API_BASE}/trainees`);
        return res.json();
    },
    async setTrainee(trainee) {
        const res = await fetch(`${API_BASE}/trainees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trainee)
        });
        return res.json();
    },
    async deleteTrainee(id) {
        await fetch(`${API_BASE}/trainees/${id}`, { method: 'DELETE' });
    },
    async getPrograms(traineeId) {
        const res = await fetch(`${API_BASE}/programs/trainee/${traineeId}`);
        return res.json();
    },
    async setProgram(program) {
        const res = await fetch(`${API_BASE}/programs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(program)
        });
        return res.json();
    },
    async deleteProgram(id) {
        await fetch(`${API_BASE}/programs/${id}`, { method: 'DELETE' });
    },
    async getHistory(traineeId) {
        const url = traineeId ? `${API_BASE}/history/trainee/${traineeId}` : `${API_BASE}/history`;
        const res = await fetch(url);
        return res.json();
    },
    async setHistory(entry) {
        const res = await fetch(`${API_BASE}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        return res.json();
    },
    async ping() {
        console.log("Checking server health at:", `${API_BASE}/ping`);
        const res = await fetch(`${API_BASE}/ping`);
        return res.text();
    }
};

// --- State Management ---
let state = {
    trainees: [],
    currentPrograms: [], // Local cache of programs for the selected trainee
    currentTraineeIndex: 0,
    viewMode: 'grid',
    theme: 'light',
    activeTab: 'trainee', // 'trainee' | 'history'
    dirtyTrainees: new Set(), // IDs of trainees with unsaved name changes or new
    dirtyPrograms: new Set(),  // IDs of programs with unsaved changes or new
    deletedTrainees: new Set(),
    deletedPrograms: new Set()
};

const DEFAULT_TRAINEE_NAME_1 = 'עידו';
const DEFAULT_TRAINEE_NAME_2 = 'יאיר';

// --- Initialization ---
async function init() {
    console.log("Initializing myfit app with Java API...");

    try {
        console.log("Step 1: Pinging server...");
        const pingRes = await api.ping();
        console.log("Server Health Check:", pingRes);

        // Load Data from Java API
        console.log("Step 2: Fetching trainees...");
        state.trainees = await api.getTrainees();
        console.log(`Loaded ${state.trainees.length} trainees from API.`);

        // Default Data if empty
        if (state.trainees.length === 0) {
            console.log("API empty, adding default trainees...");
            const t1 = await api.setTrainee({ name: DEFAULT_TRAINEE_NAME_1 });
            await api.setProgram({ traineeId: t1.id, title: 'אימון A', data: JSON.stringify([['תרגיל', 'סטים', 'חזרות', 'משקל'], ['', '', '', '']]), orderIndex: 0 });

            const t2 = await api.setTrainee({ name: DEFAULT_TRAINEE_NAME_2 });
            await api.setProgram({ traineeId: t2.id, title: 'אימון A', data: JSON.stringify([['תרגיל', 'סטים', 'חזרות', 'משקל'], ['', '', '', '']]), orderIndex: 0 });

            state.trainees = await api.getTrainees();
        }

        // Settings (Local storage is fine for UI preferences like theme, as per user's "users input" vs "ui settings" distinction, 
        // but I'll move them to the browser's persistent state or just keep them for now. 
        // The user specifically asked for "data users enter", "history", "trainee names", "training programs" in the DB.
        const savedSettings = localStorage.getItem('myfit_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            state.viewMode = settings.viewMode || 'grid';
            state.theme = settings.theme || 'light';
            state.currentTraineeIndex = (settings.currentTraineeIndex < state.trainees.length) ? settings.currentTraineeIndex : 0;
        }

        applyTheme();
        renderTraineeTabs();
        await renderCurrentTrainee();
        setupEventListeners();
        console.log("App initialized successfully.");
    } catch (err) {
        console.error("CRITICAL ERROR during initialization:", err);
        console.group("Connection Diagnostics");
        console.log("Target API Base:", API_BASE);
        console.log("Current Page Origin:", window.location.origin);
        console.log("Action Required: Make sure your Java server is running in a terminal!");
        console.log("How to run: cd backend && ./run.sh");
        console.groupEnd();

        let errorMsg = "שגיאה בהתחברות לשרת!\n";
        if (window.location.origin.includes("github.io")) {
            errorMsg += "\nשים לב: אתה מנסה להריץ את האפליקציה דרך GitHub (HTTPS).\n" +
                "הדפדפן חוסם חיבור לשרת מקומי מתוך אתר מאובטח.\n" +
                "אנא פתח את הקובץ index.html ישירות מהתיקייה במחשב שלך.";
        } else {
            errorMsg += "\n1. וודא שחלון הטרמינל של השרת פתוח.\n2. בדוק שאין שגיאות בטרמינל.\n3. נסה לרענן את הדף.";
        }
        alert(errorMsg);
    }
}

function saveSettings() {
    localStorage.setItem('myfit_settings', JSON.stringify({
        viewMode: state.viewMode,
        theme: state.theme,
        currentTraineeIndex: state.currentTraineeIndex
    }));
}

async function logHistory(action, description) {
    const trainee = state.trainees[state.currentTraineeIndex];
    if (!trainee) return;
    const entry = {
        timestamp: new Date().toLocaleString('he-IL'),
        traineeId: trainee.id,
        traineeName: trainee.name,
        action,
        description
    };
    await api.setHistory(entry);
}

// --- UI Rendering ---
function renderTraineeTabs() {
    const tabsContainer = document.getElementById('traineeTabs');
    const existingTabs = tabsContainer.querySelectorAll('.tab:not(#addTraineeBtn):not(#historyTabBtn)');
    existingTabs.forEach(t => t.remove());

    state.trainees.forEach((trainee, index) => {
        const tab = document.createElement('button');
        tab.className = `tab ${(state.activeTab === 'trainee' && index === state.currentTraineeIndex) ? 'active' : ''}`;
        tab.textContent = trainee.name;
        tab.onclick = () => switchTrainee(index);
        tabsContainer.insertBefore(tab, document.getElementById('historyTabBtn'));
    });

    document.getElementById('historyTabBtn').className = `tab ${state.activeTab === 'history' ? 'active' : ''}`;
}

async function switchTrainee(index) {
    if (state.dirtyTrainees.size > 0 || state.dirtyPrograms.size > 0) {
        if (!confirm('ישנם שינויים שלא נשמרו. האם להמשיך ללא שמירה?')) {
            return;
        }
    }
    state.dirtyTrainees.clear();
    state.dirtyPrograms.clear();

    state.activeTab = 'trainee';
    state.currentTraineeIndex = index;
    const trainee = state.trainees[index];
    if (trainee) {
        state.currentPrograms = await api.getPrograms(trainee.id);
        state.currentPrograms.sort((a, b) => a.orderIndex - b.orderIndex);
    } else {
        state.currentPrograms = [];
    }
    saveSettings();
    renderTraineeTabs();
    await renderCurrentTrainee();

    document.getElementById('traineeSection').classList.remove('hidden');
    document.getElementById('historySection').classList.add('hidden');
}

async function renderCurrentTrainee() {
    const trainee = state.trainees[state.currentTraineeIndex];
    if (!trainee) return;

    document.getElementById('currentTraineeName').textContent = trainee.name;
    const blocksContainer = document.getElementById('blocksContainer');
    blocksContainer.innerHTML = '';
    blocksContainer.className = `blocks-container ${state.viewMode}`;

    state.currentPrograms.forEach((program, index) => {
        // Parse the JSON data from Java if it's still a string
        const dataArr = typeof program.data === 'string' ? JSON.parse(program.data) : program.data;
        const blockEl = createBlockElement({ ...program, data: dataArr }, index, state.currentPrograms);
        blocksContainer.appendChild(blockEl);
    });
}

function createBlockElement(block, blockIndex, allBlocks) {
    const div = document.createElement('div');
    div.className = 'block';
    div.innerHTML = `
    <div class="block-header">
      <span class="block-title" contenteditable="true">${block.title}</span>
      <div class="block-controls" style="display: flex; gap: 1rem;">
        <button class="btn btn-sm move-up" title="הזז למעלה">↑</button>
        <button class="btn btn-sm move-down" title="הזז למטה">↓</button>
        <button class="btn btn-sm btn-danger delete-block" title="מחק אימון">🗑️</button>
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            ${block.data[0].map((h, i) => `<th contenteditable="true" data-col="${i}">${h}</th>`).join('')}
            <th class="ctrl-col" style="width: 50px;"></th>
          </tr>
        </thead>
        <tbody>
          ${block.data.slice(1).map((row, r) => `
            <tr>
              ${row.map((cell, c) => `<td contenteditable="true" data-row="${r + 1}" data-col="${c}">${linkify(cell)}</td>`).join('')}
              <td class="ctrl-col"><button class="btn btn-sm btn-danger delete-row" style="padding: 0.25rem 0.5rem;">🗑️</button></td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="${block.data[0].length + 1}">
              <div style="display: flex; gap: 1.5rem; margin-top: 1rem;">
                <button class="btn btn-sm add-row">+ הוסף שורה</button>
                <button class="btn btn-sm add-col">+ הוסף עמודה</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

    // Listeners
    const titleEl = div.querySelector('.block-title');
    titleEl.onblur = async (e) => {
        const oldTitle = block.title;
        block.title = e.target.textContent;
        if (oldTitle !== block.title) {
            state.dirtyPrograms.add(block.id);
            // Updating the local state.currentPrograms item
            const pIndex = state.currentPrograms.findIndex(p => p.id === block.id);
            if (pIndex !== -1) {
                state.currentPrograms[pIndex].title = block.title;
            }
            logHistory('שינוי שם אימון', `מ-${oldTitle} ל-${block.title}`);
        }
    };

    div.querySelector('.delete-block').onclick = () => deleteBlock(block);
    div.querySelector('.move-up').onclick = () => moveBlock(blockIndex, -1, allBlocks);
    div.querySelector('.move-down').onclick = () => moveBlock(blockIndex, 1, allBlocks);
    div.querySelector('.add-row').onclick = () => addRow(block);
    div.querySelector('.add-col').onclick = () => addCol(block);

    div.querySelectorAll('.delete-row').forEach((btn, r) => {
        btn.onclick = () => deleteRow(block, r + 1);
    });

    div.querySelectorAll('td[contenteditable="true"], th[contenteditable="true"]').forEach(cell => {
        cell.onblur = (e) => updateCell(block, e.target);
    });

    return div;
}

// --- Actions ---
async function updateCell(block, cellEl) {
    const row = parseInt(cellEl.dataset.row) || 0;
    const col = parseInt(cellEl.dataset.col);
    const val = cellEl.textContent;

    if (block.data[row][col] !== val) {
        block.data[row][col] = val;
        state.dirtyPrograms.add(block.id);
        const pIndex = state.currentPrograms.findIndex(p => p.id === block.id);
        if (pIndex !== -1) {
            state.currentPrograms[pIndex].data = block.data; // Keep it as array locally
        }
        cellEl.innerHTML = linkify(val);
        logHistory('עדכון נתון', `באימון ${block.title}: שונה ל-"${val}"`);
    }
}

async function addRow(block) {
    const newRow = new Array(block.data[0].length).fill('');
    block.data.push(newRow);
    state.dirtyPrograms.add(block.id);
    logHistory('הוספת שורה', `באימון ${block.title}`);
    await renderCurrentTrainee();
}

async function deleteRow(block, rowIndex) {
    block.data.splice(rowIndex, 1);
    state.dirtyPrograms.add(block.id);
    logHistory('מחיקת שורה', `באימון ${block.title}`);
    await renderCurrentTrainee();
}

async function addCol(block) {
    block.data.forEach((row, i) => {
        row.push(i === 0 ? 'עמודה חדשה' : '');
    });
    state.dirtyPrograms.add(block.id);
    logHistory('הוספת עמודה', `באימון ${block.title}`);
    await renderCurrentTrainee();
}

async function deleteBlock(block) {
    if (confirm('בטוח שברצונך למחוק אימון זה?')) {
        if (!block.id.toString().startsWith('temp_')) {
            state.deletedPrograms.add(block.id);
        }
        state.dirtyPrograms.delete(block.id);
        state.currentPrograms = state.currentPrograms.filter(p => p.id !== block.id);
        logHistory('מחיקת אימון (ממתין לשמירה)', block.title);
        await renderCurrentTrainee();
    }
}

async function moveBlock(index, direction, blocks) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < blocks.length) {
        const b1 = blocks[index];
        const b2 = blocks[newIndex];
        const tempOrder = b1.orderIndex;
        b1.orderIndex = b2.orderIndex;
        b2.orderIndex = tempOrder;

        state.dirtyPrograms.add(b1.id);
        state.dirtyPrograms.add(b2.id);

        logHistory('הזזת אימון', `מיקום שונה`);
        await renderCurrentTrainee();
    }
}

function linkify(text) {
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

// --- Global Listeners ---
function setupEventListeners() {
    document.getElementById('themeToggle').onclick = () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        saveSettings();
    };

    document.getElementById('viewToggle').onclick = () => {
        state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
        saveSettings();
        renderCurrentTrainee();
    };

    document.getElementById('historyTabBtn').onclick = showHistoryTab;

    document.getElementById('addTraineeBtn').onclick = async () => {
        const name = prompt('שם המתאמן החדש:');
        if (name) {
            const newTrainee = { id: 'temp_' + Date.now(), name: name };
            state.trainees.push(newTrainee);
            state.dirtyTrainees.add(newTrainee.id);
            logHistory('הוספת מתאמן (ממתין לשמירה)', name);
            saveSettings();
            await switchTrainee(state.trainees.length - 1);
        }
    };

    document.getElementById('deleteTraineeBtn').onclick = async () => {
        if (state.trainees.length <= 1) return alert('חייב להישאר לפחות מתאמן אחד');
        const trainee = state.trainees[state.currentTraineeIndex];
        if (confirm(`למחוק את ${trainee.name}?`)) {
            if (!trainee.id.startsWith('temp_')) {
                state.deletedTrainees.add(trainee.id);
            }
            state.dirtyTrainees.delete(trainee.id);
            state.trainees.splice(state.currentTraineeIndex, 1);
            state.currentTraineeIndex = 0;
            logHistory('מחיקת מתאמן (ממתין לשמירה)', trainee.name);
            saveSettings();
            await switchTrainee(0);
        }
    };

    document.getElementById('addBlockBtn').onclick = async () => {
        const trainee = state.trainees[state.currentTraineeIndex];
        const title = prompt('שם האימון (למשל אימון A):', 'אימון חדש');
        if (title) {
            const newProgram = {
                id: 'temp_' + Date.now(),
                traineeId: trainee.id,
                title,
                data: [['תרגיל', 'סטים', 'חזרות', 'משקל'], ['', '', '', '']],
                orderIndex: state.currentPrograms.length
            };
            state.currentPrograms.push(newProgram);
            state.dirtyPrograms.add(newProgram.id);
            logHistory('הוספת אימון (ממתין לשמירה)', title);
            await renderCurrentTrainee();
        }
    };

    document.getElementById('currentTraineeName').onblur = async (e) => {
        const trainee = state.trainees[state.currentTraineeIndex];
        const oldName = trainee.name;
        const newName = e.target.textContent;
        if (oldName !== newName) {
            trainee.name = newName;
            state.dirtyTrainees.add(trainee.id);
            logHistory('שינוי שם מתאמן', `מ-${oldName} ל-${newName}`);
            renderTraineeTabs();
        }
    };

    document.getElementById('importBtn').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = handleFileUpload;

    document.getElementById('saveBtn').onclick = async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ נשמר!';
        btn.classList.add('btn-success');

        // Manual save trigger/visual feedback
        await renderCurrentTrainee();

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('btn-success');
        }, 2000);
    };
}

function applyTheme() {
    document.body.setAttribute('data-theme', state.theme);
}

async function showHistoryTab() {
    state.activeTab = 'history';
    renderTraineeTabs();

    document.getElementById('traineeSection').classList.add('hidden');
    document.getElementById('historySection').classList.remove('hidden');

    const list = document.getElementById('fullHistoryList');
    const history = await api.getHistory();
    history.sort((a, b) => b.id - a.id);

    list.innerHTML = history.map(h => `
    <div style="border-bottom: 1px solid var(--border-color); padding: 0.8rem 0; text-align: right;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>${h.traineeName}</strong>
        <small>${h.timestamp}</small>
      </div>
      <div style="margin-top: 0.3rem;">${h.action}: ${h.description}</div>
    </div>
  `).join('') || '<div style="text-align: center; padding: 2rem;">אין עדיין היסטוריה</div>';
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (ext === 'csv' || ext === 'xlsx') {
        reader.onload = async (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            await importDataToBlock(file.name, jsonData);
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'docx') {
        reader.onload = async (event) => {
            const result = await mammoth.convertToHtml({ arrayBuffer: event.target.result });
            await importDataToBlock(file.name, [['תוכן מיובא מ-DOCX'], [result.value]]);
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'txt') {
        reader.onload = async (event) => {
            const rows = event.target.result.split('\n').map(r => r.split(','));
            await importDataToBlock(file.name, rows);
        };
        reader.readAsText(file);
    }
}

async function importDataToBlock(title, data) {
    const trainee = state.trainees[state.currentTraineeIndex];
    const currentPrograms = await api.getPrograms(trainee.id);
    await api.setProgram({
        traineeId: trainee.id,
        title: `מיובא: ${title}`,
        data: JSON.stringify(data.length ? data : [[''], ['']]),
        orderIndex: currentPrograms.length
    });
    logHistory('ייבוא קובץ', title);
    await renderCurrentTrainee();
}

// Start the app
init();
