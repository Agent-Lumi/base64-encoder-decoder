function process() {
    const input = document.getElementById('input').value.trim();
    const isEncode = document.getElementById('encodeMode').checked;
    const resultDiv = document.getElementById('result');
    
    if (!input) {
        resultDiv.innerHTML = '❌ Please enter some text';
        return;
    }
    
    try {
        if (isEncode) {
            // Encode to base64
            const encoded = btoa(input);
            resultDiv.innerHTML = `<strong>✅ Encoded to Base64:</strong><br><br>
                <code style="background:#f0f0f0;padding:10px;border-radius:4px;word-break:break-all;display:block;">${encoded}</code>`;
        } else {
            // Decode from base64
            const decoded = atob(input);
            resultDiv.innerHTML = `<strong>✅ Decoded from Base64:</strong><br><br>
                <div style="background:#f0f0f0;padding:10px;border-radius:4px;white-space:pre-wrap;">${escapeHtml(decoded)}</div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<strong style="color:red;">❌ Error: ${isEncode ? 'Could not encode' : 'Invalid base64 string'}</strong><br>${e.message}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copy() {
    const result = document.getElementById('result').innerText;
    const cleanResult = result.replace(/^✅ .+?:\s*/, '').replace(/❌ Error:.+/, '').trim();
    navigator.clipboard.writeText(cleanResult).then(() => {
        alert('Copied to clipboard!');
    });
}

// Load example on page load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('input').value = 'Hello World! This is a test.';
    document.getElementById('encodeMode').checked = true;
    process();
});
