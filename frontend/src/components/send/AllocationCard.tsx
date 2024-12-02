import Link from "next/link";
import { PropsWithChildren, useMemo, useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { ArrowUpRight, Info } from "lucide-react";
import { toast } from "sonner";

import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import styles from "@/components/send/AllocationCard.module.scss";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TDisplay } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import useBreakpoint from "@/hooks/useBreakpoint";
import { formatToken } from "@/lib/format";
import { cn, hoverUnderlineClassName } from "@/lib/utils";
import {
  Allocation,
  AllocationId,
  AssetType,
  SEND_TOTAL_SUPPLY,
  getOwnedObjectsOfType,
} from "@/pages/send";

// TODO: Replace all of these with the beta values for testing
const BURN_CONTRACT_PACKAGE_ID =
  "0x849200bd9b89b283ded0492ac745a2c743368307581b44f9aa46a2096d6c0f1f"; // TODO (this package id only works on testnet)
const NORMALIZED_mSEND_COINTYPE = normalizeStructTag(
  "0xe60ed7e38b3eddd64d98250c495b813ab0d089b216920c5fcf15a55920626a87::m_send_test::M_SEND_TEST", // TODO (this coinType works on testnet)
);

const NORMALIZED_SEND_POINTS_COINTYPE = normalizeStructTag(
  "0x34fe4f3c9e450fed4d0a3c587ed842eec5313c30c3cc3c0841247c49425e246b::suilend_point::SUILEND_POINT", // TODO (this is the real SEND Points cointype)
);
const POINTS_MANAGER_OBJECT_ID =
  "0x6ac4bdd0505e1834cd4906f72c32b021b3e57057d31e2fa8f20a0a3d7cf56344"; // TODO (this object id only works on testnet)

const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule"; // TODO (this is the real Suilend Capsule type)
const CAPSULE_MANAGER_OBJECT_ID =
  "0xce349f8dc4ed79382d0bfa71d315e5f852491a3e4884deb428c06ed2b19ce0e7"; // TODO (this object id only works on testnet)

interface StatusProps {
  allocation: Allocation;
  mSendClaimedAmount?: BigNumber;
  isEligible?: boolean;
  isNotEligible?: boolean;
}

function Status({
  allocation,
  mSendClaimedAmount,
  isEligible,
  isNotEligible,
}: StatusProps) {
  return (
    <div
      className={cn(
        "relative z-[1] -mb-2 flex h-11 w-full flex-row items-center rounded-t-md px-4 pb-2",
        mSendClaimedAmount !== undefined || isEligible
          ? "justify-between bg-[#5DF886]"
          : cn(
              "justify-center",
              !allocation.snapshotTaken ? "bg-[#8FDCF4]" : "bg-[#192A3A]",
            ),
      )}
    >
      {mSendClaimedAmount !== undefined || isEligible ? (
        <>
          <TBody className="text-[#030917]">
            {mSendClaimedAmount !== undefined
              ? "mSEND CLAIMED"
              : allocation.id === AllocationId.SAVE
                ? "mSEND BRIDGED"
                : "ELIGIBLE"}
          </TBody>
          <div className="flex flex-row items-center gap-1.5">
            <SendTokenLogo />
            <Tooltip
              title={
                mSendClaimedAmount !== undefined
                  ? undefined
                  : allocation.id === AllocationId.SEND_POINTS
                    ? "Allocation is an estimate since SEND Points are still ongoing"
                    : [
                          AllocationId.FUD,
                          AllocationId.AAA,
                          AllocationId.OCTO,
                          AllocationId.TISM,
                        ].includes(allocation.id)
                      ? "Allocation is an estimate since the final snapshot has not been taken yet"
                      : undefined
              }
            >
              <TBody
                className={cn(
                  "text-[16px] text-[#030917]",
                  mSendClaimedAmount !== undefined
                    ? undefined
                    : cn("decoration-[#030917]/50", hoverUnderlineClassName),
                )}
              >
                {formatToken(
                  mSendClaimedAmount !== undefined
                    ? mSendClaimedAmount
                    : new BigNumber(SEND_TOTAL_SUPPLY).times(
                        allocation.userAllocationPercent!.div(100),
                      ),
                  { exact: false },
                )}
                {mSendClaimedAmount !== undefined
                  ? undefined
                  : [
                      AllocationId.SEND_POINTS,
                      AllocationId.FUD,
                      AllocationId.AAA,
                      AllocationId.OCTO,
                      AllocationId.TISM,
                    ].includes(allocation.id) && "*"}
              </TBody>
            </Tooltip>
          </div>
        </>
      ) : (
        <TBody
          className={cn(
            "uppercase",
            !allocation.snapshotTaken ? "text-[#030917]" : "text-[#8FDCF4]",
          )}
        >
          {!allocation.snapshotTaken
            ? "Snapshot not taken"
            : isNotEligible
              ? "Not eligible"
              : "Snapshot taken"}
        </TBody>
      )}
    </div>
  );
}

