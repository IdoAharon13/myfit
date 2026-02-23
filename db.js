class MyFitDB {
    constructor() {
        this.dbName = 'MyFitDB';
        this.version = 2; // Bumped version for new store
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('trainees')) {
                    db.createObjectStore('trainees', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('blocks')) {
                    const blockStore = db.createObjectStore('blocks', { keyPath: 'id', autoIncrement: true });
                    blockStore.createIndex('traineeId', 'traineeId', { unique: false });
                }
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('traineeId', 'traineeId', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAllTrainees() {
        return this._getAll('trainees');
    }

    async addTrainee(trainee) {
        return this._add('trainees', trainee);
    }

    async updateTrainee(trainee) {
        return this._update('trainees', trainee);
    }

    async deleteTrainee(id) {
        await this.deleteBlocksByTrainee(id);
        await this.deleteHistoryByTrainee(id);
        return this._delete('trainees', id);
    }

    async getBlocksByTrainee(traineeId) {
        return this._getByIndex('blocks', 'traineeId', traineeId);
    }

    async addBlock(block) {
        return this._add('blocks', block);
    }

    async updateBlock(block) {
        return this._update('blocks', block);
    }

    async deleteBlock(id) {
        return this._delete('blocks', id);
    }

    async getHistoryByTrainee(traineeId) {
        return this._getByIndex('history', 'traineeId', traineeId);
    }

    async addHistory(entry) {
        return this._add('history', entry);
    }

    async deleteBlocksByTrainee(traineeId) {
        const blocks = await this.getBlocksByTrainee(traineeId);
        for (const block of blocks) {
            await this.deleteBlock(block.id);
        }
    }

    async deleteHistoryByTrainee(traineeId) {
        const history = await this.getHistoryByTrainee(traineeId);
        for (const entry of history) {
            await this._delete('history', entry.id);
        }
    }

    // --- Settings ---
    async getSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('settings', 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('app_settings');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveSettings(settings) {
        return this._update('settings', { id: 'app_settings', ...settings });
    }

    // --- Private Helpers ---
    _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    _delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new MyFitDB();
