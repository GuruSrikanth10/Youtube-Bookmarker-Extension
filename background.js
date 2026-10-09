import { getVideoId } from "./utils.js";

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const videoId = getVideoId(changeInfo.url);

  if (videoId) {
    chrome.tabs.sendMessage(tabId, {
      type: "NEW",
      videoId,
    }).catch(() => {
      // On a full page load the URL changes before the content script is running.
      // That's fine: the content script reads the video ID from the page when it starts.
    });
  }
});
