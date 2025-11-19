import Head from "next/head";
import { useCallback, useState } from "react";

import { SuiObjectResponse } from "@mysten/sui/client";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";

import { formatId, getAllOwnedObjects } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import CreatePackageMetadataObjectDialog from "@/components/mvr/CreatePackageMetadataObjectDialog";
import PublishNewPackageDialog from "@/components/mvr/PublishNewPackageDialog";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import OpenURLButton from "@/components/shared/OpenURLButton";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";

export default function Multisig() {
  const { explorer, suiClient } = useSettingsContext();

  // Multisig address
  const [multisigAddress, setMultisigAddress] = useLocalStorage<string>(
    "multisigAddress",
    "",
  );

  // UpgradeCaps
  const [upgradeCapObjects, setUpgradeCapObjects] = useState<
    SuiObjectResponse[] | undefined
  >(undefined);
  const [mvrPackageMetadataObjects, setMvrPackageMetadataObjects] = useState<
    SuiObjectResponse[] | undefined
  >(undefined);

  const fetchUpgradeCaps = useCallback(async () => {
    try {
      if (multisigAddress === "") throw new Error("Enter a multisig address");

      const [upgradeCapObjs, mvrPackageMetadataObjs] = await Promise.all([
        getAllOwnedObjects(suiClient, multisigAddress, {
          StructType: "0x2::package::UpgradeCap",
        }),
        getAllOwnedObjects(suiClient, multisigAddress, {
          StructType:
            "0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::package_info::PackageInfo",
        }),
      ]);
      setUpgradeCapObjects(upgradeCapObjs);
      setMvrPackageMetadataObjects(mvrPackageMetadataObjs);
    } catch (err) {
      toast.error("Failed to fetch owned objects", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  }, [multisigAddress, suiClient]);

  return (
    <>
      <Head>
        <title>
          <TTitle>Multisig</TTitle>
        </title>
      </Head>

      <div className="flex w-full max-w-4xl flex-col gap-8">
        {/* Form */}
        <div className="flex w-full flex-row items-end gap-4">
          {/* Address */}
          <Input
            className="flex-1"
            id="multisig-address"
            label="Multisig address"
            value={multisigAddress}
            onChange={setMultisigAddress}
            inputProps={{
              autoFocus: true,
            }}
          />

          {/* CTA */}
          <Button
            className="w-max"
            labelClassName="uppercase"
            size="lg"
            onClick={fetchUpgradeCaps}
          >
            Fetch UpgradeCaps
          </Button>
        </div>

        {/* UpgradeCaps */}
        {upgradeCapObjects !== undefined &&
          mvrPackageMetadataObjects !== undefined && (
            <>
              <Separator />

              <div className="flex w-full flex-col gap-4">
                <PublishNewPackageDialog multisigAddress={multisigAddress} />

                <table className="w-full border">
                  <thead className="h-8 border-b">
                    <tr>
                      <td className="border-l px-2">
                        <TLabelSans>ID</TLabelSans>
                      </td>
                      <td className="border-l px-2">
                        <TLabelSans>Package ID</TLabelSans>
                      </td>
                      <td className="border-l px-2">
                        <TLabelSans>Version</TLabelSans>
                      </td>
                      <td className="border-l px-2">
                        <TLabelSans>Move Package Registry</TLabelSans>
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradeCapObjects.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No UpgradeCaps</td>
                      </tr>
                    ) : (
                      upgradeCapObjects.map((obj) => {
                        const id = obj.data?.objectId as string;
                        const { package: packageId, version } = (
                          obj.data?.content as any
                        ).fields;

                        const mvrPackageMetadataObj =
                          mvrPackageMetadataObjects.find(
                            (obj) =>
                              (obj.data?.content as any).fields
                                .upgrade_cap_id === id,
                          );
                        const mvrPackageMetadataId = mvrPackageMetadataObj?.data
                          ?.objectId as string | undefined;
                        const mvrPackageMetadataName = (
                          mvrPackageMetadataObj?.data?.content as any
                        )?.fields.metadata.fields.contents[0].fields.value;

                        return (
                          <tr key={id} className="h-8 border-b">
                            <td className="border-l px-2">
                              <div className="flex flex-row items-center gap-1">
                                <Tooltip title={id}>
                                  <TBody className="w-max uppercase">
                                    {formatId(id)}
                                  </TBody>
                                </Tooltip>

                                <OpenOnExplorerButton
                                  url={explorer.buildObjectUrl(id)}
                                />
                              </div>
                            </td>
                            <td className="border-l px-2">
                              <div className="flex flex-row items-center gap-1">
                                <Tooltip title={packageId}>
                                  <TBody className="w-max uppercase">
                                    {formatId(packageId)}
                                  </TBody>
                                </Tooltip>

                                <OpenOnExplorerButton
                                  url={explorer.buildPackageUrl(packageId)}
                                />
                              </div>
                            </td>
                            <td className="border-l px-2">
                              <TBody>{version}</TBody>
                            </td>
                            <td className="border-l px-2">
                              {mvrPackageMetadataObj ? (
                                <div className="flex flex-col gap-1 py-1">
                                  <div className="flex h-6 flex-row items-center gap-1">
                                    <Tooltip
                                      title={
                                        mvrPackageMetadataObj.data
                                          ?.objectId as string
                                      }
                                    >
                                      <TBody className="w-max uppercase">
                                        {formatId(
                                          mvrPackageMetadataId as string,
                                        )}
                                      </TBody>
                                    </Tooltip>

                                    <OpenOnExplorerButton
                                      url={explorer.buildObjectUrl(
                                        mvrPackageMetadataId as string,
                                      )}
                                    />
                                  </div>

                                  <div className="flex h-6 flex-row items-center gap-1">
                                    <TBody>{mvrPackageMetadataName}</TBody>

                                    <OpenURLButton
                                      url={`https://www.moveregistry.com/package/${mvrPackageMetadataName}`}
                                    >
                                      Open on Move Package Registry
                                    </OpenURLButton>
                                  </div>
                                </div>
                              ) : (
                                <CreatePackageMetadataObjectDialog
                                  multisigAddress={multisigAddress}
                                  upgradeCapId={id}
                                  version={version}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
      </div>
    </>
  );
}
