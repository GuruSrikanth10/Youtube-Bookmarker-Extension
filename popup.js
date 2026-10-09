import { getActiveTab, getVideoId } from "./utils.js";

let activeTab;
let currentVideo;
let pendingDelete = Promise.resolve();

const fetchBookmarks = async (videoId) => {
  const data = await chrome.storage.sync.get([videoId]);

  return data[videoId] ? JSON.parse(data[videoId]) : [];
};

const addNewBookmark = (bookmarks, bookmark) => {
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");

  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";

  setBookmarkAttributes("play", "Play", () => onPlay(bookmark), controlsElement);
  setBookmarkAttributes("delete", "Delete", () => onDelete(bookmark), controlsElement);

  newBookmarkElement.className = "bookmark";

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks=[]) => {
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
  }

  return;
};

const showMessage = (text) => {
  const messageElement = document.getElementById("message");

  messageElement.textContent = text;
  messageElement.hidden = false;
};

const onPlay = async (bookmark) => {
  // Sending fails when the content script isn't running in the tab,
  // e.g. a YouTube tab that was opened before the extension was installed or updated.
  const played = await chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmark.time,
  }).catch(() => false);

  if (!played) {
    showMessage("Couldn't reach the video. Refresh the YouTube tab and try again.");
  }
};

const deleteBookmark = async (bookmarkTime) => {
  // Read the saved list again instead of trusting an older copy, which can be missing recent bookmarks.
  const bookmarks = await fetchBookmarks(currentVideo);
  const remainingBookmarks = bookmarks.filter((b) => b.time !== bookmarkTime);

  if (remainingBookmarks.length > 0) {
    await chrome.storage.sync.set({ [currentVideo]: JSON.stringify(remainingBookmarks) });
  } else {
    await chrome.storage.sync.remove(currentVideo);
  }

  viewBookmarks(remainingBookmarks);
};

const onDelete = (bookmark) => {
  // Run deletes one at a time so that quick clicks can't overwrite each other's changes.
  pendingDelete = pendingDelete
    .then(() => deleteBookmark(bookmark.time))
    .catch((error) => {
      console.error("Failed to delete bookmark:", error);
      showMessage("Couldn't delete the bookmark. Please try again.");
    });
};

const setBookmarkAttributes = (src, label, eventListener, controlParentElement) => {
  const controlElement = document.createElement("button");
  const iconElement = document.createElement("img");

  controlElement.type = "button";
  controlElement.title = label;
  controlElement.addEventListener("click", eventListener);

  iconElement.src = "assets/" + src + ".png";
  iconElement.alt = label;

  controlElement.appendChild(iconElement);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  activeTab = await getActiveTab();
  currentVideo = getVideoId(activeTab?.url);

  if (currentVideo) {
    viewBookmarks(await fetchBookmarks(currentVideo));
  } else {
    const container = document.getElementsByClassName("container")[0];

    container.innerHTML = '<div class="title">This is not a YouTube video page.</div>';
  }
});

