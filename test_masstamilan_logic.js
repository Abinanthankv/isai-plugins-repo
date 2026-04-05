const fs = require('fs');

async function testExtraction() {
    // Mock HTML based on Masstamilan search results structure for Vidaamuyarchi
    const mockSearchHtml = `
    <div class="a-i">
        <a href="/vidaamuyarchi-songs" title="Vidaamuyarchi">
            <h2>Vidaamuyarchi</h2>
        </a>
    </div>
    <div class="a-i">
        <a href="/maan-karate-bgm-original-background-score-songs" title="Maan Karate BGM (Original Background Score)">
            <h2>Maan Karate BGM</h2>
        </a>
    </div>
    `;

    // 1. Test Album Links Logic
    console.log("=== Testing Album Links Regex ===");
    const albumLinks = [];
    const seen = new Set();
    
    // CURRENT REGEX:
    const regex1 = /href=(['"])([^'"]+-songs[^'"]*)\1/g;
    let match;
    while ((match = regex1.exec(mockSearchHtml)) !== null) {
        albumLinks.push(match[2]);
    }
    console.log("Current Regex (-songs):", albumLinks);

    // NEW REGEX: Match any href inside an 'a-i' class or similar, or just look for typical album paths
    const newRegex = /<a[^>]*href=(['"])([^'"]+)\1[^>]*title=(['"])([^'"]+)\3/g;
    const albumLinks2 = [];
    while ((match = newRegex.exec(mockSearchHtml)) !== null) {
        albumLinks2.push({ url: match[2], title: match[4] });
    }
    console.log("New Regex (a tag with title):", albumLinks2);

    // 2. Test Song Extraction Logic
    const mockAlbumHtml = `
    <h1>Vidaamuyarchi Tamil Songs Download</h1>
    <table class="song-list">
        <tr>
            <td>
                <span itemprop="name">Pathikichu</span>
            </td>
            <td>
                <a class="dlink anim" href="/downloader/pathikichu/320">Download 320kbps</a>
            </td>
        </tr>
    </table>
    `;

    console.log("\n=== Testing Song Extraction Regex ===");
    const cleanQuery = "Pathikichu Vidaamuyarchi";
    const queryWords = cleanQuery.toLowerCase().split(' ').filter(w => w.length > 2);
    const dlinkRegex = /<a[^>]*class=["'](?:[^"']*?\s)?dlink(?:[\s"'][^>]*?)?href=(['"])(.*?)\1/g;

    let dMatch;
    let songsCount = 0;
    while ((dMatch = dlinkRegex.exec(mockAlbumHtml)) !== null) {
        const url = dMatch[2];
        if (!url.includes('320')) continue;
        const rowStart = mockAlbumHtml.lastIndexOf('<tr', dMatch.index);
        const rowEnd = mockAlbumHtml.indexOf('</tr>', dMatch.index);
        if (rowStart !== -1 && rowEnd !== -1) {
            const rowHtml = mockAlbumHtml.substring(rowStart, rowEnd);
            const nameMatch = rowHtml.match(/itemprop="name"[^>]*>([\s\S]*?)<\/span>/) || rowHtml.match(/<h2>([\s\S]*?)<\/h2>/);
            let songName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : null;
            if (songName) {
                console.log(`Found candidate song: ${songName} -> ${url}`);
                const songLower = songName.toLowerCase();
                const albumTitle = "Vidaamuyarchi";
                const albumLower = albumTitle.toLowerCase();
                const isMatch = queryWords.length === 0 || queryWords.some(w => songLower.includes(w) || albumLower.includes(w));
                if (isMatch) {
                    console.log(`Matched query!`);
                    songsCount++;
                }
            }
        }
    }
    console.log(`Total songs extracted: ${songsCount}`);
}

testExtraction();
