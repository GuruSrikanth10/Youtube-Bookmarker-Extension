(() => {
  let currentVideo = "";
  let waitingForControls = false;
  let pendingSave = Promise.resolve();

  const getVideoIdFromPage = () => {
    return location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null;
  };

  // Look inside the main player only: the home and search pages have their own players for hover previews.
  const getYoutubePlayer = () => document.querySelector("#movie_player video");

  const waitForElement = (selector) => {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);

      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const addedElement = document.querySelector(selector);

        if (addedElement) {
          observer.disconnect();
          resolve(addedElement);
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  };

  const formatTime = (t) => {
    const totalSeconds = Math.floor(t);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  };

  const fetchBookmarks = async (videoId) => {
    const obj = await chrome.storage.sync.get([videoId]);

    return obj[videoId] ? JSON.parse(obj[videoId]) : [];
  };

  const saveBookmark = async (videoId, time) => {
    const currentVideoBookmarks = await fetchBookmarks(videoId);

    // Clicking again before the video has moved (e.g. while it's paused) would add the same bookmark twice.
    if (currentVideoBookmarks.some((b) => b.time === time)) {
      return;
    }

    const newBookmark = {
      time,
      desc: "Bookmark at " + formatTime(time),
    };

    await chrome.storage.sync.set({
      [videoId]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
    });
  };

  const addNewBookmarkEventHandler = () => {
    const youtubePlayer = getYoutubePlayer();

    if (!youtubePlayer || !currentVideo) {
      return;
    }

    // Read the video and time now: by the time the save runs, the user may have moved on.
    const videoId = currentVideo;
    const currentTime = youtubePlayer.currentTime;

    // Save one bookmark at a time so that quick clicks can't overwrite each other's changes.
    pendingSave = pendingSave
      .then(() => saveBookmark(videoId, currentTime))
      .catch((error) => console.error("Failed to save bookmark:", error));
  };

  const newVideoLoaded = async () => {
    // YouTube builds the player after the page loads, so the controls may not exist yet.
    // If a call is already waiting for them, it will add the button.
    if (waitingForControls) {
      return;
    }

    waitingForControls = true;
    const youtubeLeftControls = await waitForElement("#movie_player .ytp-left-controls");
    waitingForControls = false;

    if (youtubeLeftControls.querySelector(".bookmark-btn")) {
      return;
    }

    const bookmarkBtn = document.createElement("img");

    bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
    bookmarkBtn.className = "ytp-button bookmark-btn";
    bookmarkBtn.title = "Click to bookmark current timestamp";

    youtubeLeftControls.appendChild(bookmarkBtn);
    bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") {
      const youtubePlayer = getYoutubePlayer();

      if (youtubePlayer) {
        youtubePlayer.currentTime = value;
      }

      response(Boolean(youtubePlayer));
    }
  });

  // The background script only reports URL changes that happen after this script has loaded,
  // so when a video is opened directly or the page is refreshed, read the video ID from the page.
  currentVideo = getVideoIdFromPage();

  if (currentVideo) {
    newVideoLoaded();
  }
})();
