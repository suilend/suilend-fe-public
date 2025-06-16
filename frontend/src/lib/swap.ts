import { useEffect, useMemo } from "react";

import { setSuiClient as set7kSdkSuiClient } from "@7kprotocol/sdk-ts/cjs";
import {
  AggregatorClient as CetusSdk,
  Env,
} from "@cetusprotocol/aggregator-sdk";
import { AggregatorQuoter as FlowXAggregatorQuoter } from "@flowx-finance/sdk";
import { Aftermath as AftermathSdk } from "aftermath-ts-sdk";

import { QuoteProvider } from "@suilend/sdk";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { _7K_PARTNER_ADDRESS } from "@/lib/7k";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { FLOWX_PARTNER_ID } from "@/lib/flowx";

export type SdkMap = {
  [QuoteProvider.AFTERMATH]: AftermathSdk;
  [QuoteProvider.CETUS]: CetusSdk;
  [QuoteProvider.FLOWX]: FlowXAggregatorQuoter;
};
export type PartnerIdMap = {
  [QuoteProvider.CETUS]: string;
  [QuoteProvider._7K]: string;
  [QuoteProvider.FLOWX]: string;
};

export const useAggSdks = (): {
  sdkMap: SdkMap;
  partnerIdMap: PartnerIdMap;
} => {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  // SDKs
  const aftermathSdk = useMemo(() => {
    const sdk = new AftermathSdk("MAINNET");
    sdk.init();
    return sdk;
  }, []);

  const cetusSdk = useMemo(() => {
    const sdk = new CetusSdk({
      endpoint: "https://api-sui.cetus.zone/router_v2/find_routes",
      signer: address,
      client: suiClient,
      env: Env.Mainnet,
    });
    return sdk;
  }, [address, suiClient]);

  useEffect(() => {
    set7kSdkSuiClient(suiClient);
  }, [suiClient]);

  const flowXSdk = useMemo(() => {
    const sdk = new FlowXAggregatorQuoter("mainnet");
    return sdk;
  }, []);

  // Config
  const sdkMap = useMemo(
    () => ({
      [QuoteProvider.AFTERMATH]: aftermathSdk,
      [QuoteProvider.CETUS]: cetusSdk,
      [QuoteProvider.FLOWX]: flowXSdk,
    }),
    [aftermathSdk, cetusSdk, flowXSdk],
  );

  const partnerIdMap = useMemo(
    () => ({
      [QuoteProvider.CETUS]: CETUS_PARTNER_ID,
      [QuoteProvider._7K]: _7K_PARTNER_ADDRESS,
      [QuoteProvider.FLOWX]: FLOWX_PARTNER_ID,
    }),
    [],
  );

  return { sdkMap, partnerIdMap };
};
