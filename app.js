import { db } from './db.js';

// --- State Management ---
let state = {
    trainees: [],
    currentTraineeIndex: 0,
    viewMode: 'grid', // 'grid' | 'list'
    theme: 'light'
};

const DEFAULT_TRAINEE_NAME_1 = 'עידו';
const DEFAULT_TRAINEE_NAME_2 = 'יאיר';

// --- Initialization ---
async function init() {
    console.log("Initializing myfit app...");
    try {
        await db.init();
        console.log("Database initialized.");
    } catch (err) {
        console.error("Failed to initialize database:", err);
        alert("שגיאה בחיבור למסד הנתונים. המידע עשוי שלא להישמר.");
    }

    // Load Data from IndexedDB first
    state.trainees = await db.getAllTrainees();
    console.log(`Loaded ${state.trainees.length} trainees.`);

    // Migration / Default Data
    if (state.trainees.length === 0) {
        // Check for old localStorage state migration
        const oldStateStr = localStorage.getItem('myfit_state');
        if (oldStateStr) {
            const oldState = JSON.parse(oldStateStr);
            console.log("Migrating trainees from localStorage...");
            for (const t of oldState.trainees) {
                const traineeId = await db.addTrainee({ name: t.name, createdAt: new Date() });
                for (let i = 0; i < t.blocks.length; i++) {
                    const b = t.blocks[i];
                    await db.addBlock({ traineeId, title: b.title, data: b.data, order: i });
                }
            }
            state.trainees = await db.getAllTrainees();
            localStorage.removeItem('myfit_state');
        } else {
            console.log("Adding default trainees...");
            const id1 = await db.addTrainee({ name: DEFAULT_TRAINEE_NAME_1, createdAt: new Date() });
            await db.addBlock({ traineeId: id1, title: 'אימון A', data: [['תרגיל', 'סטים', 'חזרות', 'משקל'], ['', '', '', '']], order: 0 });

            const id2 = await db.addTrainee({ name: DEFAULT_TRAINEE_NAME_2, createdAt: new Date() });
            await db.addBlock({ traineeId: id2, title: 'אימון A', data: [['תרגיל', 'סטים', 'חזרות', 'משקל'], ['', '', '', '']], order: 0 });

            state.trainees = await db.getAllTrainees();
        }
    }

    // Load Settings from IndexedDB
    let dbSettings = await db.getSettings();

    // Migration for settings from localStorage
    const savedSettings = localStorage.getItem('myfit_settings');
    if (savedSettings && !dbSettings) {
        console.log("Migrating settings from localStorage...");
        try {
            const settings = JSON.parse(savedSettings);
            dbSettings = {
                viewMode: settings.viewMode || 'grid',
                theme: settings.theme || 'light',
                currentTraineeIndex: settings.currentTraineeIndex || 0
            };
            await db.saveSettings(dbSettings);
            localStorage.removeItem('myfit_settings');
        } catch (e) {
            console.error("Failed to migrate settings:", e);
        }
    }

    if (dbSettings) {
        state.viewMode = dbSettings.viewMode || 'grid';
        state.theme = dbSettings.theme || 'light';
        // Validate index
        if (dbSettings.currentTraineeIndex >= 0 && dbSettings.currentTraineeIndex < state.trainees.length) {
            state.currentTraineeIndex = dbSettings.currentTraineeIndex;
        } else {
            state.currentTraineeIndex = 0;
        }
    }

    applyTheme();
    renderTraineeTabs();
    await renderCurrentTrainee();
    setupEventListeners();
}

async function saveSettings() {
    await db.saveSettings({
        viewMode: state.viewMode,
        theme: state.theme,
        currentTraineeIndex: state.currentTraineeIndex
    });
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
    await db.addHistory(entry);
}

// --- UI Rendering ---
function renderTraineeTabs() {
    const tabsContainer = document.getElementById('traineeTabs');
    const existingTabs = tabsContainer.querySelectorAll('.tab:not(#addTraineeBtn)');
    existingTabs.forEach(t => t.remove());

    state.trainees.forEach((trainee, index) => {
        const tab = document.createElement('button');
        tab.className = `tab ${index === state.currentTraineeIndex ? 'active' : ''}`;
        tab.textContent = trainee.name;
        tab.onclick = () => switchTrainee(index);
        tabsContainer.insertBefore(tab, document.getElementById('addTraineeBtn'));
    });
}

async function switchTrainee(index) {
    state.currentTraineeIndex = index;
    await saveSettings();
    renderTraineeTabs();
    await renderCurrentTrainee();
}

