import { useCallback, useEffect, useRef, useState } from "react";

import { Transaction, namedPackagesPlugin } from "@mysten/sui/transactions";
import { DebouncedFunc, debounce } from "lodash";
import { Box } from "lucide-react";

import { useSettingsContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import { TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import {
  MVR_REGISTRY_OBJECT_ID,
  MvrGitInfo,
  MvrMetadata,
  SUILEND_SUINS_OBJECT_ID,
} from "@/lib/mvr";

interface CreatePackageMetadataObjectDialogProps {
  multisigAddress: string;
  upgradeCapId: string;
  version: number;
}
export default function CreatePackageMetadataObjectDialog({
  multisigAddress,
  upgradeCapId,
  version,
}: CreatePackageMetadataObjectDialogProps) {
  const { suiClient } = useSettingsContext();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [packageName, setPackageName] = useState<string>("");
  const [versionGitInfoMap, setVersionGitInfoMap] = useState<
    Record<number, MvrGitInfo>
  >({});
  const [metadata, setMetadata] = useState<MvrMetadata>({});
  const [transactionJSON, setTransactionJSON] = useState<string>("");

  const getTransactionJSON = useCallback(
    async (
      _multisigAddress: string,
      _upgradeCapId: string,
      _version: number,
      _packageName: string,
      _versionGitInfoMap: Record<number, MvrGitInfo>,
      _metadata: MvrMetadata,
    ) => {
      // 1) Publish
      const transaction = new Transaction();
      transaction.setSender(_multisigAddress);

      const mainnetPlugin = namedPackagesPlugin({
        url: "https://mainnet.mvr.mystenlabs.com",
      });
      transaction.addSerializationPlugin(mainnetPlugin);

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
          transaction.pure.string(`@suilend/${_packageName}`),
        ],
      });

      // GitInfo
      for (let v = 1; v <= _version; v++) {
        const gitInfo = _versionGitInfoMap[v];
        if (!gitInfo) continue;

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
          transaction.object(SUILEND_SUINS_OBJECT_ID),
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
          transaction.object(
            `0x0e5d473a055b6b7d014af557a13ad9075157fdc19b6d51562a18511afd397727`,
          ),
          transaction.object(appCap),
          transaction.object(packageInfo),
        ],
      });

      const json = await transaction.toJSON({ client: suiClient });
      setTransactionJSON(json);
    },
    [],
  );
  const debouncedGetTransactionJSONRef = useRef<
    DebouncedFunc<typeof getTransactionJSON>
  >(debounce(getTransactionJSON, 100));

  const onPackageNameChange = useCallback(
    (_packageName: string) => {
      setPackageName(_packageName);
      debouncedGetTransactionJSONRef.current(
        multisigAddress,
        upgradeCapId,
        version,
        _packageName,
        versionGitInfoMap,
        metadata,
      );
    },
    [multisigAddress, upgradeCapId, version, versionGitInfoMap, metadata],
  );
  const onVersionGitInfoMapChange = useCallback(
    (_version: number, key: keyof MvrGitInfo, value: string) => {
      const _versionGitInfoMap = {
        ...versionGitInfoMap,
        [_version]: {
          ...versionGitInfoMap[_version],
          [key]: value,
        },
      };

      setVersionGitInfoMap(_versionGitInfoMap);
      debouncedGetTransactionJSONRef.current(
        multisigAddress,
        upgradeCapId,
        version,
        packageName,
        _versionGitInfoMap,
        metadata,
      );
    },
    [
      multisigAddress,
      upgradeCapId,
      version,
      packageName,
      versionGitInfoMap,
      metadata,
    ],
  );
  const onMetadataChange = useCallback(
    (key: keyof MvrMetadata, value: string) => {
      const _metadata = {
        ...metadata,
        [key]: value,
      };
      setMetadata(_metadata);
      debouncedGetTransactionJSONRef.current(
        multisigAddress,
        upgradeCapId,
        version,
        packageName,
        versionGitInfoMap,
        _metadata,
      );
    },
    [
      multisigAddress,
      upgradeCapId,
      version,
      packageName,
      versionGitInfoMap,
      metadata,
    ],
  );

  // Reset
  const reset = useCallback(() => {
    setPackageName("");
    setVersionGitInfoMap({});
    setMetadata({});
    setTransactionJSON("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-max"
          labelClassName="uppercase"
          variant="secondary"
          startIcon={<Box />}
        >
          Register
        </Button>
      }
      headerProps={{
        title: { icon: <Box />, children: "Register package" },
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Form */}
        <div className="flex w-full flex-col gap-4">
          {/* Package name */}
          <Input
            className="w-full"
            label={
              <>
                Package name <span className="text-red-500">*</span>
              </>
            }
            id="packageName"
            value={packageName}
            onChange={onPackageNameChange}
            inputProps={{ autoFocus: true }}
          />

          {/* Version Git Info Map */}
          {Array.from({ length: version }, (_, i) => i + 1).map((version) => (
            <div key={version} className="flex w-full flex-row items-end gap-2">
              <div className="flex h-10 flex-row items-center">
                <TLabelSans className="pr-2">v{version}</TLabelSans>
              </div>

              <Input
                className="flex-1"
                label={
                  <>
                    Repository <span className="text-red-500">*</span>
                  </>
                }
                id={`version${version}Repository`}
                value={
                  versionGitInfoMap[version as number]?.["repository"] ?? ""
                }
                onChange={(value) =>
                  onVersionGitInfoMapChange(version, "repository", value)
                }
              />
              <Input
                className="flex-1"
                label={
                  <>
                    Subdirectory <span className="text-red-500">*</span>
                  </>
                }
                id={`version${version}Subdirectory`}
                value={
                  versionGitInfoMap[version as number]?.["subdirectory"] ?? ""
                }
                onChange={(value) =>
                  onVersionGitInfoMapChange(version, "subdirectory", value)
                }
              />
              <Input
                className="flex-1"
                label={
                  <>
                    Commit hash <span className="text-red-500">*</span>
                  </>
                }
                id={`version${version}CommitHash`}
                value={
                  versionGitInfoMap[version as number]?.["commitHash"] ?? ""
                }
                onChange={(value) =>
                  onVersionGitInfoMapChange(version, "commitHash", value)
                }
              />
            </div>
          ))}

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

        <Separator />

        {/* Transaction JSON */}
        <div className="flex w-full flex-col gap-2">
          <TLabelSans>Transaction JSON</TLabelSans>
          <textarea
            id="transactionJSON"
            className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={transactionJSON}
            readOnly
            rows={16}
          />
        </div>
      </div>
    </Dialog>
  );
}
