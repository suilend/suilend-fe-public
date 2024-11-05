import { Fragment, useEffect, useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { Grab } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "@suilend/sdk/client";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { formatToken, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ClaimFeesDialogProps {
  reserve?: ParsedReserve;
}

export default function ClaimFeesDialog({ reserve }: ClaimFeesDialogProps) {
  const { address } = useWalletContext();
  const {
    suiClient,
    refreshData,
    signExecuteAndWaitForTransaction,
    ...restAppContext
  } = useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Reserves
  const reserves = useMemo(
    () => (reserve ? [reserve] : data.lendingMarket.reserves),
    [reserve, data.lendingMarket.reserves],
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
        const res2 = await suiClient.getDynamicFieldObject({
          parentId: _reserve.id,
          name: res1.data[0].name,
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
        suilendClient.claimFees(transaction, _reserve.coinType);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Claimed fees");
    } catch (err) {
      toast.error("Failed to claim fees", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshData();
    }
  };

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      contentProps={{ className: "sm:max-w-md" }}
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
      titleIcon={<Grab />}
      title={
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
                              .plus(feesMap[r.coinType].unclaimedSpreadFees),
                          ).times(r.price)
                        : new BigNumber(0),
                    ),
                  new BigNumber(0),
                ),
              )}
            </span>
          )}
        </>
      }
      footer={
        <div className="flex w-full flex-row items-center gap-2">
          <Button
            className="flex-1"
            labelClassName="uppercase"
            size="lg"
            onClick={submit}
          >
            Claim
          </Button>
        </div>
      }
    >
      <div className="flex w-full flex-col gap-4">
        {reserves.map((r, index) => (
          <Fragment key={r.coinType}>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2">
                <TokenLogo
                  className="h-4 w-4"
                  token={{
                    coinType: r.coinType,
                    symbol: r.symbol,
                    iconUrl: r.iconUrl,
                  }}
                />
                <TBody>{r.symbol}</TBody>
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
