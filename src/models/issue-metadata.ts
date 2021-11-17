export interface IssueMetadata {
  success: boolean;
  pathArray: string[];
  issueFork?: string;
  allHrefs: string[];
  issueBranches: string[];
  moduleVersion: string;
  loggedIn: boolean;
  pushAccess: boolean;
}
