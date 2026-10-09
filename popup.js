import { getActiveTabURL, getVideoId } from "./utils.js";

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

  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  newBookmarkElement.id = "bookmark-" + bookmark.time;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

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

const onPlay = async e => {
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  });
};

const deleteBookmark = async (currentVideo, bookmarkTime) => {
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

const onDelete = async e => {
  const bookmarkTime = Number(e.target.parentNode.parentNode.getAttribute("timestamp"));
  const activeTab = await getActiveTabURL();
  const currentVideo = getVideoId(activeTab.url);

  // Run deletes one at a time so that quick clicks can't overwrite each other's changes.
  pendingDelete = pendingDelete
    .then(() => deleteBookmark(currentVideo, bookmarkTime))
    .catch((error) => console.error("Failed to delete bookmark:", error));
};

const setBookmarkAttributes =  (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const currentVideo = getVideoId(activeTab?.url);

  if (currentVideo) {
    viewBookmarks(await fetchBookmarks(currentVideo));
  } else {
    const container = document.getElementsByClassName("container")[0];

    container.innerHTML = '<div class="title">This is not a youtube video page.</div>';
  }
});

