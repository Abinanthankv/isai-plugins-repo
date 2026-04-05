/**
 * YouTube Scraper Plugin
 * Uses scraping of m.youtube.com to find video metadata
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
        
        // Extract ytInitialData
        const match = html.match(/var ytInitialData = ({.*?});/);
        if (!match) {
            console.log("[Plugin] YouTube: Could not find ytInitialData");
            return [];
        }

        const data = JSON.parse(match[1]);
        const results = [];
        
        // Navigate through the heavily nested YouTube JSON
        const contents = data.contents && data.contents.sectionListRenderer && data.contents.sectionListRenderer.contents;
        if (!contents) return [];

        let videoItems = [];
        for (const section of contents) {
            if (section.itemSectionRenderer) {
                videoItems = section.itemSectionRenderer.contents;
                break;
            }
        }

        for (const item of videoItems) {
            const video = item.videoRenderer;
            if (!video) continue;

            const videoId = video.videoId;
            const title = video.title && video.title.runs && video.title.runs[0] && video.title.runs[0].text;
            const author = video.ownerText && video.ownerText.runs && video.ownerText.runs[0] && video.ownerText.runs[0].text;
            const durationText = video.lengthText && video.lengthText.simpleText;
            const thumbnail = video.thumbnail && video.thumbnail.thumbnails && video.thumbnail.thumbnails[0] && video.thumbnail.thumbnails[0].url;

            if (videoId && title) {
                results.push({
                    title: title,
                    artist: author || "Unknown Artist",
                    url: videoId, // Returning videoId which the app handles
                    source: "YouTube (Plugin)",
                    format: durationText || "Video",
                    linkType: "youtube",
                    thumbnail: thumbnail,
                    duration: durationText
                });
            }

            if (results.length >= 10) break;
        }

        return results;
    } catch (e) {
        console.log(`[Plugin] YouTube search error: ${e.message}`);
        return [];
    }
}
