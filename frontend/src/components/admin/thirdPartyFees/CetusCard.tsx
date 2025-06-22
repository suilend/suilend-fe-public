import { useEffect, useMemo, useState } from "react";

import { initMainnetSDK } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { CoinMetadata } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import {
  formatAddress,
  formatToken,
  getCoinMetadataMap,
  getToken,
} from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_CAP_ID, CETUS_PARTNER_ID } from "@/lib/cetus";

const CAP_OWNER =
  "0x7d68adb758c18d0f1e6cbbfe07c4c12bce92de37ce61b27b51245a568381b83e";

export default function CetusCard() {
  const { rpc, explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const isEditable = address === CAP_OWNER;

  // Cetus SDK
  const cetusSdk = useMemo(() => initMainnetSDK(rpc.url), [rpc.url]);

  // Fees
  type FeesMap = Record<
    string,
    { amount: BigNumber; coinMetadata: CoinMetadata }
  >;

  const [feesMap, setFeesMap] = useState<FeesMap | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const refFees =
        await cetusSdk.Pool.getPartnerRefFeeAmount(CETUS_PARTNER_ID);

      const coinTypes = refFees.map((refFee) =>
        normalizeStructTag(refFee.coinAddress),
      );
      const coinMetadataMap = await getCoinMetadataMap(coinTypes);

      setFeesMap(
        refFees.reduce((acc, refFee) => {
          const coinType = normalizeStructTag(refFee.coinAddress);
          const coinMetadata = coinMetadataMap[coinType];

          return {
            ...acc,
            [normalizeStructTag(refFee.coinAddress)]: {
              amount: new BigNumber(refFee.balance.toString()).div(
                10 ** coinMetadata.decimals,
              ),
              coinMetadata,
            },
          };
        }, {} as FeesMap),
      );
    })();
  }, [cetusSdk]);

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!isEditable)
      throw new Error("Connected wallet is not the cap owner wallet");

    if (!feesMap) return;

    try {
      for (const coinType of Object.keys(feesMap)) {
        const transaction = await cetusSdk.Pool.claimPartnerRefFeePayload(
          CETUS_PARTNER_CAP_ID,
          CETUS_PARTNER_ID,
          coinType,
        );

        await signExecuteAndWaitForTransaction(transaction);
      }

      toast.success("Claimed referral fees");
    } catch (err) {
      toast.error("Failed to claim referral fees", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Cetus</TTitle>
        <Tooltip title={CAP_OWNER}>
          <TLabel className="w-max uppercase">
            {formatAddress(CAP_OWNER)}
          </TLabel>
        </Tooltip>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid w-full grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
          {feesMap === undefined ? (
            <>
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </>
          ) : (
            Object.entries(feesMap).map(
              ([coinType, { amount, coinMetadata }]) => (
                <div
                  key={coinType}
                  className="flex w-full flex-row items-center gap-2"
                >
                  <TokenLogo
                    token={getToken(coinType, coinMetadata)}
                    size={16}
                  />

                  <TBody className="overflow-hidden text-ellipsis text-nowrap">
                    {formatToken(amount, { dp: coinMetadata.decimals })}{" "}
                    <TextLink
                      className="font-normal"
                      href={explorer.buildCoinUrl(coinType)}
                      noIcon
                    >
                      {coinMetadata.symbol}
                    </TextLink>
                  </TBody>
                </div>
              ),
            )
          )}
        </div>

        <Button
          className="w-max"
          labelClassName="uppercase text-xs"
          startIcon={<Coins />}
          variant="secondaryOutline"
          onClick={submit}
          disabled={!isEditable}
        >
          Claim referral fees
        </Button>
      </CardContent>
    </Card>
  );
}
