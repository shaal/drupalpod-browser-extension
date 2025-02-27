/**
 * DrupalPod browser extension
 * This script handles the popup UI and manages interactions with Drupal.org issue pages
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

document.addEventListener('DOMContentLoaded', function() {
    // Removed because we use only a specific main repo.
    // getDrupalPodRepo();

    // Check current URL to activate extension only on relevant pages
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        const url = tabs[0].url;
        debugLog('Current URL:', url);
        // use `url` here inside the callback because it's asynchronous!
        checkURL(url).catch(error => {
            console.error('Error in checkURL:', error);
            displayWarning('something-went-wrong-instructions');
            hideElement('.reading-page-status');
        });
    });

    /**
     * Validates if the current URL is a Drupal issue page
     * @param {string} url - The URL to check
     */
    async function checkURL(url) {
        debugLog('Checking URL:', url);
        
        // Run only on Drupal issues pages, otherwise display a message
        // Removed global flag from regex to avoid potential issues
        const projectIssuePageRegex = /(https:\/\/www.drupal.org\/project\/)\w+(\/issues\/)\d+/m;

        if (projectIssuePageRegex.test(url)) {
            debugLog('URL matches Drupal issue page pattern');
            
            // Ensure we have permissions before proceeding
            const hasPermissions = await ensurePermissions(url);
            debugLog('Permission check result:', hasPermissions);
            
            if (hasPermissions) {
                readIssueContent();
            } else {
                console.error('Failed to get required permissions');
                displayWarning('something-went-wrong-instructions');
                hideElement('.reading-page-status');
            }
        }
        else {
            debugLog('URL does not match Drupal issue page pattern');
            displayWarning('not-issue-page-instructions');
            hideElement('.reading-page-status');
        }
    }

    /**
     * Executes content script to read issue information from the page
     */
    function readIssueContent() {
        debugLog('Starting readIssueContent function');
        
        // Using chrome.tabs.query to get the current tab
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            debugLog('Got tabs:', tabs);
            
            if (!tabs || tabs.length === 0) {
                console.error('No active tabs found');
                displayWarning('something-went-wrong-instructions');
                hideElement('.reading-page-status');
                return;
            }

            try {
                // Try using messaging with the pre-injected content script first
                debugLog('Trying to communicate with pre-injected content script');
                
                chrome.tabs.sendMessage(
                    tabs[0].id, 
                    {action: 'getPageInfo'}, 
                    (response) => {
                        debugLog('Received content script response:', response);
                        
                        if (chrome.runtime.lastError) {
                            console.error('Error communicating with content script:', chrome.runtime.lastError);
                            // Fall back to injection methods
                            injectAndExecuteContentScript(tabs[0]);
                            return;
                        }
                        
                        if (response && response.success && response.data) {
                            processContentScriptResults(response.data);
                        } else {
                            console.error('Invalid response from content script:', response);
                            // Fall back to injection methods
                            injectAndExecuteContentScript(tabs[0]);
                        }
                    }
                );
            } catch (error) {
                console.error('Error in readIssueContent:', error);
                console.error('Error stack:', error.stack);
                injectAndExecuteContentScript(tabs[0]);
            }
        });
    }

    /**
     * Fallback method to inject and execute content script
     * @param {Object} tab - The browser tab to inject into
     */
    function injectAndExecuteContentScript(tab) {
        debugLog('Falling back to script injection methods');
        
        try {
            // Try Manifest V3 style first
            if (typeof chrome.scripting !== 'undefined' && chrome.scripting.executeScript) {
                debugLog('Using chrome.scripting.executeScript (Manifest V3 style)');
                
                chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    func: inContentScript,
                })
                .then(results => {
                    debugLog('Content script executed successfully:', results);
                    processContentScriptResults(results[0]?.result);
                })
                .catch(error => {
                    console.error('Error with chrome.scripting.executeScript:', error);
                    tryManifestV2Fallback(tab);
                });
                
                return;
            }
            
            tryManifestV2Fallback(tab);
            
        } catch (error) {
            console.error('Error injecting content script:', error);
            displayWarning('something-went-wrong-instructions');
            hideElement('.reading-page-status');
        }
    }

    /**
     * Tries the Manifest V2 fallback method for content script execution
     * This is for backward compatibility with older browsers and may be removed in the future
     * @param {Object} tab - The browser tab to inject into
     */
    function tryManifestV2Fallback(tab) {
        // Fallback to Manifest V2 style
        debugLog('Fallback: Using chrome.tabs.executeScript (Manifest V2 style)');
        
        // Note: chrome.tabs.executeScript is deprecated in Manifest V3 but kept for compatibility
        if (chrome.tabs.executeScript) {
            chrome.tabs.executeScript(
                tab.id,
                {code: `(${inContentScript.toString()})();`},
                (results) => {
                    debugLog('chrome.tabs.executeScript results:', results);
                    
                    if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        handleContentScriptError(chrome.runtime.lastError);
                        return;
                    }
                    
                    processContentScriptResults(results ? results[0] : null);
                }
            );
            return;
        }
        
        // If we reach here, neither method worked
        console.error('No suitable method to inject content script found');
        displayWarning('something-went-wrong-instructions');
        hideElement('.reading-page-status');
    }

    /**
     * Processes the results from the content script
     * @param {Object} result - The result from the content script
     */
    function processContentScriptResults(result) {
        debugLog('Processing content script results:', result);
        hideElement('.reading-page-status');
        
        if (result && result.success) {
            populateIssueFork(result);
        } else {
            console.error('Invalid result from content script:', result);
            displayWarning('something-went-wrong-instructions');
        }
    }

    /**
     * Handles content script execution errors
     * @param {Error} error - The error that occurred
     */
    function handleContentScriptError(error) {
        console.error('Content script error:', error);
        displayWarning('something-went-wrong-instructions');
        hideElement('.reading-page-status');
    }

    /**
     * Content script function that runs in the context of the web page
     * @returns {Object} Issue information extracted from the page
     */
    function inContentScript() {
        try {
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
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Populates the UI with data from the issue page
     * @param {Object} pageResults - Data extracted from the issue page
     */
    function populateIssueFork(pageResults) {
        if (!pageResults.success) {
            displayWarning('something-went-wrong-instructions');
            console.error('Error in page results:', pageResults.error);
            return;
        }

        if (!pageResults.loggedIn) {
            displayWarning('not-logged-in-instructions');
        }

        // Check if issue fork found in the page
        if (!pageResults.issueFork) {
            displayWarning('no-issue-fork-instructions');
        }

        if (!pageResults.pushAccess) {
            displayWarning('no-push-access-instructions');
        }

        const projectName = pageResults.pathArray[2];
        const projectNameStatus = document.getElementById('project-name');
        if (projectNameStatus) {
            projectNameStatus.textContent = projectName;
        }

        const projectTypeStatus = document.getElementById('project-type');
        if (projectTypeStatus) {
            // Show loading state while fetching project type
            setLoading('#project-type', true);
            
            getProjectType(projectName)
                .then((projectType) => {
                    if (projectTypeStatus) {
                        projectTypeStatus.textContent = projectType || 'Unknown';
                    }
                })
                .catch((error) => {
                    console.error('Error getting project type:', error);
                    if (projectTypeStatus) {
                        projectTypeStatus.textContent = 'Unknown';
                    }
                })
                .finally(() => {
                    setLoading('#project-type', false);
                });
        }

        const issueForkStatus = document.getElementById('issue-fork');
        if (issueForkStatus) {
            issueForkStatus.textContent = pageResults.issueFork;
        }

        const moduleVersionStatus = document.getElementById('module-version');
        if (moduleVersionStatus) {
            moduleVersionStatus.textContent = pageResults.moduleVersion;
        }

        const drupalCoreVersionsArray = ['10.3.2', '10.3.x', '11.0.1', '11.x'];
        const drupalInstallProfiles = ['(none)', 'standard', 'demo_umami', 'minimal'];
        const availablePatchesArray = getPatchesFromLinks(pageResults.allHrefs);

        populateSelectList('issue-branch', pageResults.issueBranches);
        populateSelectList('core-version', drupalCoreVersionsArray);
        populateSelectList('install-profile', drupalInstallProfiles);
        populateSelectList('available-patches', availablePatchesArray);

        // Display form
        showElement('.form-selection');
    }

    // Activate button
    const button = document.getElementById('submit');
    if (button) {
        button.addEventListener('click', () => {
            // Set button to loading state
            button.disabled = true;
            button.textContent = 'Opening GitPod...';
            button.classList.add('loading');
            
            openDevEnv();
        });
    }

    /**
     * Opens Gitpod with the appropriate configuration
     */
    function openDevEnv() {
        // Build URL structure to open Gitpod
        const baseUrl = 'https://gitpod.io/#';
        
        const projectNameElement = document.getElementById('project-name');
        const issueForkElement = document.getElementById('issue-fork');
        const projectTypeElement = document.getElementById('project-type');
        const moduleVersionElement = document.getElementById('module-version');
        
        if (!projectNameElement || !issueForkElement || !projectTypeElement || !moduleVersionElement) {
            console.error('Missing required elements');
            displayWarning('something-went-wrong-instructions');
            return;
        }
        
        const projectName = 'DP_PROJECT_NAME=' + projectNameElement.textContent;
        const issueFork = 'DP_ISSUE_FORK=' + (issueForkElement.textContent === 'false' ? '' : issueForkElement.textContent);
        const issueBranch = 'DP_ISSUE_BRANCH=' + encodeURIComponent(getSelectValue('issue-branch'));
        const projectType = 'DP_PROJECT_TYPE=' + projectTypeElement.textContent;
        const moduleVersion = 'DP_MODULE_VERSION=' + moduleVersionElement.textContent;
        const coreVersion = 'DP_CORE_VERSION=' + getSelectValue('core-version');
        const patchFile = 'DP_PATCH_FILE=' + encodeURIComponent(getSelectValue('available-patches'));
        const installProfile = 'DP_INSTALL_PROFILE=' + (getSelectValue('install-profile') === '(none)' ? "\'\'" : getSelectValue('install-profile'));

        // Get repo URL from storage, with fallback to default URL
        chrome.storage.sync.get(['drupalpod_repo'], (options) => {
            const envRepo = options.drupalpod_repo || 'https://git.drupalcode.org/project/drupalpod';
            
            // Validate URL parameters
            if (!projectName || !projectType || !moduleVersion) {
                console.error('Missing required parameters for GitPod URL');
                displayWarning('something-went-wrong-instructions');
                return;
            }
            
            // Ensure parameters are correctly formatted
            const params = [
                projectName,
                issueFork,
                issueBranch,
                projectType,
                moduleVersion,
                coreVersion,
                patchFile,
                installProfile
            ];
            
            // Check for invalid characters in parameters
            const hasInvalidChars = params.some(param => 
                param.includes('"') || param.includes('`') || param.includes('\\')
            );
            
            if (hasInvalidChars) {
                console.error('Invalid characters in GitPod URL parameters');
                displayWarning('something-went-wrong-instructions');
                return;
            }
            
            // Use template literals for better readability
            chrome.tabs.create({
                url: `${baseUrl}${projectName},${issueFork},${issueBranch},${projectType},${moduleVersion},${coreVersion},${patchFile},${installProfile}/${envRepo}`
            });
            window.close();
        });
    }
});

