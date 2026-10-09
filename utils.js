export async function getActiveTabURL() {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    active: true
  });

  return tabs[0];
}

// Returns the video ID of a YouTube watch page URL, or null for any other URL.
export function getVideoId(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const isYouTube = parsed.hostname === "youtube.com" || parsed.hostname.endsWith(".youtube.com");

  if (parsed.protocol !== "https:" || !isYouTube || parsed.pathname !== "/watch") {
    return null;
  }

  return parsed.searchParams.get("v") || null;
}
