import { useCallback, useEffect, useMemo, useState } from "react";

import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";
import { toast } from "sonner";

import {
  FundKeypairResult,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  ReturnAllOwnedObjectsAndSuiToUserResult,
  TX_TOAST_DURATION,
  Token,
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
import track from "@suilend/sui-fe/lib/track";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import { cn } from "@/lib/utils";

const FEE_PERCENT = 1;
const FEE_ADDRESS =
  "0x7d68adb758c18d0f1e6cbbfe07c4c12bce92de37ce61b27b51245a568381b83e";

interface BulkSwapCardProps {
  tokenOut: Token;
}

export default function BulkSwapCard({ tokenOut }: BulkSwapCardProps) {
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
      coinType === tokenOut.coinType ||
      coinMetadata.symbol.includes("STEAMM LP") ||
      coinMetadata.name.includes("bToken") ||
      coinMetadata.symbol.includes("SEND Points") ||
      coinType.includes("::CToken") ||
      coinType.includes("::sui::") ||
      [
        "0x12e736bc471d5614fa20b214a62576d6990b6c764abc652b2cba7f747547e05c::deep::DEEP",
        "0xca9bc8fc71414e2a40806b561f02a77e074ec31b8803cdfff2d7a3133aa12867::asui::ASUI",
        "0x3fc9e49c9f83ea5c49b81e46ebb4190d51307fb2b803312e9ae527e65f452586::asuiio::ASUIIO",
        "0xf2100017e8013eb4bba249b1c88480a34404297942f3134e4803463e01f20379::swavo_points::SWAVO_POINTS",
        "0xef3a48d5c6dffc7d9c6edf4535a592cac585090e8b01d9dee80ee7eefbaa0b70::swavo_points::SWAVO_POINTS",
        "0xdb50e6f379506e58188e15ef65328a1d3c0df276d5ad2aef2f6703e941f98486::hippo::HIPPO",
        "0x8521ea7c46686a84d07a11f98a8f5d153e1f879c65d8de75da8772200db58e40::blub::BLUB",
        "0x3a147bb72d4d67baffec8ca98e228f011e33ee707704af06ef4fb474c39adad4::aaa::AAA",
        "0x917b0433f4e52c65b87ff118b95c15b2a659ef13098617d427ab96f22073e034::aaa::AAA",
        "0x372f08d4b4394f989411f3d060565fcb34cec81db67ddbb9b93e49ac94434ccd::usdc::USDC",
      ].includes(coinType), // Scam tokens
    [tokenOut.coinType],
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

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>("0/0");
  const [selectedCoinTypes, setSelectedCoinTypes] = useState<string[]>([]);
  useEffect(() => {
    if (isSubmitting) return;

    setSelectedCoinTypes((prev) =>
      prev.filter((coinType) => selectableCoinTypes.includes(coinType)),
    );
  }, [isSubmitting, selectableCoinTypes]);

  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const onSubmitClick = async () => {
    if (!account?.publicKey || !address)
      throw new Error("Wallet not connected");

    try {
      setIsSubmitting(true);
      setProgress(`0/${selectedCoinTypes.length}`);

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
            amount: BigNumber.max(0.04, selectedCoinTypes.length * 0.002),
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
      let coinCount = 0;
      let tokenOutAmount = new BigNumber(0);
      for (let i = 0; i < selectedCoinTypes.length; i++) {
        setProgress(`${i}/${selectedCoinTypes.length}`);

        const coinType = selectedCoinTypes[i];
        console.log("[onSubmitClick] swapping coinType", coinType);

        const transaction = new Transaction();
        transaction.setSender(keypairAddress);

        try {
          // Get coins
          const coins = await getAllCoins(suiClient, keypairAddress, coinType);
          const mergeCoin = mergeAllCoins(coinType, transaction, coins);

          // Get routes
          const routers = await cetusSdk.findRouters({
            from: coinType,
            target: tokenOut.coinType,
            amount: new BN(
              getBalance(coinType)
                .times(10 ** (balancesCoinMetadataMap ?? {})[coinType].decimals)
                .toString(),
            ),
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
          const amountOut = new BigNumber(routers.amountOut.toString())
            .div(10 ** tokenOut.decimals)
            .decimalPlaces(tokenOut.decimals, BigNumber.ROUND_DOWN);
          const feeAmount = new BigNumber(amountOut.times(FEE_PERCENT / 100))
            .times(10 ** tokenOut.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString();

          const [feeCoin] = transaction.splitCoins(coinOut, [feeAmount]);
          transaction.transferObjects(
            [feeCoin],
            transaction.pure.address(FEE_ADDRESS),
          );
          transaction.transferObjects(
            [coinOut], // Remaining to user
            transaction.pure.address(keypairAddress),
          );

          const res = await keypairSignExecuteAndWaitForTransaction(
            transaction,
            keypair,
            suiClient,
          );

          const balanceChangeIn = getBalanceChange(
            res,
            keypairAddress,
            tokenOut,
          );
          if (balanceChangeIn !== undefined) {
            tokenOutAmount = tokenOutAmount.plus(balanceChangeIn);
            track("bulk_swap_success", {
              assetOut: tokenOut.symbol,
              amountOut: tokenOutAmount.toFixed(
                tokenOut.decimals,
                BigNumber.ROUND_DOWN,
              ),
            });
          }

          coinCount++;
        } catch (err) {
          // Fail silently
          console.error(err);
          continue; // Skip coin if failed to swap
        } finally {
          setProgress(`${i + 1}/${selectedCoinTypes.length}`);
        }
      }

      // 4) Return all owned objects and SUI to user
      const returnAllOwnedObjectsAndSuiToUserResult: ReturnAllOwnedObjectsAndSuiToUserResult =
        await returnAllOwnedObjectsAndSuiToUser(address, keypair, suiClient);
      const txUrl = explorer.buildTxUrl(
        returnAllOwnedObjectsAndSuiToUserResult.res.digest,
      );

      toast.success(
        [
          "Swapped",
          `${coinCount}/${selectedCoinTypes.length}`,
          "coins",
          "for",
          formatToken(tokenOutAmount, {
            dp: tokenOut.decimals,
            trimTrailingZeros: true,
          }),
          tokenOut.symbol,
        ]
          .filter(Boolean)
          .join(" "),
        {
          description:
            coinCount < selectedCoinTypes.length
              ? `Failed to swap ${selectedCoinTypes.length - coinCount} coin${
                  selectedCoinTypes.length - coinCount !== 1 ? "s" : ""
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
      toast.error(`Failed to swap coins for ${tokenOut.symbol}`, {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();

      setIsSubmitting(false);
      setProgress("0/0");
      setSelectedCoinTypes([]);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <TTitle className="uppercase">
          Bulk swap coins for {tokenOut.symbol}
        </TTitle>
      </CardHeader>
      <CardContent className="flex w-full flex-col gap-6">
        {Object.entries(balancesCoinMetadataMap ?? {})
          .filter(([coinType]) => getBalance(coinType).gt(0))
          .filter(
            ([coinType]) =>
              coinType !== NORMALIZED_SUI_COINTYPE &&
              coinType !== NORMALIZED_USDC_COINTYPE &&
              coinType !== tokenOut.coinType,
          ).length > 0 ? (
          <div className="flex w-full flex-col gap-2">
            {/* Select all */}
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
                  coinType !== NORMALIZED_USDC_COINTYPE &&
                  coinType !== tokenOut.coinType,
              )
              .map(([coinType, coinMetadata]) => (
                <div
                  key={coinType}
                  className="flex h-5 w-full flex-row items-center gap-2"
                >
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 flex-row items-center gap-2",
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
                    <TBody className="overflow-hidden text-ellipsis text-nowrap">
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
        ) : (
          <TLabelSans>No coins to swap</TLabelSans>
        )}

        <Button
          className="h-auto min-h-14 w-full rounded-md py-2"
          labelClassName="text-wrap uppercase"
          style={{ overflowWrap: "anywhere" }}
          disabled={selectedCoinTypes.length === 0 || isSubmitting}
          onClick={onSubmitClick}
        >
          {isSubmitting ? (
            <>
              Swapping {selectedCoinTypes.length} coin
              {selectedCoinTypes.length !== 1 ? "s" : ""} for {tokenOut.symbol}
            </>
          ) : (
            <>
              Swap {selectedCoinTypes.length} coin
              {selectedCoinTypes.length !== 1 ? "s" : ""} for {tokenOut.symbol}
            </>
          )}
          <span
            className={cn(
              "mt-0.5 block font-sans text-xs normal-case",
              isSubmitting && "animate-pulse",
            )}
          >
            {isSubmitting ? (
              <>{progress}</>
            ) : (
              <>
                {formatPercent(new BigNumber(FEE_PERCENT), { dp: 1 })} fee will
                be deducted
              </>
            )}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
