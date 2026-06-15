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
            
            // Show export formats and share button
            const exportFormats = document.getElementById('exportFormats');
            const shareBtn = document.getElementById('shareBtn');
            if (exportFormats) exportFormats.style.display = 'block';
            if (shareBtn) shareBtn.style.display = 'inline-block';
            
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

// Export in different formats
function exportAs(format) {
    const result = window.lastResult;
    if (!result) {
        showToast('No result to export!', 'error');
        return;
    }
    
    let content, mimeType, filename;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    switch(format) {
        case 'json':
            content = JSON.stringify({
                result: result,
                type: window.lastResultType || 'text',
                timestamp: new Date().toISOString(),
                input_type: document.getElementById('encodeMode').checked ? 'text' : 'base64',
                url_safe: document.getElementById('urlSafeMode').checked
            }, null, 2);
            mimeType = 'application/json';
            filename = `base64-result-${timestamp}.json`;
            break;
            
        case 'base64':
            content = result;
            mimeType = 'application/octet-stream';
            filename = `base64-result-${timestamp}.b64`;
            break;
            
        case 'html':
            const isEncode = document.getElementById('encodeMode').checked;
            content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Base64 Result</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .result-box { background: #f3f4f6; padding: 20px; border-radius: 8px; word-break: break-all; font-family: monospace; }
        .meta { color: #6b7280; font-size: 14px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Base64 ${isEncode ? 'Encoded' : 'Decoded'} Result</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    <div class="result-box">${escapeHtml(result)}</div>
    <div class="meta">
        <p>Mode: ${isEncode ? 'Encode (Text → Base64)' : 'Decode (Base64 → Text)'}</p>
        <p>URL-safe: ${document.getElementById('urlSafeMode').checked ? 'Yes' : 'No'}</p>
        <p>Result type: ${window.lastResultType || 'text'}</p>
    </div>
</body>
</html>`;
            mimeType = 'text/html';
            filename = `base64-result-${timestamp}.html`;
            break;
            
        case 'markdown':
            content = `# Base64 Result

**Generated:** ${new Date().toLocaleString()}

**Mode:** ${document.getElementById('encodeMode').checked ? 'Encode' : 'Decode'}

**URL-safe:** ${document.getElementById('urlSafeMode').checked ? 'Yes' : 'No'}

## Result

\`\`\`
${result}
\`\`\`

---
*Generated by Base64 Encoder/Decoder*`;
            mimeType = 'text/markdown';
            filename = `base64-result-${timestamp}.md`;
            break;
            
        case 'txt':
        default:
            content = `Base64 Result
Generated: ${new Date().toLocaleString()}
Mode: ${document.getElementById('encodeMode').checked ? 'Encode' : 'Decode'}
URL-safe: ${document.getElementById('urlSafeMode').checked ? 'Yes' : 'No'}

---

${result}`;
            mimeType = 'text/plain';
            filename = `base64-result-${timestamp}.txt`;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`📄 Exported as ${format.toUpperCase()}!`);
}

// Share functionality
async function shareResult() {
    const result = window.lastResult;
    if (!result) {
        showToast('No result to share!', 'error');
        return;
    }
    
    const isEncode = document.getElementById('encodeMode').checked;
    const shareText = `Base64 ${isEncode ? 'encoded' : 'decoded'} result:\n\n${result.substring(0, 500)}${result.length > 500 ? '...' : ''}`;
    const shareTitle = `Base64 Result - ${isEncode ? 'Encoded' : 'Decoded'}`;
    
    // Try Web Share API first
    if (navigator.share) {
        try {
            await navigator.share({
                title: shareTitle,
                text: shareText
            });
            showToast('🔗 Shared successfully!');
            return;
        } catch (e) {
            // User cancelled or failed, fall through to clipboard
        }
    }
    
    // Fallback: Copy to clipboard with share link
    const shareUrl = `${window.location.origin}${window.location.pathname}?r=${encodeURIComponent(result.substring(0, 2000))}&m=${isEncode ? 'e' : 'd'}`;
    const fullText = `${shareText}\n\nView online: ${shareUrl}`;
    
    try {
        await navigator.clipboard.writeText(fullText);
        showToast('📋 Share text copied to clipboard!');
        
        // Show share modal with QR code option
        showShareModal(shareUrl);
    } catch (e) {
        showToast('❌ Could not copy to clipboard', 'error');
    }
}

// Show share modal
function showShareModal(shareUrl) {
    // Remove existing modal
    const existing = document.getElementById('shareModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <h3>🔗 Share Result</h3>
            <p>Share this link to let others view your result:</p>
            <div class="share-url-box">
                <input type="text" value="${shareUrl}" readonly id="shareUrlInput">
                <button onclick="copyShareUrl()" class="share-copy-btn">📋 Copy</button>
            </div>
            <div class="share-actions">
                <a href="https://twitter.com/intent/tweet?text=Base64%20result&url=${encodeURIComponent(shareUrl)}" target="_blank" class="share-btn twitter">𝕏 Tweet</a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}" target="_blank" class="share-btn linkedin">💼 LinkedIn</a>
                <a href="mailto:?subject=Base64 Result&body=${encodeURIComponent('Here is my Base64 result: ' + shareUrl)}" class="share-btn email">✉️ Email</a>
            </div>
            <button onclick="closeShareModal()" class="share-close-btn">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeShareModal();
    });
}

