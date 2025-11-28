import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { DebouncedFunc, debounce } from "lodash";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { TX_TOAST_DURATION } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import RepoSelect from "@/components/mvr/RepoSelect";
import WorkflowRunSelect from "@/components/mvr/WorkflowRunSelect";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import TextLink from "@/components/shared/TextLink";
import { TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { GitHubBuild, useGitHubRepos } from "@/lib/mvr";

interface UpgradePackageDialogProps {
  address: string;
  isMultisig: boolean;
  packageId: string;
  upgradeCapId: string;
  version: number;
  refresh: () => Promise<void>;
}

export default function UpgradePackageDialog({
  address,
  isMultisig,
  packageId,
  upgradeCapId,
  version,
  refresh,
}: UpgradePackageDialogProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  // GitHub
  const {
    session,
    octokit,
    repos,
    setRepos,
    workflowRunsForRepo,
    setWorkflowRunsForRepo,
    getReposForUser,
    getWorkflowRunsForRepo,
    getBuildForWorkflowRun,
  } = useGitHubRepos();

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
  }, [session, octokit, getReposForUser, setRepos]);

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
    (
      _address: string,
      _packageId: string,
      _upgradeCapId: string,
      _build: GitHubBuild,
    ) => {
      const transaction = new Transaction();
      transaction.setSender(_address);

      // 1) Upgrade
      const [ticket] = transaction.moveCall({
        target: "0x2::package::authorize_upgrade",
        arguments: [
          transaction.object(_upgradeCapId),
          transaction.pure.u8(0), // Policy (0 for compatible, 1 for additive, 2 for dep_only)
          transaction.pure.vector("u8", _build.digest), // Package digest as vector<u8>
        ],
      });
      const [receipt] = transaction.upgrade({
        modules: _build.modules,
        package: _packageId,
        ticket,
        dependencies: _build.dependencies,
      });
      transaction.moveCall({
        target: "0x2::package::commit_upgrade",
        arguments: [transaction.object(_upgradeCapId), receipt],
      });

      return transaction;
    },
    [],
  );
  const getTransactionBase64 = useCallback(
    async (
      _address: string,
      _packageId: string,
      _upgradeCapId: string,
      _build: GitHubBuild,
    ) => {
      const transaction = getTransaction(
        _address,
        _packageId,
        _upgradeCapId,
        _build,
      );

      const transactionBytes = await transaction.build({ client: suiClient });
      const base64 = Buffer.from(transactionBytes).toString("base64");
      setTransactionBase64(base64);
    },
    [getTransaction, suiClient],
  );
  const debouncedGetTransactionBase64Ref = useRef<
    DebouncedFunc<typeof getTransactionBase64>
  >(debounce(getTransactionBase64, 100));

  // Submit
  const reset = useCallback(() => {
    setRepos([]);
    setWorkflowRunsForRepo([]);

    setRepoId(undefined);
    didFetchReposRef.current = false;
    setWorkflowRunId(undefined);
    setBuild(undefined);
    setTransactionBase64("");
  }, [setRepos, setWorkflowRunsForRepo]);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  const submit = async () => {
    try {
      if (!build) return;

      const transaction = getTransaction(
        address,
        packageId,
        upgradeCapId,
        build,
      );

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

      toast.success("Upgraded package", {
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
      toast.error("Failed to upgrade package", {
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
    [getWorkflowRunsForRepo, setWorkflowRunsForRepo],
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
        await debouncedGetTransactionBase64Ref.current(
          address,
          packageId,
          upgradeCapId,
          _build,
        );
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [
      repoId,
      getBuildForWorkflowRun,
      isMultisig,
      address,
      packageId,
      upgradeCapId,
    ],
  );

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-max"
          labelClassName="uppercase"
          variant="secondary"
          startIcon={<ArrowUp />}
        >
          Upgrade
        </Button>
      }
      headerProps={{
        title: { icon: <ArrowUp />, children: "Upgrade package" },
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
                Upgrade
              </Button>
            )}
          </>
        ),
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Repo */}
        <RepoSelect
          repos={repos}
          repoId={repoId}
          repo={repo}
          onRepoIdChange={onRepoIdChange}
        />

        {/* Workflow run */}
        <WorkflowRunSelect
          workflowRunsForRepo={workflowRunsForRepo}
          repoId={repoId}
          workflowRunId={workflowRunId}
          workflowRun={workflowRun}
          onWorkflowRunIdChange={onWorkflowRunIdChange}
        />

        {/* Version */}
        <Input
          label="Version"
          id="version"
          value={`${+version + 1}`}
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
