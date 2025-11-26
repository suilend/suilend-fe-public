import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { SuiObjectResponse } from "@mysten/sui/client";
import { Transaction, namedPackagesPlugin } from "@mysten/sui/transactions";
import { DebouncedFunc, debounce } from "lodash";
import { Box } from "lucide-react";
import { toast } from "sonner";

import { TX_TOAST_DURATION } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TextLink from "@/components/shared/TextLink";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { MvrGitInfo, MvrMetadata } from "@/lib/mvr";

interface ViewPackageMetadataObjectDialogProps {
  address: string;
  isMultisig: boolean;
  upgradeCapId: string;
  version: number;
  refresh: () => Promise<void>;
  mvrPackageMetadataObj: SuiObjectResponse;
  mvrPackageMetadataGitVersioningObjs: SuiObjectResponse[];
}
export default function ViewPackageMetadataObjectDialog({
  address,
  isMultisig,
  upgradeCapId,
  version,
  refresh,
  mvrPackageMetadataObj,
  mvrPackageMetadataGitVersioningObjs,
}: ViewPackageMetadataObjectDialogProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  useEffect(() => {
    const mainnetPlugin = namedPackagesPlugin({
      url: "https://mainnet.mvr.mystenlabs.com",
    });

    Transaction.registerGlobalSerializationPlugin(
      "namedPackagesPlugin",
      mainnetPlugin,
    );
  }, []);

  // Existing
  const id = useMemo(
    () => mvrPackageMetadataObj.data?.objectId as string,
    [mvrPackageMetadataObj],
  );

  const [organization, packageName] = useMemo(
    () =>
      (
        mvrPackageMetadataObj.data?.content as any
      ).fields.metadata.fields.contents[0].fields.value.split("/") as [
        string,
        string,
      ],
    [mvrPackageMetadataObj],
  );

  const [metadata, setMetadata] = useState<MvrMetadata>({});

  const fetchMetadata = useCallback(async () => {
    const res = await fetch(
      `https://mainnet.mvr.mystenlabs.com/v1/names/${organization}/${packageName}`,
    );
    const json: {
      metadata: {
        description?: string;
        icon_url?: string;
        documentation_url?: string;
        homepage_url?: string;
        contact?: string;
      };
    } = await res.json();

    const parsedMetadata: MvrMetadata = {
      description: json.metadata?.description ?? undefined,
      iconUrl: json.metadata?.icon_url ?? undefined,
      documentationUrl: json.metadata?.documentation_url ?? undefined,
      homepageUrl: json.metadata?.homepage_url ?? undefined,
      contact: json.metadata?.contact ?? undefined,
    };

    setMetadata(parsedMetadata);
  }, [organization, packageName]);
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const hasMissingGitInfo = useMemo(() => {
    const allVersions = Array.from({ length: version }, (_, i) => i + 1);

    return !allVersions.every((_version) =>
      mvrPackageMetadataGitVersioningObjs.some(
        (obj) => (obj.data?.content as any).fields.name === _version.toString(),
      ),
    );
  }, [version, mvrPackageMetadataGitVersioningObjs]);

  const [versionGitInfoMap, setVersionGitInfoMap] = useState<
    Record<number, MvrGitInfo>
  >({});

  // Transaction
  const [transactionBase64, setTransactionBase64] = useState<string>("");

  const getTransaction = useCallback(
    (
      _id: string,
      _address: string,
      _upgradeCapId: string,
      _version: number,
      _versionGitInfoMap: Record<number, MvrGitInfo>,
    ) => {
      const transaction = new Transaction();
      transaction.setSender(_address);

      // GitInfo
      for (let v = 1; v <= _version; v++) {
        const gitInfo = _versionGitInfoMap[v];
        if (!gitInfo) continue;
        if (!gitInfo.repository || !gitInfo.subdirectory || !gitInfo.commitHash)
          continue;

        const git = transaction.moveCall({
          target: `@mvr/metadata::git::new`,
          arguments: [
            transaction.pure.string(gitInfo.repository),
            transaction.pure.string(gitInfo.subdirectory),
            transaction.pure.string(gitInfo.commitHash),
          ],
        });
        transaction.moveCall({
          target: `@mvr/metadata::package_info::set_git_versioning`,
          arguments: [transaction.object(_id), transaction.pure.u64(v), git],
        });
      }

      return transaction;
    },
    [],
  );
  const getTransactionBase64 = useCallback(
    async (
      _id: string,
      _address: string,
      _upgradeCapId: string,
      _version: number,
      _versionGitInfoMap: Record<number, MvrGitInfo>,
    ) => {
      const transaction = getTransaction(
        _id,
        _address,
        _upgradeCapId,
        _version,
        _versionGitInfoMap,
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
    setVersionGitInfoMap({});
    setTransactionBase64("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  const submit = async () => {
    try {
      const transaction = getTransaction(
        id,
        address,
        upgradeCapId,
        version,
        versionGitInfoMap,
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

      toast.success("Updated package", {
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
      toast.error("Failed to update package", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  // On change
  const onVersionGitInfoMapChange = useCallback(
    async (_version: number, key: keyof MvrGitInfo, value: string) => {
      const _versionGitInfoMap = {
        ...versionGitInfoMap,
        [_version]: {
          ...versionGitInfoMap[_version],
          [key]: value,
        },
      };
      setVersionGitInfoMap(_versionGitInfoMap);

      if (!isMultisig) return;
      try {
        await debouncedGetTransactionBase64Ref.current(
          id,
          address,
          upgradeCapId,
          version,
          _versionGitInfoMap,
        );
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [versionGitInfoMap, isMultisig, id, address, upgradeCapId, version],
  );

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-max"
          labelClassName="uppercase"
          variant={hasMissingGitInfo ? "default" : "outline"}
          startIcon={<Box />}
        >
          {hasMissingGitInfo ? "Update" : "View"}
        </Button>
      }
      headerProps={{
        title: {
          icon: <Box />,
          children: `${hasMissingGitInfo ? "Update" : "View"} package`,
        },
      }}
      footerProps={{
        children: hasMissingGitInfo && (
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
              >
                Update
              </Button>
            )}
          </>
        ),
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Id */}
        <Input
          endDecoratorClassName="pointer-events-auto right-1"
          label="Id"
          id="id"
          value={id}
          onChange={() => {}}
          inputProps={{
            className: "pr-9 bg-transparent",
            readOnly: true,
          }}
          endDecorator={
            <OpenOnExplorerButton url={explorer.buildObjectUrl(id)} />
          }
        />

        {/* Package name */}
        <Input
          label="Name"
          id="packageName"
          value={packageName}
          onChange={() => {}}
          inputProps={{
            className: "bg-transparent",
            readOnly: true,
            style: {
              paddingLeft: `${3 * 4 + (organization.length + 1) * 8.4}px`,
            },
          }}
          startDecorator={
            <TBody className="text-muted-foreground">{organization}/</TBody>
          }
        />

        {/* Version Git Info Map */}
        <div className="flex w-full flex-col gap-2">
          <TLabelSans>Git repository info</TLabelSans>
          <div className="flex w-full flex-col gap-4 rounded-md border p-4">
            {Array.from({ length: version }, (_, i) => i + 1).map(
              (_version) => {
                const mvrPackageMetadataGitVersioningObj =
                  mvrPackageMetadataGitVersioningObjs.find(
                    (obj) =>
                      (obj.data?.content as any).fields.name ===
                      _version.toString(),
                  );

                if (!!mvrPackageMetadataGitVersioningObj) {
                  const repository = (
                    mvrPackageMetadataGitVersioningObj.data?.content as any
                  ).fields.value.fields.repository as string;
                  const path = (
                    mvrPackageMetadataGitVersioningObj.data?.content as any
                  ).fields.value.fields.path as string;
                  const tag = (
                    mvrPackageMetadataGitVersioningObj.data?.content as any
                  ).fields.value.fields.tag as string;

                  return (
                    <div
                      key={_version}
                      className="flex w-full flex-row items-end gap-2"
                    >
                      <div className="flex h-10 w-10 flex-row items-center justify-center rounded-md border bg-muted">
                        <TLabel className="text-sm text-background">
                          v{_version}
                        </TLabel>
                      </div>

                      <Input
                        className="flex-1"
                        label="Repository"
                        id={`version${_version}Repository`}
                        value={repository}
                        onChange={() => {}}
                        inputProps={{
                          className: "bg-transparent",
                          readOnly: true,
                        }}
                      />
                      <Input
                        className="flex-1"
                        label="Subdirectory"
                        id={`version${_version}Subdirectory`}
                        value={path}
                        onChange={() => {}}
                        inputProps={{
                          className: "bg-transparent",
                          readOnly: true,
                        }}
                      />
                      <Input
                        className="flex-1"
                        label="Commit hash"
                        id={`version${_version}CommitHash`}
                        value={tag}
                        onChange={() => {}}
                        inputProps={{
                          className: "bg-transparent",
                          readOnly: true,
                        }}
                      />
                    </div>
                  );
                } else
                  return (
                    <div
                      key={_version}
                      className="flex w-full flex-row items-end gap-2"
                    >
                      <div className="flex h-10 w-10 flex-row items-center justify-center rounded-md border bg-secondary">
                        <TLabel className="text-sm text-background">
                          v{_version}
                        </TLabel>
                      </div>

                      <Input
                        className="flex-1"
                        label={
                          <>
                            Repository <span className="text-red-500">*</span>
                          </>
                        }
                        id={`version${_version}Repository`}
                        value={
                          versionGitInfoMap[_version as number]?.[
                            "repository"
                          ] ?? ""
                        }
                        onChange={(value) =>
                          onVersionGitInfoMapChange(
                            _version,
                            "repository",
                            value,
                          )
                        }
                      />
                      <Input
                        className="flex-1"
                        label={
                          <>
                            Subdirectory <span className="text-red-500">*</span>
                          </>
                        }
                        id={`version${_version}Subdirectory`}
                        value={
                          versionGitInfoMap[_version as number]?.[
                            "subdirectory"
                          ] ?? ""
                        }
                        onChange={(value) =>
                          onVersionGitInfoMapChange(
                            _version,
                            "subdirectory",
                            value,
                          )
                        }
                      />
                      <Input
                        className="flex-1"
                        label={
                          <>
                            Commit hash <span className="text-red-500">*</span>
                          </>
                        }
                        id={`version${_version}CommitHash`}
                        value={
                          versionGitInfoMap[_version as number]?.[
                            "commitHash"
                          ] ?? ""
                        }
                        onChange={(value) =>
                          onVersionGitInfoMapChange(
                            _version,
                            "commitHash",
                            value,
                          )
                        }
                      />
                    </div>
                  );
              },
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-row gap-2">
            <Input
              className="flex-[3]"
              label="Description"
              id="metadataDescription"
              value={metadata.description ?? ""}
              onChange={() => {}}
              inputProps={{
                className: "bg-transparent",
                readOnly: true,
              }}
            />
            <Input
              className="flex-1"
              label="Contact"
              id="metadataContact"
              value={metadata.contact ?? ""}
              onChange={() => {}}
              inputProps={{
                className: "bg-transparent",
                readOnly: true,
              }}
            />
          </div>

          <div className="flex w-full flex-row gap-2">
            <Input
              className="flex-1"
              label="Icon URL"
              id="metadataIconUrl"
              value={metadata.iconUrl ?? ""}
              onChange={() => {}}
              inputProps={{
                className: "bg-transparent",
                readOnly: true,
              }}
            />
            <Input
              className="flex-1"
              label="Documentation URL"
              id="metadataDocumentationUrl"
              value={metadata.documentationUrl ?? ""}
              onChange={() => {}}
              inputProps={{
                className: "bg-transparent",
                readOnly: true,
              }}
            />
            <Input
              className="flex-1"
              label="Homepage URL"
              id="metadataHomepageUrl"
              value={metadata.homepageUrl ?? ""}
              onChange={() => {}}
              inputProps={{
                className: "bg-transparent",
                readOnly: true,
              }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
