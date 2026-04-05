const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

// Mock fetch for Node.js
global.fetch = (url, options = {}) => {
    console.log(`[FETCH] ${url}`);
    return new Promise((resolve, reject) => {
        const handleRequest = (currentUrl) => {
            const req = https.request(currentUrl, options, (res) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    let buffer = Buffer.concat(chunks);
                    const encoding = res.headers['content-encoding'];
                    
                    if (encoding === 'gzip') {
                        buffer = zlib.gunzipSync(buffer);
                    } else if (encoding === 'br') {
                        buffer = zlib.brotliDecompressSync(buffer);
                    }

                    const data = buffer.toString();
                    
                    if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                        let redirectUrl = res.headers.location;
                        if (!redirectUrl.startsWith('http')) {
                            const parsed = new URL(currentUrl);
                            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
                        }
                        console.log(`[REDIRECT] to ${redirectUrl}`);
                        handleRequest(redirectUrl);
                        return;
                    }

                    resolve({
                        status: res.statusCode,
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        text: () => Promise.resolve(data),
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                });
            });
            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        };
        handleRequest(url);
    });
};

global.console.log = (...args) => process.stdout.write('[LOG] ' + args.join(' ') + '\n');
global.console.error = (...args) => process.stderr.write('[ERR] ' + args.join(' ') + '\n');

async function testPlugin(pluginId, query) {
    console.log(`\n>>> Testing Plugin: ${pluginId} with query: "${query}"`);
    const pluginPath = path.join(__dirname, 'plugins', pluginId.split('.').pop(), 'index.js');
    
    // Simpler path resolution for our local repo structure
    const folderName = pluginId.replace('org.isai.', '');
    const scriptPath = path.resolve(__dirname, 'plugins', folderName, 'index.js');
    
    if (!fs.existsSync(scriptPath)) {
        console.error(`Script not found at ${scriptPath}`);
        return;
    }

    const script = fs.readFileSync(scriptPath, 'utf8');
    
    try {
        // Evaluate the script in a way that we can call search()
        const searchFunc = new Function('query', `${script}\nreturn search(query).then(r => ({ results: r }));`);
        const { results } = await searchFunc(query);
        
        if (results.length === 0) {
            console.log("No results found. Writing HTML to /tmp/debug.html");
            // Note: In our test script, we need access to the raw HTML.
            // I'll modify the searchFunc to return it.
        }
        
        console.log(`Found ${results.length} results:`);
        results.slice(0, 3).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.title} - ${r.artist} (${r.url.substring(0, 50)}...)`);
        });
    } catch (e) {
        console.error(`Execution failed: ${e.stack}`);
    }
}

// Custom split helper for my specific logic
String.prototype.splitLast = function() { return this.split('.').pop(); };

const query = process.argv[2] || "Jaiye Sajana";

(async () => {
    await testPlugin('org.isai.jiosaavn', query);
    await testPlugin('org.isai.masstamilan', query);
    await testPlugin('org.isai.youtube', query);
    await testPlugin('org.isai.tidal', query);
})();
