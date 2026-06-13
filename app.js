function process() {
    const input = document.getElementById('input').value.trim();
    const isEncode = document.getElementById('encodeMode').checked;
    const urlSafe = document.getElementById('urlSafeMode').checked;
    const resultDiv = document.getElementById('result');
    const statsDiv = document.getElementById('stats');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Check for file input
    const fileInfo = document.getElementById('fileInfo');
    const currentFile = window.currentFile;
    
    if (!input && !currentFile) {
        resultDiv.innerHTML = '❌ Please enter some text or upload a file';
        statsDiv.classList.add('hidden');
        downloadBtn.style.display = 'none';
        return;
    }
    
    try {
        let result;
        let inputSize, outputSize;
        
        if (currentFile && document.getElementById('file-tab').classList.contains('active')) {
            // Process file
            inputSize = currentFile.size;
            
            if (isEncode) {
                // Encode file to base64
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target.result.split(',')[1];
                    result = urlSafe ? toUrlSafe(base64) : base64;
                    outputSize = new Blob([result]).size;
                    
                    resultDiv.innerHTML = `<strong>✅ File encoded to Base64:</strong><br><br>
                        <div class="file-result">
                            <p><strong>File:</strong> ${escapeHtml(currentFile.name)}</p>
                            <p><strong>Type:</strong> ${currentFile.type || 'Unknown'}</p>
                            <p><strong>Size:</strong> ${formatBytes(currentFile.size)}</p>
                        </div>
                        <code class="result-code" title="Click to expand/collapse" onclick="this.classList.toggle('expanded')">${escapeHtml(result.substring(0, 200))}${result.length > 200 ? '...' : ''}</code>`;
                    
                    window.lastResult = result;
                    window.lastResultType = 'file';
                    window.lastFileName = currentFile.name;
                    
                    updateStats(inputSize, outputSize);
                    downloadBtn.style.display = 'inline-block';
                    downloadBtn.textContent = '💾 Download as .txt';
                    
                    // Save to history
                    saveToHistory(currentFile.name, 'file', inputSize, outputSize);
                };
                reader.readAsDataURL(currentFile);
                return;
            } else {
                resultDiv.innerHTML = '<strong style="color:red;">❌ Cannot decode file input. Please paste base64 text.</strong>';
                statsDiv.classList.add('hidden');
                downloadBtn.style.display = 'none';
                return;
            }
        } else {
            // Process text input
            inputSize = new Blob([input]).size;
            
            if (isEncode) {
                // Encode text to base64
                let encoded = btoa(unescape(encodeURIComponent(input)));
                if (urlSafe) {
                    encoded = toUrlSafe(encoded);
                }
                result = encoded;
                outputSize = new Blob([result]).size;
                
                resultDiv.innerHTML = `<strong>✅ Encoded to Base64${urlSafe ? ' (URL-safe)' : ''}:</strong><br><br>
                    <code class="result-code">${escapeHtml(result)}</code>`;
                
                window.lastResultType = 'text';
            } else {
                // Decode base64 to text
                let decodedInput = input;
                if (urlSafe) {
                    decodedInput = fromUrlSafe(input);
                }
                
                // Try to decode as UTF-8 text
                try {
                    const decoded = decodeURIComponent(escape(atob(decodedInput)));
                    result = decoded;
                    outputSize = new Blob([result]).size;
                    
                    resultDiv.innerHTML = `<strong>✅ Decoded from Base64${urlSafe ? ' (URL-safe)' : ''}:</strong><br><br>
                        <div class="result-text">${escapeHtml(result)}</div>`;
                    
                    window.lastResultType = 'text';
                } catch (e) {
                    // If UTF-8 decoding fails, try raw binary
                    try {
                        const binary = atob(decodedInput);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        
                        resultDiv.innerHTML = `<strong>✅ Decoded binary data:</strong><br><br>
                            <div class="result-binary">
                                <p>Binary data (${bytes.length} bytes) - not valid UTF-8 text</p>
                                <button onclick="downloadBinary()" class="secondary">💾 Download Binary</button>
                            </div>`;
                        
                        window.binaryData = bytes;
                        window.lastResultType = 'binary';
                    } catch (e2) {
                        throw new Error('Invalid base64 string');
                    }
                }
            }
            
            window.lastResult = result;
            updateStats(inputSize, outputSize);
            downloadBtn.style.display = window.lastResultType === 'text' ? 'inline-block' : 'none';
            
            // Save to history
            saveToHistory(input.substring(0, 50) + (input.length > 50 ? '...' : ''), window.lastResultType, inputSize, outputSize);
        }
    } catch (e) {
        resultDiv.innerHTML = `<strong style="color:red;">❌ Error: ${isEncode ? 'Could not encode' : 'Invalid base64 string'}</strong><br>${escapeHtml(e.message)}`;
        statsDiv.classList.add('hidden');
        downloadBtn.style.display = 'none';
    }
}

