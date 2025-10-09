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

export interface VaultContext {
  vaults: ParsedVault[];
  createVault: (args: {
    baseCoinType: string;
    managementFeeBps: number;
    performanceFeeBps: number;
    depositFeeBps: number;
    withdrawalFeeBps: number;
    feeReceiver?: string;
  }) => Promise<void>;

  createObligation: (args: {
    vaultId: string;
    lendingMarketId: string; // type auto-detected
    baseCoinType: string; // T
    managerCapId: string;
  }) => Promise<void>;

  deployFunds: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType: string;
    obligationIndex: number;
    amount: string;
    baseCoinType: string;
    managerCapId: string;
  }) => Promise<void>;

  withdrawDeployedFunds: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType: string;
    obligationIndex: number;
    ctokenAmount: string;
    baseCoinType: string;
    managerCapId: string;
  }) => Promise<void>;

  listVaultObligations: (vaultId: string) => Promise<VaultObligationEntry[]>;

  // Vault page data
  vaultPageVaultId?: string;
  setVaultPageVaultId: (vaultId?: string) => void;
  vaultData?: ParsedVault;
  isLoadingVaultData: boolean;
  errorVaultData?: string;

  depositIntoVault: (args: {
    vaultId: string;
    baseCoinType: string;
    amount: string; // human units
    pricingLendingMarketId: string;
    lendingMarketType: string;
  }) => Promise<void>;

  withdrawFromVault: (args: {
    vaultId: string;
    baseCoinType: string;
    sharesAmount: string; // in shares u64
    pricingLendingMarketId: string;
    lendingMarketType: string;
  }) => Promise<void>;
}

const defaultContextValue: VaultContext = {
  vaults: [] as ParsedVault[],
  createVault: async () => {},
  createObligation: async () => {},
  deployFunds: async () => {},
  withdrawDeployedFunds: async () => {},
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
  } = useFetchVault(vaultPageVaultId, address);

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

  // Context
  const contextValue: VaultContext = useMemo(
    () => ({
      vaults: fetchedVaults as ParsedVault[],
      // Vault page state
      vaultPageVaultId,
      setVaultPageVaultId,
      vaultData,
      isLoadingVaultData,
      createVault: async ({
        baseCoinType,
        managementFeeBps,
        performanceFeeBps,
        depositFeeBps,
        withdrawalFeeBps,
        feeReceiver,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!baseCoinType) throw new Error("Enter a base coin type");

        const receiver =
          feeReceiver && feeReceiver !== "" ? feeReceiver : address;

        const transaction = new Transaction();

        const [managerCap] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault`,
          typeArguments: [baseCoinType],
          arguments: [
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
      createObligation: async ({
        vaultId,
        lendingMarketId,
        baseCoinType,
        managerCapId,
      }) => {
        if (!address) throw new Error("Wallet not connected");

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
        managerCapId,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        const obligations = vaultData?.obligations || [];
        if (!obligations.length)
          throw new Error("Vault has no obligations to price against");

        const transaction = new Transaction();

        // Aggregation based on vault obligations
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            `${VAULTS_PACKAGE_ID}::vault::VaultShare`,
            baseCoinType,
          ],
          arguments: [transaction.object(vaultId)],
        });
        const resolvedAgg = obligations
          .map((o) => ({ id: o.lendingMarketId, type: o.marketType }))
          .slice(0, Math.max(1, obligations.length));
        for (const m of resolvedAgg) {
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [m.type],
            arguments: [acc, transaction.object(m.id)],
          });
        }
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
            lendingMarketType,
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
        managerCapId,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        const obligations = vaultData?.obligations || [];
        if (!obligations.length)
          throw new Error("Vault has no obligations to price against");

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
        const resolvedAgg = obligations
          .map((o) => ({ id: o.lendingMarketId, type: o.marketType }))
          .slice(0, Math.max(1, obligations.length));
        for (const m of resolvedAgg) {
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [m.type],
            arguments: [acc, transaction.object(m.id)],
          });
        }
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
            lendingMarketType,
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
        lendingMarketType,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!pricingLendingMarketId)
          throw new Error("Pricing lending market ID is required");

        const transaction = new Transaction();
        // Resolve decimals for base coin and scale human amount -> on-chain units
        const md = await suiClient.getCoinMetadata({ coinType: baseCoinType });
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
        let total: bigint = BigInt(0);
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
        const marketType = lendingMarketType;

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
          typeArguments: [marketType],
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
        lendingMarketType,
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
        let sharesTotal: bigint = BigInt(0);
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
        const marketType = lendingMarketType;

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
          typeArguments: [marketType],
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
