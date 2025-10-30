import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
} from "react";
import BigNumber from "bignumber.js";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { toast } from "sonner";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";
import TextLink from "@/components/shared/TextLink";
import { ParsedVault } from "@/fetchers/parseVault";
import useFetchVault from "@/fetchers/useFetchVault";
import useFetchVaults from "@/fetchers/useFetchVaults";
import {
  TX_TOAST_DURATION,
  VAULTS_PACKAGE_ID,
  VSHARES_BYTECODE_B64,
} from "@/lib/constants";
import { useRouter } from "next/router";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { formatToken } from "@suilend/sui-fe";
import useFetchVaultHistory, { VaultEvent } from "@/fetchers/useFetchVaultHistory";

export type VaultMetadata = {
  id: string;
  name: string;
  description: React.ReactNode;
  image: string;
  queryParam: string;
}

export const VAULT_METADATA: Record<string, VaultMetadata> = {
  ["0x5fb667f4660b9d39e3f4c446c2836fcf2c9252710bfc6552fec132104b402086"]: {
    id: "0x5fb667f4660b9d39e3f4c446c2836fcf2c9252710bfc6552fec132104b402086",
    name: "USDC Vault",
    description: <div>
    USDC Prime is a conservative lending strategy designed to deliver consistent, risk-adjusted yields by allocating funds across highly liquid markets and premium collateral.
<br />
<br />
Managed by Steakhouse Financial, this vault optimizes returns by lending USDC against both core collateral markets (ain/JLP) and select real-world asset (RWA) pools, dynamically adapting to market conditions to ensure robust yield performance and capital preservation.
</div>,
    image: "/assets/tokens/USDC.png",
    queryParam: "usdc-vault",
  },
}

export type VaultObligationEntry = {
  marketType: string;
  lendingMarketId?: string;
  index: number;
  obligationId: string;
};

export interface VaultContext {
  vaults: ParsedVault[];
  vaultHistory: Record<string, VaultEvent[]>;
  userVaultHistory: Record<string, VaultEvent[]>;
  userPnls: Record<string, BigNumber | undefined>;
  createVault: (args: {
    baseCoinType: string;
    managementFeeBps: number;
    performanceFeeBps: number;
    depositFeeBps: number;
    withdrawalFeeBps: number;
  }) => Promise<void>;

  createObligation: (args: {
    vault: ParsedVault;
    lendingMarketId: string;
  }) => Promise<void>;

  deployFunds: (args: {
    vault: ParsedVault;
    lendingMarketId: string;
    amount: string;
  }) => Promise<void>;

  withdrawDeployedFunds: (args: {
    vault: ParsedVault;
    lendingMarketId: string;
    ctokenAmount: string;
  }) => Promise<void>;

  // Vault page data
  vaultData?: ParsedVault;
  isLoadingVaultData: boolean;
  errorVaultData?: string;

  depositIntoVault: (args: {
    vault: ParsedVault;
    amount: string; // human units
    }) => Promise<SuiTransactionBlockResponse>;

  withdrawFromVault: (args: {
    vault: ParsedVault;
    amount: string; // human units
    useMaxAmount: boolean;
  }) => Promise<SuiTransactionBlockResponse>;

  claimManagerFees: (args: {
    vault: ParsedVault;
    amount: string; // u64 amount in on-chain units
  }) => Promise<SuiTransactionBlockResponse>;

  compoundRewards: (args: {
    vault: ParsedVault;
    lendingMarketId: string;
    obligationIndex: string; // u64
    rewardReserveIndex: string; // u64
    rewardIndex: string; // u64
    isDepositReward: boolean;
    depositReserveIndex: string; // u64
  }) => Promise<SuiTransactionBlockResponse>;
};

