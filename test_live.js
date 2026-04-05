const https = require('https');

async function testFetch() {
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"iOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        }
    };

    https.get('https://masstamilan.dev/search?keyword=Othaiyadi%20Kenatha%20Kanom', options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Data length: ${data.length}`);
            if (res.statusCode === 403) {
                console.log("Failed! Cloudflare blocked it again.");
            } else {
                console.log("Success! Bypassed Cloudflare.");
                console.log(data.substring(0, 300));
            }
        });
    }).on('error', (e) => {
        console.error(e);
    });
}
testFetch();
