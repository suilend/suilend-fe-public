import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";
import unzipper from "unzipper";

import {
  GitHubBuild,
  SessionWithAccessToken,
  getAuthenticatedOctokit,
} from "@/lib/mvr";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Get session server-side
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get authenticated Octokit instance
    const octokit = getAuthenticatedOctokit(session as SessionWithAccessToken);
    if (!octokit) {
      res.status(401).json({ error: "GitHub authentication required" });
      return;
    }

    // Extract parameters from request body
    const { owner, repo, artifact_id } = JSON.parse(req.body);
    console.log(
      "XXX owner:",
      owner,
      "repo:",
      repo,
      "artifact_id:",
      artifact_id,
    );

    if (!owner || !repo || !artifact_id) {
      res.status(400).json({
        error: "Missing required parameters: owner, repo, artifact_id",
      });
      return;
    }

    // Download the artifact
    const res2 = await octokit.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: parseInt(artifact_id),
      archive_format: "zip",
    });

    const dir = res2.data as ArrayBuffer;
    const files = (await unzipper.Open.buffer(Buffer.from(dir))).files;

    const file = files[0];
    if (!file) {
      res.status(400).json({
        error: "No file found in artifact",
      });
      return;
    }

    const build: GitHubBuild = JSON.parse(
      Buffer.from(await file.buffer()).toString("utf8"),
    );
    res.status(200).json({ build });
  } catch (error) {
    console.error("Error downloading artifact:", error);

    res.status(500).json({
      error: "Failed to download artifact",
      message: (error as Error)?.message,
    });
  }
}
