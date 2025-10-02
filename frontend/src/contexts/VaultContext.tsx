import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { toast } from "sonner";

import { getAllOwnedObjects } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import TextLink from "@/components/shared/TextLink";
import { ParsedVault } from "@/fetchers/parseVault";
import useFetchVault from "@/fetchers/useFetchVault";
import useFetchVaults from "@/fetchers/useFetchVaults";
import { TX_TOAST_DURATION, VAULTS_PACKAGE_ID } from "@/lib/constants";

export type VaultObligationEntry = {
  marketType: string;
  lendingMarketId?: string;
  index: number;
  obligationId: string;
};

interface VaultContext {
  vaults: ParsedVault[];
  createVault: (args: {
    baseCoinType: string;
    managementFeeBps: number;
    performanceFeeBps: number;
    depositFeeBps: number;
    withdrawalFeeBps: number;
    feeReceiver?: string;
  }) => Promise<void>;

  findManagerCapIdForVault: (vaultId: string) => Promise<string | undefined>;

  createObligation: (args: {
    vaultId: string;
    lendingMarketId: string; // type auto-detected
    baseCoinType: string; // T
  }) => Promise<void>;

  deployFunds: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType?: string; // auto-detected if omitted
    obligationIndex: number;
    amount: string;
    baseCoinType: string;
    aggregatorMarkets: {
      lendingMarketId: string;
      lendingMarketType?: string;
    }[]; // types auto-detected
  }) => Promise<void>;

  withdrawDeployedFunds: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType?: string;
    obligationIndex: number;
    ctokenAmount: string;
    baseCoinType: string;
    aggregatorMarkets: {
      lendingMarketId: string;
      lendingMarketType?: string;
    }[];
  }) => Promise<void>;

  compoundPerformanceFees: (args: {
    vaultId: string;
    baseCoinType: string;
    aggregatorMarkets: { lendingMarketId: string; lendingMarketType: string }[];
  }) => Promise<void>;

  listVaultObligations: (vaultId: string) => Promise<VaultObligationEntry[]>;

  // Vault page data
  vaultPageVaultId?: string;
  setVaultPageVaultId: (vaultId?: string) => void;
  vaultData?: {
    id: string;
    baseCoinType?: string;
    undeployedAmount: BigNumber;
    deployedAmount: BigNumber;
    obligations: {
      obligationId: string;
      lendingMarketId?: string;
      marketType: string;
    }[];
    pricingLendingMarketId?: string;
    object: SuiObjectResponse;
  };
  isLoadingVaultData: boolean;
  errorVaultData?: string;

  depositIntoVault: (args: {
    vaultId: string;
    baseCoinType: string;
    amount: string; // human units
    pricingLendingMarketId?: string;
  }) => Promise<void>;

  withdrawFromVault: (args: {
    vaultId: string;
    baseCoinType: string;
    sharesAmount: string; // in shares u64
    pricingLendingMarketId?: string;
  }) => Promise<void>;
}

const defaultContextValue: VaultContext = {
  vaults: [] as ParsedVault[],
  createVault: async () => {},
  findManagerCapIdForVault: async () => undefined,
  createObligation: async () => {},
  deployFunds: async () => {},
  withdrawDeployedFunds: async () => {},
  compoundPerformanceFees: async () => {},
  listVaultObligations: async () => [],
  vaultPageVaultId: undefined,
  setVaultPageVaultId: () => {},
  vaultData: undefined,
  isLoadingVaultData: false,
  errorVaultData: undefined,
  depositIntoVault: async () => {},
  withdrawFromVault: async () => {},
};

const VaultContext = createContext<VaultContext>(defaultContextValue);

export const useVaultContext = () => useContext(VaultContext);

