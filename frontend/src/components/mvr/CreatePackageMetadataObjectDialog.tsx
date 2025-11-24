import { useCallback, useEffect, useRef, useState } from "react";

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
import StandardSelect from "@/components/shared/StandardSelect";
import TextLink from "@/components/shared/TextLink";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import {
  MVR_REGISTRY_OBJECT_ID,
  MvrGitInfo,
  MvrMetadata,
  MvrOrganization,
} from "@/lib/mvr";

interface CreatePackageMetadataObjectDialogProps {
  suinsDomainObjs: SuiObjectResponse[];
  address: string;
  isMultisig: boolean;
  upgradeCapId: string;
  version: number;
  refresh: () => Promise<void>;
}
export default function CreatePackageMetadataObjectDialog({
  suinsDomainObjs,
  address,
  isMultisig,
  upgradeCapId,
  version,
  refresh,
}: CreatePackageMetadataObjectDialogProps) {
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

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [suinsDomainObjId, setSuinsDomainObjId] = useState<string | undefined>(
    undefined,
  );
  const getOrganizationObj = useCallback(
    (_suinsDomainObjId: string | undefined): MvrOrganization | undefined => {
      if (!_suinsDomainObjId) return undefined;

      const suinsDomainObj = suinsDomainObjs.find(
        (obj) => obj.data?.objectId === _suinsDomainObjId,
      );
      if (!suinsDomainObj) throw new Error("Suins domain object not found");

      return {
        suinsDomainObjId: _suinsDomainObjId,
        name: `@${(suinsDomainObj.data?.content as any).fields?.domain_name
          .split(".")
          .slice(0, -1)
          .join(".")}`,
      };
    },
    [suinsDomainObjs],
  );
  useEffect(() => {
    if (isDialogOpen) {
      if (suinsDomainObjs.length > 0 && !suinsDomainObjId)
        setSuinsDomainObjId(suinsDomainObjs[0].data?.objectId as string);
    }
  }, [isDialogOpen, suinsDomainObjs, suinsDomainObjId]);

  const [packageName, setPackageName] = useState<string>("");
  const [versionGitInfoMap, setVersionGitInfoMap] = useState<
    Record<number, MvrGitInfo>
  >({});
  const [metadata, setMetadata] = useState<MvrMetadata>({});

  // Transaction
  const [transactionBase64, setTransactionBase64] = useState<string>("");

  const getTransaction = useCallback(
    (
      _address: string,
      _upgradeCapId: string,
      _version: number,
      _organizationObj: MvrOrganization | undefined,
      _packageName: string,
      _versionGitInfoMap: Record<number, MvrGitInfo>,
      _metadata: MvrMetadata,
    ) => {
      if (!_organizationObj) throw new Error("Missing organization");
      if (!_packageName) throw new Error("Missing package name");

      const transaction = new Transaction();
      transaction.setSender(_address);

      // 1) Publish
      // PackageInfo
      const packageInfo = transaction.moveCall({
        target: `@mvr/metadata::package_info::new`,
        arguments: [transaction.object(_upgradeCapId)],
      });
      const display = transaction.moveCall({
        target: `@mvr/metadata::display::default`,
        arguments: [transaction.pure.string(_packageName)],
      });
      transaction.moveCall({
        target: `@mvr/metadata::package_info::set_display`,
        arguments: [transaction.object(packageInfo), display],
      });
      transaction.moveCall({
        target: "@mvr/metadata::package_info::set_metadata",
        arguments: [
          transaction.object(packageInfo),
          transaction.pure.string("default"),
          transaction.pure.string(`${_organizationObj.name}/${_packageName}`),
        ],
      });

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
          arguments: [
            transaction.object(packageInfo),
            transaction.pure.u64(v),
            git,
          ],
        });
      }

      // Create application
      const appCap = transaction.moveCall({
        target: `@mvr/core::move_registry::register`,
        arguments: [
          transaction.object(MVR_REGISTRY_OBJECT_ID),
          transaction.object(_organizationObj.suinsDomainObjId),
          transaction.pure.string(_packageName),
          transaction.object.clock(),
        ],
      });

      if (_metadata.description)
        transaction.moveCall({
          target: `@mvr/core::move_registry::set_metadata`,
          arguments: [
            transaction.object(MVR_REGISTRY_OBJECT_ID),
            appCap,
            transaction.pure.string("description"),
            transaction.pure.string(_metadata.description),
          ],
        });
      if (_metadata.iconUrl)
        transaction.moveCall({
          target: `@mvr/core::move_registry::set_metadata`,
          arguments: [
            transaction.object(MVR_REGISTRY_OBJECT_ID),
            appCap,
            transaction.pure.string("icon_url"),
            transaction.pure.string(_metadata.iconUrl),
          ],
        });
      if (_metadata.documentationUrl)
        transaction.moveCall({
          target: `@mvr/core::move_registry::set_metadata`,
          arguments: [
            transaction.object(MVR_REGISTRY_OBJECT_ID),
            appCap,
            transaction.pure.string("documentation_url"),
            transaction.pure.string(_metadata.documentationUrl),
          ],
        });
      if (_metadata.homepageUrl)
        transaction.moveCall({
          target: `@mvr/core::move_registry::set_metadata`,
          arguments: [
            transaction.object(MVR_REGISTRY_OBJECT_ID),
            appCap,
            transaction.pure.string("homepage_url"),
            transaction.pure.string(_metadata.homepageUrl),
          ],
        });
      if (_metadata.contact)
        transaction.moveCall({
          target: `@mvr/core::move_registry::set_metadata`,
          arguments: [
            transaction.object(MVR_REGISTRY_OBJECT_ID),
            appCap,
            transaction.pure.string("contact"),
            transaction.pure.string(_metadata.contact),
          ],
        });

      transaction.moveCall({
        target: `@mvr/core::move_registry::assign_package`,
        arguments: [
          transaction.object(MVR_REGISTRY_OBJECT_ID),
          transaction.object(appCap),
          transaction.object(packageInfo),
        ],
      });

      transaction.moveCall({
        target: `@mvr/metadata::package_info::transfer`,
        arguments: [
          transaction.object(packageInfo),
          transaction.pure.address(_address),
        ],
      });
      transaction.transferObjects([appCap], transaction.pure.address(_address));

      return transaction;
    },
    [],
  );
  const getTransactionBase64 = useCallback(
    async (
      _address: string,
      _upgradeCapId: string,
      _version: number,
      _organizationObj: MvrOrganization | undefined,
      _packageName: string,
      _versionGitInfoMap: Record<number, MvrGitInfo>,
      _metadata: MvrMetadata,
    ) => {
      const transaction = getTransaction(
        _address,
        _upgradeCapId,
        _version,
        _organizationObj,
        _packageName,
        _versionGitInfoMap,
        _metadata,
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
    setSuinsDomainObjId(undefined);
    setPackageName("");
    setVersionGitInfoMap({});
    setMetadata({});
    setTransactionBase64("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  const submit = async () => {
    try {
      const transaction = getTransaction(
        address,
        upgradeCapId,
        version,
        getOrganizationObj(suinsDomainObjId),
        packageName,
        versionGitInfoMap,
        metadata,
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

      toast.success("Registered package", {
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
  const onSuinsDomainObjIdChange = useCallback(
    async (_suinsDomainObjId: string) => {
      setSuinsDomainObjId(_suinsDomainObjId);

      if (!isMultisig) return;
      try {
        await debouncedGetTransactionBase64Ref.current(
          address,
          upgradeCapId,
          version,
          getOrganizationObj(_suinsDomainObjId),
          packageName,
          versionGitInfoMap,
          metadata,
        );
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [
      isMultisig,
      address,
      upgradeCapId,
      version,
      getOrganizationObj,
      packageName,
      versionGitInfoMap,
      metadata,
    ],
  );
  const onPackageNameChange = useCallback(
    async (_packageName: string) => {
      setPackageName(_packageName);

      if (!isMultisig) return;
      try {
        await debouncedGetTransactionBase64Ref.current(
          address,
          upgradeCapId,
          version,
          getOrganizationObj(suinsDomainObjId),
          _packageName,
          versionGitInfoMap,
          metadata,
        );
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [
      isMultisig,
      address,
      upgradeCapId,
      version,
      getOrganizationObj,
      suinsDomainObjId,
      versionGitInfoMap,
      metadata,
    ],
  );
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
          address,
          upgradeCapId,
          version,
          getOrganizationObj(suinsDomainObjId),
          packageName,
          _versionGitInfoMap,
          metadata,
        );
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [
      versionGitInfoMap,
      isMultisig,
      address,
      upgradeCapId,
      version,
      getOrganizationObj,
      suinsDomainObjId,
      packageName,
      metadata,
    ],
  );
  const onMetadataChange = useCallback(
    async (key: keyof MvrMetadata, value: string) => {
      const _metadata = {
        ...metadata,
        [key]: value,
      };
      setMetadata(_metadata);

      if (!isMultisig) return;
      try {
        await debouncedGetTransactionBase64Ref.current(
          address,
          upgradeCapId,
          version,
          getOrganizationObj(suinsDomainObjId),
          packageName,
          versionGitInfoMap,
          _metadata,
        );
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [
      isMultisig,
      address,
      upgradeCapId,
      version,
      getOrganizationObj,
      suinsDomainObjId,
      packageName,
      versionGitInfoMap,
      metadata,
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
          startIcon={<Box />}
          disabled={suinsDomainObjs.length === 0}
        >
          Register
        </Button>
      }
      headerProps={{
        title: { icon: <Box />, children: "Register package" },
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
                    rows={4}
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
                Register
              </Button>
            )}
          </>
        ),
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Form */}
        <div className="flex w-full flex-col gap-4">
          {/* Suins domain */}
          <div className="flex w-full flex-col gap-2">
            <TLabelSans>
              Organization <span className="text-red-500">*</span>
            </TLabelSans>
            <StandardSelect
              viewportClassName="p-2"
              itemClassName="font-mono text-sm h-10"
              triggerClassName="font-mono rounded-md h-10 bg-background !text-foreground"
              items={suinsDomainObjs.map((suinsDomainObj) => {
                const id = suinsDomainObj.data?.objectId as string;

                return {
                  id,
                  name: getOrganizationObj(id)?.name ?? "",
                };
              })}
              value={suinsDomainObjId}
              onChange={onSuinsDomainObjIdChange}
            />
          </div>

          {/* Package name */}
          <Input
            label={
              <>
                Name <span className="text-red-500">*</span>
              </>
            }
            id="packageName"
            value={packageName}
            onChange={onPackageNameChange}
            inputProps={{
              autoFocus: true,
              style: {
                paddingLeft: `${3 * 4 + ((getOrganizationObj(suinsDomainObjId)?.name ?? "").length + 1) * 8.4}px`,
              },
            }}
            startDecorator={
              <TBody className="text-muted-foreground">
                {getOrganizationObj(suinsDomainObjId)?.name ?? ""}/
              </TBody>
            }
          />

          {/* Version Git Info Map */}
          <div className="flex w-full flex-col gap-2">
            <TLabelSans>Git repository info</TLabelSans>
            <div className="flex w-full flex-col gap-4 rounded-md border p-4">
              {Array.from({ length: version }, (_, i) => i + 1).map(
                (_version) => (
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
                        versionGitInfoMap[_version as number]?.["repository"] ??
                        ""
                      }
                      onChange={(value) =>
                        onVersionGitInfoMapChange(_version, "repository", value)
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
                        versionGitInfoMap[_version as number]?.["commitHash"] ??
                        ""
                      }
                      onChange={(value) =>
                        onVersionGitInfoMapChange(_version, "commitHash", value)
                      }
                    />
                  </div>
                ),
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
                onChange={(value) => onMetadataChange("description", value)}
              />
              <Input
                className="flex-1"
                label="Contact"
                id="metadataContact"
                value={metadata.contact ?? ""}
                onChange={(value) => onMetadataChange("contact", value)}
              />
            </div>

            <div className="flex w-full flex-row gap-2">
              <Input
                className="flex-1"
                label="Icon URL"
                id="metadataIconUrl"
                value={metadata.iconUrl ?? ""}
                onChange={(value) => onMetadataChange("iconUrl", value)}
              />
              <Input
                className="flex-1"
                label="Documentation URL"
                id="metadataDocumentationUrl"
                value={metadata.documentationUrl ?? ""}
                onChange={(value) =>
                  onMetadataChange("documentationUrl", value)
                }
              />
              <Input
                className="flex-1"
                label="Homepage URL"
                id="metadataHomepageUrl"
                value={metadata.homepageUrl ?? ""}
                onChange={(value) => onMetadataChange("homepageUrl", value)}
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
