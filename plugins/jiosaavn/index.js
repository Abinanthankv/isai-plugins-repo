/**
 * JioSaavn Scraper Plugin (JS Version)
 * Translated from jiosaavn_scraper.dart
 */

async function search(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    console.log(`[Plugin] JioSaavn searching for: "${cleanQuery}"`);

    try {
        const response = await fetch(
            `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(cleanQuery)}`
        );
        const data = await response.json();
        
        if (!data) return [];

        const isVercelFormat = (data.success === true || data.status === 'SUCCESS') && data.data;
        const results = isVercelFormat ? (data.data.results || []) : (data.results || []);

        return results.map(item => {
            try {
                const title = item.name || 'Unknown';
                
                let artist = 'Unknown Artist';
                if (typeof item.primaryArtists === 'string') {
                    artist = item.primaryArtists;
                } else if (item.artists && Array.isArray(item.artists.primary)) {
                    artist = item.artists.primary.map(a => a.name || 'Unknown').join(', ');
                }

                const albumData = item.album;
                const albumName = (typeof albumData === 'object') ? (albumData.name || '') : (albumData || '');

                const images = item.image || [];
                let thumbnail = images.length > 0 ? (images[images.length - 1].link || images[images.length - 1].url) : null;
                for (const img of images) {
                    if (img.quality === '500x500') {
                        thumbnail = img.link || img.url;
                        break;
                    }
                }

                const downloadUrls = item.downloadUrl || [];
                let downloadUrl = null;
                let qualityStr = '160kbps';

                // Try 320kbps
                const d320 = downloadUrls.find(d => d.quality === '320kbps');
                if (d320) {
                    downloadUrl = d320.link || d320.url;
                    qualityStr = '320kbps';
                } else {
                    const d160 = downloadUrls.find(d => d.quality === '160kbps');
                    if (d160) {
                        downloadUrl = d160.link || d160.url;
                        qualityStr = '160kbps';
                    } else if (downloadUrls.length > 0) {
                        const last = downloadUrls[downloadUrls.length - 1];
                        downloadUrl = last.link || last.url;
                    }
                }

                if (!downloadUrl) return null;

                const durationSecs = parseInt(item.duration) || 0;
                const duration = `${Math.floor(durationSecs / 60)}:${(durationSecs % 60).toString().padStart(2, '0')}`;

                return {
                    title: title,
                    artist: artist,
                    url: downloadUrl,
                    size: 0,
                    format: `AAC:${qualityStr}`,
                    source: 'JioSaavn',
                    album: albumName,
                    thumbnail: thumbnail,
                    linkType: 'jiosaavn',
                    duration: duration,
                    extras: {
                        id: item.id,
                        year: item.year
                    }
                };
            } catch (e) {
                console.error(`[Plugin] JioSaavn item parse error: ${e}`);
                return null;
            }
        }).filter(item => item !== null);

    } catch (e) {
        console.error(`[Plugin] JioSaavn error: ${e}`);
        return [];
    }
}
