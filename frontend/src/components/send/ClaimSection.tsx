import Image from "next/image";
import { Fragment } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { capitalize } from "lodash";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import { TBody, TDisplay } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatInteger, formatToken } from "@/lib/format";
import {
  Allocation,
  AllocationId,
  NORMALIZED_mSEND_12_MONTHS_COINTYPE,
  NORMALIZED_mSEND_3_MONTHS_COINTYPE,
  NORMALIZED_mSEND_6_MONTHS_COINTYPE,
  SEND_TOTAL_SUPPLY,
  SuilendCapsuleRarity,
  mSEND_MANAGER_OBJECT_ID,
  mTOKEN_CONTRACT_PACKAGE_ID,
} from "@/pages/send";

interface ClaimSectionProps {
  allocations: Allocation[];
  isLoading: boolean;
  ownedSendPoints?: BigNumber;
  ownedSuilendCapsulesMap?: Record<SuilendCapsuleRarity, BigNumber>;
  suilendCapsulesTotalAllocationBreakdownMap: Record<
    SuilendCapsuleRarity,
    { percent: BigNumber }
  >;
  burnSendPointsSuilendCapsules: () => Promise<void>;
}

export default function ClaimSection({
  allocations,
  isLoading,
  ownedSendPoints,
  ownedSuilendCapsulesMap,
  suilendCapsulesTotalAllocationBreakdownMap,
  burnSendPointsSuilendCapsules,
}: ClaimSectionProps) {
  const { getBalance } = useLoadedAppContext();

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

  // Claim SEND
  const balanceMsend3Months = getBalance(NORMALIZED_mSEND_3_MONTHS_COINTYPE);
  const balanceMsend6Months = getBalance(NORMALIZED_mSEND_6_MONTHS_COINTYPE);
  const balanceMsend12Months = getBalance(NORMALIZED_mSEND_12_MONTHS_COINTYPE);

  const claimSend = async (
    mSendCoinObj: string,
    suiCoinObj: string,
    sender: string,
  ) => {
    const transaction = new Transaction();

    const MSEND_TYPE =
      "0x1a98c181ce323d1571be1f805b3d5d19e98c1f79492aa32f592e7fd4575fd9e2::msend::MSEND";
    const SEND_TYPE =
      "0x1a98c181ce323d1571be1f805b3d5d19e98c1f79492aa32f592e7fd4575fd9e2::send::SEND";

    const send = transaction.moveCall({
      target: `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::redeem_mtokens`,
      typeArguments: [MSEND_TYPE, SEND_TYPE, "0x2::sui::SUI"],
      arguments: [
        transaction.object(mSEND_MANAGER_OBJECT_ID),
        transaction.object(mSendCoinObj),
        transaction.object(suiCoinObj),
        transaction.object(SUI_CLOCK_OBJECT_ID),
      ],
    });

    transaction.transferObjects([send], sender);

    // TODO: Send tx
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
                      {formatToken(ownedSendPoints as BigNumber)} SEND Points
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
                Object.entries(ownedSuilendCapsulesMap!)
                  .filter(([key, value]) => value.gt(0))
                  .map(([key, value], index, array) => (
                    <Fragment key={key}>
                      <div className="flex w-full flex-row items-center justify-between gap-4">
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
                      {index !== array.length - 1 && <Separator />}
                    </Fragment>
                  ))}
            </div>

            <Button
              className="h-12 w-full"
              labelClassName="text-[16px]"
              size="lg"
              onClick={burnSendPointsSuilendCapsules}
            >
              CONVERT TO mSEND
            </Button>
          </div>
        )
      )}

      <div className="flex flex-col gap-4 rounded-md border px-4 py-3">
        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND (3 months) in wallet:{" "}
            {formatToken(balanceMsend3Months, { exact: false })}
          </TBody>
          <Button labelClassName="uppercase" onClick={claimSend}>
            Claim
          </Button>
        </div>

        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND (6 months) in wallet:{" "}
            {formatToken(balanceMsend6Months, { exact: false })}
          </TBody>
          <Button labelClassName="uppercase" onClick={claimSend}>
            Claim
          </Button>
        </div>

        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND (12 months) in wallet:{" "}
            {formatToken(balanceMsend12Months, { exact: false })}
          </TBody>
          <Button labelClassName="uppercase" onClick={claimSend}>
            Claim
          </Button>
        </div>
      </div>
    </div>
  );
}