function copyShareUrl() {
    const input = document.getElementById('shareUrlInput');
    input.select();
    document.execCommand('copy');
    showToast('📋 URL copied!');
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.remove();
}

// Check for shared result in URL
function checkSharedResult() {
    const params = new URLSearchParams(window.location.search);
    const sharedResult = params.get('r');
    const mode = params.get('m');
    
    if (sharedResult) {
        document.getElementById('input').value = decodeURIComponent(sharedResult);
        if (mode === 'd') {
            document.getElementById('decodeMode').checked = true;
        }
        showToast('📋 Loaded shared result!');
        process();
    }
}

// Load export options visibility
function loadExportOptions() {
    const exportFormats = document.getElementById('exportFormats');
    const shareBtn = document.getElementById('shareBtn');
    if (exportFormats && window.lastResult) {
        exportFormats.style.display = 'block';
    }
    if (shareBtn && window.lastResult) {
        shareBtn.style.display = 'inline-block';
    }
}

function clearAll() {
    document.getElementById('input').value = '';
    document.getElementById('result').innerHTML = '<em>Enter text or upload a file and click Process to see the result...</em>';
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('downloadBtn').style.display = 'none';
    
    // Hide export formats and share button
    const exportFormats = document.getElementById('exportFormats');
    const shareBtn = document.getElementById('shareBtn');
    if (exportFormats) exportFormats.style.display = 'none';
    if (shareBtn) shareBtn.style.display = 'none';
    
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
    
    // Check for shared result in URL
    checkSharedResult();
    
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

function processBulk() {
    const input = document.getElementById('bulkInput').value.trim();
    const resultDiv = document.getElementById('bulkResult');
    const outputDiv = document.getElementById('bulkOutput');
    const statsSpan = document.getElementById('bulkStats');
    
    if (!input) {
        alert('Please enter some text to process!');
        return;
    }
    
    const lines = input.split('\n').filter(line => line.trim());
    const autoDetect = document.getElementById('bulkAutoDetect').checked;
    const isEncode = document.getElementById('encodeMode').checked;
    const urlSafe = document.getElementById('urlSafeMode').checked;
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        let result, status, action;
        
        try {
            if (autoDetect) {
                // Try to detect if it's base64
                if (isValidBase64(trimmedLine)) {
                    // Decode
                    let decodedInput = urlSafe ? fromUrlSafe(trimmedLine) : trimmedLine;
                    try {
                        result = decodeURIComponent(escape(atob(decodedInput)));
                        action = 'decoded';
                    } catch (e) {
                        // Binary data
                        const binary = atob(decodedInput);
                        result = '[Binary data: ' + binary.length + ' bytes]';
                        action = 'decoded (binary)';
                    }
                } else {
                    // Encode
                    let encoded = btoa(unescape(encodeURIComponent(trimmedLine)));
                    if (urlSafe) {
                        encoded = toUrlSafe(encoded);
                    }
                    result = encoded;
                    action = 'encoded';
                }
                status = 'success';
                successCount++;
            } else {
                // Manual mode based on radio selection
                if (isEncode) {
                    let encoded = btoa(unescape(encodeURIComponent(trimmedLine)));
                    if (urlSafe) {
                        encoded = toUrlSafe(encoded);
                    }
                    result = encoded;
                    action = 'encoded';
                } else {
                    let decodedInput = urlSafe ? fromUrlSafe(trimmedLine) : trimmedLine;
                    try {
                        result = decodeURIComponent(escape(atob(decodedInput)));
                        action = 'decoded';
                    } catch (e) {
                        result = '[Invalid base64]';
                        throw new Error('Invalid base64');
                    }
                }
                status = 'success';
                successCount++;
            }
        } catch (e) {
            result = e.message || 'Error';
            status = 'error';
            action = 'failed';
            errorCount++;
        }
        
        results.push({
            index: index + 1,
            input: trimmedLine,
            output: result,
            status: status,
            action: action
        });
    });
    
    // Render results
    outputDiv.innerHTML = results.map(r => `
        <div class="bulk-item ${r.status}">
            <div class="bulk-item-header">
                <span class="bulk-item-number">#${r.index}</span>
                <span class="bulk-item-action">${r.action}</span>
            </div>
            <div class="bulk-item-input">
                <strong>Input:</strong> ${escapeHtml(r.input.substring(0, 100))}${r.input.length > 100 ? '...' : ''}
            </div>
            <div class="bulk-item-output">
                <strong>Output:</strong> 
                <code class="bulk-result-code">${escapeHtml(r.output)}</code>
                <button onclick="copyText('${escapeHtml(r.output).replace(/'/g, "\\'")}')" class="bulk-copy-btn" title="Copy this result">📋</button>
            </div>
        </div>
    `).join('');
    
    statsSpan.innerHTML = `✅ ${successCount} successful | ❌ ${errorCount} failed`;
    resultDiv.classList.remove('hidden');
    
    // Store for copy/download
    window.bulkResults = results;
    
    showToast(`⚡ Processed ${lines.length} items!`);
}