/**
 * Gets the selected value from a select element
 * @param {string} id - ID of the select element
 * @returns {string} The selected value or empty string
 */
function getSelectValue(id) {
    const selectElement = document.getElementById(id);
    if (!selectElement) return '';
    
    if (selectElement.options[selectElement.selectedIndex]) {
        return selectElement.options[selectElement.selectedIndex].value;
    }
    return '';
}

/**
 * Extracts patch links from an array of URLs
 * @param {Array} linksArray - Array of URLs
 * @returns {Array} Array of patch file URLs
 */
function getPatchesFromLinks(linksArray) {
    if (!Array.isArray(linksArray)) {
        console.error('Invalid links array:', linksArray);
        return [''];
    }
    
    const patchesRegex = /^https:\/\/www\.drupal\.org\/files\/issues\/.*\.patch$/;
    const patchesFound = linksArray.filter(item => patchesRegex.test(item));

    patchesFound.unshift('');
    return patchesFound;
}

/**
 * Displays a warning message by class name
 * @param {string} className - CSS class of the warning element
 */
function displayWarning(className) {
    // Reveal error message
    const warningMessageElement = document.querySelector('.' + className);
    if (warningMessageElement) {
        warningMessageElement.classList.remove('hidden');
    }
}

/**
 * Populates a select element with options
 * @param {string} id - ID of the select element
 * @param {Array} options - Array of option values
 */
