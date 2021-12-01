/* global chrome */

function getStorage() {
  if (undefined !== chrome.storage && undefined !== chrome.storage.StorageAreaSync) {
    return chrome.storage;
  }
  return null;
}

function setDrupalPodRepo(url) {
  const storage = getStorage();
  if (storage !== null) {
    storage.sync.set({ drupalpod_repo: url })
      .catch((err) => {
        console.error(err);
      });
  }
}

async function getDrupalPodRepo() {
  const p = new Promise((resolve, reject) => {
    const storage = getStorage();
    if (storage !== null) {
      storage.sync.get(['drupalpod_repo'], (options) => {
        resolve(options.drupalpod_repo);
      });
    } else {
      resolve('https://github.com/shaal/drupalpod');
    }
  });

  return p;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'fetch-drupalpod-repo') {
    (async function responding() {
      sendResponse({ message: await getDrupalPodRepo() });
    }());
  } else if (request.message === 'set-drupalpod-repo') {
    setDrupalPodRepo(request.url);
    sendResponse({ message: 'great success' });
  }
  return true;
});

// set default
setDrupalPodRepo('https://github.com/shaal/drupalpod');
