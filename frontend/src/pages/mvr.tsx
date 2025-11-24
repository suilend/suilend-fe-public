import Head from "next/head";
import Image from "next/image";
import { useCallback, useState } from "react";

import { SuiObjectResponse } from "@mysten/sui/client";
import { Check } from "lucide-react";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";

import { formatId, getAllOwnedObjects } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import CreatePackageMetadataObjectDialog from "@/components/mvr/CreatePackageMetadataObjectDialog";
import PublishPackageDialog from "@/components/mvr/PublishPackageDialog";
import ViewPackageMetadataObjectDialog from "@/components/mvr/ViewPackageMetadataObjectDialog";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import OpenURLButton from "@/components/shared/OpenURLButton";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

function Page() {
  const { explorer, suiClient } = useSettingsContext();

  const { data: session } = useSession();

  // Address
  const [address, setAddress] = useLocalStorage<string>("mvr_address", "");

  // Multisig
  const [isMultisig, setIsMultisig] = useLocalStorage<boolean>(
    "mvr_isMultisig",
    false,
  );

  // Owned objects
  const [upgradeCapObjs, setUpgradeCapObjs] = useState<
    SuiObjectResponse[] | undefined
  >(undefined);
  const [mvrPackageMetadataObjs, setMvrPackageMetadataObjs] = useState<
    SuiObjectResponse[] | undefined
  >(undefined);
  const [
    mvrPackageMetadataGitVersioningObjsMap,
    setMvrPackageMetadataGitVersioningObjsMap,
  ] = useState<Record<string, SuiObjectResponse[]>>({});
  const [suinsDomainObjs, setSuinsDomainObjs] = useState<
    SuiObjectResponse[] | undefined
  >(undefined);

  const fetchOwnedObjects = useCallback(async () => {
    try {
      const [_upgradeCapObjs, _mvrPackageMetadataObjs, _suinsDomainObjs] =
        await Promise.all([
          getAllOwnedObjects(suiClient, address, {
            StructType: "0x2::package::UpgradeCap",
          }),
          getAllOwnedObjects(suiClient, address, {
            StructType:
              "0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::package_info::PackageInfo",
          }),
          getAllOwnedObjects(suiClient, address, {
            StructType:
              "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::suins_registration::SuinsRegistration",
          }),
        ]);

      const _mvrPackageMetadataGitVersioningObjsMap: Record<
        string,
        SuiObjectResponse[]
      > = {};
      for (const obj of _mvrPackageMetadataObjs) {
        const mvrPackageMetadataObjId = obj.data?.objectId as string;

        // Git versioning
        if (!_mvrPackageMetadataGitVersioningObjsMap[mvrPackageMetadataObjId])
          _mvrPackageMetadataGitVersioningObjsMap[mvrPackageMetadataObjId] = [];

        const gitVersioningObjId = (obj.data?.content as any).fields
          .git_versioning.fields.id.id;
        const gitVersioningObj = await suiClient.getDynamicFields({
          parentId: gitVersioningObjId,
        });

        const gitVersioningObjEntryIds = gitVersioningObj.data.map(
          (d) => d.objectId,
        );
        const gitVersioningObjEntryObjs = await suiClient.multiGetObjects({
          ids: gitVersioningObjEntryIds,
          options: {
            showContent: true,
          },
        });
        _mvrPackageMetadataGitVersioningObjsMap[mvrPackageMetadataObjId].push(
          ...gitVersioningObjEntryObjs,
        );
      }

      setUpgradeCapObjs(_upgradeCapObjs);
      setMvrPackageMetadataObjs(_mvrPackageMetadataObjs);
      setMvrPackageMetadataGitVersioningObjsMap(
        _mvrPackageMetadataGitVersioningObjsMap,
      );
      setSuinsDomainObjs(_suinsDomainObjs);
    } catch (err) {
      toast.error("Failed to fetch UpgradeCaps", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  }, [address, suiClient]);

  return (
    <>
      <Head>
        <title>MVR</title>
      </Head>

      <div className="flex w-full max-w-4xl flex-col gap-8">
        {/* Form */}
        <div className="flex w-full flex-col gap-6">
          {/* Content */}
          <div className="flex w-full flex-row items-end gap-4">
            {/* GitHub */}
            <div className="flex w-max flex-col gap-2">
              <TLabelSans>
                GitHub
                {!!session && ` (${session.user?.email})`}
              </TLabelSans>

              <div className="flex h-10 w-max flex-row items-center">
                <Button
                  className="w-max bg-white hover:bg-white/90"
                  labelClassName="uppercase !text-black"
                  size="lg"
                  startIcon={
                    <Image
                      src="/github-mark.svg"
                      alt="GitHub"
                      width={16}
                      height={16}
                    />
                  }
                  onClick={() => (!session ? signIn("github") : signOut())}
                >
                  {!session ? "Sign in" : "Sign out"}
                </Button>
              </div>
            </div>

            {/* Address */}
            <Input
              className="flex-1"
              id="address"
              label="Address"
              value={address}
              onChange={setAddress}
              inputProps={{
                autoFocus: true,
              }}
            />

            {/* Multisig */}
            <button
              className="flex h-10 w-max flex-row items-center gap-2"
              onClick={() => setIsMultisig((is) => !is)}
            >
              <div
                className={cn(
                  "flex h-5 w-5 flex-row items-center justify-center rounded-sm border border-muted-foreground",
                  isMultisig && "border-primary bg-primary",
                )}
              >
                {isMultisig && <Check className="h-4 w-4 text-foreground" />}
              </div>
              <TBodySans
                className={cn(
                  isMultisig ? "text-foreground" : "text-muted-foreground",
                )}
              >
                Multisig
              </TBodySans>
            </button>
          </div>

          {/* CTAs */}
          <div className="flex w-full flex-row items-center gap-3">
            {/* Publish Package */}
            <PublishPackageDialog
              address={address}
              isMultisig={isMultisig}
              refresh={fetchOwnedObjects}
            />

            {/* Fetch UpgradeCaps */}
            <Button
              className="w-max"
              labelClassName="uppercase"
              variant="secondary"
              onClick={fetchOwnedObjects}
              disabled={!address}
            >
              Fetch UpgradeCaps
            </Button>
          </div>
        </div>

        {/* UpgradeCaps */}
        {upgradeCapObjs !== undefined &&
          mvrPackageMetadataObjs !== undefined &&
          suinsDomainObjs !== undefined && (
            <div className="flex w-full flex-col gap-2">
              <TLabelSans>UpgradeCaps</TLabelSans>

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
                  {upgradeCapObjs.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No UpgradeCaps</td>
                    </tr>
                  ) : (
                    upgradeCapObjs.map((obj) => {
                      const id = obj.data?.objectId as string;
                      const { package: packageId, version } = (
                        obj.data?.content as any
                      ).fields;

                      const mvrPackageMetadataObj = mvrPackageMetadataObjs.find(
                        (obj) =>
                          (obj.data?.content as any).fields.upgrade_cap_id ===
                          id,
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
                            <div className="flex flex-row items-center gap-2 py-1">
                              <TBody>{version}</TBody>
                              {/* <PublishPackageDialog /> */}
                            </div>
                          </td>
                          <td className="border-l px-2">
                            {!!mvrPackageMetadataObj ? (
                              <div className="flex flex-row items-center gap-2 py-1">
                                <ViewPackageMetadataObjectDialog
                                  address={address}
                                  isMultisig={isMultisig}
                                  upgradeCapId={id}
                                  version={version}
                                  refresh={fetchOwnedObjects}
                                  mvrPackageMetadataObj={mvrPackageMetadataObj}
                                  mvrPackageMetadataGitVersioningObjs={
                                    mvrPackageMetadataGitVersioningObjsMap[
                                      mvrPackageMetadataId as string
                                    ]
                                  }
                                />

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
                                suinsDomainObjs={suinsDomainObjs}
                                address={address}
                                isMultisig={isMultisig}
                                upgradeCapId={id}
                                version={version}
                                refresh={fetchOwnedObjects}
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
          )}
      </div>
    </>
  );
}

export default function MVR() {
  return (
    <SessionProvider>
      <Page />
    </SessionProvider>
  );
}
