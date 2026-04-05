/**
 * Masstamilan Plugin - Bulletproof JS (v1.0.2)
 * Pure JS solution (no bridge required, assumes native fetch available).
 */

async function search(query) {
    const rawQuery = query.trim();
    if (!rawQuery) return [];

    const baseUrl = 'https://masstamilan.dev';
    const cleanQuery = rawQuery.replace(/[&()"[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Multiple search attempts with different cleaning
    const strategies = [
        cleanQuery,
        cleanQuery.split(' ').slice(-1)[0], // Last word (usually movie name)
        cleanQuery.split(' ').slice(0, 2).join(' ') // First 2 words
    ].filter((s, i, a) => s && s.length > 2 && a.indexOf(s) === i);

    for (const keyword of strategies) {
        try {
            console.log(`[Plugin] Masstamilan quest: "${keyword}"`);
            const url = `${baseUrl}/search?keyword=${encodeURIComponent(keyword)}&_cb=${Date.now()}`;
            const res = await fetch(url);
            const html = await res.text();
            
            console.log(`[Plugin] Masstamilan fetched ${html.length} bytes for "${keyword}"`);

            // Ultra-robust Link Discovery
            // We look for ANY link that contains "-songs" and has a movie-like title
            const albumLinks = [];
            const seen = new Set();
            
            // Matches: href="/vidaamuyarchi-songs" OR href="https://masstamilan.dev/vikram-songs"
            const linkRegex = /href=["']([^"']+-songs[^"']*)["'].*?>(.*?)<\/a>/gi;
            let match;
            while ((match = linkRegex.exec(html)) !== null && albumLinks.length < 5) {
                let href = match[1];
                let title = match[2].replace(/<[^>]+>/g, '').trim();
                
                if (href.startsWith('/')) href = baseUrl + href;
                if (!seen.has(href)) {
                    seen.add(href);
                    albumLinks.push({ href, title });
                }
            }

            if (albumLinks.length > 0) {
                console.log(`[Plugin] Masstamilan found ${albumLinks.length} albums!`);
                let allSongs = [];
                for (const album of albumLinks) {
                    const songs = await scrapeAlbum(album.href, baseUrl);
                    allSongs = allSongs.concat(songs);
                    if (allSongs.length > 30) break;
                }
                if (allSongs.length > 0) return allSongs;
            }
        } catch (e) {
            console.log(`[Plugin] Masstamilan quest error: ${e.message}`);
        }
    }
    return [];
}

async function scrapeAlbum(url, baseUrl) {
    try {
        const res = await fetch(url);
        const html = await res.text();
        
        // Find Album Title
        let albumTitle = "Album";
        const hMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (hMatch) albumTitle = hMatch[1].replace(/<[^>]+>/g, '').replace(' Tamil Songs', '').trim();

        // Extract 320kbps links
        // Pattern: <a class="dlink" title="Download [Song] 320kbps" href="[URL]">
        const songs = [];
        const songRegex = /class=["']dlink["'][^>]*title=["']Download (.*?) 320kbps["'][^>]*href=["']([^"']+)["']/gi;
        let match;
        while ((match = songRegex.exec(html)) !== null) {
            let name = match[1].trim();
            let link = match[2];
            if (link.startsWith('/')) link = baseUrl + link;
            
            songs.push({
                title: name,
                artist: albumTitle,
                album: albumTitle,
                url: link,
                format: 'MP3 (320kbps)',
                source: 'MassTamilan'
            });
        }
        return songs;
    } catch (e) {
        return [];
    }
}