function populateSelectList(id, options) {
    const select = document.getElementById(id);
    if (!select || !Array.isArray(options)) return;

    // Clear existing options first
    while (select.firstChild) {
        select.removeChild(select.firstChild);
    }

    options.forEach(element => {
        const opt = document.createElement('option');
        opt.value = element;
        opt.textContent = element;
        select.appendChild(opt);
    });
}

/**
 * Fetches the project type from Drupal API with caching
 * @param {string} projectName - Name of the Drupal project
 * @returns {Promise<string>} Project type
 */
async function getProjectType(projectName) {
    if (!projectName) {
        return Promise.reject(new Error('No project name provided'));
    }
    
    // Check cache first
    const cacheKey = `project_type_${projectName}`;
    
    try {
        // Try to get from cache
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([cacheKey], async (result) => {
                // If we have a cached result and it's not too old (24 hours)
                if (result[cacheKey] && 
                    result[cacheKey].timestamp > Date.now() - 24 * 60 * 60 * 1000) {
                    debugLog('Using cached project type for:', projectName);
                    resolve(result[cacheKey].type);
                    return;
                }
                
                // No valid cache, fetch from API
                try {
                    const url = `https://www.drupal.org/api-d7/node.json?field_project_machine_name=${encodeURIComponent(projectName)}`;
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`API request failed with status ${response.status}`);
                    }
                    
                    const data = await response.json();
                    let projectType = 'Unknown';
                    
                    if (data && data.list && data.list.length > 0) {
                        projectType = data.list[0].type;
                    } else {
                        console.warn('No project found with name:', projectName);
                    }
                    
                    // Cache the result
                    chrome.storage.local.set({
                        [cacheKey]: {
                            type: projectType,
                            timestamp: Date.now()
                        }
                    });
                    
                    resolve(projectType);
                } catch (error) {
                    console.error('Error fetching project type:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Cache error for project type:', error);
        return 'Unknown';
    }
}

/**
 * Shows an element by removing the 'hidden' class
 * @param {string} selector - CSS selector for the element
 */
function showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * Hides an element by adding the 'hidden' class
 * @param {string} selector - CSS selector for the element
 */
function hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Sets the loading state for an element
 * @param {string} selector - CSS selector for the element
 * @param {boolean} isLoading - Whether the element is in loading state
 */
function setLoading(selector, isLoading) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    if (isLoading) {
        element.classList.add('loading');
        // Store original text if not already stored
        if (!element.dataset.originalText) {
            element.dataset.originalText = element.textContent;
        }
        element.textContent = 'Loading...';
    } else {
        element.classList.remove('loading');
        // Restore original text if it was stored
        if (element.dataset.originalText) {
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }
}

/**
 * Function to get DrupalPod repo from storage
 * This is currently not used as noted in the original code
 */
function getDrupalPodRepo() {
    chrome.runtime.sendMessage({message: 'fetch-drupalpod-repo'}, (response) => {
        const drupalPodRepoStatus = document.getElementById('devdrupalpod');
        if (drupalPodRepoStatus && response && response.message) {
            drupalPodRepoStatus.textContent = response.message;
        }
    });
}

/**
 * Checks and requests permissions if needed
 * @param {string} url - The URL to request permissions for
 * @returns {Promise<boolean>} - Whether permissions were granted
 */
async function ensurePermissions(url) {
    debugLog('Checking permissions for:', url);
    
    try {
        // First check if we already have the permissions
        const hasPermission = await chrome.permissions.contains({
            permissions: ['scripting'],
            origins: [new URL(url).origin + '/*']
        });
        
        debugLog('Already has permissions:', hasPermission);
        
        if (hasPermission) {
            return true;
        }
        
        // If not, request them
        debugLog('Requesting permissions...');
        const granted = await chrome.permissions.request({
            permissions: ['scripting'],
            origins: [new URL(url).origin + '/*']
        });
        
        debugLog('Permissions granted:', granted);
        return granted;
    } catch (error) {
        console.error('Error checking/requesting permissions:', error);
        return false;
    }
}
