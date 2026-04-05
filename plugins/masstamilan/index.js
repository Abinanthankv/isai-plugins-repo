/**
 * Masstamilan Plugin - Ultra Robust Version
 */

async function search(query) {
    const rawQuery = query.trim();
    if (!rawQuery) return [];

    const baseUrl = 'https://masstamilan.dev';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    
    // 1. Direct URL handling
    if (rawQuery.startsWith('http') && rawQuery.includes('masstamilan')) {
        return await scrapeAlbum(rawQuery, baseUrl, '');
    }

    // 2. Normal keyword search
    const cleanQuery = rawQuery.replace(/[&()"[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanQuery) return [];

    const words = cleanQuery.split(' ');
    const searchKeyword = words.length > 6 ? words.slice(0, 6).join(' ') : cleanQuery;

    console.log(`[Plugin] MassTamilan searching for: "${searchKeyword}"`);

    try {
        const searchUrl = `${baseUrl}/search?keyword=${encodeURIComponent(searchKeyword)}`;
        console.log(`[Plugin] MassTamilan Fetching URL: ${searchUrl}`);
        const response = await fetch(searchUrl, { headers });
        const html = await response.text();

        const albumLinks = [];
        const seen = new Set();
        
        // Find all links containing "-songs"
        const regex = /href=(['"])([^'"]+-songs[^'"]*)\1/g;
        let match;
        while ((match = regex.exec(html)) !== null && albumLinks.length < 5) {
            const href = match[2];
            if (!seen.has(href)) {
                seen.add(href);
                // Try to find title in the same <a> tag
                let title = "Unknown Album";
                const startPos = html.lastIndexOf('<a', match.index);
                const endPos = html.indexOf('>', match.index);
                if (startPos !== -1 && endPos !== -1) {
                    const tag = html.substring(startPos, endPos + 1);
                    const tMatch = tag.match(/title=(['"])(.*?)\1/);
                    if (tMatch) title = tMatch[2];
                    else {
                        const h2Match = html.substring(startPos, endPos + 200).match(/<h2>(.*?)<\/h2>/);
                        if (h2Match) title = h2Match[1];
                    }
                }
                albumLinks.push({ href: href.startsWith('http') ? href : `${baseUrl}${href}`, title });
            }
        }

        console.log(`[Plugin] MassTamilan found ${albumLinks.length} albums`);

        const allResults = [];
        for (const link of albumLinks) {
            const results = await scrapeAlbum(link.href, baseUrl, cleanQuery);
            allResults.push(...results);
            if (allResults.length >= 20) break;
        }

        return allResults;
    } catch (e) {
        console.log(`[Plugin] MassTamilan search error: ${e.message}`);
        return [];
    }
}

async function scrapeAlbum(albumUrl, baseUrl, cleanQuery) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    try {
        const response = await fetch(albumUrl, { headers });
        const html = await response.text();

        // Extract Album Title (basic)
        let albumTitle = "Unknown Album";
        const hMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (hMatch) {
            albumTitle = hMatch[1].replace(/<[^>]+>/g, '').replace(' Tamil Songs', '').replace(' Songs Download', '').trim();
        }

        // Extract Thumbnail
        let thumbnail = null;
        const imgMatch = html.match(/class="info-wrapper"[^>]*>[\s\S]*?src=(['"])(.*?)\1/);
        if (imgMatch) {
            const src = imgMatch[2];
            thumbnail = src.startsWith('http') ? src : `${baseUrl}${src}`;
        }

        const results = [];
        const queryWords = cleanQuery.toLowerCase().split(' ').filter(w => w.length > 2);

        // Find songs - more robust link discovery
        console.log(`[Plugin] Masstamilan HTML length: ${html.length}`);
        const dlinkRegex = /<a[^>]*class=["'][^"']*?\bdlink\b[^"']*?["'][^>]*href=(['"])(.*?)\1/gi;
        let dMatch;
        while ((dMatch = dlinkRegex.exec(html)) !== null) {
            const url = dMatch[2];
            if (!url.includes('320')) continue; 

            const rowStart = html.lastIndexOf('<tr', dMatch.index);
            const rowEnd = html.indexOf('</tr>', dMatch.index);
            if (rowStart !== -1 && rowEnd !== -1) {
                const rowHtml = html.substring(rowStart, rowEnd);
                const nameMatch = rowHtml.match(/itemprop="name"[^>]*>([\s\S]*?)<\/span>/) || rowHtml.match(/<h2>([\s\S]*?)<\/h2>/);
                let songName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : null;
                console.log(`[Plugin] Masstamilan candidate song: ${songName}`);

                if (songName) {
                    const songLower = songName.toLowerCase();
                    const albumLower = albumTitle.toLowerCase();
                    const isMatch = queryWords.length === 0 || queryWords.some(w => songLower.includes(w) || albumLower.includes(w));
                    
                    if (isMatch) {
                        results.push({
                            title: songName,
                            artist: "Various Artists",
                            url: url.startsWith('http') ? url : `${baseUrl}${url}`,
                            size: 0,
                            format: 'MP3 (320kbps Plugin)',
                            source: 'MassTamilan',
                            album: albumTitle,
                            thumbnail: thumbnail
                        });
                    }
                }
            }
        }

        return results;
    } catch (e) {
        console.log(`[Plugin] MassTamilan album error: ${e.message}`);
        return [];
    }
}
