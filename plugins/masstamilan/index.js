/**
 * MassTamilan Scraper Plugin (JS Version)
 * Translated from masstamilan_scraper.dart
 * 
 * Note: Uses RegEx for HTML parsing to avoid heavy dependencies, 
 * assuming a simple fetch environment.
 */

async function search(query) {
    const rawQuery = query.trim();
    if (!rawQuery) return [];

    const baseUrl = 'https://www.masstamilan.dev';
    
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
        const response = await fetch(searchUrl);
        const html = await response.text();

        // Extract album links (href="...-songs")
        const albumLinks = [];
        const albumRegex = /<a[^>]+href="([^"]+-songs)"[^>]*title="([^"]+)"/g;
        let match;
        const seen = new Set();

        while ((match = albumRegex.exec(html)) !== null && albumLinks.length < 3) {
            const href = match[1];
            if (!seen.has(href)) {
                seen.add(href);
                albumLinks.push({ href, title: match[2] });
            }
        }

        const allResults = [];
        for (const link of albumLinks) {
            const albumUrl = link.href.startsWith('http') ? link.href : `${baseUrl}${link.href}`;
            const results = await scrapeAlbum(albumUrl, baseUrl, cleanQuery);
            allResults.push(...results);
        }

        return allResults;
    } catch (e) {
        console.error(`[Plugin] MassTamilan search error: ${e}`);
        return [];
    }
}

async function scrapeAlbum(albumUrl, baseUrl, cleanQuery) {
    try {
        const response = await fetch(albumUrl);
        const html = await response.text();

        // Extract Album Title
        let albumTitle = "Unknown Album";
        const titleMatch = html.match(/<h1[^>]*>([^<]+)/);
        if (titleMatch) {
            albumTitle = titleMatch[1].replace(' Tamil Songs', '').replace(' Songs Download', '').trim();
        }

        // Extract Thumbnail
        let thumbnail = null;
        const thumbMatch = html.match(/<div class="info-wrapper">[\s\S]*?<img[^>]+src="([^"]+)"/);
        if (thumbMatch) {
            thumbnail = thumbMatch[1].startsWith('http') ? thumbMatch[1] : `${baseUrl}${thumbMatch[1]}`;
        }

        // Extract Songs from table rows
        const songResults = [];
        const rowRegex = /<tr itemprop="itemListElement">([\s\S]*?)<\/tr>/g;
        let rowMatch;

        const queryWords = cleanQuery.toLowerCase().split(' ').filter(w => w.length > 2);

        while ((rowMatch = rowRegex.exec(html)) !== null) {
            const rowHtml = rowMatch[1];
            
            // Song Name
            const nameMatch = rowHtml.match(/<span itemprop="name">([^<]+)/);
            if (!nameMatch) continue;
            const songName = nameMatch[1].trim();

            // Artist
            const artistMatch = rowHtml.match(/<span itemprop="byArtist">([^<]+)/);
            const artist = artistMatch ? artistMatch[1].trim() : "Unknown Artist";

            // 320kbps Link
            const d320Match = rowHtml.match(/<a[^>]+href="([^"]+d320_cdn[^"]+)"/i) || 
                              rowHtml.match(/<a[^>]+href="([^"]+320[^"]+)"[^>]*class="dlink"/i);
            
            if (!d320Match) continue;
            const downloadUrl = d320Match[1].startsWith('http') ? d320Match[1] : `${baseUrl}${d320Match[1]}`;

            // Filtering logic
            const songLower = songName.toLowerCase();
            const albumLower = albumTitle.toLowerCase();
            const matches = queryWords.length === 0 || 
                          queryWords.some(w => songLower.includes(w) || albumLower.includes(w));

            if (matches) {
                songResults.add({
                    title: songName,
                    artist: artist,
                    url: downloadUrl,
                    size: 0,
                    format: 'MP3 (320kbps)',
                    source: 'MassTamilan (Plugin)',
                    album: albumTitle,
                    thumbnail: thumbnail
                });
            }
        }

        return songResults;
    } catch (e) {
        console.error(`[Plugin] MassTamilan album error: ${e}`);
        return [];
    }
}
