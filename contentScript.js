(() => {
  let currentVideo = "";
  let currentVideoBookmarks = [];
  let waitingForControls = false;

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

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };

  const addNewBookmarkEventHandler = async () => {
    const youtubePlayer = getYoutubePlayer();

    if (!youtubePlayer) {
      return;
    }

    const currentTime = youtubePlayer.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };

    currentVideoBookmarks = await fetchBookmarks();

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
    });
  };

  const newVideoLoaded = async () => {
    currentVideoBookmarks = await fetchBookmarks();

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
    } else if ( type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
      chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) });

      response(currentVideoBookmarks);
    }
  });

  // The background script only reports URL changes that happen after this script has loaded,
  // so when a video is opened directly or the page is refreshed, read the video ID from the page.
  currentVideo = getVideoIdFromPage();

  if (currentVideo) {
    newVideoLoaded();
  }
})();

const getTime = t => {
  var date = new Date(0);
  date.setSeconds(t);

  return date.toISOString().substr(11, 8);
};
