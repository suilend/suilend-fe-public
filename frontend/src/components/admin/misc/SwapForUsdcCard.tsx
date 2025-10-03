import { useCallback, useEffect, useMemo, useState } from "react";

import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";
import { chunk } from "lodash";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import {
  FundKeypairResult,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  ReturnAllOwnedObjectsAndSuiToUserResult,
  TX_TOAST_DURATION,
  createKeypair,
  formatPercent,
  formatToken,
  fundKeypair,
  getAllCoins,
  getBalanceChange,
  getToken,
  keypairSignExecuteAndWaitForTransaction,
  mergeAllCoins,
  returnAllOwnedObjectsAndSuiToUser,
} from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import { cn } from "@/lib/utils";

export default function SwapForUsdcCard() {
  const { explorer, suiClient } = useSettingsContext();
  const { account, address, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { appData } = useLoadedAppContext();
  const { refresh, balancesCoinMetadataMap, getBalance } =
    useLoadedUserContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // State
  const isCoinTypeDisabled = useCallback(
    (coinType: string, coinMetadata: CoinMetadata) =>
      coinType === NORMALIZED_SUI_COINTYPE ||
      coinType === NORMALIZED_USDC_COINTYPE ||
      coinMetadata.symbol.includes("STEAMM LP") ||
      coinMetadata.name.includes("bToken") ||
      coinMetadata.symbol.includes("SEND Points") ||
      coinType.includes("::CToken") ||
      coinType.includes("::usdc::") ||
      coinType.includes("::sui::") ||
      [
        "0x12e736bc471d5614fa20b214a62576d6990b6c764abc652b2cba7f747547e05c::deep::DEEP",
        "0xca9bc8fc71414e2a40806b561f02a77e074ec31b8803cdfff2d7a3133aa12867::asui::ASUI",
        "0x3fc9e49c9f83ea5c49b81e46ebb4190d51307fb2b803312e9ae527e65f452586::asuiio::ASUIIO",
        "0xf2100017e8013eb4bba249b1c88480a34404297942f3134e4803463e01f20379::swavo_points::SWAVO_POINTS",
      ].includes(coinType), // Scam tokens
    [],
  );
  const selectableCoinTypes = useMemo(
    () =>
      Object.entries(balancesCoinMetadataMap ?? {})
        .filter(([coinType]) => getBalance(coinType).gt(0))
        .filter(
          ([coinType, coinMetadata]) =>
            !isCoinTypeDisabled(coinType, coinMetadata),
        )
        .map(([coinType]) => coinType),
    [balancesCoinMetadataMap, getBalance, isCoinTypeDisabled],
  );

  const [selectedCoinTypes, setSelectedCoinTypes] = useState<string[]>([]);
  useEffect(() => {
    console.log("XXXX", selectableCoinTypes.length);
    setSelectedCoinTypes((prev) =>
      prev.filter((coinType) => selectableCoinTypes.includes(coinType)),
    );
  }, [selectableCoinTypes]);

  const batches = useMemo(
    () => chunk(selectedCoinTypes, 5),
    [selectedCoinTypes],
  );

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const onSubmitClick = async () => {
    if (!account?.publicKey || !address)
      throw new Error("Wallet not connected");

    try {
      setIsSubmitting(true);

      // 1) Create keypair
      const createKeypairResult = await createKeypair(
        account,
        signPersonalMessage,
      );
      const keypair = createKeypairResult.keypair;
      const keypairAddress = createKeypairResult.address;

      // 2) Fund keypair
      const fundKeypairResult: FundKeypairResult = await fundKeypair(
        [
          {
            ...getToken(
              NORMALIZED_SUI_COINTYPE,
              appData.coinMetadataMap[NORMALIZED_SUI_COINTYPE],
            ),
            amount: BigNumber.max(0.015, batches.length * 0.003),
          },
          ...selectedCoinTypes.map((coinType) => ({
            ...getToken(coinType, (balancesCoinMetadataMap ?? {})[coinType]),
            amount: getBalance(coinType),
          })),
        ],
        address,
        keypair,
        suiClient,
        signExecuteAndWaitForTransaction,
      );

      // 3) Swap
      // Get coins
      const coinsMap = Object.fromEntries(
        await Promise.all(
          selectedCoinTypes.map((coinType) => [
            coinType,
            getAllCoins(suiClient, keypairAddress, coinType),
          ]),
        ),
      );

      const totalCoinCount = selectedCoinTypes.length;
      let coinCount = 0;
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        let batchCoinCount = 0;

        const transaction = new Transaction();
        transaction.setSender(keypairAddress);

        try {
          for (const coinType of batch) {
            try {
              // Get coins
              const coins = coinsMap[coinType];
              const mergeCoin = mergeAllCoins(coinType, transaction, coins);

              // Get routes
              const routers = await cetusSdk.findRouters({
                from: coinType,
                target: NORMALIZED_USDC_COINTYPE,
                amount: new BN(
                  getBalance(coinType)
                    .times(
                      10 ** (balancesCoinMetadataMap ?? {})[coinType].decimals,
                    )
                    .toString(),
                ), // Underestimate (rewards keep accruing)
                byAmountIn: true,
              });
              if (!routers) return; // Skip coin if no swap quote found

              // Swap
              const slippagePercent = 3;

              const coinOut = await cetusSdk.fixableRouterSwapV3({
                router: routers,
                inputCoin: transaction.object(mergeCoin.coinObjectId),
                slippage: slippagePercent / 100,
                txb: transaction,
                partner: CETUS_PARTNER_ID,
              });

              // Transfer
              transaction.transferObjects(
                [coinOut],
                transaction.pure.address(keypairAddress),
              );

              batchCoinCount++;
            } catch (err) {
              // Fail silently
              console.error(err);
              continue; // Skip coin if no swap quote found
            }
          }

          await keypairSignExecuteAndWaitForTransaction(
            transaction,
            keypair,
            suiClient,
          );

          coinCount += batchCoinCount;
        } catch (err) {
          // Fail silently
          console.error(err);
          continue; // Skip batch if transaction failed to sign or execute
        } finally {
          setProgress(((i + 1) / batches.length) * 100);
        }
      }

      // 4) Return all owned objects and SUI to user
      const returnAllOwnedObjectsAndSuiToUserResult: ReturnAllOwnedObjectsAndSuiToUserResult =
        await returnAllOwnedObjectsAndSuiToUser(address, keypair, suiClient);
      const txUrl = explorer.buildTxUrl(
        returnAllOwnedObjectsAndSuiToUserResult.res.digest,
      );

      const balanceChangeIn = getBalanceChange(
        returnAllOwnedObjectsAndSuiToUserResult.res,
        address,
        getToken(
          NORMALIZED_USDC_COINTYPE,
          appData.coinMetadataMap[NORMALIZED_USDC_COINTYPE],
        ),
      );

      toast.success(
        [
          "Swapped",
          `${coinCount}/${totalCoinCount}`,
          "coins",
          "for",
          balanceChangeIn !== undefined
            ? formatToken(balanceChangeIn, {
                dp: appData.coinMetadataMap[NORMALIZED_USDC_COINTYPE].decimals,
                trimTrailingZeros: true,
              })
            : null,
          "USDC",
        ]
          .filter(Boolean)
          .join(" "),
        {
          description:
            coinCount < totalCoinCount
              ? `Failed to swap ${totalCoinCount - coinCount} coin${
                  totalCoinCount - coinCount !== 1 ? "s" : ""
                }`
              : undefined,
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
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Swap for USDC</TTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* SUI and USDC */}
        {Object.entries(balancesCoinMetadataMap ?? {})
          .filter(([coinType]) => getBalance(coinType).gt(0))
          .filter(
            ([coinType]) =>
              coinType === NORMALIZED_SUI_COINTYPE ||
              coinType === NORMALIZED_USDC_COINTYPE,
          ).length > 0 && (
          <div className="flex flex-col gap-2">
            {Object.entries(balancesCoinMetadataMap ?? {})
              .filter(([coinType]) => getBalance(coinType).gt(0))
              .filter(
                ([coinType]) =>
                  coinType === NORMALIZED_SUI_COINTYPE ||
                  coinType === NORMALIZED_USDC_COINTYPE,
              )
              .map(([coinType, coinMetadata]) => (
                <div
                  key={coinType}
                  className="flex h-5 flex-row items-center gap-2"
                >
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

                  <OpenOnExplorerButton
                    className="-ml-1"
                    url={explorer.buildCoinUrl(coinType)}
                  />
                </div>
              ))}
          </div>
        )}

        {Object.entries(balancesCoinMetadataMap ?? {})
          .filter(([coinType]) => getBalance(coinType).gt(0))
          .filter(
            ([coinType]) =>
              coinType !== NORMALIZED_SUI_COINTYPE &&
              coinType !== NORMALIZED_USDC_COINTYPE,
          ).length > 0 && (
          <>
            <Separator />

            {/* Select all */}
            <div className="flex flex-col gap-2">
              <div
                className="flex cursor-pointer flex-row items-center gap-2"
                onClick={() => {
                  setSelectedCoinTypes((prev) =>
                    prev.length === selectableCoinTypes.length
                      ? []
                      : selectableCoinTypes,
                  );
                }}
              >
                <div className="mr-1">
                  <Checkbox
                    checked={
                      selectedCoinTypes.length === selectableCoinTypes.length
                    }
                  />
                </div>

                <TBody className="uppercase">Select all</TBody>
              </div>

              {/* Other coins */}
              {Object.entries(balancesCoinMetadataMap ?? {})
                .filter(([coinType]) => getBalance(coinType).gt(0))
                .filter(
                  ([coinType]) =>
                    coinType !== NORMALIZED_SUI_COINTYPE &&
                    coinType !== NORMALIZED_USDC_COINTYPE,
                )
                .map(([coinType, coinMetadata]) => (
                  <div
                    key={coinType}
                    className="flex h-5 flex-row items-center gap-2"
                  >
                    <div
                      className={cn(
                        "flex flex-row items-center gap-2",
                        selectableCoinTypes.includes(coinType)
                          ? "cursor-pointer"
                          : "pointer-events-none opacity-50",
                      )}
                      onClick={() => {
                        if (!selectableCoinTypes.includes(coinType)) return;

                        setSelectedCoinTypes((prev) =>
                          prev.includes(coinType)
                            ? prev.filter((type) => type !== coinType)
                            : [...prev, coinType],
                        );
                      }}
                    >
                      <div className="mr-1">
                        <Checkbox
                          checked={selectedCoinTypes.includes(coinType)}
                        />
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
          </>
        )}

        <Button
          className="w-max"
          labelClassName="uppercase text-xs"
          startIcon={<ArrowRightLeft />}
          variant="secondaryOutline"
          onClick={onSubmitClick}
          disabled={selectedCoinTypes.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            `Swapping... ${formatPercent(new BigNumber(progress))}`
          ) : (
            <>
              Swap {selectedCoinTypes.length} coin
              {selectedCoinTypes.length !== 1 ? "s" : ""} for USDC
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
