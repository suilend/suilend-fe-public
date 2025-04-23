import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Flame } from "lucide-react";
import { toast } from "sonner";

import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import {
  TBodySans,
  TDisplay,
  TLabelSans,
} from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSETS_URL, TX_TOAST_DURATION } from "@/lib/constants";
import { getOwnedObjectsOfType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

enum QueryParams {
  DEV_MODE = "dev-mode",
}

const ROOT_SAUCE_NFT_PACKAGE_ID =
  "0x87ae5da8393dcbdcd584eee6e6703e57d3c67ff7eecb40415f7bf9114138bb88";

export default function Basecamp2025() {
  const router = useRouter();
  const queryParams = {
    [QueryParams.DEV_MODE]: router.query[QueryParams.DEV_MODE] as
      | string
      | undefined,
  };

  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  const isInDevMode = queryParams[QueryParams.DEV_MODE] === "true";

  // Owned objects
  // Owned objects - Root Sauce NFT
  const [ownedRootSauceNftObjectsMap, setOwnedRootSauceNftObjectsMap] =
    useState<Record<string, SuiObjectResponse[]>>({});

  const fetchOwnedRootSauceNftObjectsMap = useCallback(
    async (_address: string) => {
      console.log("Fetching ownedRootSauceNftObjectsMap", _address);

      try {
        const objs = await getOwnedObjectsOfType(
          suiClient,
          _address,
          `${ROOT_SAUCE_NFT_PACKAGE_ID}::rootlets_basecamp_nft::RootletsBasecampNft`,
        );

        setOwnedRootSauceNftObjectsMap((prev) => ({
          ...prev,
          [_address]: objs,
        }));
        console.log("Fetched ownedRootSauceNftObjectsMap", _address, objs);
      } catch (err) {
        console.error("Failed to fetch ownedRootSauceNftObjectsMap", err);
      }
    },
    [suiClient],
  );

  const isFetchingOwnedRootSauceNftObjectsMapRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (isFetchingOwnedRootSauceNftObjectsMapRef.current.includes(address))
      return;
    isFetchingOwnedRootSauceNftObjectsMapRef.current.push(address);

    fetchOwnedRootSauceNftObjectsMap(address);
  }, [address, fetchOwnedRootSauceNftObjectsMap]);

  const ownedRootSauceNftObjectIds = useMemo(
    () =>
      address === undefined ||
      ownedRootSauceNftObjectsMap[address] === undefined
        ? undefined
        : ownedRootSauceNftObjectsMap[address].map(
            (obj) => obj.data?.objectId as string,
          ),
    [ownedRootSauceNftObjectsMap, address],
  );

  // Location
  const [isLocationValid, setIsLocationValid] = useState<boolean | undefined>(
    undefined,
  );

  const isFetchingLocationRef = useRef<boolean>(false);
  useEffect(() => {
    if (isFetchingLocationRef.current) return;
    isFetchingLocationRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/ip-address-country");
        if (!res.ok) throw new Error("Request failed");

        const json = await res.json();
        const code = json?.country?.code;
        setIsLocationValid(code === "AE" || isInDevMode);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isInDevMode]);

  const isComingSoon = Date.now() < 1746043200000 && !isInDevMode; // 1 May 00:00 (GMT+4)
  const isOver =
    Date.now() >= 1746043200000 + 3 * 24 * 60 * 1000 && !isInDevMode; // 4 May 00:00 (GMT+4)

  // Actions
  // Actions - Basecamp NFT
  const mintBasecampNft = async () => {};

  // Actions - Root Sauce NFT
  const [isBurningNft, setIsBurningNft] = useState<boolean>(false);

  const burnRootSauceNft = async () => {
    if (
      !isLocationValid ||
      !address ||
      ownedRootSauceNftObjectIds === undefined ||
      ownedRootSauceNftObjectIds.length === 0
    )
      return;
    if (isBurningNft) return;

    setIsBurningNft(true);

    const transaction = new Transaction();

    try {
      const objId = ownedRootSauceNftObjectIds[0]; // Burn one NFT at a time

      // transaction.moveCall({
      //   target: `${ROOT_SAUCE_NFT_PACKAGE_ID}::rootlets_basecamp_nft::destroy`,
      //   arguments: [transaction.object(objId)],
      // });

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Burned Root Sauce NFT", {
        description:
          "Don't forget to redeem your Root Sauce at the SEND booth!",
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        icon: <Flame className="h-5 w-5 text-[#EA4630]" />,
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      showErrorToast(
        "Failed to burn Root Sauce NFT",
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsBurningNft(false);
      fetchOwnedRootSauceNftObjectsMap(address);
    }
  };

  return (
    <div className="flex w-full flex-col gap-8 py-4 md:flex-row md:items-stretch md:gap-10">
      {/* Mint */}
      <div className="flex flex-col items-center gap-8 md:flex-1">
        <TDisplay className="text-center text-4xl md:text-5xl">
          Sui Basecamp NFT
        </TDisplay>

        <TBodySans className="max-w-lg text-center leading-5 text-foreground/80">
          {
            "As Sui's leading DeFi protocol, Suilend is proud to be a Platinum Sponsor for Sui Basecamp 2025 Dubai."
          }
          <br />
          <br />
          {
            "Mint our Basecamp 2025 Commemorative NFT to celebrate your time in Dubai! Use this NFT to qualify for a chance at exclusive prizes!"
          }
        </TBodySans>

        <video
          className="w-full max-w-[320px] border border-white/50 bg-muted/10"
          autoPlay
          loop
          muted
          playsInline
          style={{ aspectRatio: "1/1" }}
        >
          <source
            src={`${ASSETS_URL}/basecamp2025/Basecamp_NFT.mp4`}
            type="video/mp4"
          />
        </video>

        {isLocationValid === undefined ? (
          <Skeleton className="h-14 w-[260px]" />
        ) : (
          <Button
            className={cn(
              "h-14 w-[260px]",
              isLocationValid === false
                ? "disabled:opacity-50"
                : "disabled:opacity-100",
            )}
            labelClassName="text-wrap uppercase"
            disabled={isLocationValid === false || isComingSoon || isOver}
            onClick={mintBasecampNft}
          >
            {isComingSoon
              ? "Coming soon"
              : isOver
                ? "Mint finished"
                : "Mint Basecamp NFT"}
          </Button>
        )}
      </div>

      <div className="w-full bg-border max-md:h-px md:w-px" />

      {/* Burn */}
      <div className="flex flex-col items-center gap-8 md:flex-1">
        <TDisplay className="text-center text-4xl md:text-5xl">
          Root Sauce NFT
        </TDisplay>

        <TBodySans className="max-w-lg text-center leading-5 text-foreground/80">
          {
            "Spice up your Basecamp experience with a Limited Edition Basecamp Root Sauce. Only 100 of these limited edition bottles exist!"
          }
          <br />
          <br />
          {
            "One Limited Edition Root Sauce NFT has been airdropped to every wallet owning a Rootlet. Burn this NFT to redeem a physical bottle of root sauce."
          }
        </TBodySans>

        <video
          className="w-full max-w-[320px] bg-muted/10"
          autoPlay
          loop
          muted
          playsInline
          style={{ aspectRatio: "1/1" }}
        >
          <source
            src={`${ASSETS_URL}/basecamp2025/Basecamp_Root_Sauce_NFT.mp4`}
            type="video/mp4"
          />
        </video>

        <div className="flex flex-col items-center gap-3">
          <Button
            className={cn(
              "h-14 w-[260px] bg-[#EA4630] text-white hover:bg-[#EA3430]",
              !isLocationValid ||
                !address ||
                ownedRootSauceNftObjectIds === undefined ||
                ownedRootSauceNftObjectIds.length === 0
                ? "disabled:opacity-50"
                : "disabled:opacity-100",
            )}
            labelClassName="text-wrap uppercase"
            disabled={
              isBurningNft ||
              isComingSoon ||
              isOver ||
              !isLocationValid ||
              !address ||
              ownedRootSauceNftObjectIds === undefined ||
              ownedRootSauceNftObjectIds.length === 0
            }
            onClick={burnRootSauceNft}
          >
            {isBurningNft ? (
              <Spinner size="md" />
            ) : (
              <>
                {isComingSoon
                  ? "Coming soon"
                  : isOver
                    ? "Burn finished"
                    : "Burn Root Sauce NFT"}
              </>
            )}
          </Button>

          <TLabelSans>
            {ownedRootSauceNftObjectIds?.length ?? 0} Root Sauce NFT
            {(ownedRootSauceNftObjectIds?.length ?? 0) !== 1 && "s"} in wallet
          </TLabelSans>
        </div>
      </div>
    </div>
  );
}
