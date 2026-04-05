/**
 * Masstamilan Plugin - Bulletproof Rewrite (v1.0.1)
 * Using bridgedFetch to bypass native JS engine conflicts.
 */

async function search(query) {
    const rawQuery = query.trim();
    if (!rawQuery) return [];

    const baseUrl = 'https://masstamilan.dev';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    
    // Explicitly use bridgedFetch if available
    const myFetch = typeof bridgedFetch !== 'undefined' ? bridgedFetch : fetch;

    // 1. Direct URL handling
    if (rawQuery.startsWith('http') && rawQuery.includes('masstamilan')) {
        return await scrapeAlbum(rawQuery, baseUrl, '');
    }

    // 2. Intelligent Movie Name Extraction
    let movieName = null;
    const movieMatch = rawQuery.match(/\(From ["'](.*?)["']\)/i) || rawQuery.match(/From ["'](.*?)["']/i);
    if (movieMatch) movieName = movieMatch[1].trim();

    // 3. Clean keywords
    const cleanQuery = rawQuery.replace(/[&()"[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const keywords = cleanQuery.split(' ');
    
    const searchStrategies = [
        movieName, 
        keywords.length > 3 ? keywords.slice(-3).join(' ') : cleanQuery,
        keywords.filter(w => !['from', 'official', 'video', 'song', 'full', 'mp3', 'the', 'mixed', 'audio'].includes(w.toLowerCase())).join(' ')
    ].filter((s, i, a) => s && s.length > 2 && a.indexOf(s) === i);

    for (const searchKeyword of searchStrategies) {
        try {
            console.log(`[Plugin] MassTamilan bridged search attempt: "${searchKeyword}"`);
            const searchUrl = `${baseUrl}/search?keyword=${encodeURIComponent(searchKeyword)}&_cb=${Date.now()}`;
            const response = await myFetch(searchUrl, { headers });
            
            if (!response.ok) continue;
            const html = await response.text();

            const albumLinks = [];
            const seen = new Set();
            const linkRegex = /href=(['"])([^'"]+-songs[^'"]*)\1/gi;
            let match;
            
            while ((match = linkRegex.exec(html)) !== null && albumLinks.length < 5) {
                const href = match[2];
                if (!seen.has(href)) {
                    seen.add(href);
                    let title = "Album";
                    const aStart = html.lastIndexOf('<a', match.index);
                    const aEnd = html.indexOf('>', match.index);
                    if (aStart !== -1 && aEnd !== -1) {
                        const aTag = html.substring(aStart, aEnd + 1);
                        const tMatch = aTag.match(/title=(['"])(.*?)\1/i);
                        if (tMatch) title = tMatch[2];
                    }
                    albumLinks.push({ 
                        href: href.split('?')[0].startsWith('http') ? href.split('?')[0] : `${baseUrl}${href.split('?')[0]}`, 
                        title 
                    });
                }
            }

            if (albumLinks.length > 0) {
                console.log(`[Plugin] MassTamilan found ${albumLinks.length} albums for "${searchKeyword}"`);
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
}

async function scrapeAlbum(albumUrl, baseUrl, cleanQuery) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    const myFetch = typeof bridgedFetch !== 'undefined' ? bridgedFetch : fetch;

    try {
        const response = await myFetch(albumUrl, { headers });
        if (!response.ok) return [];
        const html = await response.text();

        let albumTitle = "Album";
        const hMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (hMatch) albumTitle = hMatch[1].replace(/<[^>]+>/g, '').replace(' Tamil Songs', '').trim();

        let thumbnail = "";
        const imgMatch = html.match(/<img[^>]+src=(['"])([^'"]+\.jpg)\1[^>]+class=(['"])(?:cover|album-cover)/i) || html.match(/<img[^>]+src=(['"])([^'"]+\.jpg)\1/i);
        if (imgMatch) thumbnail = imgMatch[2].startsWith('http') ? imgMatch[2] : `${baseUrl}${imgMatch[2]}`;

        const songs = [];
        const seenUrls = new Set();
        
        const dlinkRegex = /<a[^>]+class=["']dlink["'][^>]*title=["']Download (.*?) 320kbps["'][^>]*href=["']([^"']+)["']/gi;
        let dmatch;
        
        while ((dmatch = dlinkRegex.exec(html)) !== null) {
            let songName = dmatch[1].trim();
            let downloadUrl = dmatch[2];
            if (seenUrls.has(downloadUrl)) continue;
            seenUrls.add(downloadUrl);

            songs.push({
                title: songName, artist: albumTitle, album: albumTitle,
                url: downloadUrl.startsWith('http') ? downloadUrl : `${baseUrl}${downloadUrl}`,
                thumbnail: thumbnail, format: 'MP3 (320kbps)', source: 'MassTamilan'
            });
        }
        return songs;
    } catch (e) {
        console.log(`[Plugin] MassTamilan scrape error: ${e.message}`);
        return [];
    }
}
