/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MockChrome {
  tabs: any,
  runtime: any,
}

export const mockChrome: MockChrome = {
  tabs: {
    urls: [],
    query(props: any, callback: (tabs?: chrome.tabs.Tab[]) => void): void {
      console.log(props);
      callback([
        {
          index: 0,
          url: document.location.href,
          pinned: false,
          highlighted: false,
          windowId: 0,
          active: true,
          incognito: false,
          discarded: false,
          autoDiscardable: false,
          selected: true,
          groupId: 0,
        },
      ]);
    },
    create(props: any): void {
      console.log(props);
    },
    executeScript(props: any, callback: (results?: any[]) => void): void {
      console.log(props);
      callback([]);
    },
  },
  runtime: {
    sendMessage(message: any, callback: (response?: any) => void): void {
      console.log(message);
      callback();
    },
  },
};

export default function chromeFactory(): any | MockChrome {
  return typeof chrome !== 'undefined' ? chrome : mockChrome;
}
