import { Octokit } from "@octokit/rest";
import { Session } from "next-auth";

export type SessionWithAccessToken = Session & { accessToken: string };

export type GitHubRepo = {
  id: string;
  owner: string;
  name: string;
  url: string;
};

export type GitHubWorkflowRun = {
  id: string;
  displayTitle: string;
  commitSha: string;
  createdAt: string;
  url: string;
};

export type GitHubBuild = {
  digest: number[];
  modules: string[];
  dependencies: string[];
};

export const MVR_REGISTRY_OBJECT_ID =
  "0x0e5d473a055b6b7d014af557a13ad9075157fdc19b6d51562a18511afd397727";
export const MVR_SUILEND_SUINS_OBJECT_ID =
  "0x07914f35c88605d5d0f12269a43bd7c6cb24bce81f4d8627a232fc71d261ad80"; // Owned by 0xb1ff
export const MVR_CAM00_SUINS_OBJECT_ID =
  "0x3719deca8d64145c110df2039c447d8fe8ce9746304ec2bbb817a4f2a006d347"; // Owned by 0x6191

export type MvrOrganization = { suinsDomainObjId: string; name: string };

export type MvrGitInfo = {
  repository: string; // E.g. https://github.com/suilend/suilend-public
  subdirectory: string; // E.g. contracts/suilend
  commitHash: string; // E.g. 6d3baefa31c0a672b1f96c81a058b4c688bf8ffc
};
export type MvrMetadata = {
  description?: string;
  iconUrl?: string;
  documentationUrl?: string;
  homepageUrl?: string;
  contact?: string;
};

/**
 * Creates an authenticated Octokit instance from a NextAuth session
 * @param session - NextAuth session object with accessToken
 * @returns Authenticated Octokit instance
 * @throws Error if session or accessToken is missing
 */
export function getAuthenticatedOctokit(
  session: SessionWithAccessToken | null,
): Octokit | null {
  if (!session?.accessToken) return null;

  return new Octokit({
    auth: session.accessToken,
  });
}
