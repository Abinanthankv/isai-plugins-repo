const fs = require('fs');
const path = require('path');

// Mock fetch to return local file content
global.fetch = (url) => {
    let filePath = '';
    if (url.includes('-songs')) filePath = '/tmp/masstamilan_album_2026.html';
    else if (url.includes('search')) filePath = '/tmp/masstamilan_search.html';
    
    if (!fs.existsSync(filePath)) {
        console.log(`[MOCK] File not found for: ${url}`);
        return Promise.resolve({ text: () => Promise.resolve('File not found') });
    }
    return Promise.resolve({ 
        text: () => Promise.resolve(fs.readFileSync(filePath, 'utf8')),
        status: 200,
        ok: true
    });
};

const originalLog = console.log;
global.console.log = (...args) => originalLog('[LOG]', ...args);

async function testLocal() {
    const script = fs.readFileSync(path.resolve(__dirname, 'plugins/masstamilan/index.js'), 'utf8');
    const searchFunc = new Function('query', `${script}\nreturn search(query);`);
    
    console.log("Testing Masstamilan search with static file /tmp/masstamilan_search.html");
    const results = await searchFunc("Othaiyadi Kenatha Kanom");
    console.log(`Found ${results.length} songs in total`);
    results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.title} - ${r.url}`);
    });
}

testLocal();