function isValidBase64(str) {
    // Check if string looks like base64
    const base64Regex = /^[A-Za-z0-9+/\-_]+={0,2}$/;
    if (!base64Regex.test(str)) return false;
    
    // Try to decode
    try {
        // Check length is multiple of 4 (with padding) or reasonable
        const cleanStr = str.replace(/-/g, '+').replace(/_/g, '/');
        if (cleanStr.length % 4 !== 0 && !str.includes('-') && !str.includes('_')) {
            // Not standard base64 length
            if (str.length < 20) return false; // Short strings are ambiguous
        }
        
        // Actually try to decode
        atob(cleanStr);
        return true;
    } catch (e) {
        return false;
    }
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied to clipboard!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('📋 Copied to clipboard!');
    });
}

function copyBulkResults() {
    if (!window.bulkResults || window.bulkResults.length === 0) return;
    
    const text = window.bulkResults.map(r => r.output).join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 All results copied!');
    });
}

function downloadBulkResults() {
    if (!window.bulkResults || window.bulkResults.length === 0) return;
    
    // Create CSV
    const csv = [
        ['#', 'Input', 'Output', 'Action', 'Status'].join(','),
        ...window.bulkResults.map(r => [
            r.index,
            '"' + r.input.replace(/"/g, '""') + '"',
            '"' + r.output.replace(/"/g, '""') + '"',
            r.action,
            r.status
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'base64-bulk-results-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('💾 CSV download started!');
}

function clearBulk() {
    document.getElementById('bulkInput').value = '';
    document.getElementById('bulkResult').classList.add('hidden');
    document.getElementById('bulkOutput').innerHTML = '';
    window.bulkResults = [];
}

// Export functions for inline onclick handlers
window.process = process;
window.copy = copy;
window.clearAll = clearAll;
window.downloadResult = downloadResult;
window.downloadBinary = downloadBinary;
window.clearHistory = clearHistory;
window.processBulk = processBulk;
window.copyBulkResults = copyBulkResults;
window.downloadBulkResults = downloadBulkResults;
window.clearBulk = clearBulk;
window.copyText = copyText;
window.exportAs = exportAs;
window.shareResult = shareResult;
window.copyShareUrl = copyShareUrl;
window.closeShareModal = closeShareModal;
window.loadExample = loadExample;

// Load example data
function loadExample(type = 'hello') {
    const input = document.getElementById('input');
    const encodeMode = document.getElementById('encodeMode');
    const decodeMode = document.getElementById('decodeMode');
    const urlSafe = document.getElementById('urlSafeMode');
    
    switch(type) {
        case 'hello':
            input.value = 'Hello World!';
            encodeMode.checked = true;
            urlSafe.checked = false;
            break;
        case 'urlsafe':
            input.value = 'Hello+World/Path';
            encodeMode.checked = true;
            urlSafe.checked = true;
            break;
        case 'decode':
            input.value = 'SGVsbG8gV29ybGQ=';
            decodeMode.checked = true;
            urlSafe.checked = false;
            break;
    }
    
    process();
    showToast(`🎲 Example loaded: ${type}`);
}
window.exportAs = exportAs;
window.shareResult = shareResult;
window.copyShareUrl = copyShareUrl;
window.closeShareModal = closeShareModal;
