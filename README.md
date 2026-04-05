# Isai Plugin Repository

This repository hosts external music scrapers for the **Debrid Vault (Isai)** application. By decoupling scrapers into this repository, the main application remains lightweight and compliant while allowing the community to add new music sources dynamically.

## Repository Structure

- **`index.json`**: The central registry. The app points to this URL to discover available plugins.
- **`plugins/`**: Contains subdirectories for each plugin.
    - Each plugin directory MUST contain a `manifest.json` and an entry JavaScript file (e.g., `index.js`).

---

## How to Create a New Scraper Plugin

### 1. Create a Plugin Manifest (`manifest.json`)
Every plugin needs a manifest to tell the app who it is.

```json
{
  "id": "org.isai.myscraper",
  "name": "My Custom Scraper",
  "version": "1.0.0",
  "description": "Scrapes music from my-source.com",
  "author": "Your Name",
  "icon": "https://raw.githubusercontent.com/user/repo/main/plugins/myscraper/icon.png",
  "entry": "index.js",
  "type": "music_scraper"
}
```

### 2. Implement the Scraper Logic (`index.js`)
Your JavaScript file must export an `async function search(query)`.

#### Available Global APIs:
- **`fetch(url, options)`**: A fully functional fetch API mapped to the app's networking engine.
- **`console.log(string)`**: For debugging in the app logs.

#### Example Implementation:
```javascript
async function search(query) {
  try {
    const response = await fetch(`https://api.example.com/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    return data.results.map(item => ({
      title: item.title,
      artist: item.artist,
      album: item.album_name,
      url: item.stream_url, // Direct stream link
      size: item.file_size_bytes || 0,
      format: "MP3",
      source: "My Source",
      thumbnail: item.cover_art_url
    }));
  } catch (e) {
    console.log("Search failed: " + e.message);
    return [];
  }
}
```

### 3. Register your Plugin
Add your plugin's manifest path to the root `index.json`:

```json
[
  { "manifest": "plugins/jiosaavn/manifest.json" },
  { "manifest": "plugins/masstamilan/manifest.json" },
  { "manifest": "plugins/myscraper/manifest.json" }
]
```

---

## Scraper Result Fields

The `search` function should return an array of objects with the following fields:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | The song title (Required) |
| `artist` | `string` | The artist name |
| `url` | `string` | The direct stream or download URL (Required) |
| `source` | `string` | The name of the source (e.g., "JioSaavn") |
| `album` | `string` | The album name |
| `thumbnail`| `string` | URL to the cover art |
| `format` | `string` | File format (e.g., "FLAC", "MP3") |
| `size` | `number` | File size in bytes |
| `duration` | `number` | Duration in seconds |

## Performance Tips
- Use efficient RegEx for HTML scraping if no API is available.
- Avoid large external dependencies; keep the script self-contained.
- Use `console.log` during development to debug your `fetch` responses.
