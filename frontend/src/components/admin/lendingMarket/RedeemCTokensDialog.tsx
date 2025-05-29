import { useMemo } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { formatToken, getToken, isCTokenCoinType } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function RedeemCTokensDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { balancesCoinMetadataMap, getBalance, refresh } =
    useLoadedUserContext();

  const { appData } = useAdminContext();

  const coinTypes = useMemo(
    () =>
      Object.keys(balancesCoinMetadataMap ?? {}).filter(
        (coinType) => getBalance(coinType).gt(0) && isCTokenCoinType(coinType),
      ),
    [balancesCoinMetadataMap, getBalance],
  );

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
      await appData.suilendClient.redeemCtokensAndWithdrawLiquidity(
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
      refresh();
    }
  };

  return (
    <Dialog
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
      headerProps={{
        title: { icon: <Coins />, children: "Redeem CTokens" },
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
              disabled={coinTypes.length === 0}
            >
              Redeem
            </Button>
          </>
        ),
      }}
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
