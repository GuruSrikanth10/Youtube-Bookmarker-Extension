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

// Content scripts listed in the manifest only run in pages loaded after the extension is installed or updated.
// Add ours to the YouTube tabs that are already open so the bookmark button works without a refresh.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install" && reason !== "update") {
    return;
  }

  const tabs = await chrome.tabs.query({ url: "https://*.youtube.com/*" });

  for (const tab of tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"],
    }).catch(() => {
      // Some tabs can't be scripted, e.g. discarded ones. They get the content script when they reload.
    });
  }
});
