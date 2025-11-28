import { useCallback, useState } from "react";

import { Octokit } from "@octokit/rest";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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

export const useGitHubRepos = () => {
  // GitHub
  const { data: session } = useSession();
  const octokit = getAuthenticatedOctokit(session as SessionWithAccessToken);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [workflowRunsForRepo, setWorkflowRunsForRepo] = useState<
    GitHubWorkflowRun[]
  >([]);

  // GitHub - repos
  const getReposForUser = useCallback(async () => {
    try {
      if (!octokit) return;

      const res = await octokit.repos.listForAuthenticatedUser({
        visibility: "all",
        affiliation: "owner,collaborator,organization_member",
      });
      const _repos = res.data
        .map((repo) => {
          const owner = repo.owner.html_url.split("/").pop() as string;
          const name = repo.name;
          const url = repo.html_url;
          const id = `${owner}/${name}`;

          return {
            id,
            owner,
            name,
            url,
          };
        })
        .sort((a, b) => (a.id.toLowerCase() < b.id.toLowerCase() ? -1 : 1)); // Sort alphabetically by id
      console.log("_repos:", _repos);

      return _repos;
    } catch (err) {
      toast.error("Failed to get repos for user", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  }, [octokit]);

  // GitHub - workflow runs for repo
  const getWorkflowRunsForRepo = useCallback(
    async (_repoId: string) => {
      try {
        if (!octokit) return;

        const [owner, repo] = _repoId.split("/");
        const res = await octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo,
        });
        const _workflowRuns = res.data.workflow_runs.map((workflowRun) => {
          return {
            id: workflowRun.id.toString(),
            displayTitle: workflowRun.display_title,
            commitSha: workflowRun.head_commit?.id || "",
            createdAt: workflowRun.created_at,
            url: workflowRun.html_url,
          };
        });
        console.log("_workflowRuns:", _workflowRuns);

        return _workflowRuns;
      } catch (err) {
        toast.error("Failed to get workflow runs for repo", {
          description: (err as Error)?.message || "An unknown error occurred",
        });
      }
    },
    [octokit],
  );

  // GitHub - artifact build for workflow run
  const getBuildForWorkflowRun = useCallback(
    async (_repoId: string, _workflowRunId: string) => {
      try {
        if (!octokit) return;

        const [owner, repo] = _repoId.split("/");
        const res = await octokit.actions.listWorkflowRunArtifacts({
          owner,
          repo,
          run_id: parseInt(_workflowRunId),
        });
        const _artifact = res.data.artifacts[0]; // Assume there is max one artifact
        console.log("_artifact:", _artifact);
        if (!_artifact) throw new Error("Workflow run has no artifacts");

        const res2 = await fetch("/api/github/download-artifact", {
          method: "POST",
          body: JSON.stringify({
            owner,
            repo,
            artifact_id: _artifact.id,
          }),
        });
        const { build: _build }: { build: GitHubBuild } = await res2.json();
        console.log("_build:", _build);

        return _build;
      } catch (err) {
        toast.error("Failed to get artifact for workflow run", {
          description: (err as Error)?.message || "An unknown error occurred",
        });
      }
    },
    [octokit],
  );

  return {
    session,
    octokit,
    repos,
    setRepos,
    workflowRunsForRepo,
    setWorkflowRunsForRepo,
    getReposForUser,
    getWorkflowRunsForRepo,
    getBuildForWorkflowRun,
  };
};