interface CtaButtonProps {
  allocation: Allocation;
  mSendClaimedAmount?: BigNumber;
}

function CtaButton({ allocation, mSendClaimedAmount }: CtaButtonProps) {
  const { suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  const showSendPointsSuilendCapsulesClaimMsendCta = true;

  const claimMsend = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!address) return;

    if (allocation.id === AllocationId.SEND_POINTS) {
      // TOOD: Claim points

      const transaction = new Transaction();
      try {
        // Merge coins
        const coins = (
          await suiClient.getCoins({
            owner: address,
            coinType: NORMALIZED_SEND_POINTS_COINTYPE,
          })
        ).data;

        const mergeCoin = coins[0];
        if (coins.length > 1) {
          transaction.mergeCoins(
            transaction.object(mergeCoin.coinObjectId),
            coins.map((c) => transaction.object(c.coinObjectId)).slice(1),
          );
        }

        // Burn points
        const mSend = transaction.moveCall({
          target: `${BURN_CONTRACT_PACKAGE_ID}::points::burn_points`,
          typeArguments: [NORMALIZED_mSEND_COINTYPE],
          arguments: [
            transaction.object(POINTS_MANAGER_OBJECT_ID),
            transaction.object(mergeCoin.coinObjectId),
          ],
        });

        // Transfer mSEND to user
        transaction.transferObjects([mSend], transaction.pure.address(address));

        await signExecuteAndWaitForTransaction(transaction);

        toast.success("Converted SEND Points to mSEND");
      } catch (err) {
        toast.error("Failed to convert SEND Points to mSEND", {
          description: (err as Error)?.message || "An unknown error occurred",
        });
      }
    } else {
      // Get capsules owned by user
      const objs = await getOwnedObjectsOfType(
        suiClient,
        address,
        SUILEND_CAPSULE_TYPE,
      );

      const transaction = new Transaction();
      try {
        const mSendCoins = [];

        for (const obj of objs) {
          // Burn capsule
          const mSendCoin = transaction.moveCall({
            target: `${BURN_CONTRACT_PACKAGE_ID}::capsule::burn_capsule`,
            typeArguments: [NORMALIZED_mSEND_COINTYPE],
            arguments: [
              transaction.object(CAPSULE_MANAGER_OBJECT_ID),
              transaction.object(obj.data?.objectId as string),
            ],
          });

          mSendCoins.push(mSendCoin);
        }

        // Merge mSEND coins
        const mergeCoin = mSendCoins[0];
        if (mSendCoins.length > 1) {
          transaction.mergeCoins(
            transaction.object(mergeCoin),
            mSendCoins.map((c) => transaction.object(c)).slice(1),
          );
        }

        // Transfer merged mSEND to user
        transaction.transferObjects(
          [mergeCoin],
          transaction.pure.address(address),
        );

        await signExecuteAndWaitForTransaction(transaction);

        toast.success("Converted Suilend Capsules to mSEND");
      } catch (err) {
        toast.error("Failed to convert Suilend Capsules to mSEND", {
          description: (err as Error)?.message || "An unknown error occurred",
        });
      }
    }
  };

  if (
    [AllocationId.SEND_POINTS, AllocationId.SUILEND_CAPSULES].includes(
      allocation.id,
    ) &&
    showSendPointsSuilendCapsulesClaimMsendCta &&
    address
  ) {
    if (mSendClaimedAmount === undefined)
      return (
        <Button
          className="h-10 w-full"
          labelClassName="text-[16px]"
          onClick={claimMsend}
        >
          CLAIM mSEND
        </Button>
      );
    return <div className="h-10 w-full max-sm:hidden" />;
  }
  return allocation.cta !== undefined && !allocation.snapshotTaken ? (
    <Link
      className="flex"
      target="_blank"
      href={allocation.cta.href}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Button
        className="h-10 w-full border-secondary text-primary-foreground"
        labelClassName="uppercase text-[16px]"
        endIcon={<ArrowUpRight className="h-4 w-4" />}
        variant="secondaryOutline"
      >
        {allocation.cta.title}
      </Button>
    </Link>
  ) : (
    <div className="h-10 w-full max-sm:hidden" />
  );
}