const defaultContextValue: VaultContext = {
  vaults: [] as ParsedVault[],
  vaultHistory: {},
  userVaultHistory: {},
  userPnls: {},
  createVault: async () => {},
  createObligation: async () => {},
  deployFunds: async () => {},
  withdrawDeployedFunds: async () => {},
  vaultData: undefined,
  isLoadingVaultData: false,
  errorVaultData: undefined,
  depositIntoVault: async () => {
    throw new Error("Not implemented");
  },
  withdrawFromVault: async () => {
    throw new Error("Not implemented");
  },
  claimManagerFees: async () => {
    throw new Error("Not implemented");
  },
  compoundRewards: async () => {
    throw new Error("Not implemented");
  },
};

const VaultContext = createContext<VaultContext>(defaultContextValue);

export const useVaultContext = () => useContext(VaultContext);

export function VaultContextProvider({ children }: PropsWithChildren) {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const router = useRouter();
  const { vaultId } = router.query as { vaultId?: string };
  const { data: vaultHistory } = useFetchVaultHistory();
  const { data: userVaultHistory } = useFetchVaultHistory(undefined, address);

  const {
    data: vaultData,
    isLoading: isLoadingVaultData,
    error: errorVaultDataObj,
  } = useFetchVault(vaultId);

  const { data: fetchedVaults, mutate: mutateVaults } = useFetchVaults();

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

  const userPnls = useMemo(() => {
    return fetchedVaults.reduce((acc, vault) => {
      const vaultHistory = userVaultHistory?.[vault.id];
      const netDepositAmount = vaultHistory?.reduce((acc, event) => {
        if (event.type === "VaultDepositEvent") {
          acc.plus(event.deposit_amount);
        } else if (event.type === "VaultWithdrawEvent") {
          acc.minus(event.amount);
        }
        return acc;
      }, new BigNumber(0)) ?? new BigNumber(0);
      acc[vault.id] = vaultHistory?.length ? vault.userSharesBalance.minus(netDepositAmount) : undefined;
      return acc;
    }, {} as Record<string, BigNumber | undefined>);
  }, [fetchedVaults, userVaultHistory]);

  // Context
  const contextValue: VaultContext = useMemo(
    () => ({
      vaults: fetchedVaults as ParsedVault[],
      userPnls,
      vaultHistory: vaultHistory ?? {},
      userVaultHistory: userVaultHistory ?? {},
      vaultData,
      isLoadingVaultData,
      createVault: async ({
        baseCoinType,
        managementFeeBps,
        performanceFeeBps,
        depositFeeBps,
        withdrawalFeeBps,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!baseCoinType) throw new Error("Enter a base coin type");

        // 1) Publish the VSHARES coin module to mint TreasuryCap and MetadataCap in init
        const publishTx = new Transaction();
        // Some build pipelines output modules with a Move binary header and version prefix,
        // e.g. 0xDE AD C0 DE <u32 version> or 0xA1 1C EB 0B <u32 version>.
        // Sui expects modules without this header when publishing.
        const [upgradeCap] = publishTx.publish({
          modules: [VSHARES_BYTECODE_B64],
          // Sui std and framework
          dependencies: ["0x1", "0x2"],
        });
        // Transfer the UpgradeCap so it isn't left unused in the transaction
        publishTx.transferObjects(
          [upgradeCap],
          publishTx.pure.address(address),
        );

        const publishRes = await signExecuteAndWaitForTransaction(publishTx);
        const objectChanges = (publishRes.objectChanges || []) as any[];
        const publishedChange = objectChanges.find((c) => c.type === "published") as any;
        const pkgId = publishedChange?.packageId as string | undefined;
        if (!pkgId) throw new Error("Failed to publish VSHARES module");

        // Compute the share type from the newly published package
        const shareType = `${pkgId}::vshares::VSHARES`;

        // Parse created objects from publish results instead of fetching by owner
        const treasuryCapId = objectChanges.find(
          (c) =>
            c.type === "created" &&
            typeof c.objectType === "string" &&
            c.objectType === `0x2::coin::TreasuryCap<${shareType}>`,
        )?.objectId as string | undefined;

        const currencyId = objectChanges.find(
          (c) =>
            c.type === "created" &&
            typeof c.objectType === "string" &&
            c.objectType === `0x2::coin_registry::Currency<${shareType}>`,
        )?.objectId as string | undefined;

        if (!treasuryCapId)
          throw new Error("TreasuryCap not found in publish results");
        if (!currencyId)
          throw new Error("Currency object not found in publish results");

        // 2) Delete MetadataCap -> Currency<P>, then create_vault<P,T>
        const createTx = new Transaction();

        const [managerCap] = createTx.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault`,
          typeArguments: [shareType, baseCoinType],
          arguments: [
            createTx.object(treasuryCapId),
            // createTx.object(LENDING_MARKET_ID),
            createTx.pure.u64(managementFeeBps.toString()),
            createTx.pure.u64(performanceFeeBps.toString()),
            createTx.pure.u64(depositFeeBps.toString()),
            createTx.pure.u64(withdrawalFeeBps.toString()),
            createTx.object(SUI_CLOCK_OBJECT_ID),
          ],
        });

        createTx.transferObjects(
          [managerCap],
          createTx.pure.address(address),
        );

        const res = await signExecuteAndWaitForTransaction(createTx);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success("Created vault", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
        mutateVaults();
      },
      createObligation: async ({
        vault,
        lendingMarketId,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!vault.managerCapId) throw new Error("Vault manager cap ID is required");

        const { shareType } = vault;
        const lendingMarketType =
          await detectLendingMarketType(lendingMarketId);

        const transaction = new Transaction();
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_obligation`,
          typeArguments: [
            shareType,
            lendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            transaction.object(vault.managerCapId),
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
        vault,
        lendingMarketId,
        amount,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!vault.managerCapId) throw new Error("Vault manager cap ID is required");
        const obligations = vaultData?.obligations || [];
        if (!obligations.length)
          throw new Error("Vault has no obligations to price against");


        const transaction = new Transaction();

        // Aggregation based on vault obligations
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            vault.shareType,
            vault.baseCoinType,
          ],
          arguments: [transaction.object(vault.id)],
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
            vault.shareType,
            pricingMarket.type,
            vault.baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vault.id),
            transaction.object(pricingMarket.id),
          ],
        });

        const lendingMarketType = pricingMarket.type;
        const obligationIndex = obligations.find((o) => o.lendingMarketId === pricingMarket.id)?.index;
        if (obligationIndex === undefined) throw new Error("Obligation not found");

        // Deploy funds
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::deploy_funds`,
          typeArguments: [
            vault.shareType,
            lendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            transaction.object(vault.managerCapId),
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
        vault,
        lendingMarketId,
        ctokenAmount,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!vault.managerCapId) throw new Error("Vault manager cap ID is required");

        const obligations = vaultData?.obligations || [];
        if (!obligations.length)
          throw new Error("Vault has no obligations to price against");

        const transaction = new Transaction();

        // Aggregation
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            vault.shareType,
            vault.baseCoinType,
          ],
          arguments: [transaction.object(vault.id)],
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
            vault.shareType,
            pricingMarket.type,
            vault.baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vault.id),
            transaction.object(pricingMarket.id),
          ],
        });

        const lendingMarketType = pricingMarket.type;
        const obligationIndex = obligations.find((o) => o.lendingMarketId === pricingMarket.id)?.index;
        if (obligationIndex === undefined) throw new Error("Obligation not found");

        // Withdraw
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::withdraw_deployed_funds`,
          typeArguments: [
            vault.shareType,
            lendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            transaction.object(vault.managerCapId),
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

      depositIntoVault: async ({
        vault,
        amount,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!vault.managerCapId) throw new Error("Vault manager cap ID is required");
        if (!vault.pricingLendingMarketType || !vault.pricingLendingMarketId)
          throw new Error("Vault doesn't have any obligations");

        const transaction = new Transaction();
        // Resolve decimals for base coin and scale human amount -> on-chain units
        const md = await suiClient.getCoinMetadata({ coinType: vault.baseCoinType });
        const decimals = md?.decimals;
        if (!decimals) throw new Error("Failed to get decimals");
        const amountMinor = new BigNumber(amount)
          .times(new BigNumber(10).pow(decimals))
          .integerValue(BigNumber.ROUND_FLOOR)
          .toString();
        // On-chain min deposit is 1_000_000 base units
        if (new BigNumber(amountMinor).lt(1_000_000)) {
          throw new Error(
            `Minimum deposit is ${formatToken(BigNumber(1_000_000).div(new BigNumber(10).pow(decimals)))} base units`,
          );
        }

        // Prepare Coin<T> of baseCoinType from user's coins
        const coinsRes = await suiClient.getCoins({
          owner: address,
          coinType: vault.baseCoinType,
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
        const marketType = vault.pricingLendingMarketType;

        // Build an empty aggregate for pricing (single market ok)
        const acc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            vault.shareType,
            vault.baseCoinType,
          ],
          arguments: [transaction.object(vault.id)],
        });
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
          typeArguments: [vault.pricingLendingMarketType],
          arguments: [acc, transaction.object(vault.pricingLendingMarketId)],
        });
        const agg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            vault.shareType,
            marketType,
            vault.baseCoinType,
          ],
          arguments: [
            acc,
            transaction.object(vault.id),
            transaction.object(vault.pricingLendingMarketId),
          ],
        });

        // Call deposit<P,L,T> -> returns Coin<P> (shares)
        const [mintedShares] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::deposit`,
          typeArguments: [
            vault.shareType,
            vault.pricingLendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            inputCoin,
            transaction.object(vault.pricingLendingMarketId),
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
        return res;
      },

      withdrawFromVault: async ({
        vault,
        amount,
        useMaxAmount = false,
      }) => {
        const amountRounded = new BigNumber(amount).times(new BigNumber(10).pow(vault.baseCoinMetadata?.decimals ?? 0)).decimalPlaces(0, BigNumber.ROUND_FLOOR).toString();
        if (!address) throw new Error("Wallet not connected");
        if (!vault.pricingLendingMarketType || !vault.pricingLendingMarketId)
          throw new Error("Vault doesn't have any obligations");
        const transaction = new Transaction();

        // Calculate shares-to-burn inside this transaction
        let sharesToBurnArg: any = null;
        const calcAcc = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [vault.shareType, vault.baseCoinType],
          arguments: [transaction.object(vault.id)],
        });
        for (const o of vault.obligations || []) {
          if (!o.lendingMarketId || !o.marketType) continue;
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [o.marketType],
            arguments: [calcAcc, transaction.object(o.lendingMarketId)],
          });
        }
        const calcAgg = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            vault.shareType,
            vault.pricingLendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            calcAcc,
            transaction.object(vault.id),
            transaction.object(vault.pricingLendingMarketId),
          ],
        });
        if (!useMaxAmount) {
          sharesToBurnArg = transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::calculate_shares_to_burn`,
            typeArguments: [
              vault.shareType,
              vault.pricingLendingMarketType,
              vault.baseCoinType,
            ],
            arguments: [
              transaction.object(vault.id),
              transaction.pure.u64(amountRounded),
              transaction.object(vault.pricingLendingMarketId),
              calcAgg,
            ],
          });
        }

        // Prepare Coin<VaultShare> from user's share coins
        const sharesRes = await suiClient.getCoins({
          owner: address,
          coinType: vault.shareType,
          limit: 200,
        });
        const shareCoins = sharesRes.data || [];
        let sharesTotal: bigint = BigInt(0);
        for (const c of shareCoins) sharesTotal += BigInt(c.balance);
        console.log('sharesToBurnArg', sharesToBurnArg);
        if (useMaxAmount) {
          sharesToBurnArg = transaction.pure.u64(sharesTotal.toString());
        }
        const primaryShare = shareCoins[0];
        const primaryShareObj = transaction.object(primaryShare.coinObjectId);
        const otherShares = shareCoins
          .slice(1)
          .map((c) => transaction.object(c.coinObjectId));
        if (otherShares.length > 0)
          transaction.mergeCoins(primaryShareObj, otherShares);
        const [sharesCoin] = transaction.splitCoins(primaryShareObj, [
          sharesToBurnArg,
        ]);

        // Aggregation (same as simulation)
        const acc2 = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_accumulator`,
          typeArguments: [
            vault.shareType,
            vault.baseCoinType,
          ],
          arguments: [transaction.object(vault.id)],
        });
        // Process all obligations into the accumulator so valuation covers all markets
        for (const o of vault.obligations || []) {
          if (!o.lendingMarketId || !o.marketType) continue;
          transaction.moveCall({
            target: `${VAULTS_PACKAGE_ID}::vault::process_lending_market`,
            typeArguments: [o.marketType],
            arguments: [acc2, transaction.object(o.lendingMarketId)],
          });
        }
        const agg2 = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::create_vault_value_aggregate`,
          typeArguments: [
            vault.shareType,
            vault.pricingLendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            acc2,
            transaction.object(vault.id),
            transaction.object(vault.pricingLendingMarketId),
          ],
        });

        // Call withdraw<P,L,T> -> returns Coin<T> (base coin)
        const [baseCoinOut] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::withdraw`,
          typeArguments: [
            vault.shareType,
            vault.pricingLendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            sharesCoin,
            transaction.object(vault.pricingLendingMarketId),
            transaction.object(SUI_CLOCK_OBJECT_ID),
            agg2,
          ],
        });

        // Transfer withdrawn base coin to user
        transaction.transferObjects(
          [baseCoinOut],
          transaction.pure.address(address),
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        return res;
      },

      claimManagerFees: async ({
        vault,
        amount,
      }) => {
        if (!address) throw new Error("Wallet not connected");
        if (!vault.managerCapId) throw new Error("Vault manager cap ID is required");

        const transaction = new Transaction();

        // Call claim_manager_fees<P, T> -> returns Coin<P> (shares)
        const [feeCoin] = transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::claim_manager_fees`,
          typeArguments: [
            vault.shareType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            transaction.object(vault.managerCapId),
            transaction.pure.u64(amount),
          ],
        });

        // Transfer fee coin to user
        transaction.transferObjects(
          [feeCoin],
          transaction.pure.address(address),
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Claimed manager fees", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
        return res;
      },

      compoundRewards: async ({
        vault,
        lendingMarketId,
        obligationIndex,
        rewardReserveIndex,
        rewardIndex,
        isDepositReward,
        depositReserveIndex,
      }) => {
        if (!address) throw new Error("Wallet not connected");

        const lendingMarketType = await detectLendingMarketType(lendingMarketId);

        const transaction = new Transaction();

        // Call compound_rewards<P, L, T>
        transaction.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::compound_rewards`,
          typeArguments: [
            vault.shareType,
            lendingMarketType,
            vault.baseCoinType,
          ],
          arguments: [
            transaction.object(vault.id),
            transaction.object(lendingMarketId),
            transaction.pure.u64(obligationIndex),
            transaction.pure.u64(rewardReserveIndex),
            transaction.pure.u64(rewardIndex),
            transaction.pure.bool(isDepositReward),
            transaction.pure.u64(depositReserveIndex),
            transaction.object(SUI_CLOCK_OBJECT_ID),
          ],
        });

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);
        toast.success("Compounded rewards", {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        });
        return res;
      },
    }),
    [
      address,
      explorer,
      signExecuteAndWaitForTransaction,
      suiClient,
      fetchedVaults,
      vaultData,
      isLoadingVaultData,
      errorVaultDataObj,
      vaultHistory,
      userVaultHistory,
      userPnls,
    ],
  );

  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  );
}
