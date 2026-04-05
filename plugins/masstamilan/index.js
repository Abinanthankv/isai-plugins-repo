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

    const keywords = cleanQuery.split(' ');
    // Try original, then try cleaned, then try last words
    const searchStrategies = [
        keywords.join(' '), // Full
        keywords.filter(w => !['from', 'official', 'video', 'song', 'full', 'mp3', 'the', 'mix'].includes(w.toLowerCase())).join(' '), // Cleaned
        keywords.slice(-2).join(' ') // Last two words (often movie name)
    ].filter((s, i, a) => s && a.indexOf(s) === i); // Unique

    try {
        for (const searchKeyword of searchStrategies) {
        console.log(`[Plugin] MassTamilan strategy: "${searchKeyword}"`);
        try {
            const searchUrl = `${baseUrl}/search?keyword=${encodeURIComponent(searchKeyword)}`;
            const response = await fetch(searchUrl, { headers });
            const html = await response.text();

            const albumLinks = [];
            const seen = new Set();
            
            // Ultra robust: Match any href that looks like an album link, and grab title from anywhere inside or attribute
            const aRegex = /<a[^>]+href=(['"])([^'"]+?)\1[^>]*title=(['"])([^'"]+?)\3/gi;
            let match;
            while ((match = aRegex.exec(html)) !== null && albumLinks.length < 5) {
                const href = match[2];
                const title = match[4];
                if (!href.includes('category') && href.length > 5 && !seen.has(href)) {
                    seen.add(href);
                    albumLinks.push({ href: href.split('?')[0].startsWith('http') ? href.split('?')[0] : `${baseUrl}${href.split('?')[0]}`, title });
                }
            }

            if (albumLinks.length === 0) {
                // Try simpler regex if title attribute fails
                const simpleRegex = /<a[^>]+href=(['"])([^'"]+-songs)\1/gi;
                while ((match = simpleRegex.exec(html)) !== null && albumLinks.length < 5) {
                    const href = match[2];
                    if (!seen.has(href)) {
                        seen.add(href);
                        albumLinks.push({ href: href.startsWith('http') ? href : `${baseUrl}${href}`, title: "Unknown Album" });
                    }
                }
            }

            if (albumLinks.length > 0) {
                console.log(`[Plugin] MassTamilan found ${albumLinks.length} albums with strategy "${searchKeyword}"`);
                const allResults = [];
                for (const link of albumLinks) {
                    const results = await scrapeAlbum(link.href, baseUrl, cleanQuery);
                    allResults.push(...results);
                    if (allResults.length >= 20) break;
                }
                if (allResults.length > 0) return allResults;
            }
        } catch (e) {
            console.log(`[Plugin] MassTamilan strategy error: ${e.message}`);
        }
    }
    return [];
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

        // Use a safe, simple regex to find all anchor tags, then filter in JS
        const anchorRegex = /<a\s+[^>]*?href=(['"])(.*?)\1/gi;
        let aMatch;
        while ((aMatch = anchorRegex.exec(html)) !== null) {
            const fullTag = aMatch[0];
            const url = aMatch[2];
            
            // Check if this is a download link (contains dlink class)
            if (!fullTag.includes('dlink')) continue;
            if (!url.includes('320')) continue; 
            if (url.includes('zip') || url.includes('rar')) continue;

            // Extract title from <a> tag's title attribute
            let songName = null;
            const titleAttrMatch = fullTag.match(/title=(['"])(.*?)\1/i);
            if (titleAttrMatch) {
                const titleAttr = titleAttrMatch[2];
                // Masstamilan title format: "Download Pathikichu 320kbps"
                const nameMatch = titleAttr.match(/Download (.*?) (128|320)kbps/i);
                if (nameMatch) songName = nameMatch[1].trim();
            }

            // Fallback to row parsing if title extraction failed
            if (!songName) {
                const rowStart = html.lastIndexOf('<tr', aMatch.index);
                const rowEnd = html.indexOf('</tr>', aMatch.index);
                if (rowStart !== -1 && rowEnd !== -1) {
                    const rowHtml = html.substring(rowStart, rowEnd);
                    const nameMatchRow = rowHtml.match(/itemprop="name"[^>]*>([\s\S]*?)<\/span>/) || rowHtml.match(/<h2>([\s\S]*?)<\/h2>/);
                    songName = nameMatchRow ? nameMatchRow[1].replace(/<[^>]+>/g, '').trim() : null;
                }
            }

            if (songName) {
                const songLower = songName.toLowerCase();
                const albumLower = albumTitle.toLowerCase();
                // Filter: at least one word from query must match EITHER song or album
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

        return results;
    } catch (e) {
        console.log(`[Plugin] MassTamilan album error: ${e.message}`);
        return [];
    }
}
