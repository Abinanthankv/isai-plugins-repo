globalThis.manifest = {
  id: "youtube",
  name: "YouTube",
  version: "1.0.0",
  description: "Dynamic search and stream resolution for YouTube using Invidious API",
  icon: "https://youtube.com/favicon.ico"
};

const instances = [
  'https://vid.puffyan.us',
  'https://yewtu.be',
  'https://invidious.lunar.icu',
  'https://inv.vern.cc'
];

async function fetchFromAnyInstance(path) {
  for (const inst of instances) {
    try {
      const url = inst + path;
      console.log('[JS Plugin YouTube] Trying instance: ' + url);
      const response = await globalThis.fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error('[JS Plugin YouTube] Instance ' + inst + ' failed: ' + e);
    }
  }
  throw new Error('All Invidious instances failed');
}

globalThis.search = async function(query) {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    console.log('[JS Plugin YouTube] Searching for: ' + cleanQuery);
    
    const data = await fetchFromAnyInstance('/api/v1/search?q=' + encodeURIComponent(cleanQuery) + '&type=video');
    if (!Array.isArray(data)) return [];

    const out = [];
    const videos = data.slice(0, 8);

    for (const v of videos) {
      try {
        const id = v.videoId;
        const title = v.title || 'Unknown';
        const artist = v.author || 'Unknown Channel';
        
        let thumbnail = null;
        if (Array.isArray(v.videoThumbnails) && v.videoThumbnails.length > 0) {
          thumbnail = v.videoThumbnails[v.videoThumbnails.length - 1].url;
        } else {
          thumbnail = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg';
        }

        const durationSecs = parseInt(v.lengthSeconds || '0', 10);
        const mins = Math.floor(durationSecs / 60);
        const secs = durationSecs % 60;
        const duration = mins + ':' + (secs < 10 ? '0' + secs : secs);

        out.push({
          title: title,
          artist: artist,
          url: id,
          trackId: id,
          isLazy: true,
          size: 0,
          format: 'YouTube (Audio)',
          source: 'YouTube (JS)',
          thumbnail: thumbnail,
          duration: duration,
          extras: {
            videoId: id,
            author: artist,
            durationSeconds: durationSecs
          }
        });
      } catch (e) {
        console.error('[JS Plugin YouTube] Parse error: ' + e);
      }
    }
    return out;
  } catch (e) {
    console.error('[JS Plugin YouTube] Error: ' + e);
    return [];
  }
};

globalThis.getStream = async function(trackId) {
  try {
    console.log('[JS Plugin YouTube] Resolving stream for video ID: ' + trackId);
    
    const data = await fetchFromAnyInstance('/api/v1/videos/' + trackId);
    const adaptiveFormats = data.adaptiveFormats || [];
    
    let audioStream = adaptiveFormats.find(f => f.type && f.type.startsWith('audio/') && f.audioQuality === 'AUDIO_QUALITY_HIGH');
    if (!audioStream) {
      audioStream = adaptiveFormats.find(f => f.type && f.type.startsWith('audio/'));
    }
    if (!audioStream) {
      const formatStreams = data.formatStreams || [];
      audioStream = formatStreams[0];
    }

    if (audioStream && audioStream.url) {
      console.log('[JS Plugin YouTube] Resolved stream url successfully.');
      return audioStream.url;
    }
    
    return null;
  } catch (e) {
    console.error('[JS Plugin YouTube] Resolution error: ' + e);
    return null;
  }
};