export function VaultContextProvider({ children }: PropsWithChildren) {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  // Vault page: fetchers managed here
  const [vaultPageVaultId, setVaultPageVaultId] = useState<string | undefined>(
    undefined,
  );
  const {
    data: vaultData,
    isLoading: isLoadingVaultData,
    error: errorVaultDataObj,
  } = useFetchVault(vaultPageVaultId);

  const { data: fetchedVaults } = useFetchVaults();

  const getInnerType = (fullType: string, base: string): string | undefined => {
    const anchor = `${base}<`;
    const start = fullType.indexOf(anchor);
    if (start === -1) return undefined;
    let i = start + anchor.length;
    let depth = 0;
    let curr = "";
    for (; i < fullType.length; i++) {
      const ch = fullType[i];
      if (ch === "<") depth++;
      if (ch === ">") {
        if (depth === 0) {
          curr += "";
          break;
        }
        depth--;
      }
      curr += ch;
    }
    // For single generic T, return the whole inner content (may include commas)
    // For LendingMarket<L> we expect a single type param with no top-level commas
    const parts = [] as string[];
    let part = "";
    let d = 0;
    for (const ch of curr) {
      if (ch === "<") d++;
      if (ch === ">") d--;
      if (ch === "," && d === 0) {
        parts.push(part.trim());
        part = "";
      } else {
        part += ch;
      }
    }
    if (part.trim().length) parts.push(part.trim());
    return parts[0];
  };

  const detectLendingMarketType = async (
    lendingMarketId: string,
  ): Promise<string> => {
    const obj = await suiClient.getObject({
      id: lendingMarketId,
      options: { showContent: true },
    });
    const typeStr = (obj.data?.content as any)?.type as string | undefined;
    if (!typeStr) throw new Error("Invalid lending market object");
    const lmBase = "::lending_market::LendingMarket";
    const idx = typeStr.indexOf(lmBase);
    if (idx === -1) throw new Error("Object is not a LendingMarket");
    const pkgAndMod = typeStr.substring(0, idx);
    const base = `${pkgAndMod}${lmBase}`;
    const inner = getInnerType(typeStr, base);
    if (!inner) throw new Error("Failed to detect LendingMarket type");
    return inner;
  };

  const getLendingMarketTypeToId = async (): Promise<
    Record<string, string>
  > => {
    const REGISTRY_PARENT_ID =
      "0xdc00dfa5ea142a50f6809751ba8dcf84ae5c60ca5f383e51b3438c9f6d72a86e";
    const df = await suiClient.getDynamicFields({
      parentId: REGISTRY_PARENT_ID,
    });
    const entries = await Promise.all(
      df.data.map(async ({ objectId }) =>
        suiClient.getObject({ id: objectId, options: { showContent: true } }),
      ),
    );
    const map: Record<string, string> = {};
    for (const e of entries) {
      const c = e.data?.content as any;
      if (!c) continue;
      const lendingMarketId: string = c.fields.value;
      const lendingMarketType: string = `0x${c.fields.name.fields.name}`;
      map[lendingMarketType] = lendingMarketId;
    }
    return map;
  };

  // Context
  const contextValue: VaultContext = useMemo(
    () => ({
      vaults: fetchedVaults as ParsedVault[],
      // Vault page state
      vaultPageVaultId,
      setVaultPageVaultId,
      vaultData,
      isLoadingVaultData,
      errorVaultData: (errorVaultDataObj as any)?.message,
      createVault: async ({
        baseCoinType,
        managementFeeBps,
        performanceFeeBps,
        depositFeeBps,
        withdrawalFeeBps,
        feeReceiver,
      }) => {
        console.log(
          "createVault",
          baseCoinType,
          managementFeeBps,
          performanceFeeBps,
          depositFeeBps,
          withdrawalFeeBps,
          feeReceiver,
        );
        debugger;
        if (!address) throw new Error("Wallet not connected");
        if (!baseCoinType) throw new Error("Enter a base coin type");

        const receiver =
          feeReceiver && feeReceiver !== "" ? feeReceiver : address;

        const transaction = new Transaction();

        const [managerCap] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault`,
          typeArguments: [baseCoinType],
          arguments: [
            transaction.pure.address(receiver),
            transaction.pure.u64(managementFeeBps.toString()),
            transaction.pure.u64(performanceFeeBps.toString()),
            transaction.pure.u64(depositFeeBps.toString()),
            transaction.pure.u64(withdrawalFeeBps.toString()),
            transaction.object(SUI_CLOCK_OBJECT_ID),
          ],
        });

        transaction.transferObjects(
          [managerCap],
          transaction.pure.address(address),
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success("Created vault", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },
      findManagerCapIdForVault: async (vaultId: string) => {
        if (!address) throw new Error("Wallet not connected");
        const managerCapStructType = `${VAULTS_PACKAGE_ID}::vault::VaultManagerCap<${VAULTS_PACKAGE_ID}::vault::VaultShare>`;
        const objs = await getAllOwnedObjects(suiClient, address, {
          StructType: managerCapStructType,
        });
        const match = objs.find(
          (o) => (o.data?.content as any)?.fields?.vault_id === vaultId,
        );
        return match?.data?.objectId as string | undefined;
      },

      createObligation: async ({ vaultId, lendingMarketId, baseCoinType }) => {
        if (!address) throw new Error("Wallet not connected");
        const managerCapId =
          await contextValue.findManagerCapIdForVault(vaultId);
        if (!managerCapId)
          throw new Error(
            "Manager cap for this vault not found in your wallet",
          );

        const lendingMarketType =
          await detectLendingMarketType(lendingMarketId);

        const transaction = new Transaction();
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_obligation`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            lendingMarketType,
            baseCoinType,
          ],
          arguments: [
            transaction.object(vaultId),
            transaction.object(managerCapId),
            transaction.object(lendingMarketId),
          ],
        });

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Created obligation", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },

      deployFunds: async ({
        vaultId,
        lendingMarketId,
        lendingMarketType,
        obligationIndex,
        amount,
        baseCoinType,
        aggregatorMarkets,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!aggregatorMarkets.length)
          throw new Error("Add at least one lending market for aggregation");

        const managerCapId =
          await contextValue.findManagerCapIdForVault(vaultId);
        if (!managerCapId)
          throw new Error(
            "Manager cap for this vault not found in your wallet",
          );

        const transaction = new Transaction();

        // Aggregation (auto-detect types for each market)
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [transaction.object(vaultId)],
        });
        const resolvedAgg = [] as { id: string; type: string }[];
        for (const m of aggregatorMarkets) {
          const type =
            m.lendingMarketType ??
            (await detectLendingMarketType(m.lendingMarketId));
          resolvedAgg.push({ id: m.lendingMarketId, type });
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [type, baseCoinType],
            arguments: [acc, transaction.object(m.lendingMarketId)],
          });
        }
        const targetLendingMarketType =
          lendingMarketType ?? (await detectLendingMarketType(lendingMarketId));
        const pricingMarket = resolvedAgg[0];
        const agg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            pricingMarket.type,
            baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vaultId),
            transaction.object(pricingMarket.id),
          ],
        });

        // Deploy funds
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::deploy_funds`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            targetLendingMarketType,
            baseCoinType,
          ],
          arguments: [
            transaction.object(vaultId),
            transaction.object(managerCapId),
            transaction.object(lendingMarketId),
            transaction.pure.u64(obligationIndex.toString()),
            transaction.pure.u64(amount),
            transaction.object(SUI_CLOCK_OBJECT_ID),
            agg,
          ],
        });

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Deployed funds to obligation", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },

      withdrawDeployedFunds: async ({
        vaultId,
        lendingMarketId,
        lendingMarketType,
        obligationIndex,
        ctokenAmount,
        baseCoinType,
        aggregatorMarkets,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!aggregatorMarkets.length)
          throw new Error("Add at least one lending market for aggregation");

        const managerCapId =
          await contextValue.findManagerCapIdForVault(vaultId);
        if (!managerCapId)
          throw new Error(
            "Manager cap for this vault not found in your wallet",
          );

        const transaction = new Transaction();

        // Aggregation (auto-detect types)
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [transaction.object(vaultId)],
        });
        const resolvedAgg = [] as { id: string; type: string }[];
        for (const m of aggregatorMarkets) {
          const type =
            m.lendingMarketType ??
            (await detectLendingMarketType(m.lendingMarketId));
          resolvedAgg.push({ id: m.lendingMarketId, type });
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [type, baseCoinType],
            arguments: [acc, transaction.object(m.lendingMarketId)],
          });
        }
        const targetLendingMarketType =
          lendingMarketType ?? (await detectLendingMarketType(lendingMarketId));
        const pricingMarket = resolvedAgg[0];
        const agg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            pricingMarket.type,
            baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vaultId),
            transaction.object(pricingMarket.id),
          ],
        });

        // Withdraw
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::withdraw_deployed_funds`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            targetLendingMarketType,
            baseCoinType,
          ],
          arguments: [
            transaction.object(vaultId),
            transaction.object(managerCapId),
            transaction.object(lendingMarketId),
            transaction.pure.u64(obligationIndex.toString()),
            transaction.pure.u64(ctokenAmount),
            transaction.object(SUI_CLOCK_OBJECT_ID),
            agg,
          ],
        });

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Withdrew deployed funds", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },

      compoundPerformanceFees: async ({
        vaultId,
        baseCoinType,
        aggregatorMarkets,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!aggregatorMarkets.length)
          throw new Error("Add at least one lending market for aggregation");

        const transaction = new Transaction();

        // Aggregation
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [transaction.object(vaultId)],
        });
        for (const m of aggregatorMarkets) {
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [m.lendingMarketType, baseCoinType],
            arguments: [acc, transaction.object(m.lendingMarketId)],
          });
        }
        const pricingMarket = aggregatorMarkets[0];
        const agg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            pricingMarket.lendingMarketType,
            baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vaultId),
            transaction.object(pricingMarket.lendingMarketId),
          ],
        });

        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::compound_performance_fees`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [
            transaction.object(vaultId),
            agg,
            transaction.object(SUI_CLOCK_OBJECT_ID),
          ],
        });

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Compounded performance fees", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },

      listVaultObligations: async (vaultId: string) => {
        if (!address) throw new Error("Wallet not connected");
        const managerCapStructType = `${VAULTS_PACKAGE_ID}::vault::VaultManagerCap<${VAULTS_PACKAGE_ID}::vault::VaultShare>`;
        const objs = await getAllOwnedObjects(suiClient, address, {
          StructType: managerCapStructType,
        });
        const match = objs.find(
          (o) => (o.data?.content as any)?.fields?.vault_id === vaultId,
        );
        if (!match) return [];

        const obligations: VaultObligationEntry[] = [];
        const managerCapId = (match.data as any).objectId;
        const managerCap = await suiClient.getObject({
          id: managerCapId,
          options: { showContent: true },
        });
        const managerCapContent = managerCap.data?.content as any;

        const obligationsParentId =
          managerCapContent.fields.obligations_parent_id;
        if (!obligationsParentId) return [];

        const df = await suiClient.getDynamicFields({
          parentId: obligationsParentId,
        });
        const entries = await Promise.all(
          df.data.map(async ({ objectId }) =>
            suiClient.getObject({
              id: objectId,
              options: { showContent: true },
            }),
          ),
        );

        for (const e of entries) {
          const c = e.data?.content as any;
          if (!c) continue;
          const lendingMarketId: string = c.fields.value;
          const lendingMarketType: string = `0x${c.fields.name.fields.name}`;
          const obligationId: string = c.fields.obligation_id;
          const index: number = c.fields.index;

          obligations.push({
            marketType: lendingMarketType,
            lendingMarketId,
            index,
            obligationId,
          });
        }
        return obligations;
      },

      depositIntoVault: async ({
        vaultId,
        baseCoinType,
        amount,
        pricingLendingMarketId,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!pricingLendingMarketId)
          throw new Error("Pricing lending market ID is required");

        const transaction = new Transaction();
        // Resolve decimals for base coin and scale human amount -> on-chain units
        const md = await suiClient.getCoinMetadata({ coinType: baseCoinType });
        console.log(baseCoinType, amount, pricingLendingMarketId, md);
        const decimals = md?.decimals ?? 9;
        const amountMinor = new BigNumber(amount)
          .times(new BigNumber(10).pow(decimals))
          .integerValue(BigNumber.ROUND_FLOOR)
          .toString();
        // On-chain min deposit is 1_000_000 base units
        if (new BigNumber(amountMinor).lt(1_000_000)) {
          throw new Error(
            "Minimum deposit is 1,000,000 base units (check decimals)",
          );
        }

        // Prepare Coin<T> of baseCoinType from user's coins
        const coinsRes = await suiClient.getCoins({
          owner: address,
          coinType: baseCoinType,
          limit: 200,
        });
        const coins = coinsRes.data || [];
        const amountU64 = BigInt(amountMinor);
        let total: bigint = 0n;
        for (const c of coins) total += BigInt(c.balance);
        if (total < amountU64)
          throw new Error("Insufficient balance of base coin");
        const primary = coins[0];
        const primaryObj = transaction.object(primary.coinObjectId);
        const others = coins
          .slice(1)
          .map((c) => transaction.object(c.coinObjectId));
        if (others.length > 0) transaction.mergeCoins(primaryObj, others);
        const [inputCoin] = transaction.splitCoins(primaryObj, [
          transaction.pure.u64(amountMinor),
        ]);

        // Resolve market type once
        const marketType = await detectLendingMarketType(
          pricingLendingMarketId,
        );

        // Build an empty aggregate for pricing (single market ok)
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [transaction.object(vaultId)],
        });
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
          typeArguments: [marketType, baseCoinType],
          arguments: [acc, transaction.object(pricingLendingMarketId)],
        });
        const agg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            marketType,
            baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vaultId),
            transaction.object(pricingLendingMarketId),
          ],
        });

        // Call deposit<P,L,T> -> returns Coin<P> (shares)
        const [mintedShares] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::deposit`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            marketType,
            baseCoinType,
          ],
          arguments: [
            transaction.object(vaultId),
            inputCoin,
            transaction.object(pricingLendingMarketId),
            transaction.object(SUI_CLOCK_OBJECT_ID),
            agg,
          ],
        });

        // Transfer minted shares to user
        transaction.transferObjects(
          [mintedShares],
          transaction.pure.address(address),
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Deposited into vault", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },

      withdrawFromVault: async ({
        vaultId,
        baseCoinType,
        sharesAmount,
        pricingLendingMarketId,
      }) => {
        if (!address) throw new Error("Wallet not connected");

        const transaction = new Transaction();

        // Prepare Coin<VaultShare> from user's share coins
        const shareType = `${VAULTS_PACKAGE_ID}::vault::VaultShare`;
        const sharesRes = await suiClient.getCoins({
          owner: address,
          coinType: shareType,
          limit: 200,
        });
        const shareCoins = sharesRes.data || [];
        const sharesNeeded = BigInt(sharesAmount);
        let sharesTotal: bigint = 0n;
        for (const c of shareCoins) sharesTotal += BigInt(c.balance);
        if (sharesTotal < sharesNeeded)
          throw new Error("Insufficient vault shares");
        const primaryShare = shareCoins[0];
        const primaryShareObj = transaction.object(primaryShare.coinObjectId);
        const otherShares = shareCoins
          .slice(1)
          .map((c) => transaction.object(c.coinObjectId));
        if (otherShares.length > 0)
          transaction.mergeCoins(primaryShareObj, otherShares);
        const [sharesCoin] = transaction.splitCoins(primaryShareObj, [
          transaction.pure.u64(sharesAmount),
        ]);

        if (!pricingLendingMarketId)
          throw new Error("Pricing lending market ID is required");

        // Resolve market type once
        const marketType = await detectLendingMarketType(
          pricingLendingMarketId,
        );

        // Aggregation
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [transaction.object(vaultId)],
        });
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
          typeArguments: [marketType, baseCoinType],
          arguments: [acc, transaction.object(pricingLendingMarketId)],
        });
        const agg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            marketType,
            baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vaultId),
            transaction.object(pricingLendingMarketId),
          ],
        });

        // Call withdraw<P,L,T> -> returns Coin<T> (base coin)
        const [baseCoinOut] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::withdraw`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            marketType,
            baseCoinType,
          ],
          arguments: [
            transaction.object(vaultId),
            sharesCoin,
            transaction.object(pricingLendingMarketId),
            transaction.object(SUI_CLOCK_OBJECT_ID),
            agg,
          ],
        });

        // Transfer withdrawn base coin to user
        transaction.transferObjects(
          [baseCoinOut],
          transaction.pure.address(address),
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Withdrew from vault", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
      },
    }),
    [
      address,
      explorer,
      signExecuteAndWaitForTransaction,
      suiClient,
      fetchedVaults,
      vaultPageVaultId,
      vaultData,
      isLoadingVaultData,
      errorVaultDataObj,
    ],
  );

  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  );
}
