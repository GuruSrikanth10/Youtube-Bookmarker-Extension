import { getVideoId } from "./utils.js";

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const videoId = getVideoId(changeInfo.url);

  if (videoId) {
    chrome.tabs.sendMessage(tabId, {
      type: "NEW",
      videoId,
    });
  }
});
