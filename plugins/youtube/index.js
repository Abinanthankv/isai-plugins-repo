/**
 * YouTube Scraper Plugin - Ultra Robust Version
 */

async function search(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    console.log(`[Plugin] YouTube searching for: "${cleanQuery}"`);

    try {
        const url = `https://m.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
            }
        });
        const html = await response.text();
        
        let data = null;
        
        // Strategy 1: Look for ytInitialData variable with various markers
        const markers = ['ytInitialData = ', 'window["ytInitialData"] = ', 'window[\'ytInitialData\'] = ', 'var ytInitialData ='];
        for (const marker of markers) {
            const idx = html.indexOf(marker);
            if (idx !== -1) {
                const jsonStart = html.indexOf('{', idx + marker.length);
                if (jsonStart !== -1) {
                    data = extractBalancedJSON(html, jsonStart);
                    if (data && findVideoRendererItems(data).length > 0) break;
                }
            }
        }
        
        // Strategy 2: Scan all scripts for videoRenderer
        if (!data || findVideoRendererItems(data).length === 0) {
            console.log("[Plugin] YouTube: Marker-based search failed or returned empty. Scanning scripts...");
            const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
            for (const script of scriptMatches) {
                if (script.includes('videoRenderer')) {
                    const braceIdx = script.indexOf('{');
                    if (braceIdx !== -1) {
                        const potential = extractBalancedJSON(script, braceIdx);
                        if (potential) {
                            const items = findVideoRendererItems(potential);
                            if (items.length > 0) {
                                data = potential;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Strategy 3: Extreme fallback - look for any { "contents": ... } pattern in the whole HTML
        if (!data || findVideoRendererItems(data).length === 0) {
            console.log("[Plugin] YouTube: Script scanning failed. Trying deep pattern match...");
            let pos = 0;
            while (true) {
                const idx = html.indexOf('{"contents":', pos);
                if (idx === -1) break;
                const potential = extractBalancedJSON(html, idx);
                if (potential) {
                    const items = findVideoRendererItems(potential);
                    if (items.length > 0) {
                        data = potential;
                        break;
                    }
                }
                pos = idx + 10;
                if (pos > html.length - 100) break;
            }
        }

        if (!data) {
            console.log("[Plugin] YouTube: FAILED to find any video data");
            return [];
        }

        const videoItems = findVideoRendererItems(data);
        const results = [];

        for (const item of videoItems) {
            const video = item.videoRenderer;
            if (!video) continue;

            const videoId = video.videoId;
            const title = video.title && video.title.runs && video.title.runs[0] && video.title.runs[0].text;
            const author = (video.ownerText && video.ownerText.runs && video.ownerText.runs[0] && video.ownerText.runs[0].text) || 
                          (video.shortBylineText && video.shortBylineText.runs && video.shortBylineText.runs[0] && video.shortBylineText.runs[0].text);
            const durationText = video.lengthText && video.lengthText.simpleText;
            const thumbnail = video.thumbnail && video.thumbnail.thumbnails && video.thumbnail.thumbnails[0] && video.thumbnail.thumbnails[0].url;

            if (videoId && title) {
                results.push({
                    title: title,
                    artist: author || "Unknown Artist",
                    url: videoId,
                    source: "YouTube (Plugin)",
                    format: durationText || "Video",
                    linkType: "youtube",
                    thumbnail: thumbnail,
                    duration: durationText
                });
            }

            if (results.length >= 15) break;
        }

        console.log(`[Plugin] YouTube found ${results.length} results`);
        return results;
    } catch (e) {
        console.log(`[Plugin] YouTube search error: ${e.message}`);
        return [];
    }
}

function extractBalancedJSON(html, start) {
    let braceCount = 0;
    let inString = false;
    let escape = false;
    
    for (let i = start; i < html.length; i++) {
        const char = html[i];
        if (char === '"' && !escape) inString = !inString;
        if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (braceCount === 0 && i > start) {
                try {
                    const candidate = html.substring(start, i + 1);
                    return JSON.parse(candidate);
                } catch (e) {
                    return null;
                }
            }
        }
        escape = (char === '\\' && !escape);
    }
    return null;
}

function findVideoRendererItems(data) {
    const items = [];
    function search(obj, depth = 0) {
        if (!obj || typeof obj !== 'object' || depth > 20) return;
        if (obj.videoRenderer) {
            items.push(obj);
            return;
        }
        if (Array.isArray(obj)) {
            for (const item of obj) search(item, depth + 1);
        } else {
            for (const key in obj) {
                // Only descend into objects, skipping some known large non-result keys
                if (key !== 'trackingParams' && typeof obj[key] === 'object') {
                    search(obj[key], depth + 1);
                }
            }
        }
    }
    search(data);
    return items;
}
