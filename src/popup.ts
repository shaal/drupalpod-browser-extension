import { IssueMetadata } from './models/issue-metadata';

export const displayWarning = (className: string): void => {
  // Reveal error message.
  const warningMessageElement = document.querySelector(`.${className}`) as HTMLElement;
  if (warningMessageElement) {
    warningMessageElement.classList.remove('hidden');
  }
};

export const getSelectValue = (id: string): string => {
  const selectElement = document.getElementById(id) as HTMLSelectElement;
  if (selectElement.options[selectElement.selectedIndex]) {
    return selectElement.options[selectElement.selectedIndex].value;
  }
  return '';
};

export const getPatchesFromLinks = (linksArray: string[]): string[] => {
  const patchesRegex = /^https:\/\/www\.drupal\.org\/files\/issues\/.*\.patch$/;
  const patchesFound = linksArray.filter((item) => (patchesRegex.exec(item) !== null));

  patchesFound.unshift('');
  return patchesFound;
};

export const populateSelectList = (id: string, options: string[]): void => {
  const select = document.getElementById(id) as HTMLSelectElement;
  if (select) {
    options.forEach((optionValue) => {
      const opt = document.createElement('option') as HTMLOptionElement;
      opt.value = optionValue;
      opt.innerHTML = optionValue;
      select.append(opt);
    });
  } else {
    throw new Error('Select element does not exist');
  }
};

export const getDrupalPodRepo = (): void => {
  chrome.runtime.sendMessage({ message: 'fetch-drupalpod-repo' }, (response) => {
    // return response.message;
    const drupalPodRepoStatus = document.getElementById('devdrupalpod') as HTMLElement;
    if (drupalPodRepoStatus) {
      drupalPodRepoStatus.innerText = response.message;
    }
  });
};

export const isDrupalOrgUrl = (url: string): boolean => {
  // Run only on Drupal issues pages, otherwise display a message
  // const projectPageRegex = /(https:\/\/www.drupal.org\/project\/)\w+\/?$/gm;
  const projectIssuePageRegex = /(https:\/\/www.drupal.org\/project\/)\w+(\/issues\/)\d+/gm;

  return projectIssuePageRegex.test(url);
};

// Check current URL to activate extension only on relevant pages.
export const parseDrupalOrgTab = (): Promise<boolean> => (
  new Promise<boolean>((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url: string = tabs[0].url || '';
      if (isDrupalOrgUrl(url)) {
        resolve(true);
      } else {
        reject(new Error('not-issue-page-instructions'));
      }
    });
  })
);

export const getProjectType = async (projectName: string): Promise<string> => {
  const url = `https://www.drupal.org/api-d7/node.json?field_project_machine_name=${projectName}`;
  let obj = null;

  try {
    obj = await (await fetch(url)).json();
    return await (obj.list[0].type);
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
};

export const populateIssueFork = (pageResults: IssueMetadata): any => {
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
  const projectNameStatus = document.getElementById('project-name') as HTMLElement;
  projectNameStatus.innerHTML = projectName;

  getProjectType(projectName).then((projectType) => {
    const projectTypeStatus = document.getElementById('project-type') as HTMLElement;
    projectTypeStatus.innerHTML = projectType;
  });

  const issueForkStatus = document.getElementById('issue-fork') as HTMLElement;
  issueForkStatus.innerHTML = pageResults.issueFork || '';

  const moduleVersionStatus = document.getElementById('module-version') as HTMLElement;
  moduleVersionStatus.innerHTML = pageResults.moduleVersion;

  const drupalCoreVersionsArray = ['9.2.0', '8.9.x', '9.0.x', '9.1.x', '9.2.x', '9.3.x'];
  const drupalInstallProfiles = ['(none)', 'standard', 'demo_umami', 'minimal'];
  const availablePatchesArray = getPatchesFromLinks(pageResults.allHrefs);

  populateSelectList('issue-branch', pageResults.issueBranches);
  populateSelectList('core-version', drupalCoreVersionsArray);
  populateSelectList('install-profile', drupalInstallProfiles);
  populateSelectList('available-patches', availablePatchesArray);

  // Display form
  const formSelectionElement = document.querySelector('.form-selection') as HTMLElement;
  formSelectionElement.classList.remove('hidden');
};

export const openDevEnv = (
  envRepo: string,
  projectName: string,
  issueFork: string,
  issueBranch: string,
  projectType: string,
  moduleVersion: string,
  coreVersion: string,
  patchFile: string,
  installProfile: string,
): void => {
  // Build URL structure to open Gitpod.
  const url = `https://gitpod.io/#${projectName},${issueFork},${issueBranch},${projectType},${moduleVersion},${coreVersion},${patchFile},${installProfile}/${envRepo}`;
  chrome.tabs.create({ url });
  window.close();
};

export const readIssueContent = (): void => {
  const inContent = (params: any): IssueMetadata => {
    const pathArray: string[] = window.location.pathname.split('/');
    const issueForkEl = document.querySelector('.fork-link') as HTMLElement;
    const issueFork = issueForkEl?.innerText || '';
    const allBranchesEl = document.querySelector('.branches') as HTMLElement;
    const allBranches: HTMLCollection = allBranchesEl?.children as HTMLCollectionOf<HTMLElement>;

    // Get links to find patches
    const allLinks = document.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const duplicateAllHrefs = [];
    for (let i = 0; i < allLinks.length; i++) {
      const el = allLinks[i] as HTMLAnchorElement;
      if (el.hasAttribute('href')) {
        duplicateAllHrefs.push(el.getAttribute('href') || '');
      }
    }
    // Remove duplicate Hrefs.
    const allHrefs: string[] = [...new Set(duplicateAllHrefs)];

    const issueBranches = [];
    (Array.from(allBranches) as HTMLElement[]).forEach((element: HTMLElement) => {
      issueBranches.push(element.dataset.branch);
    });
    issueBranches.unshift('');

    const versionEl = document.querySelector('.field-name-field-issue-version') as HTMLElement;
    const versionChildEl = versionEl?.children[1] as HTMLElement || null;
    const moduleVersion = versionChildEl?.innerText.replace('-dev', '') || '';
    const loggedIn = !!document.querySelector('.person');
    const pushAccess = !!document.querySelector('.push-access');

    return {
      success: true,
      pathArray,
      issueFork,
      allHrefs,
      issueBranches,
      moduleVersion,
      loggedIn,
      pushAccess,
    };
  };

  chrome.tabs.executeScript({
    code: `(${inContent})(${JSON.stringify({ foo: 'bar' })})`,
  }, ([result] = []) => {
    // Hide 'please wait' message
    const pageStatusElement = document.querySelector('.reading-page-status') as HTMLElement;
    if (pageStatusElement) {
      pageStatusElement.classList.add('hidden');
    }
    if (!chrome.runtime.lastError) {
      populateIssueFork(result);
    } else {
      console.error(chrome.runtime.lastError);
      displayWarning('something-went-wrong-instructions');
    }
  });
};
