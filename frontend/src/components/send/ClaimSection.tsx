import Image from "next/image";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { capitalize } from "lodash";
import { toast } from "sonner";

import {
  NORMALIZED_BETA_SEND_COINTYPE,
  NORMALIZED_BETA_mSEND_COINTYPE,
  NORMALIZED_mSEND_COINTYPES,
  getBalanceChange,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import useCoinMetadataMap from "@suilend/frontend-sui-next/hooks/useCoinMetadataMap";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import TextLink from "@/components/shared/TextLink";
import { TBody, TDisplay } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { formatInteger, formatToken } from "@/lib/format";
import {
  burnSendPoints,
  burnSuilendCapsules,
  redeemMsendForSend,
} from "@/lib/send";
import {
  Allocation,
  AllocationId,
  SEND_TOTAL_SUPPLY,
  SuilendCapsuleRarity,
} from "@/pages/send";

interface ClaimSectionProps {
  allocations: Allocation[];
  isLoading: boolean;
  suilendCapsulesTotalAllocationBreakdownMap: Record<
    SuilendCapsuleRarity,
    { percent: BigNumber }
  >;
  userSendPoints: { owned: BigNumber; claimedMsend: BigNumber } | undefined;
  mutateUserSendPoints: () => Promise<void>;
  userSuilendCapsules:
    | {
        ownedMap: Record<SuilendCapsuleRarity, BigNumber>;
        claimedMsend: BigNumber;
      }
    | undefined;
  mutateUserSuilendCapsules: () => Promise<void>;
  userSend: { redeemedSend: BigNumber } | undefined;
  mutateUserSend: () => Promise<void>;
}

export default function ClaimSection({
  allocations,
  isLoading,
  suilendCapsulesTotalAllocationBreakdownMap,
  userSendPoints,
  mutateUserSendPoints,
  userSuilendCapsules,
  mutateUserSuilendCapsules,
  userSend,
  mutateUserSend,
}: ClaimSectionProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data, getBalance } = useLoadedAppContext();

  const mSendBalanceMap = NORMALIZED_mSEND_COINTYPES.reduce(
    (acc, coinType) => ({ ...acc, [coinType]: getBalance(coinType) }),
    {} as Record<string, BigNumber>,
  );

  const coinMetadataMap = useCoinMetadataMap([
    ...NORMALIZED_mSEND_COINTYPES,
    NORMALIZED_BETA_SEND_COINTYPE, // TODO
  ]);

  // const mSend3MBalance = getBalance(NORMALIZED_mSEND_3M_COINTYPE);
  // const mSend6MBalance = getBalance(NORMALIZED_mSEND_6M_COINTYPE);
  // const mSend12MBalance = getBalance(NORMALIZED_mSEND_12M_COINTYPE);

  // Burn SEND Points and Suilend Capsules
  const sendPointsAllocation = allocations.find(
    (a) => a.id === AllocationId.SEND_POINTS,
  ) as Allocation;
  const suilendCapsulesAllocation = allocations.find(
    (a) => a.id === AllocationId.SUILEND_CAPSULES,
  ) as Allocation;

  // const totalClaimableMsend = new BigNumber(
  //   new BigNumber(sendPointsAllocation.userAllocationPercent ?? 0)
  //     .times(SEND_TOTAL_SUPPLY)
  //     .div(100),
  // ).plus(
  //   ownedSuilendCapsulesMap
  //     ? Object.entries(ownedSuilendCapsulesMap).reduce(
  //         (acc, [key, value]) =>
  //           acc.plus(
  //             value.times(
  //               suilendCapsulesTotalAllocationBreakdownMap[
  //                 key as SuilendCapsuleRarity
  //               ].percent
  //                 .times(SEND_TOTAL_SUPPLY)
  //                 .div(100),
  //             ),
  //           ),
  //         new BigNumber(0),
  //       )
  //     : new BigNumber(0),
  // );

  // Burn SEND Points and Suilend Capsules for mSEND
  const onConvertClick = async () => {
    if (!address) return;
    if (userSendPoints === undefined || userSuilendCapsules === undefined)
      return;

    const coinMetadata = coinMetadataMap?.[NORMALIZED_BETA_mSEND_COINTYPE]; // TODO
    if (!coinMetadata) return undefined; // TODO

    const transaction = new Transaction();
    try {
      const ownedSendPoints = userSendPoints.owned;
      const ownedSuilendCapsules = Object.values(
        userSuilendCapsules.ownedMap,
      ).reduce((acc, val) => acc.plus(val), new BigNumber(0));

      if (ownedSendPoints.gt(0))
        await burnSendPoints(suilendClient, data, address, transaction);
      if (ownedSuilendCapsules.gt(0))
        await burnSuilendCapsules(suiClient, address, transaction);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_BETA_mSEND_COINTYPE, // TODO
        ...coinMetadata, // TODO
      });

      toast.success(
        [
          "Converted",
          [
            ownedSendPoints.gt(0)
              ? `${formatToken(ownedSendPoints, { exact: false })} SEND Points`
              : undefined,
            ownedSuilendCapsules.gt(0)
              ? `${formatInteger(+ownedSuilendCapsules)} Suilend Capsules`
              : undefined,
          ]
            .filter(Boolean)
            .join(" and "),
          "to",
          balanceChange !== undefined
            ? `${formatToken(balanceChange, { dp: coinMetadata.decimals })} mSEND`
            : "mSEND",
        ].join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error(
        "Failed to convert SEND Points and/or Suilend Capsules to mSEND",
        { description: (err as Error)?.message || "An unknown error occurred" },
      );
    } finally {
      await mutateUserSendPoints();
      await mutateUserSuilendCapsules();
    }
  };

  // Redeem mSEND for SEND
  const onClaimSendClick = async () => {
    if (!address) return;

    const coinMetadata = coinMetadataMap?.[NORMALIZED_BETA_SEND_COINTYPE]; // TODO
    if (!coinMetadata) return undefined;

    const transaction = new Transaction();
    try {
      await redeemMsendForSend(suiClient, address, transaction);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_BETA_SEND_COINTYPE, // TODO
        ...coinMetadata,
      });

      toast.success(
        [
          "Claimed",
          balanceChange !== undefined
            ? `${formatToken(balanceChange, { dp: coinMetadata.decimals })} SEND`
            : "SEND",
        ].join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to claim SEND", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await mutateUserSend();
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-12 py-16 md:gap-16 md:py-20">
      <SectionHeading id="claim-section-heading">Claim SEND</SectionHeading>

      {/* Convert */}
      {isLoading ? (
        <Skeleton className="h-16 w-80" />
      ) : (
        (sendPointsAllocation.userAllocationPercent?.gt(0) ||
          sendPointsAllocation.userAllocationPercent?.gt(0)) && (
          <div className="-mt-8 flex w-full max-w-[560px] flex-col items-center gap-6">
            <TDisplay className="text-3xl uppercase">Convert</TDisplay>

            <div className="flex w-full flex-col gap-4 rounded-md border p-4">
              {/* SEND Points */}
              {sendPointsAllocation.userAllocationPercent?.gt(0) && (
                <div className="flex w-full flex-row items-center justify-between gap-4">
                  <div className="flex flex-row items-center gap-3">
                    <Image
                      src={sendPointsAllocation.src}
                      alt="SEND Points"
                      width={28}
                      height={28}
                    />
                    <TBody className="text-[16px]">
                      {formatToken(userSendPoints!.owned as BigNumber)} SEND
                      Points
                    </TBody>
                  </div>

                  <div className="flex flex-row items-center gap-1.5">
                    {/* TODO: mSEND */}
                    <SendTokenLogo />
                    <TBody className="text-[16px]">
                      {formatToken(
                        sendPointsAllocation.userAllocationPercent
                          .times(SEND_TOTAL_SUPPLY)
                          .div(100),
                        { exact: false },
                      )}
                    </TBody>
                  </div>
                </div>
              )}

              {sendPointsAllocation.userAllocationPercent?.gt(0) &&
                suilendCapsulesAllocation.userAllocationPercent?.gt(0) && (
                  <Separator />
                )}

              {/* Suilend Capsules */}
              {suilendCapsulesAllocation.userAllocationPercent?.gt(0) &&
                Object.entries(userSuilendCapsules!.ownedMap)
                  .filter(([key, value]) => value.gt(0))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex w-full flex-row items-center justify-between gap-4"
                    >
                      <div className="flex flex-row items-center gap-3">
                        <Image
                          src={suilendCapsulesAllocation.src}
                          alt="Suilend Capsules"
                          width={28}
                          height={28}
                        />
                        <TBody className="text-[16px]">
                          {formatInteger(+value)} {capitalize(key)} Suilend
                          Capsule{!value.eq(1) && "s"}
                        </TBody>
                      </div>

                      <div className="flex flex-row items-center gap-1.5">
                        {/* TODO: mSEND */}
                        <SendTokenLogo />
                        <TBody className="text-[16px]">
                          {formatToken(
                            value.times(
                              suilendCapsulesTotalAllocationBreakdownMap[
                                key as SuilendCapsuleRarity
                              ].percent
                                .times(SEND_TOTAL_SUPPLY)
                                .div(100),
                            ),
                            { exact: false },
                          )}
                        </TBody>
                      </div>
                    </div>
                  ))}
            </div>

            <Button
              className="h-12 w-full"
              labelClassName="text-[16px]"
              size="lg"
              onClick={onConvertClick}
            >
              CONVERT TO mSEND
            </Button>
          </div>
        )
      )}

      <div className="flex flex-col gap-4 rounded-md border px-4 py-3">
        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND in wallet:{" "}
            {formatToken(mSendBalanceMap[NORMALIZED_BETA_mSEND_COINTYPE], {
              exact: false, // TODO
            })}
          </TBody>
          <Button labelClassName="uppercase" onClick={onClaimSendClick}>
            Claim SEND
          </Button>
        </div>

        <div className="flex flex-row items-center gap-8">
          <TBody>Claimed SEND:</TBody>

          {userSend === undefined ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <TBody>
              {formatToken(userSend.redeemedSend ?? new BigNumber(0), {
                exact: false,
              })}
            </TBody>
          )}
        </div>
      </div>
    </div>
  );
}
