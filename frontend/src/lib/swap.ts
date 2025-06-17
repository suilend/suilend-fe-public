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

import { CETUS_PARTNER_ID } from "@/lib/cetus";

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

export const useCetusSdk = () => {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  const cetusSdk = useMemo(() => {
    const sdk = new CetusSdk({
      endpoint: "https://api-sui.cetus.zone/router_v2/find_routes",
      signer: address,
      client: suiClient,
      env: Env.Mainnet,
    });
    return sdk;
  }, [address, suiClient]);

  return cetusSdk;
};

export const useAggSdks = (): {
  sdkMap: SdkMap;
  partnerIdMap: PartnerIdMap;
} => {
  const { suiClient } = useSettingsContext();

  // SDKs
  const aftermathSdk = useMemo(() => {
    const sdk = new AftermathSdk("MAINNET");
    sdk.init();
    return sdk;
  }, []);

  const cetusSdk = useCetusSdk();

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
      [QuoteProvider._7K]:
        "0x7d68adb758c18d0f1e6cbbfe07c4c12bce92de37ce61b27b51245a568381b83e",
      [QuoteProvider.FLOWX]:
        "0x7d68adb758c18d0f1e6cbbfe07c4c12bce92de37ce61b27b51245a568381b83e",
    }),
    [],
  );

  return { sdkMap, partnerIdMap };
};
