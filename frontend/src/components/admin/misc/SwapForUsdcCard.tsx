import { useEffect, useMemo, useState } from "react";

import { RouterDataV3 } from "@cetusprotocol/aggregator-sdk";
import { CoinStruct } from "@mysten/sui/client";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { BN } from "bn.js";
import { chunk } from "lodash";
import { ArrowRightLeft } from "lucide-react";
import pLimit from "p-limit";
import { toast } from "sonner";

import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  TX_TOAST_DURATION,
  formatToken,
  getAllCoins,
  getBalanceChange,
  getToken,
  mergeAllCoins,
} from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import { cn } from "@/lib/utils";

export default function SwapForUsdcCard() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { refresh, balancesCoinMetadataMap, getBalance } =
    useLoadedUserContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // State
  const filteredBalancesCoinMetadataMap = Object.fromEntries(
    Object.entries(balancesCoinMetadataMap ?? {})
      .filter(([coinType]) => getBalance(coinType).gt(0))
      .filter(
        ([coinType, coinMetadata]) =>
          coinType !== NORMALIZED_SUI_COINTYPE &&
          coinType !== NORMALIZED_USDC_COINTYPE &&
          !coinMetadata.symbol.includes("STEAMM LP") &&
          !coinMetadata.symbol.includes("SEND Points"),
      ),
  );

  const [selectedCoinTypes, setSelectedCoinTypes] = useState<string[]>(
    Object.keys(filteredBalancesCoinMetadataMap),
  );
  useEffect(() => {
    setSelectedCoinTypes((prev) =>
      Object.keys(filteredBalancesCoinMetadataMap).filter((coinType) =>
        prev.includes(coinType),
      ),
    );
  }, [filteredBalancesCoinMetadataMap]);

  // Submit
  const onSubmitClick = async () => {
    if (!address) throw new Error("Wallet not connected");

    const batches = chunk(selectedCoinTypes, 10);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const transaction = new Transaction();

      try {
        let coinCount = 0;
        for (const coinType of batch) {
          const coins = await getAllCoins(suiClient, address, coinType);
          const mergeCoin = mergeAllCoins(coinType, transaction, coins);

          // Get routes
          console.log(`[onSubmitClick] getting routers for ${coinType}`);
          const routers = await cetusSdk.findRouters({
            from: coinType,
            target: NORMALIZED_USDC_COINTYPE,
            amount: new BN(
              getBalance(coinType)
                .times(10 ** filteredBalancesCoinMetadataMap[coinType].decimals)
                .toString(),
            ), // Underestimate (rewards keep accruing)
            byAmountIn: true,
          });
          if (!routers) return; // Skip coin if no swap quote found

          // Swap
          const slippagePercent = 3;

          let coinOut;
          try {
            coinOut = await cetusSdk.fixableRouterSwapV3({
              router: routers,
              inputCoin: transaction.object(mergeCoin.coinObjectId),
              slippage: slippagePercent / 100,
              txb: transaction,
              partner: CETUS_PARTNER_ID,
            });
          } catch (err) {
            continue; // Skip coin if no swap quote found
          }

          // Transfer
          transaction.transferObjects(
            [coinOut],
            transaction.pure.address(address),
          );

          coinCount++;
        }

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeIn = getBalanceChange(
          res,
          address,
          getToken(
            NORMALIZED_USDC_COINTYPE,
            appData.coinMetadataMap[NORMALIZED_USDC_COINTYPE],
          ),
        );

        toast.success(
          [
            "Swapped",
            `${coinCount}/${batch.length}`,
            "coins",
            "for",
            balanceChangeIn !== undefined
              ? formatToken(balanceChangeIn, {
                  dp: appData.coinMetadataMap[NORMALIZED_USDC_COINTYPE]
                    .decimals,
                  trimTrailingZeros: true,
                })
              : null,
            "USDC",
          ]
            .filter(Boolean)
            .join(" "),
          {
            description: `Batch ${i + 1}/${batches.length}`,
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to swap for USDC", {
          description: (err as Error)?.message || "An unknown error occurred",
        });
      } finally {
        refresh();
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Swap for USDC</TTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div
            className="flex cursor-pointer flex-row items-center gap-2"
            onClick={() => {
              setSelectedCoinTypes((prev) =>
                prev.length ===
                Object.keys(filteredBalancesCoinMetadataMap).length
                  ? []
                  : Object.keys(filteredBalancesCoinMetadataMap),
              );
            }}
          >
            <div className="mr-1">
              <Checkbox
                checked={
                  selectedCoinTypes.length ===
                  Object.keys(filteredBalancesCoinMetadataMap).length
                }
              />
            </div>

            <TBody className="uppercase">Select all</TBody>
          </div>

          {Object.entries(balancesCoinMetadataMap ?? {})
            .filter(([coinType]) => getBalance(coinType).gt(0))
            .map(([coinType, coinMetadata]) => (
              <div
                key={coinType}
                className="flex h-5 flex-row items-center gap-2"
              >
                <div
                  className={cn(
                    "flex flex-row items-center gap-2",
                    !!filteredBalancesCoinMetadataMap[coinType]
                      ? "cursor-pointer"
                      : "pointer-events-none opacity-50",
                  )}
                  onClick={() => {
                    if (!filteredBalancesCoinMetadataMap[coinType]) return;

                    setSelectedCoinTypes((prev) =>
                      prev.includes(coinType)
                        ? prev.filter((type) => type !== coinType)
                        : [...prev, coinType],
                    );
                  }}
                >
                  <div className="mr-1">
                    <Checkbox checked={selectedCoinTypes.includes(coinType)} />
                  </div>

                  <TokenLogo
                    token={getToken(coinType, coinMetadata)}
                    size={16}
                  />
                  <TBody>
                    {formatToken(getBalance(coinType), {
                      dp: coinMetadata.decimals,
                      trimTrailingZeros: true,
                    })}{" "}
                    {coinMetadata.symbol}
                  </TBody>
                </div>

                <OpenOnExplorerButton
                  className="-ml-1"
                  url={explorer.buildCoinUrl(coinType)}
                />
              </div>
            ))}
        </div>

        <Button
          className="w-max"
          labelClassName="uppercase text-xs"
          startIcon={<ArrowRightLeft />}
          variant="secondaryOutline"
          onClick={onSubmitClick}
        >
          Swap {selectedCoinTypes.length} coin
          {selectedCoinTypes.length !== 1 ? "s" : ""} for USDC
        </Button>
      </CardContent>
    </Card>
  );
}
