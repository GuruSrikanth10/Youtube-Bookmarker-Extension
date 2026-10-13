# My Youtube Bookmarks

A Chrome extension for saving timestamps in YouTube videos and jumping back to them later.

## Features

- A bookmark button in the YouTube player's control bar saves the current moment of the video.
- The extension's toolbar popup lists the bookmarks for the video you're watching. For each one you can:
  - **Play**: jump to that moment in the video.
  - **Rename**: click the name, type a new one, then press Enter or the save button (Escape cancels).
  - **Delete** it.
- Bookmarks are saved with `chrome.storage.sync`, so they follow you to other computers where you're signed in to Chrome with sync turned on.

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the repository folder.

Open a YouTube video and the bookmark button appears in the player's controls. YouTube tabs that are already open get the button too, without a refresh.

## Permissions

| Permission | Why it's needed |
| --- | --- |
| Access to `youtube.com` | Add the bookmark button to the player and read which video is open. |
| `storage` | Save your bookmarks. |
| `scripting` | Add the bookmark button to YouTube tabs that were already open when the extension was installed or updated. |

## How it works

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (Manifest V3). |
| `contentScript.js` | Runs on YouTube pages. Adds the bookmark button to the player, saves bookmarks and jumps to them. |
| `background.js` | Service worker. Tells the content script when you move to another video (YouTube changes videos without reloading the page) and adds the content script to open YouTube tabs on install or update. |
| `popup.html`, `popup.css`, `popup.js` | The toolbar popup: lists, plays, renames and deletes bookmarks. |
| `utils.js` | Helpers shared by the popup and the service worker. |
| `assets/` | Icons and images. `assets/ext-icon.png` is the source artwork for the icons in `assets/icons/`. |

Each video's bookmarks are stored under its video ID as a JSON string, sorted by time:

```json
[{ "time": 95.4, "desc": "Bookmark at 00:01:35" }]
```

`time` is in seconds and `desc` is the name shown in the popup. Chrome limits sync storage to about 100 KB in total and 8 KB per video, which fits more than a hundred bookmarks per video with the default names.
