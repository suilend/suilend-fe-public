import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { DebouncedFunc, debounce } from "lodash";
import { ChevronDown, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { TX_TOAST_DURATION } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import RepoItem from "@/components/mvr/RepoItem";
import WorkflowRunItem from "@/components/mvr/WorkflowRunItem";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import Input from "@/components/shared/Input";
import OpenURLButton from "@/components/shared/OpenURLButton";
import TextLink from "@/components/shared/TextLink";
import { TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import {
  GitHubBuild,
  GitHubRepo,
  GitHubWorkflowRun,
  SessionWithAccessToken,
  getAuthenticatedOctokit,
} from "@/lib/mvr";
import { cn } from "@/lib/utils";

interface PublishPackageDialogProps {
  address: string;
  isMultisig: boolean;
  refresh: () => Promise<void>;
}

export default function PublishPackageDialog({
  address,
  isMultisig,
  refresh,
}: PublishPackageDialogProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

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

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [repoId, setRepoId] = useState<string | undefined>(undefined);
  const repo = useMemo(
    () => repos.find((repo) => repo.id === repoId),
    [repos, repoId],
  );

  const didFetchReposRef = useRef<boolean>(false);
  useEffect(() => {
    if (!session || !octokit) return;

    if (didFetchReposRef.current) return;
    didFetchReposRef.current = true;

    (async () => {
      const _repos = await getReposForUser();
      if (!_repos) return;

      setRepos(_repos);
    })();
  }, [session, octokit, getReposForUser]);

  const [workflowRunId, setWorkflowRunId] = useState<string | undefined>(
    undefined,
  );
  const workflowRun = useMemo(
    () =>
      workflowRunsForRepo.find(
        (workflowRun) => workflowRun.id === workflowRunId,
      ),
    [workflowRunsForRepo, workflowRunId],
  );

  const [build, setBuild] = useState<GitHubBuild | undefined>(undefined);

  // Transaction
  const [transactionBase64, setTransactionBase64] = useState<string>("");

  const getTransaction = useCallback(
    (_address: string, _build: GitHubBuild) => {
      const transaction = new Transaction();
      transaction.setSender(_address);

      // 1) Publish
      const [upgradeCap] = transaction.publish({
        modules: _build.modules,
        dependencies: _build.dependencies,
      });
      transaction.transferObjects(
        [upgradeCap],
        transaction.pure.address(_address),
      );

      return transaction;
    },
    [],
  );
  const getTransactionBase64 = useCallback(
    async (_address: string, _build: GitHubBuild) => {
      const transaction = getTransaction(_address, _build);

      const transactionBytes = await transaction.build({ client: suiClient });
      const base64 = Buffer.from(transactionBytes).toString("base64");
      setTransactionBase64(base64);

      const res = await suiClient.devInspectTransactionBlock({
        sender: _address,
        transactionBlock: transaction,
      });
      console.log("res:", res);
    },
    [getTransaction, suiClient],
  );
  const debouncedGetTransactionBase64Ref = useRef<
    DebouncedFunc<typeof getTransactionBase64>
  >(debounce(getTransactionBase64, 100));

  // Submit
  const reset = useCallback(() => {
    setRepoId(undefined);
    setWorkflowRunId(undefined);
    setBuild(undefined);
    setTransactionBase64("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  const submit = async () => {
    try {
      if (!build) return;

      const transaction = getTransaction(address, build);

      const res1 = await signAndExecuteTransaction({ transaction });
      const res = await suiClient.waitForTransaction({
        digest: res1.digest,
        options: {
          showBalanceChanges: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Published package", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });

      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to register package", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  // On change
  const onRepoIdChange = useCallback(
    async (_repoId: string) => {
      setRepoId(_repoId);
      setWorkflowRunId(undefined);

      const _workflowRuns = await getWorkflowRunsForRepo(_repoId);
      if (!_workflowRuns) return;

      setWorkflowRunsForRepo(_workflowRuns);
    },
    [getWorkflowRunsForRepo],
  );
  const onWorkflowRunIdChange = useCallback(
    async (_workflowRunId: string) => {
      if (!repoId) return;

      setWorkflowRunId(_workflowRunId);

      const _build = await getBuildForWorkflowRun(repoId, _workflowRunId);
      if (!_build) return;

      setBuild(_build);

      if (!isMultisig) return;
      try {
        await debouncedGetTransactionBase64Ref.current(address, _build);
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [repoId, getBuildForWorkflowRun, isMultisig, address],
  );

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-max"
          labelClassName="uppercase"
          startIcon={<Plus />}
          variant="secondary"
          disabled={!session || !address}
        >
          Publish package
        </Button>
      }
      headerProps={{
        title: { icon: <Plus />, children: "Publish package" },
      }}
      footerProps={{
        children: (
          <>
            {isMultisig ? (
              <div className="flex w-full flex-col gap-4">
                <Separator className="-mx-4 w-auto" />

                <div className="flex w-full flex-col gap-2">
                  <TLabelSans>Transaction base64</TLabelSans>
                  <textarea
                    id="transactionBase64"
                    className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={transactionBase64}
                    readOnly
                    rows={8}
                  />
                </div>
              </div>
            ) : (
              <Button
                className="w-full"
                labelClassName="uppercase"
                size="lg"
                onClick={submit}
                disabled={!build}
              >
                Publish
              </Button>
            )}
          </>
        ),
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Repo */}
        <div className="flex w-full flex-col gap-2">
          <TLabelSans>
            Repository <span className="text-red-500">*</span>
          </TLabelSans>
          <DropdownMenu
            contentProps={{
              style: {
                minWidth: "var(--radix-dropdown-menu-trigger-width)",
                maxWidth: "var(--radix-dropdown-menu-trigger-width)",
              },
            }}
            trigger={
              <Button
                className="h-max min-h-10 w-full justify-between"
                labelClassName={cn("font-sans", repoId && "text-foreground")}
                endIcon={<ChevronDown />}
                variant="secondaryOutline"
                size="lg"
              >
                {repo ? <RepoItem repo={repo} /> : "Select repository"}
              </Button>
            }
            items={
              <div className="flex w-full flex-col gap-2">
                {repos.map((repo) => {
                  return (
                    <DropdownMenuItem
                      key={repo.id}
                      className="h-10"
                      isSelected={repo.id === repoId}
                      onClick={() => onRepoIdChange(repo.id)}
                    >
                      <div className="flex w-full flex-row items-center justify-between">
                        <RepoItem repo={repo} />

                        <OpenURLButton url={repo.url}>
                          View on GitHub
                        </OpenURLButton>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            }
          />
        </div>

        {/* Workflow run */}
        <div className="flex w-full flex-col gap-2">
          <TLabelSans>
            Workflow run <span className="text-red-500">*</span>
          </TLabelSans>
          <DropdownMenu
            contentProps={{
              style: {
                minWidth: "var(--radix-dropdown-menu-trigger-width)",
                maxWidth: "var(--radix-dropdown-menu-trigger-width)",
              },
            }}
            trigger={
              <Button
                className="h-max min-h-10 w-full justify-between"
                labelClassName={cn(
                  "font-sans",
                  workflowRunId && "text-foreground",
                )}
                endIcon={<ChevronDown />}
                variant="secondaryOutline"
                size="lg"
                disabled={!repoId}
              >
                {workflowRun ? (
                  <WorkflowRunItem workflowRun={workflowRun} />
                ) : (
                  "Select workflow run"
                )}
              </Button>
            }
            items={
              <div className="flex w-full flex-col gap-2">
                {workflowRunsForRepo.map((workflowRun) => {
                  return (
                    <DropdownMenuItem
                      key={workflowRun.id}
                      className="h-max min-h-10"
                      isSelected={workflowRun.id === workflowRunId}
                      onClick={() => onWorkflowRunIdChange(workflowRun.id)}
                    >
                      <div className="flex w-full flex-row items-center justify-between">
                        <WorkflowRunItem workflowRun={workflowRun} />

                        <OpenURLButton url={workflowRun.url}>
                          View on GitHub
                        </OpenURLButton>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            }
          />
        </div>

        {/* Version */}
        <Input
          label="Version"
          id="version"
          value="1"
          onChange={() => {}}
          inputProps={{
            className: "bg-transparent",
            readOnly: true,
          }}
        />
      </div>
    </Dialog>
  );
}
