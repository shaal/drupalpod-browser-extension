export interface IssueMetadata {
  success: boolean;
  projectName: string;
  projectType: string | null;
  issueFork?: string;
  availablePatches: string[];
  issueBranches: string[];
  moduleVersion: string;
  loggedIn: boolean;
  pushAccess: boolean;
}
