export interface IssueMetadata {
  success: boolean;
  pathArray: string[];
  issueFork?: string;
  availablePatches: string[];
  issueBranches: string[];
  moduleVersion: string;
  loggedIn: boolean;
  pushAccess: boolean;
}
