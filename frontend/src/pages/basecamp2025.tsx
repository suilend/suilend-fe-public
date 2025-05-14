import { useRouter } from "next/router";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useFlags } from "launchdarkly-react-client-sdk";
import { Droplet, Flame } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
  showErrorToast,
  useLocalStorage,
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
import { ASSETS_URL, TX_TOAST_DURATION } from "@/lib/constants";
import { SUILEND_URL } from "@/lib/navigation";
import { getOwnedObjectsOfType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

enum QueryParams {
  DEV_MODE = "dev",
}

const BASECAMP_2025_NFT_REGISTRY_OBJECT_ID =
  "0xf78982d5ee345026220d092c48bbde1151fb65538357032e5f24f82d6761c40a";
const BASECAMP_2025_NFT_PACKAGE_ID =
  "0xc441dac0335300ee0c37280f5daad227cbe86b3ad59b428e486cb6a981f43c1a";

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

  // State
  const isInDevMode = queryParams[QueryParams.DEV_MODE] === "true";

  const [hasMintedBasecamp2025Nft, setHasMintedBasecamp2025Nft] =
    useLocalStorage<boolean>("hasMintedBasecamp2025Nft", false);
  const [hasBurnedRootSauceNft, setHasBurnedRootSauceNft] =
    useLocalStorage<boolean>("hasBurnedRootSauceNft", false);

  const xForWebsitesScriptId = useRef<string>(uuidv4()).current;

  // Location
  const [isLocationValid, setIsLocationValid] = useState<boolean | undefined>(
    true,
  );

  const isFetchingLocationRef = useRef<boolean>(false);
  useEffect(() => {
    if (isFetchingLocationRef.current) return;
    isFetchingLocationRef.current = true;

    setIsLocationValid(true);
  }, [isInDevMode]);

  // Dates
  const isComingSoon = Date.now() < 1746043200000 && !isInDevMode; // 1 May 00:00 (GMT+4)
  const isOver = Date.now() >= 1746302400000 && !isInDevMode; // 4 May 00:00 (GMT+4)

  // Flags
  const flags = useFlags();
  const isRootSauceNftBurningEnabled: boolean | undefined = useMemo(
    () => flags?.suilendBasecamp2025RootSauceEnableBurning,
    [flags?.suilendBasecamp2025RootSauceEnableBurning],
  );

  // Owned objects
  // Owned objects - Basecamp 2025 NFT
  const [ownedBasecamp2025NftObjectsMap, setOwnedBasecamp2025NftObjectsMap] =
    useState<Record<string, SuiObjectResponse[]>>({});

  const fetchOwnedBasecamp2025NftObjectsMap = useCallback(
    async (_address: string) => {
      console.log("Fetching ownedBasecamp2025NftObjectsMap", _address);

      try {
        const objs = await getOwnedObjectsOfType(
          suiClient,
          _address,
          `${BASECAMP_2025_NFT_PACKAGE_ID}::suilend_basecamp_nft::SuilendBasecampNft`,
        );

        setOwnedBasecamp2025NftObjectsMap((prev) => ({
          ...prev,
          [_address]: objs,
        }));
        console.log("Fetched ownedBasecamp2025NftObjectsMap", _address, objs);
      } catch (err) {
        console.error("Failed to fetch ownedBasecamp2025NftObjectsMap", err);
      }
    },
    [suiClient],
  );

  const isFetchingOwnedBasecamp2025NftObjectsMapRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (isFetchingOwnedBasecamp2025NftObjectsMapRef.current.includes(address))
      return;
    isFetchingOwnedBasecamp2025NftObjectsMapRef.current.push(address);

    fetchOwnedBasecamp2025NftObjectsMap(address);
  }, [address, fetchOwnedBasecamp2025NftObjectsMap]);

  const ownedBasecamp2025NftObjectIds = useMemo(
    () =>
      address === undefined ||
      ownedBasecamp2025NftObjectsMap[address] === undefined
        ? undefined
        : ownedBasecamp2025NftObjectsMap[address].map(
            (obj) => obj.data?.objectId as string,
          ),
    [ownedBasecamp2025NftObjectsMap, address],
  );

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

  // Actions
  // Actions - Basecamp 2025 NFT
  const [isMintingBasecamp2025Nft, setIsMintingBasecamp2025Nft] =
    useState<boolean>(false);

  const mintBasecamp2025Nft = async () => {
    if (
      !isLocationValid ||
      !address ||
      ownedBasecamp2025NftObjectIds === undefined ||
      ownedBasecamp2025NftObjectIds.length > 0
    )
      return;
    if (isMintingBasecamp2025Nft) return;

    setIsMintingBasecamp2025Nft(true);

    const transaction = new Transaction();

    try {
      transaction.moveCall({
        target: `${BASECAMP_2025_NFT_PACKAGE_ID}::suilend_basecamp_nft::new`,
        arguments: [transaction.object(BASECAMP_2025_NFT_REGISTRY_OBJECT_ID)],
      });

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Minted Basecamp 2025 NFT", {
        classNames: {
          toast: "border-primary border-[2px]",
        },
        description:
          "Make sure to use this NFT to pick up SEND merch at Booth P4",
        action: (
          <TextLink
            className="block text-muted-foreground decoration-muted-foreground/50"
            href={txUrl}
          >
            View tx on {explorer.name}
          </TextLink>
        ),
        icon: <Droplet className="h-5 w-5 text-primary" />,
        duration: TX_TOAST_DURATION,
      });

      setHasMintedBasecamp2025Nft(true);
    } catch (err) {
      showErrorToast(
        "Failed to mint Basecamp 2025 NFT",
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsMintingBasecamp2025Nft(false);
      fetchOwnedBasecamp2025NftObjectsMap(address);
    }
  };

  // Actions - Root Sauce NFT
  const [isBurningRootSauceNft, setIsBurningRootSauceNft] =
    useState<boolean>(false);

  const burnRootSauceNft = async () => {
    if (
      !isLocationValid ||
      !address ||
      ownedRootSauceNftObjectIds === undefined ||
      ownedRootSauceNftObjectIds.length === 0
    )
      return;
    if (isBurningRootSauceNft) return;

    setIsBurningRootSauceNft(true);

    const transaction = new Transaction();

    try {
      const objId = ownedRootSauceNftObjectIds[0]; // Burn one NFT at a time

      transaction.moveCall({
        target: `${ROOT_SAUCE_NFT_PACKAGE_ID}::rootlets_basecamp_nft::destroy`,
        arguments: [transaction.object(objId)],
      });

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Burned Root Sauce NFT", {
        classNames: {
          toast: "border-[#EA4630] border-[2px]",
        },
        description:
          "Don't forget to show this burn confirmation at Booth P4 to redeem your Root Sauce!",
        action: (
          <TextLink
            className="block text-muted-foreground decoration-muted-foreground/50"
            href={txUrl}
          >
            View tx on {explorer.name}
          </TextLink>
        ),
        icon: <Flame className="h-5 w-5 text-[#EA4630]" />,
        duration: 10 * 60 * 60 * 1000, // 10 hours
      });

      setHasBurnedRootSauceNft(true);
    } catch (err) {
      showErrorToast(
        "Failed to burn Root Sauce NFT",
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsBurningRootSauceNft(false);
      fetchOwnedRootSauceNftObjectsMap(address);
    }
  };

  return (
    <>
      <Script id={xForWebsitesScriptId}>
        {`window.twttr = (function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0],
    t = window.twttr || {};
  if (d.getElementById(id)) return t;
  js = d.createElement(s);
  js.id = id;
  js.src = "https://platform.twitter.com/widgets.js";
  fjs.parentNode.insertBefore(js, fjs);

  t._e = [];
  t.ready = function(f) {
    t._e.push(f);
  };

  return t;
}(document, "script", "twitter-wjs-${xForWebsitesScriptId}"));`}
      </Script>

      <div className="flex w-full flex-col gap-8 py-4 md:flex-row md:items-stretch md:gap-10">
        {/* Mint */}
        <div className="flex flex-col items-center gap-8 md:flex-1">
          <TDisplay className="text-center text-4xl uppercase md:text-5xl">
            Basecamp 2025 NFT
          </TDisplay>

          <TBodySans className="max-w-lg text-center leading-5 text-foreground/80">
            {
              "As Sui's leading DeFi protocol, Suilend is proud to be a Platinum Sponsor for Sui Basecamp 2025 Dubai."
            }
            <br />
            <br />
            {
              "Mint our Basecamp 2025 Commemorative NFT to celebrate your time in Dubai! Use this NFT to pick up SEND merch and qualify for a chance at exclusive prizes!"
            }
          </TBodySans>

          <video
            className="w-full max-w-[320px] border border-white/25 bg-muted/10"
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

          <div className="flex flex-col items-center gap-3">
            <Button
              className={cn(
                "h-14 w-[260px]",
                !isLocationValid ||
                  !address ||
                  ownedBasecamp2025NftObjectIds === undefined ||
                  ownedBasecamp2025NftObjectIds.length > 0
                  ? "disabled:opacity-50"
                  : "disabled:opacity-100",
              )}
              labelClassName="text-wrap uppercase"
              disabled={
                isMintingBasecamp2025Nft ||
                isComingSoon ||
                isOver ||
                !isLocationValid ||
                !address ||
                ownedBasecamp2025NftObjectIds === undefined ||
                ownedBasecamp2025NftObjectIds.length > 0
              }
              onClick={mintBasecamp2025Nft}
            >
              {isMintingBasecamp2025Nft ? (
                <Spinner size="md" />
              ) : (
                <>
                  {isComingSoon
                    ? "Coming soon"
                    : isOver
                      ? "Mint finished"
                      : "Mint Basecamp 2025 NFT"}
                </>
              )}
            </Button>

            <TLabelSans>
              {ownedBasecamp2025NftObjectIds?.length ?? 0} Basecamp 2025 NFT
              {(ownedBasecamp2025NftObjectIds?.length ?? 0) !== 1 && "s"} in
              wallet
            </TLabelSans>

            <div
              className={cn(
                "w-max rounded-[100px] border border-white/25",
                !hasMintedBasecamp2025Nft &&
                  "-mt-3 h-0 overflow-hidden opacity-0",
              )}
            >
              <a
                className="twitter-share-button"
                href={`https://twitter.com/intent/tweet?${new URLSearchParams({
                  text: `Just minted my Basecamp 2025 NFT!

SEND IT @suilendprotocol!`,
                  url: `${SUILEND_URL}/basecamp2025`,
                })}`}
                data-size="large"
                data-lang="en"
              >
                Tweet
              </a>
            </div>
          </div>
        </div>

        <div className="w-full bg-border max-md:h-px md:w-px" />

        {/* Burn */}
        <div className="flex flex-col items-center gap-8 md:flex-1">
          <TDisplay className="text-center text-4xl uppercase md:text-5xl">
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
            className="w-full max-w-[320px] border border-white/25 bg-muted/10"
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
                isBurningRootSauceNft ||
                isComingSoon ||
                isOver ||
                !isRootSauceNftBurningEnabled ||
                !isLocationValid ||
                !address ||
                ownedRootSauceNftObjectIds === undefined ||
                ownedRootSauceNftObjectIds.length === 0
              }
              onClick={burnRootSauceNft}
            >
              {isBurningRootSauceNft ? (
                <Spinner size="md" />
              ) : (
                <>
                  {isComingSoon
                    ? "Coming soon"
                    : isOver
                      ? "Burn finished"
                      : !isRootSauceNftBurningEnabled
                        ? "Out of Root Sauce"
                        : "Burn Root Sauce NFT"}
                </>
              )}
            </Button>

            <TLabelSans>
              {ownedRootSauceNftObjectIds?.length ?? 0} Root Sauce NFT
              {(ownedRootSauceNftObjectIds?.length ?? 0) !== 1 && "s"} in wallet
            </TLabelSans>

            <div
              className={cn(
                "w-max rounded-[100px] border border-white/25",
                !hasBurnedRootSauceNft && "-mt-3 h-0 overflow-hidden opacity-0",
              )}
            >
              <a
                className="twitter-share-button"
                href={`https://twitter.com/intent/tweet?${new URLSearchParams({
                  text: `Just burned my Root Sauce NFT!

Get ready, let's r🐽t @rootlets_nft!`,
                  url: `${SUILEND_URL}/basecamp2025`,
                })}`}
                data-size="large"
                data-lang="en"
              >
                Tweet
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
