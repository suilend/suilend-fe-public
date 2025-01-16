import { useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { getToken } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";
import { isCTokenCoinType } from "@suilend/sdk/utils";

import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatToken } from "@/lib/format";

export default function RedeemCTokensDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, balancesCoinMetadataMap, getBalance, refresh } =
    useLoadedAppContext();

  const coinTypes = useMemo(
    () =>
      Object.keys(balancesCoinMetadataMap ?? {}).filter(
        (coinType) => getBalance(coinType).gt(0) && isCTokenCoinType(coinType),
      ),
    [balancesCoinMetadataMap, getBalance],
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
        coinTypes,
        transaction,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Redeemed CTokens");
    } catch (err) {
      toast.error("Failed to redeem CTokens", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refresh();
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
            disabled={coinTypes.length === 0}
          >
            Redeem
          </Button>
        </div>
      }
    >
      <div className="flex w-full flex-col gap-2">
        {coinTypes.length > 0 ? (
          coinTypes.map((coinType) => {
            const coinMetadata = balancesCoinMetadataMap?.[coinType];

            if (!coinMetadata) return null;
            return (
              <div
                key={coinType}
                className="flex flex-row items-center justify-between gap-2"
              >
                <div className="flex flex-row items-center gap-2">
                  <TokenLogo
                    className="h-4 w-4"
                    token={getToken(coinType, coinMetadata)}
                  />
                  <TBody>{coinMetadata.symbol}</TBody>
                </div>

                <TBody>
                  {formatToken(getBalance(coinType), {
                    dp: coinMetadata.decimals,
                  })}
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
