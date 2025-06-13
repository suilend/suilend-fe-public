import { Fragment, useEffect, useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { Grab } from "lucide-react";
import { toast } from "sonner";

import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { formatToken, formatUsd } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import SteammPoolBadges from "@/components/admin/reserves/SteammPoolBadges";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Spinner from "@/components/shared/Spinner";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { getPoolInfo } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface ClaimFeesDialogProps {
  reserve?: ParsedReserve;
}

export default function ClaimFeesDialog({ reserve }: ClaimFeesDialogProps) {
  const { suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData, steammPoolInfos } = useAdminContext();
  const poolInfo = getPoolInfo(steammPoolInfos, reserve?.coinType ?? "");

  // Reserves
  const reserves = useMemo(
    () => (reserve ? [reserve] : appData.lendingMarket.reserves),
    [reserve, appData.lendingMarket.reserves],
  );

  // Fees
  const [feesMap, setFeesMap] = useState<
    Record<
      string,
      {
        fees: BigNumber;
        ctokenFees: BigNumber;
        unclaimedSpreadFees: BigNumber;
      }
    >
  >({});
  useEffect(() => {
    const fetchFeesForReserve = async (_reserve: ParsedReserve) => {
      try {
        const res1 = await suiClient.getDynamicFields({
          parentId: _reserve.id,
        });
        const name = res1.data.find((d) =>
          d.name.type.includes("BalanceKey"),
        )!.name;
        const res2 = await suiClient.getDynamicFieldObject({
          parentId: _reserve.id,
          name,
        });
        const fields = (res2?.data?.content as any)?.fields.value.fields;

        const fees = new BigNumber(fields.fees).div(
          10 ** _reserve.mintDecimals,
        );
        const ctokenFees = new BigNumber(fields.ctoken_fees)
          .div(10 ** _reserve.mintDecimals)
          .times(_reserve.cTokenExchangeRate);
        const unclaimedSpreadFees = new BigNumber(_reserve.unclaimedSpreadFees);

        setFeesMap((prev) => ({
          ...prev,
          [_reserve.coinType]: {
            fees,
            ctokenFees,
            unclaimedSpreadFees,
          },
        }));
      } catch (err) {
        console.error(err);
      }
    };
    for (const _reserve of reserves) fetchFeesForReserve(_reserve);
  }, [reserves, suiClient]);

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");

    const transaction = new Transaction();

    try {
      for (const _reserve of reserves)
        appData.suilendClient.claimFees(transaction, _reserve.coinType);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Claimed fees");
    } catch (err) {
      toast.error("Failed to claim fees", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Dialog
      trigger={
        <Button
          className="w-fit"
          labelClassName={cn("uppercase", reserve && "text-xs")}
          startIcon={<Grab />}
          variant={reserve ? "secondaryOutline" : "secondary"}
        >
          Claim fees
        </Button>
      }
      headerProps={{
        title: {
          icon: <Grab />,
          children: (
            <>
              Claim fees
              {!reserve && (
                <span className="text-primary">
                  {formatUsd(
                    reserves.reduce(
                      (acc, r) =>
                        acc.plus(
                          feesMap[r.coinType]
                            ? new BigNumber(
                                feesMap[r.coinType].fees
                                  .plus(feesMap[r.coinType].ctokenFees)
                                  .plus(
                                    feesMap[r.coinType].unclaimedSpreadFees,
                                  ),
                              ).times(r.price)
                            : new BigNumber(0),
                        ),
                      new BigNumber(0),
                    ),
                  )}
                </span>
              )}
            </>
          ),
        },
      }}
      dialogContentInnerClassName="max-w-md"
      footerProps={{
        children: (
          <>
            <Button
              className="flex-1"
              labelClassName="uppercase"
              size="lg"
              onClick={submit}
            >
              Claim
            </Button>
          </>
        ),
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {reserves.map((r, index) => (
          <Fragment key={r.coinType}>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2">
                <TokenLogo className="h-4 w-4" token={r.token} />
                <TBody>
                  {r.token.symbol}
                  {poolInfo && (
                    <>
                      {" "}
                      <SteammPoolBadges poolInfo={poolInfo} />
                    </>
                  )}
                </TBody>
              </div>

              <div className="flex flex-col justify-between gap-2">
                {feesMap[r.coinType] ? (
                  <>
                    {Object.entries(feesMap[r.coinType]).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex flex-row justify-between gap-2"
                      >
                        <TLabelSans className="my-0.5">{key}</TLabelSans>
                        <div className="flex flex-col items-end gap-1">
                          <TBody className="text-right">
                            {formatToken(value, { dp: r.mintDecimals })}{" "}
                            {r.symbol}
                          </TBody>
                          <TLabel className="text-right">
                            {formatUsd(value.times(r.price))}
                          </TLabel>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-row justify-end">
                      <TBody className="text-primary">
                        {formatUsd(
                          new BigNumber(
                            feesMap[r.coinType].fees
                              .plus(feesMap[r.coinType].ctokenFees)
                              .plus(feesMap[r.coinType].unclaimedSpreadFees),
                          ).times(r.price),
                        )}
                      </TBody>
                    </div>
                  </>
                ) : (
                  <Spinner size="md" />
                )}
              </div>
            </div>
            {index !== reserves.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>
    </Dialog>
  );
}
