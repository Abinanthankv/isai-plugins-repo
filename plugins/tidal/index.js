/**
 * Tidal (SquidWTF) Scraper Plugin
 */

async function search(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const headers = {
        'x-client': 'BiniLossless/v3.4',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
    };

    console.log(`[Plugin] Tidal searching for: "${cleanQuery}"`);

    try {
        const searchResponse = await fetch(`https://triton.squid.wtf/search/?s=${encodeURIComponent(cleanQuery)}`, {
            headers: headers
        });
        
        const responseData = await searchResponse.json();
        const items = (responseData && responseData.data && responseData.data.items) || [];
        
        console.log(`[Plugin] Tidal found ${items.length} items`);

        const results = [];
        // Resolve tracks in sequence for stability, or Concurrent if we want speed
        // but since it's JS, we'll do them in a loop
        for (const track of items) {
            try {
                const result = await resolveTrack(track, headers);
                if (result) results.push(result);
            } catch (e) {
                console.log(`[Plugin] Tidal resolve failed for track ${track.id}: ${e.message}`);
            }
        }

        return results;
    } catch (e) {
        console.log(`[Plugin] Tidal search error: ${e.message}`);
        return [];
    }
}

async function resolveTrack(track, headers) {
    const id = track.id;
    const title = track.title || 'Unknown';
    const artist = (track.artists && track.artists.length > 0) 
        ? track.artists[0].name 
        : (track.artist ? track.artist.name : 'Unknown Artist');
    const album = (track.album && track.album.title) || 'Unknown Album';
    
    let thumbnail = null;
    const coverUuid = track.album && track.album.cover;
    if (coverUuid && typeof coverUuid === 'string') {
        thumbnail = `https://resources.tidal.com/images/${coverUuid.replace(/-/g, '/')}/640x640.jpg`;
    }

    const trackResponse = await fetch(`https://triton.squid.wtf/track/?id=${id}&quality=HI_RES_LOSSLESS`, {
        headers: headers
    });
    
    if (trackResponse.status !== 200) return null;
    
    const trackData = await trackResponse.json();
    const manifestBase64 = trackData && trackData.data && trackData.data.manifest;
    
    if (!manifestBase64) return null;

    // Decode Base64 manifest (using a helper or built-in if available)
    const manifestJson = decodeBase64(manifestBase64);
    if (!manifestJson || manifestJson.trim().startsWith('<')) return null;

    try {
        const manifest = JSON.parse(manifestJson);
        const url = manifest.urls && manifest.urls[0];
        
        if (!url) return null;

        return {
            title: title,
            artist: artist,
            url: url,
            size: 0,
            format: 'FLAC (Hi-Res Plugin)',
            source: 'Tidal (via SquidWTF)',
            album: album,
            thumbnail: thumbnail
        };
    } catch (e) {
        console.log(`[Plugin] Tidal manifest parse error: ${e.message}`);
        return null;
    }
}

// Simple Base64 decoder for JS environments without atob
function decodeBase64(s) {
    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let b64index = {};
    for (let i = 0; i < 64; i++) b64index[b64chars.charAt(i)] = i;

    let results = '';
    let b64 = s.replace(/=/g, '');
    let buffer = 0;
    let bufferLen = 0;

    for (let i = 0; i < b64.length; i++) {
        buffer = (buffer << 6) | b64index[b64[i]];
        bufferLen += 6;
        if (bufferLen >= 8) {
            results += String.fromCharCode((buffer >> (bufferLen - 8)) & 0xFF);
            bufferLen -= 8;
        }
    }
    return results;
}
