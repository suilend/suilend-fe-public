import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "@suilend/sdk/client";
import { extractCTokenCoinType, isCTokenCoinType } from "@suilend/sdk/utils";

import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { formatToken } from "@/lib/format";

export default function RedeemCTokensDialog() {
  const { address } = useWalletContext();
  const { refreshData, signExecuteAndWaitForTransaction, ...restAppContext } =
    useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  const ctokenCoinBalances = data.coinBalancesRaw.filter(
    (cb) => isCTokenCoinType(cb.coinType) && +cb.totalBalance > 0,
  );

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");

    const transaction = new Transaction();

    // await suilendClient.depositLiquidityAndGetCTokens(
    //   address,
    //   NORMALIZED_wUSDC_COINTYPE,
    //   `${0.01 * 10 ** 6}`,
    //   transaction,
    // );
    // await signExecuteAndWaitForTransaction(transaction);

    try {
      await suilendClient.redeemCtokensAndWithdrawLiquidity(
        address,
        ctokenCoinBalances.map((cb) => cb.coinType),
        transaction,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Redeemed CTokens");
    } catch (err) {
      toast.error("Failed to redeem CTokens", {
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
          labelClassName="uppercase text-xs"
          startIcon={<Coins />}
          variant="secondaryOutline"
        >
          Redeem
        </Button>
      }
      titleIcon={<Coins />}
      title="Redeem CTokens"
      footer={
        <div className="flex w-full flex-row items-center gap-2">
          <Button
            className="flex-1"
            labelClassName="uppercase"
            size="lg"
            onClick={submit}
            disabled={ctokenCoinBalances.length === 0}
          >
            Redeem
          </Button>
        </div>
      }
    >
      <div className="flex w-full flex-col gap-2">
        {ctokenCoinBalances.length > 0 ? (
          ctokenCoinBalances.map((cb) => {
            const coinType = extractCTokenCoinType(cb.coinType);
            const reserve = data.lendingMarket.reserves.find(
              (r) => r.coinType === coinType,
            );
            if (!reserve) return null;

            return (
              <div
                key={cb.coinType}
                className="flex flex-row items-center justify-between gap-2"
              >
                <div className="flex flex-row items-center gap-2">
                  <TokenLogo
                    className="h-4 w-4"
                    token={{
                      coinType: reserve.coinType,
                      symbol: reserve.symbol,
                      iconUrl: reserve.iconUrl,
                    }}
                  />
                  <TBody>{reserve.symbol}</TBody>
                </div>

                <TBody>
                  {formatToken(
                    new BigNumber(cb.totalBalance).div(
                      10 ** reserve.mintDecimals,
                    ),
                    { dp: reserve.mintDecimals },
                  )}
                </TBody>
              </div>
            );
          })
        ) : (
          <TLabelSans>No CTokens</TLabelSans>
        )}
      </div>
    </Dialog>
  );
}