function Wrapper({ children }: PropsWithChildren) {
  const { sm } = useBreakpoint();

  return sm ? (
    <AspectRatio ratio={280 / 396}>{children}</AspectRatio>
  ) : (
    <div className="h-[320px] w-full">{children}</div>
  );
}

interface AllocationCardProps {
  allocation: Allocation;
}

export default function AllocationCard({ allocation }: AllocationCardProps) {
  // State
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const assetTypeTitleMap: Record<AssetType, string> = {
    [AssetType.LENDING]: "Lending",
    [AssetType.NFT]: "NFT",
    [AssetType.TOKEN]: "Token",
    [AssetType.TRADING]: "Trading",
    [AssetType.POINTS]: "Points",
  };

  // Video
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onCardMouseEnter = () => {
    setIsVideoPlaying(true);

    if (!videoRef.current) return;
    videoRef.current.play();
  };
  const onCardMouseLeave = () => {
    setIsVideoPlaying(false);

    setTimeout(() => {
      if (!videoRef.current) return;
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }, 300);
  };

  // Status
  const mSendClaimedAmount = useMemo(() => {
    if (allocation.userAllocationPercent === undefined) return undefined;

    if (allocation.id === AllocationId.SEND_POINTS) {
      if (allocation.userAllocationPercent.eq(0)) {
        // TODO: Get how much mSEND the user has claimed (it's also possible the user simply has 0 SEND Points and never claimed mSEND)
        return undefined;
      } else {
        // Allocation > 0 means the user has outstanding SEND Points to burn - don't show how much mSEND they've claimed
        return undefined;
      }
    } else if (allocation.id === AllocationId.SUILEND_CAPSULES) {
      if (allocation.userAllocationPercent.eq(0)) {
        // TODO: Get how much mSEND the user has claimed (it's also possible the user simply has no Suilend Capsules and never claimed mSEND)
        return undefined;
      } else {
        // Allocation > 0 means the user has outstanding Suilend Capsules to burn - don't show how much mSEND they've claimed
        return undefined;
      }
    }

    return undefined;
  }, [allocation.userAllocationPercent, allocation.id]);

  const isEligible = useMemo(
    () => allocation.userAllocationPercent?.gt(0),
    [allocation.userAllocationPercent],
  );
  const isNotEligible = useMemo(
    () => allocation.snapshotTaken && allocation.userAllocationPercent?.eq(0),
    [allocation.snapshotTaken, allocation.userAllocationPercent],
  );

  return (
    <Wrapper>
      <button
        className={cn(
          "group h-full w-full text-left",
          isFlipped && styles.flipped,
        )}
        onClick={() => setIsFlipped((is) => !is)}
        onMouseEnter={onCardMouseEnter}
        onMouseLeave={onCardMouseLeave}
        onTouchStart={onCardMouseEnter}
        onTouchEnd={onCardMouseLeave}
        style={{ perspective: "1000px" }}
      >
        <div className={cn("relative h-full w-full", styles.cardInner)}>
          {/* Front */}
          <div className={cn(styles.front, "absolute inset-0 flex flex-col")}>
            <Status
              allocation={allocation}
              mSendClaimedAmount={mSendClaimedAmount}
              isEligible={isEligible}
              isNotEligible={isNotEligible}
            />

            <div className="relative z-[2] flex flex-1 flex-col rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-secondary/25">
              {/* Top */}
              <div className="relative flex flex-1 flex-row items-center justify-center rounded-t-md bg-[#030917]">
                {/* Total allocation */}
                <div className="absolute left-4 top-4 z-[2] flex h-7 flex-row items-center gap-1.5 rounded-sm bg-[#202639] px-2">
                  <SendTokenLogo />
                  <TBody className="text-[16px]">
                    {formatToken(
                      new BigNumber(SEND_TOTAL_SUPPLY).times(
                        allocation.totalAllocationPercent.div(100),
                      ),
                      { exact: false },
                    )}
                  </TBody>
                </div>

                {/* Info */}
                <div className="flex-column absolute right-4 top-4 z-[2] flex h-7 justify-center">
                  <Info className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>

                {/* Image/video */}
                <div className="absolute inset-y-0 left-1/2 z-[1] flex w-full max-w-28 -translate-x-1/2 flex-row items-center justify-center">
                  {/* Image */}
                  <div
                    className="absolute inset-0 z-[1]"
                    style={{
                      backgroundImage: `url('${allocation.src}')`,
                      backgroundPosition: "center",
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                    }}
                  />

                  {/* Video */}
                  {allocation.hoverSrc && (
                    <video
                      ref={videoRef}
                      className={cn(
                        "relative z-[2] h-full w-full transition-opacity",
                        isVideoPlaying ? "opacity-100" : "opacity-0",
                      )}
                      controls={false}
                      loop
                      muted
                      playsInline
                      disablePictureInPicture
                      disableRemotePlayback
                    >
                      <source src={allocation.hoverSrc} type="video/mp4" />
                    </video>
                  )}
                </div>
              </div>

              <Separator className="bg-[#192A3A]" />

              {/* Bottom */}
              <div className="flex w-full flex-col gap-4 p-4">
                <div className="flex w-full flex-col gap-1">
                  <TDisplay className="uppercase">{allocation.title}</TDisplay>

                  {allocation.assetType && (
                    <TBodySans className="text-muted-foreground">
                      {assetTypeTitleMap[allocation.assetType]}
                    </TBodySans>
                  )}
                </div>

                <CtaButton
                  allocation={allocation}
                  mSendClaimedAmount={mSendClaimedAmount}
                />
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              styles.back,
              "absolute inset-0 rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-secondary/25",
            )}
          >
            <div className="flex h-full w-full flex-col justify-between gap-6 overflow-y-auto p-4">
              {/* Top */}
              <div className="flex w-full flex-col gap-3">
                {/* Title */}
                <TDisplay className="uppercase">{allocation.title}</TDisplay>

                {/* Description */}
                <TBodySans className="text-muted-foreground">
                  {allocation.description}
                </TBodySans>
              </div>

              {/* Bottom */}
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full flex-col gap-2">
                  <LabelWithValue
                    labelClassName="text-sm"
                    label="Total allocation"
                    valueClassName="gap-1.5 items-center"
                    valueStartDecorator={<SendTokenLogo />}
                    value={formatToken(
                      new BigNumber(SEND_TOTAL_SUPPLY).times(
                        allocation.totalAllocationPercent.div(100),
                      ),
                      { exact: false },
                    )}
                    horizontal
                  />
                  {allocation.totalAllocationBreakdown.map((breakdown) => (
                    <LabelWithValue
                      key={breakdown.title}
                      labelClassName="text-sm pl-1 items-center gap-2"
                      labelStartDecorator={
                        <div className="h-1 w-1 rounded-[50%] bg-muted" />
                      }
                      label={breakdown.title}
                      valueClassName="gap-1.5 items-center"
                      valueStartDecorator={<SendTokenLogo />}
                      value={formatToken(
                        new BigNumber(SEND_TOTAL_SUPPLY).times(
                          breakdown.percent.div(100),
                        ),
                        { exact: false },
                      )}
                      horizontal
                    />
                  ))}
                </div>

                {allocation.eligibleWallets !== undefined && (
                  <>
                    <Separator className="bg-[#192A3A]" />
                    <LabelWithValue
                      labelClassName="text-sm"
                      label="Eligible wallets"
                      valueClassName="uppercase"
                      value={allocation.eligibleWallets}
                      horizontal
                    />
                  </>
                )}

                <Separator className="bg-[#192A3A]" />
                <LabelWithValue
                  labelClassName="text-sm"
                  label="Snapshot"
                  valueClassName="uppercase"
                  value={allocation.snapshotTaken ? "Taken" : "Not taken"}
                  horizontal
                />
              </div>
            </div>
          </div>
        </div>
      </button>
    </Wrapper>
  );
}