async function renderCurrentTrainee() {
    const trainee = state.trainees[state.currentTraineeIndex];
    if (!trainee) return;

    document.getElementById('currentTraineeName').textContent = trainee.name;
    const blocksContainer = document.getElementById('blocksContainer');
    blocksContainer.innerHTML = '';
    blocksContainer.className = `blocks-container ${state.viewMode}`;

    const blocks = await db.getBlocksByTrainee(trainee.id);
    blocks.sort((a, b) => a.order - b.order);

    blocks.forEach((block, blockIndex) => {
        const blockEl = createBlockElement(block, blockIndex, blocks);
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
      <table data-block-id="${block.id}">
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
            await db.updateBlock(block);
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
        await db.updateBlock(block);
        cellEl.innerHTML = linkify(val);
        logHistory('עדכון נתון', `באימון ${block.title}: שונה ל-"${val}"`);
    }
}

async function addRow(block) {
    const newRow = new Array(block.data[0].length).fill('');
    block.data.push(newRow);
    await db.updateBlock(block);
    logHistory('הוספת שורה', `באימון ${block.title}`);
    await renderCurrentTrainee();
}

async function deleteRow(block, rowIndex) {
    block.data.splice(rowIndex, 1);
    await db.updateBlock(block);
    logHistory('מחיקת שורה', `באימון ${block.title}`);
    await renderCurrentTrainee();
}

async function addCol(block) {
    block.data.forEach((row, i) => {
        row.push(i === 0 ? 'עמודה חדשה' : '');
    });
    await db.updateBlock(block);
    logHistory('הוספת עמודה', `באימון ${block.title}`);
    await renderCurrentTrainee();
}

async function deleteBlock(block) {
    if (confirm('בטוח שברצונך למחוק אימון זה?')) {
        await db.deleteBlock(block.id);
        logHistory('מחיקת אימון', block.title);
        await renderCurrentTrainee();
    }
}

async function moveBlock(index, direction, blocks) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < blocks.length) {
        const b1 = blocks[index];
        const b2 = blocks[newIndex];
        const tempOrder = b1.order;
        b1.order = b2.order;
        b2.order = tempOrder;

        await db.updateBlock(b1);
        await db.updateBlock(b2);

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
    document.getElementById('themeToggle').onclick = async () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        await saveSettings();
    };

    document.getElementById('viewToggle').onclick = async () => {
        state.viewMode = state.viewMode === 'grid' ? 'list' : 'grid';
        await saveSettings();
        await renderCurrentTrainee();
    };

    document.getElementById('addTraineeBtn').onclick = async () => {
        const name = prompt('שם המתאמן החדש:');
        if (name) {
            const id = await db.addTrainee({ name, createdAt: new Date() });
            state.trainees = await db.getAllTrainees();
            state.currentTraineeIndex = state.trainees.findIndex(t => t.id === id);
            logHistory('הוספת מתאמן', name);
            await saveSettings();
            renderTraineeTabs();
            await renderCurrentTrainee();
        }
    };

    document.getElementById('deleteTraineeBtn').onclick = async () => {
        if (state.trainees.length <= 1) return alert('חייב להישאר לפחות מתאמן אחד');
        if (confirm(`למחוק את ${state.trainees[state.currentTraineeIndex].name}?`)) {
            const trainee = state.trainees[state.currentTraineeIndex];
            await db.deleteTrainee(trainee.id);
            state.trainees = await db.getAllTrainees();
            state.currentTraineeIndex = 0;
            logHistory('מחיקת מתאמן', trainee.name);
            await saveSettings();
            renderTraineeTabs();
            await renderCurrentTrainee();
        }
    };

    document.getElementById('addBlockBtn').onclick = async () => {
        const trainee = state.trainees[state.currentTraineeIndex];
        const title = prompt('שם האימון (למשל אימון A):', 'אימון חדש');
        if (title) {
            const currentBlocks = await db.getBlocksByTrainee(trainee.id);
            await db.addBlock({
                traineeId: trainee.id,
                title,
                data: [['תרגיל', 'סטים', 'חזרות', 'משקל'], ['', '', '', '']],
                order: currentBlocks.length
            });
            logHistory('הוספת אימון', title);
            await renderCurrentTrainee();
        }
    };

    document.getElementById('currentTraineeName').onblur = async (e) => {
        const trainee = state.trainees[state.currentTraineeIndex];
        const oldName = trainee.name;
        const newName = e.target.textContent;
        if (oldName !== newName) {
            trainee.name = newName;
            await db.updateTrainee(trainee);
            logHistory('שינוי שם מתאמן', `מ-${oldName} ל-${newName}`);
            renderTraineeTabs();
        }
    };

    document.getElementById('historyBtn').onclick = showHistory;
    document.getElementById('closeHistory').onclick = () => document.getElementById('historyModal').style.display = 'none';

    document.getElementById('importBtn').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = handleFileUpload;
}

function applyTheme() {
    document.body.setAttribute('data-theme', state.theme);
}

async function showHistory() {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    const trainee = state.trainees[state.currentTraineeIndex];
    if (!trainee) return;

    const history = await db.getHistoryByTrainee(trainee.id);
    history.sort((a, b) => b.id - a.id);

    list.innerHTML = history.map(h => `
    <div style="border-bottom: 1px solid var(--border-color); padding: 0.5rem 0; text-align: right;">
      <small>${h.timestamp} - <strong>${h.traineeName}</strong></small>
      <div>${h.action}: ${h.description}</div>
    </div>
  `).join('') || 'אין עדיין היסטוריה';
    modal.style.display = 'flex';
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
    const currentBlocks = await db.getBlocksByTrainee(trainee.id);
    await db.addBlock({
        traineeId: trainee.id,
        title: `מיובא: ${title}`,
        data: data.length ? data : [[''], ['']],
        order: currentBlocks.length
    });
    logHistory('ייבוא קובץ', title);
    await renderCurrentTrainee();
}

// Start the app
init();
