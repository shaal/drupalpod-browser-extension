chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'fetch-drupalpod-repo') {
    (async function responding() {
      const repo = await getDrupalPodRepo();
      sendResponse({message: repo});
    })();
    return true; // Required to use sendResponse asynchronously
  } else if (request.message === 'set-drupalpod-repo') {
    setDrupalPodRepo(request.url);
    sendResponse({message: 'great success'});
    return true;
  }
});

async function getDrupalPodRepo() {
  try {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['drupalpod_repo'], (options) => {
        resolve(options.drupalpod_repo || 'https://git.drupalcode.org/project/drupalpod');
      });
    });
  } catch (error) {
    console.error('Error getting DrupalPod repo:', error);
    return 'https://git.drupalcode.org/project/drupalpod';
  }
}

function setDrupalPodRepo(url) {
  if (!url) return;
  chrome.storage.sync.set({'drupalpod_repo': url});
}

// Set default when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  setDrupalPodRepo('https://git.drupalcode.org/project/drupalpod');
});
