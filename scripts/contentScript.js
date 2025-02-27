/**
 * Content script for DrupalPod browser extension
 * Automatically injected into Drupal.org issue pages
 */

// Debugging utility - set to false for production
const DEBUG = false;

/**
 * Conditionally logs messages based on debug setting
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

// Set up communication with popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debugLog('Content script received message:', request);
    
    if (request.action === 'getPageInfo') {
        try {
            const pageInfo = collectPageInfo();
            debugLog('Sending page info back to popup:', pageInfo);
            sendResponse({success: true, data: pageInfo});
        } catch (error) {
            console.error('Error collecting page info:', error);
            sendResponse({success: false, error: error.message});
        }
        return true; // Required to use sendResponse asynchronously
    }
});

/**
 * Collects information from the Drupal issue page
 * @returns {Object} Information collected from the page
 */
function collectPageInfo() {
    const pathArray = window.location.pathname.split('/');
    const issueForkElement = document.querySelector('.fork-link');
    const issueFork = issueForkElement ? issueForkElement.innerText : false;
    const branchesElement = document.querySelector('.branches');
    const allBranches = branchesElement ? branchesElement.children : [];

    // Get links to find patches
    const allLinks = document.querySelectorAll('a');
    const duplicateAllHrefs = [];
    for (let i = 0; i < allLinks.length; i++) {
        if (allLinks[i].attributes.href) {
            duplicateAllHrefs.push(allLinks[i].attributes.href.nodeValue);
        }
    }
    
    // Remove duplicate Hrefs
    const allHrefs = [...new Set(duplicateAllHrefs)];

    const issueBranches = [];
    if (allBranches.length > 0) {
        Array.from(allBranches).forEach((element) => {
            issueBranches.push(element.dataset.branch);
        });
    }
    issueBranches.unshift('');

    const moduleVersionElement = document.querySelector('.field-name-field-issue-version');
    const moduleVersion = moduleVersionElement ? 
        moduleVersionElement.children[1].innerText.replace('-dev','') : '';
    
    const loggedIn = document.querySelector('.person') ? true : false;
    const pushAccess = document.querySelector('.push-access') ? true : false;

    return {
        success: true,
        pathArray: pathArray,
        issueFork: issueFork,
        allHrefs: allHrefs,
        issueBranches: issueBranches,
        moduleVersion: moduleVersion,
        loggedIn: loggedIn,
        pushAccess: pushAccess,
    };
}

// Log that the content script is loaded
debugLog('DrupalPod content script loaded on:', window.location.href); 