function toUrlSafe(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(urlSafe) {
    // Restore padding
    let padding = '';
    const padLen = (4 - (urlSafe.length % 4)) % 4;
    for (let i = 0; i < padLen; i++) {
        padding += '=';
    }
    return urlSafe.replace(/-/g, '+').replace(/_/g, '/') + padding;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateStats(inputSize, outputSize) {
    const statsDiv = document.getElementById('stats');
    const ratio = outputSize / inputSize;
    const percentage = ((ratio - 1) * 100).toFixed(1);
    
    statsDiv.innerHTML = `
        <strong>📊 Statistics:</strong><br>
        Input: ${formatBytes(inputSize)} → Output: ${formatBytes(outputSize)}<br>
        Size change: ${percentage > 0 ? '+' : ''}${percentage}%
    `;
    statsDiv.classList.remove('hidden');
}

function copy() {
    const result = window.lastResult;
    if (!result) {
        alert('No result to copy!');
        return;
    }
    
    navigator.clipboard.writeText(result).then(() => {
        showToast('📋 Copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = result;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('📋 Copied to clipboard!');
    });
}

function downloadResult() {
    const result = window.lastResult;
    if (!result) return;
    
    let filename, mimeType;
    if (window.lastResultType === 'file') {
        filename = window.lastFileName + '.b64.txt';
        mimeType = 'text/plain';
    } else {
        filename = 'base64-result.txt';
        mimeType = 'text/plain';
    }
    
    const blob = new Blob([result], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('💾 Download started!');
}

function downloadBinary() {
    const bytes = window.binaryData;
    if (!bytes) return;
    
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decoded-file.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('💾 Binary download started!');
}

function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('result').innerHTML = '<em>Enter text or upload a file and click Process to see the result...</em>';
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('downloadBtn').style.display = 'none';
    
    // Clear file
    window.currentFile = null;
    document.getElementById('fileInfo').innerHTML = '';
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('clearFileBtn').classList.add('hidden');
    document.getElementById('fileDropZone').classList.remove('has-file');
    
    window.lastResult = null;
    window.binaryData = null;
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// History feature
function saveToHistory(description, type, inputSize, outputSize) {
    const history = getHistory();
    const entry = {
        id: Date.now(),
        description,
        type,
        inputSize,
        outputSize,
        timestamp: new Date().toISOString()
    };
    
    history.unshift(entry);
    // Keep only last 50 entries
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('base64-history', JSON.stringify(history));
    renderHistory();
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('base64-history')) || [];
    } catch (e) {
        return [];
    }
}

function clearHistory() {
    localStorage.removeItem('base64-history');
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    const container = document.getElementById('historyList');
    
    if (!container) return;
    
    if (history.length === 0) {
        container.innerHTML = '<p class="history-empty">No history yet. Start encoding/decoding to see your activity here!</p>';
        return;
    }
    
    container.innerHTML = history.slice(0, 10).map(entry => {
        const date = new Date(entry.timestamp);
        const timeAgo = getTimeAgo(date);
        return `
            <div class="history-item" data-id="${entry.id}">
                <div class="history-info">
                    <span class="history-type">${entry.type === 'file' ? '📁' : '📝'} ${escapeHtml(entry.description)}</span>
                    <span class="history-time">${timeAgo}</span>
                </div>
                <div class="history-sizes">
                    ${formatBytes(entry.inputSize)} → ${formatBytes(entry.outputSize)}
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

// Tab switching
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');
        });
    });
}

// File upload handling
function setupFileUpload() {
    const dropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const clearFileBtn = document.getElementById('clearFileBtn');
    
    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());
    
    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // Clear file
    clearFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.currentFile = null;
        fileInput.value = '';
        fileInfo.innerHTML = '';
        fileInfo.classList.add('hidden');
        clearFileBtn.classList.add('hidden');
        dropZone.classList.remove('has-file');
    });
}

function handleFile(file) {
    window.currentFile = file;
    const fileInfo = document.getElementById('fileInfo');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const dropZone = document.getElementById('fileDropZone');
    
    fileInfo.innerHTML = `
        <strong>📄 ${escapeHtml(file.name)}</strong><br>
        <span>${escapeHtml(file.type || 'Unknown type')} • ${formatBytes(file.size)}</span>
    `;
    fileInfo.classList.remove('hidden');
    clearFileBtn.classList.remove('hidden');
    dropZone.classList.add('has-file');
}

// Theme management
const ThemeManager = {
    currentTheme: localStorage.getItem('base64-theme') || 'dark',
    
    init() {
        this.applyTheme(this.currentTheme);
        this.setupToggle();
    },
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        }
        this.currentTheme = theme;
        localStorage.setItem('base64-theme', theme);
    },
    
    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        showToast(`${newTheme === 'dark' ? '🌙' : '☀️'} Switched to ${newTheme} mode`);
    },
    
    setupToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }
};

// Initialize theme on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupFileUpload();
    renderHistory();
    
    // Load saved input
    const savedInput = localStorage.getItem('base64-input');
    if (savedInput) {
        document.getElementById('input').value = savedInput;
    }
    
    // Auto-save input
    document.getElementById('input').addEventListener('input', (e) => {
        localStorage.setItem('base64-input', e.target.value);
    });
    
    // Load mode preference
    const savedMode = localStorage.getItem('base64-mode');
    if (savedMode === 'decode') {
        document.getElementById('decodeMode').checked = true;
    }
    
    // Save mode on change
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            localStorage.setItem('base64-mode', e.target.value);
        });
    });
    
    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(console.error);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
            e.preventDefault();
            process();
        } else if (e.key === 'c' && !window.getSelection().toString()) {
            // Ctrl+C when nothing selected - copy result
            e.preventDefault();
            copy();
        } else if (e.key === 'd') {
            // Ctrl+D - download result
            e.preventDefault();
            if (window.lastResult) {
                downloadResult();
            }
        } else if (e.key === 'r') {
            // Ctrl+R - reset/clear
            e.preventDefault();
            clearAll();
        } else if (e.key === 'e') {
            // Ctrl+E - encode mode
            e.preventDefault();
            document.getElementById('encodeMode').checked = true;
            document.getElementById('encodeMode').dispatchEvent(new Event('change'));
        } else if (e.key === 'D') {
            // Ctrl+Shift+D - decode mode
            e.preventDefault();
            document.getElementById('decodeMode').checked = true;
            document.getElementById('decodeMode').dispatchEvent(new Event('change'));
        } else if (e.key === 't') {
            // Ctrl+T - toggle theme
            e.preventDefault();
            ThemeManager.toggle();
        }
    }
});

// Export functions for inline onclick handlers
window.process = process;
window.copy = copy;
window.clearAll = clearAll;
window.downloadResult = downloadResult;
window.downloadBinary = downloadBinary;
window.clearHistory = clearHistory;
