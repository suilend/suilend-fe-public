import { useRouter } from "next/router";
import {
  CSSProperties,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { cloneDeep } from "lodash";
import { ChevronLeft, ChevronRight, Download, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { ParsedReserve, getRewardsMap } from "@suilend/sdk";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
  createStrategyOwnerCapIfNoneExists,
  sendStrategyOwnerCapToUser,
  strategyBorrow,
  strategyClaimRewardsAndSwapForCoinType,
  strategyDeposit,
  strategySwapSomeDepositsForCoinType,
  strategyWithdraw,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { MAINNET_CONFIG, SteammSDK } from "@suilend/steamm-sdk";
import {
  MAX_U64,
  MS_PER_YEAR,
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_xBTC_COINTYPE,
  TX_TOAST_DURATION,
  formatInteger,
  formatList,
  formatNumber,
  formatPercent,
  formatToken,
  formatUsd,
  getAllCoins,
  getBalanceChange,
  getToken,
  isSui,
  mergeAllCoins,
} from "@suilend/sui-fe";
import {
  shallowPushQuery,
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Collapsible from "@/components/shared/Collapsible";
import Dialog from "@/components/shared/Dialog";
import FromToArrow from "@/components/shared/FromToArrow";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Spinner from "@/components/shared/Spinner";
import Tabs from "@/components/shared/Tabs";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import LstStrategyDialogParametersPanel from "@/components/strategies/LstStrategyDialogParametersPanel";
import StrategyHeader from "@/components/strategies/StrategyHeader";
import StrategyInput from "@/components/strategies/StrategyInput";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  Deposit,
  E,
  LST_DECIMALS,
  Withdraw,
  addOrInsertDeposit,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import {
  CETUS_CONTRACT_PACKAGE_ID,
  CETUS_GLOBAL_CONFIG_OBJECT_ID,
  CETUS_PARTNER_ID,
} from "@/lib/cetus";
import { MMT_CONTRACT_PACKAGE_ID } from "@/lib/mmt";
import { useCetusSdk } from "@/lib/swap";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";

const STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT = 0.15;

enum FlashLoanProvider {
  CETUS = "cetus",
  MMT = "mmt",
}

const STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP: Record<
  string,
  {
    provider: FlashLoanProvider;
    poolId: string;
    coinTypeA: string;
    coinTypeB: string;
    borrowA: boolean;
    feePercent: number;
  }
> = {
  [StrategyType.USDC_sSUI_SUI_LOOPING]: {
    provider: FlashLoanProvider.CETUS,
    poolId:
      "0xb8a67c149fd1bc7f9aca1541c61e51ba13bdded64c273c278e50850ae3bff073", // suiUSDT-USDC 0.001% https://app.cetus.zone/liquidity?poolAddress=0xb8a67c149fd1bc7f9aca1541c61e51ba13bdded64c273c278e50850ae3bff073
    coinTypeA: NORMALIZED_suiUSDT_COINTYPE,
    coinTypeB: NORMALIZED_USDC_COINTYPE,
    borrowA: false,
    feePercent: 0.001,
  },
  [StrategyType.AUSD_sSUI_SUI_LOOPING]: {
    provider: FlashLoanProvider.CETUS,
    poolId:
      "0x0fea99ed9c65068638963a81587c3b8cafb71dc38c545319f008f7e9feb2b5f8", // AUSD-USDC 0.01% https://app.cetus.zone/liquidity?poolAddress=0x0fea99ed9c65068638963a81587c3b8cafb71dc38c545319f008f7e9feb2b5f8
    coinTypeA: NORMALIZED_AUSD_COINTYPE,
    coinTypeB: NORMALIZED_USDC_COINTYPE,
    borrowA: true,
    feePercent: 0.01,
  },
  [StrategyType.xBTC_sSUI_SUI_LOOPING]: {
    provider: FlashLoanProvider.MMT,
    poolId:
      "0x57a662791cea065610455797dfd2751a3c10d929455d3ea88154a2b40cf6614e", // xBTC-wBTC 0.01% https://app.mmt.finance/liquidity/0x57a662791cea065610455797dfd2751a3c10d929455d3ea88154a2b40cf6614e
    coinTypeA: NORMALIZED_xBTC_COINTYPE,
    coinTypeB: NORMALIZED_wBTC_COINTYPE,
    borrowA: true,
    feePercent: 0.01,
  },
};

// xBTC/wBTC pool: https://steamm.fi/pool/0xef7aaebc8e300d1ae2110cee7ea5f07ee1a1da8974c9ea4cdf72655647cf8716
const swapInSteammPool = async (
  steammClient: SteammSDK,
  transaction: Transaction,
  coinA: TransactionObjectInput,
  coinB: TransactionObjectInput,
  a2b: boolean | TransactionArgument,
  amountIn: bigint | TransactionArgument,
  minAmountOut: bigint | TransactionArgument,
): Promise<TransactionArgument> =>
  steammClient.Pool.swap(transaction, {
    coinA,
    coinB,
    a2b,
    amountIn,
    minAmountOut,
    poolInfo: {
      poolId:
        "0xef7aaebc8e300d1ae2110cee7ea5f07ee1a1da8974c9ea4cdf72655647cf8716",
      coinTypeA:
        "0xa17c86d4a189d6cc4bbbe32d3785406ea5e473e1518a75947c2a8a011b96b558::b_xbtc::B_XBTC",
      coinTypeB:
        "0x73cfd0703fa65ce89b5928a1497b5de3db5648659eed7e3feabba58db0fd3ea0::b_btc::B_BTC",
      lpTokenType:
        "0x5825d399b842bf2346265a26a08c8aa97f699d256191f56ba947be98c7c39ab2::steamm_lp_bxbtc_bwbtc::STEAMM_LP_BXBTC_BWBTC",
      quoterType:
        "0x4fb1cf45dffd6230305f1d269dd1816678cc8e3ba0b747a813a556921219f261::cpmm::CpQuoter",
      swapFeeBps: 1,
    },
    bankInfoA: {
      coinType:
        "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC",
      btokenType:
        "0xa17c86d4a189d6cc4bbbe32d3785406ea5e473e1518a75947c2a8a011b96b558::b_xbtc::B_XBTC",
      lendingMarketType:
        "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
      bankId:
        "0xfed0dee87820d139f2f74d4e5f6ffe2489d95f1a98dfa2f0460d4762acb77ae3",
      lendingMarketId:
        "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
    },
    bankInfoB: {
      coinType:
        "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
      btokenType:
        "0x73cfd0703fa65ce89b5928a1497b5de3db5648659eed7e3feabba58db0fd3ea0::b_btc::B_BTC",
      lendingMarketType:
        "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
      bankId:
        "0xe56cbba61bce325119b293efbc1eeffc39a8db9e5557dc5008efd8bd231f9fad",
      lendingMarketId:
        "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
    },
  });

/**
 * Bisection method to find the optimal value that satisfies a condition
 * @param left - Left boundary of the search range
 * @param right - Right boundary of the search range
 * @param condition - Function that takes a value and returns true if the condition is satisfied
 * @param maxIterations - Maximum number of iterations (default: 50)
 * @param tolerance - Convergence tolerance (default: 0.000001)
 * @returns The optimal value that satisfies the condition
 */
const bisectionMethod = (
  left: BigNumber,
  right: BigNumber,
  condition: (value: BigNumber) => boolean,
  maxIterations: number = 50,
  tolerance: BigNumber = new BigNumber(0.000001),
): BigNumber => {
  let currentLeft = left;
  let currentRight = right;
  let bestValue = new BigNumber(0);

  for (let i = 0; i < maxIterations; i++) {
    const mid = currentLeft.plus(currentRight).div(2);

    if (mid.eq(currentLeft) && mid.eq(currentRight)) {
      break;
    }

    if (condition(mid)) {
      bestValue = mid;
      currentRight = mid;
    } else {
      currentLeft = mid;
    }

    // Check if we've converged
    if (currentRight.minus(currentLeft).lte(tolerance)) {
      break;
    }
  }

  return bestValue;
};

const getReserveSafeDepositLimit = (reserve: ParsedReserve) => {
  // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
  const tenMinsDepositAprPercent = reserve.depositAprPercent
    .div(MS_PER_YEAR)
    .times(10 * 60 * 1000);
  const safeDepositLimit = reserve.config.depositLimit.minus(
    reserve.depositedAmount.times(tenMinsDepositAprPercent.div(100)),
  );
  const safeDepositLimitUsd = reserve.config.depositLimitUsd.minus(
    reserve.depositedAmount
      .times(reserve.maxPrice)
      .times(tenMinsDepositAprPercent.div(100)),
  );

  return { safeDepositLimit, safeDepositLimitUsd };
};

export enum QueryParams {
  STRATEGY_NAME = "strategy",
  TAB = "action",
}

export enum Tab {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
  ADJUST = "adjust",
}

interface LstStrategyDialogProps extends PropsWithChildren {
  strategyType: StrategyType;
}

export default function LstStrategyDialog({
  strategyType,
  children,
}: LstStrategyDialogProps) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.STRATEGY_NAME]: router.query[QueryParams.STRATEGY_NAME] as
        | string
        | undefined,
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    }),
    [router.query],
  );

  const { rpc, explorer, suiClient } = useSettingsContext();
  const { address, dryRunTransaction, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { appData } = useLoadedAppContext();
  const { getBalance, userData, refresh } = useLoadedUserContext();

  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getBorrowReserve,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxBorrowedAmount,
    getStepMaxWithdrawnAmount,

    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getGlobalTvlAmountUsd,
    getUnclaimedRewardsAmount,
    getHistory,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
  } = useLoadedLstStrategyContext();
  const MoreDetailsIcon = isMoreDetailsOpen ? ChevronLeft : ChevronRight;

  const { md } = useBreakpoint();

  // STEAMM client
  const steammClient = useMemo(() => {
    const sdk = new SteammSDK({
      ...MAINNET_CONFIG,
      fullRpcUrl: rpc.url,
    });
    sdk.senderAddress =
      address ??
      "0x0000000000000000000000000000000000000000000000000000000000000000"; // Address must be set to use the SDK

    return sdk;
  }, [rpc.url, address]);

  // send.ag
  const cetusSdk = useCetusSdk();

  // Strategy
  const strategyInfo = useMemo(
    () => STRATEGY_TYPE_INFO_MAP[strategyType],
    [strategyType],
  );

  const minExposure = useMemo(
    () => exposureMap[strategyType].min,
    [strategyType, exposureMap],
  );
  const maxExposure = useMemo(
    () => exposureMap[strategyType].max,
    [strategyType, exposureMap],
  );
  const defaultExposure = useMemo(
    () => exposureMap[strategyType].default,
    [strategyType, exposureMap],
  );

  // LST
  const lst = useMemo(
    () =>
      strategyInfo.depositLstCoinType !== undefined
        ? lstMap[strategyInfo.depositLstCoinType]
        : undefined,
    [lstMap, strategyInfo.depositLstCoinType],
  );

  // Reserves
  const depositReserves = useMemo(
    () => getDepositReserves(strategyType),
    [getDepositReserves, strategyType],
  );
  const borrowReserve = useMemo(
    () => getBorrowReserve(strategyType),
    [getBorrowReserve, strategyType],
  );
  const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

  // Open
  const isOpen = useMemo(
    () => queryParams[QueryParams.STRATEGY_NAME] === strategyInfo.queryParam,
    [queryParams, strategyInfo.queryParam],
  );

  const close = useCallback(() => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[QueryParams.STRATEGY_NAME];
    shallowPushQuery(router, restQuery);
  }, [router]);

  //
  //
  //

  // Obligation
  const strategyOwnerCap = userData.strategyOwnerCaps.find(
    (soc) => soc.strategyType === strategyType,
  );
  const obligation = userData.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Tabs
  const canAdjust = getHealthPercent(
    strategyType,
    obligation,
    !!obligation && hasPosition(obligation)
      ? getExposure(strategyType, obligation)
      : new BigNumber(1),
  ).eq(100);
  const depositAdjustWithdrawAdditionalDepositedAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);
    if (canAdjust) return new BigNumber(0);

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    const depositedAmount = obligation.deposits.find(
      (d) => d.coinType === depositReserve.coinType,
    )!.depositedAmount;

    const targetDepositedAmount = bisectionMethod(
      depositedAmount, // left boundary: original deposit
      depositedAmount.times(2), // right boundary: 2x original deposit
      (newDepositedAmount: BigNumber) => {
        const additionalDepositedAmount =
          newDepositedAmount.minus(depositedAmount);

        const newHealthPercent = getHealthPercent(
          strategyType,
          getSimulatedObligation(
            strategyType,
            addOrInsertDeposit(obligation.deposits, {
              coinType: depositReserve.coinType,
              depositedAmount: additionalDepositedAmount,
            }),
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
          ),
          undefined,
        );

        return newHealthPercent.eq(100);
      },
    );

    const additionalDepositedAmount =
      targetDepositedAmount.minus(depositedAmount);
    console.log(
      "XXXX depositedAmount:",
      depositedAmount.toFixed(20),
      "targetDepositedAmount:",
      targetDepositedAmount.toFixed(20),
      "additionalDepositedAmount:",
      additionalDepositedAmount.toFixed(20),
    );

    return additionalDepositedAmount;
  }, [
    obligation,
    hasPosition,
    depositReserves.base,
    depositReserves.lst,
    canAdjust,
    getHealthPercent,
    strategyType,
    getSimulatedObligation,
  ]);

  const tabs = [
    { id: Tab.DEPOSIT, title: "Deposit" },
    { id: Tab.WITHDRAW, title: "Withdraw" },
    {
      id: Tab.ADJUST,
      title: "Adjust",
      tooltip:
        "Increase or decrease leverage without changing your Equity (deposited amount)",
    },
  ];

  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : Tab.DEPOSIT,
    [queryParams],
  );
  const onSelectedTabChange = useCallback(
    (tab: Tab) => {
      shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
    },
    [router],
  );

  // Rewards
  const rewardsMap = getRewardsMap(
    obligation,
    userData.rewardMap,
    appData.coinMetadataMap,
  );
  const hasClaimableRewards = Object.values(rewardsMap).some(({ amount }) =>
    amount.gt(0),
  );

  // Rewards - compound
  const [isCompoundingRewards, setIsCompoundingRewards] =
    useState<boolean>(false);

  const onCompoundRewardsClick = async () => {
    if (isCompoundingRewards) return;

    setIsCompoundingRewards(true);

    try {
      if (!address) throw Error("Wallet not connected");
      if (!strategyOwnerCap || !obligation)
        throw Error("StrategyOwnerCap or Obligation not found");

      const transaction = new Transaction();
      await strategyClaimRewardsAndSwapForCoinType(
        address,
        cetusSdk,
        CETUS_PARTNER_ID,
        rewardsMap,
        (depositReserves.lst ?? depositReserves.base)!, // Must have base if no LST
        strategyOwnerCap.id,
        !!obligation && hasPosition(obligation) ? true : false, // isDepositing (true = deposit)
        transaction,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        [
          "Claimed and redeposited",
          formatList(
            Object.keys(rewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
        ]
          .filter(Boolean)
          .join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      Sentry.captureException(err);
      console.error(err);
      showErrorToast(
        [
          "Failed to claim and redeposit",
          formatList(
            Object.keys(rewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
        ]
          .filter(Boolean)
          .join(" "),
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsCompoundingRewards(false);
      refresh();
    }
  };

  // Slider
  const [depositSliderValue, setDepositSliderValue] = useState<string>(
    defaultExposure.toFixed(1),
  );

  const [adjustSliderValue, setAdjustSliderValue] = useState<string>(
    !!obligation && hasPosition(obligation)
      ? BigNumber.min(
          maxExposure,
          getExposure(strategyType, obligation),
        ).toFixed(1)
      : defaultExposure.toFixed(1),
  );

  // Currency coinType, reserve, and balance
  const [currencyCoinType, setCurrencyCoinType] = useState<string>(
    defaultCurrencyReserve.coinType,
  );

  const currencyReserveOptions = useMemo(
    () =>
      strategyInfo.currencyCoinTypes.map((_currencyCoinType) => ({
        id: _currencyCoinType,
        name: appData.coinMetadataMap[_currencyCoinType].symbol,
      })),
    [strategyInfo.currencyCoinTypes, appData.coinMetadataMap],
  );
  const currencyReserve = useMemo(
    () => appData.reserveMap[currencyCoinType],
    [currencyCoinType, appData.reserveMap],
  );

  const currencyReserveBalance = useMemo(
    () => getBalance(currencyReserve.coinType),
    [getBalance, currencyReserve.coinType],
  );

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  // Stats
  // Stats - Exposure
  const exposure = useMemo(
    () =>
      !!obligation && hasPosition(obligation)
        ? getExposure(strategyType, obligation)
        : new BigNumber(depositSliderValue),
    [obligation, hasPosition, getExposure, strategyType, depositSliderValue],
  );
  const depositAdjustWithdrawExposure = useMemo(
    () => maxExposure,
    [maxExposure],
  );
  const adjustExposure = useMemo(
    () => new BigNumber(adjustSliderValue),
    [adjustSliderValue],
  );

  // Value - Max
  const getMaxDepositCalculations = useCallback(
    (_currencyCoinType: string) => {
      const _currencyReserve = appData.reserveMap[_currencyCoinType];

      const simValue = new BigNumber(1);
      const { deposits, borrowedAmount } = simulateDepositAndLoopToExposure(
        strategyType,
        [],
        new BigNumber(0),
        {
          coinType: _currencyReserve.coinType,
          depositedAmount: simValue,
        },
        exposure,
      );

      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const safeDepositLimitMap: {
        base?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
        lst?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
      } = {
        base:
          depositReserves.base !== undefined
            ? getReserveSafeDepositLimit(depositReserves.base)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? getReserveSafeDepositLimit(depositReserves.lst)
            : undefined,
      };

      // Calculate minimum available amount (100 MIST equivalent) and borrow fee
      const borrowMinAvailableAmount = new BigNumber(100).div(
        10 ** borrowReserve.token.decimals,
      );
      const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;

      // Factor
      const depositFactorMap: {
        base?: BigNumber;
        lst?: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? (deposits
                .find((d) => d.coinType === depositReserves.base!.coinType)
                ?.depositedAmount.div(simValue) ?? new BigNumber(0))
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? (deposits
                .find((d) => d.coinType === depositReserves.lst!.coinType)
                ?.depositedAmount.div(simValue) ?? new BigNumber(0))
            : undefined,
      };
      const borrowFactor = borrowedAmount.div(simValue);

      const result = [
        // Balance
        {
          reason: `Insufficient ${_currencyReserve.token.symbol}`,
          isDisabled: true,
          value: getBalance(_currencyReserve.coinType),
        },
        ...(isSui(_currencyReserve.coinType)
          ? [
              {
                reason: `${STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
                isDisabled: true,
                value: getBalance(_currencyReserve.coinType).minus(
                  STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
                ),
              },
            ]
          : []),

        // Deposit
        ...(["base", "lst"]
          .flatMap((_key) => {
            const key = _key as "base" | "lst";
            const reserve = depositReserves[key];

            if (!reserve) return undefined;
            if (
              depositReserves.base !== undefined &&
              exposure.eq(1) &&
              key === "lst"
            )
              return undefined;

            return [
              {
                reason: `Exceeds ${reserve.token.symbol} deposit limit`,
                isDisabled: true,
                value: BigNumber.max(
                  safeDepositLimitMap[key]!.safeDepositLimit.minus(
                    reserve.depositedAmount,
                  ),
                  0,
                ).div(depositFactorMap[key]!),
              },
              {
                reason: `Exceeds ${reserve.token.symbol} USD deposit limit`,
                isDisabled: true,
                value: BigNumber.max(
                  safeDepositLimitMap[key]!.safeDepositLimitUsd.minus(
                    reserve.depositedAmount.times(reserve.maxPrice),
                  ).div(reserve.maxPrice),
                  0,
                ).div(depositFactorMap[key]!),
              },
            ];
          })
          .filter(Boolean) as {
          reason: string;
          isDisabled: boolean;
          value: BigNumber;
        }[]),

        // Borrow
        ...(exposure.gt(1)
          ? [
              {
                reason: `Insufficient ${borrowReserve.token.symbol} liquidity to borrow`,
                isDisabled: true,
                value: new BigNumber(
                  borrowReserve.availableAmount
                    .minus(borrowMinAvailableAmount)
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              {
                reason: `Exceeds ${borrowReserve.token.symbol} borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  borrowReserve.config.borrowLimit
                    .minus(borrowReserve.borrowedAmount)
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              {
                reason: `Exceeds ${borrowReserve.token.symbol} USD borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  borrowReserve.config.borrowLimitUsd
                    .minus(
                      borrowReserve.borrowedAmount.times(borrowReserve.price),
                    )
                    .div(borrowReserve.price)
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              // "Borrows cannot exceed borrow limit" is not relevant here
              {
                reason: "Outflow rate limit surpassed",
                isDisabled: true,
                value: new BigNumber(
                  appData.lendingMarket.rateLimiter.remainingOutflow
                    .div(borrowReserve.maxPrice)
                    .div(borrowReserve.config.borrowWeightBps.div(10000))
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              // "IKA max utilization limit" is not relevant here
            ]
          : []),
      ];
      console.log(
        "[getMaxDepositCalculations] result:",
        JSON.stringify(result, null, 2),
      );

      return result;
    },
    [
      appData.reserveMap,
      simulateDepositAndLoopToExposure,
      strategyType,
      exposure,
      borrowReserve.token.decimals,
      borrowReserve.config.borrowFeeBps,
      depositReserves,
      getBalance,
      borrowReserve.token.symbol,
      borrowReserve.availableAmount,
      borrowReserve.config.borrowLimit,
      borrowReserve.borrowedAmount,
      borrowReserve.config.borrowLimitUsd,
      borrowReserve.price,
      borrowReserve.maxPrice,
      borrowReserve.config.borrowWeightBps,
      appData.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );
  const getMaxWithdrawCalculations = useCallback(
    (_currencyCoinType: string) => {
      const _currencyReserve = appData.reserveMap[_currencyCoinType];

      const simValue = new BigNumber(1);
      const { deposits } = simulateDepositAndLoopToExposure(
        strategyType,
        [],
        new BigNumber(0),
        {
          coinType: _currencyReserve.coinType,
          depositedAmount: simValue,
        },
        exposure,
      );

      // Calculate minimum available amount (100 MIST equivalent)
      const depositMinAvailableAmountMap: {
        base?: BigNumber;
        lst?: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? new BigNumber(100).div(10 ** depositReserves.base.token.decimals)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? new BigNumber(100).div(10 ** depositReserves.lst.token.decimals)
            : undefined,
      };

      // Factor
      const withdrawFactorMap: {
        base?: BigNumber;
        lst?: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? (deposits
                .find((d) => d.coinType === depositReserves.base!.coinType)
                ?.depositedAmount.div(simValue) ?? new BigNumber(0))
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? (deposits
                .find((d) => d.coinType === depositReserves.lst!.coinType)
                ?.depositedAmount.div(simValue) ?? new BigNumber(0))
            : undefined,
      };

      const result = [
        // Balance
        {
          reason: "Withdraws cannot exceed deposits",
          isDisabled: true,
          value: getTvlAmount(strategyType, obligation).times(
            depositReserves.base !== undefined
              ? 1
              : isSui(_currencyReserve.coinType)
                ? 1
                : (lst?.suiToLstExchangeRate ?? 1),
          ),
        },

        // Withdraw
        ...(["base", "lst"]
          .flatMap((_key) => {
            const key = _key as "base" | "lst";
            const reserve = depositReserves[key];

            if (!reserve) return undefined;
            if (
              depositReserves.base !== undefined &&
              exposure.eq(1) &&
              key === "lst"
            )
              return undefined;

            return [
              {
                reason: `Insufficient ${reserve.token.symbol} liquidity to withdraw`,
                isDisabled: true,
                value: new BigNumber(
                  reserve.availableAmount.minus(
                    depositMinAvailableAmountMap[key]!,
                  ),
                ).div(withdrawFactorMap[key]!),
              },
            ];
          })
          .filter(Boolean) as {
          reason: string;
          isDisabled: boolean;
          value: BigNumber;
        }[]),
        // TODO: "Outflow rate limit surpassed"
        // "Withdraw is unhealthy" is not relevant here
      ];
      console.log(
        "[getMaxWithdrawCalculations] result:",
        JSON.stringify(result, null, 2),
      );

      return result;
    },
    [
      appData.reserveMap,
      simulateDepositAndLoopToExposure,
      strategyType,
      exposure,
      depositReserves,
      getTvlAmount,
      obligation,
      lst?.suiToLstExchangeRate,
    ],
  );
  // TODO: getMaxAdjustUpCalculations, getMaxAdjustDownCalculations

  const getMaxAmount = useCallback(
    (_currencyCoinType?: string) => {
      const _currencyReserve =
        _currencyCoinType !== undefined
          ? appData.reserveMap[_currencyCoinType]
          : currencyReserve;

      if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
        const maxCalculations =
          selectedTab === Tab.DEPOSIT
            ? getMaxDepositCalculations(_currencyReserve.coinType)
            : getMaxWithdrawCalculations(_currencyReserve.coinType);

        return BigNumber.max(
          new BigNumber(0),
          BigNumber.min(...maxCalculations.map((calc) => calc.value)),
        );
      } else if (selectedTab === Tab.ADJUST) {
        return new BigNumber(0); // Not relevant here
      }

      return new BigNumber(0); // Should not happen
    },
    [
      appData.reserveMap,
      currencyReserve,
      selectedTab,
      getMaxDepositCalculations,
      getMaxWithdrawCalculations,
    ],
  );
  const [useMaxAmount, setUseMaxAmount] = useState<boolean>(false);

  const formatAndSetValue = useCallback(
    (_value: string) => {
      let formattedValue;
      if (new BigNumber(_value || 0).lt(0)) formattedValue = _value;
      else if (!_value.includes(".")) formattedValue = _value;
      else {
        const [integers, decimals] = _value.split(".");
        const integersFormatted = formatInteger(
          integers !== "" ? parseInt(integers) : 0,
          false,
        );
        const decimalsFormatted = decimals.slice(
          0,
          Math.min(decimals.length, currencyReserve.token.decimals),
        );
        formattedValue = `${integersFormatted}.${decimalsFormatted}`;
      }

      setValue(formattedValue);
    },
    [currencyReserve.token.decimals],
  );

  const onValueChange = (_value: string) => {
    if (useMaxAmount) setUseMaxAmount(false);
    formatAndSetValue(_value);
  };

  const useMaxValueWrapper = () => {
    setUseMaxAmount(true);
    formatAndSetValue(
      getMaxAmount().toFixed(
        currencyReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      ),
    );
  };

  const onCurrencyReserveChange = useCallback(
    (newCurrencyCoinType: string) => {
      const newCurrencyReserve = appData.reserveMap[newCurrencyCoinType];

      setCurrencyCoinType(newCurrencyCoinType);

      if (value === "") return;
      formatAndSetValue(
        (useMaxAmount
          ? getMaxAmount(newCurrencyCoinType)
          : new BigNumber(value)
        ).toFixed(newCurrencyReserve.token.decimals, BigNumber.ROUND_DOWN),
      );
    },
    [appData.reserveMap, formatAndSetValue, useMaxAmount, getMaxAmount, value],
  );

  useEffect(() => {
    // If user has specified intent to use max amount, we continue this intent
    // even if the max value updates
    if (useMaxAmount)
      formatAndSetValue(
        getMaxAmount().toFixed(
          currencyReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        ),
      );
  }, [
    useMaxAmount,
    formatAndSetValue,
    getMaxAmount,
    currencyReserve.token.decimals,
  ]);

  // Stats
  // Stats - TVL
  const tvlAmount = getTvlAmount(strategyType, obligation);

  // Stats - Health
  const healthPercent = getHealthPercent(strategyType, obligation, exposure);
  const depositAdjustWithdrawHealthPercent = getHealthPercent(
    strategyType,
    undefined,
    depositAdjustWithdrawExposure,
  );
  const adjustHealthPercent = getHealthPercent(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - Liquidation price
  const liquidationPrice = getLiquidationPrice(
    strategyType,
    obligation,
    exposure,
  );
  const depositAdjustWithdrawLiquidationPrice = getLiquidationPrice(
    strategyType,
    undefined,
    depositAdjustWithdrawExposure,
  ); // Approximate liquidation price
  const adjustLiquidationPrice = getLiquidationPrice(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - APR
  const aprPercent = getAprPercent(strategyType, obligation, exposure);
  const depositAdjustWithdrawAprPercent = getAprPercent(
    strategyType,
    undefined,
    depositAdjustWithdrawExposure,
  ); // Approximate APR
  const adjustAprPercent = getAprPercent(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - Fees
  const depositFeesAmount = useMemo(() => {
    const deposits = obligation?.deposits ?? [];
    const borrowedAmount =
      (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

    let result = new BigNumber(0);

    const { borrowedAmount: newBorrowedAmount } =
      simulateDepositAndLoopToExposure(
        strategyType,
        deposits,
        borrowedAmount,
        {
          coinType: currencyReserve.coinType,
          depositedAmount: new BigNumber(value || 0),
        },
        exposure,
      );

    // Borrow fee
    const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;
    const borrowFeeAmount = new BigNumber(
      newBorrowedAmount.minus(borrowedAmount),
    ).times(
      new BigNumber(borrowFeePercent / 100).div(1 + borrowFeePercent / 100),
    );

    result = borrowFeeAmount.decimalPlaces(
      borrowReserve.token.decimals,
      BigNumber.ROUND_DOWN,
    );

    // Result
    const resultUsd = result.times(borrowReserve.price);
    const resultCurrency = resultUsd
      .div(currencyReserve.price)
      .decimalPlaces(currencyReserve.token.decimals, BigNumber.ROUND_DOWN);

    return resultCurrency;
  }, [
    obligation?.deposits,
    obligation?.borrows,
    simulateDepositAndLoopToExposure,
    strategyType,
    currencyReserve.coinType,
    value,
    exposure,
    borrowReserve.config.borrowFeeBps,
    borrowReserve.token.decimals,
    borrowReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  const withdrawFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);
    if (new BigNumber(value || 0).lte(0)) return new BigNumber(0);

    const deposits = obligation.deposits;
    const borrowedAmount =
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

    let result = new BigNumber(0);

    const withdraw: Withdraw = {
      coinType: currencyReserve.coinType,
      withdrawnAmount: new BigNumber(value),
    };

    // From withdrawTx:
    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    const withdrawnAmount = (
      depositReserve.coinType === depositReserves.base?.coinType
        ? withdraw.withdrawnAmount
        : isSui(withdraw.coinType)
          ? withdraw.withdrawnAmount
              .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
              .div(lst?.lstToSuiExchangeRate ?? 1)
          : withdraw.withdrawnAmount
    ).decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_DOWN);
    const withdrawnAmountUsd = withdrawnAmount
      .times(depositReserve.price)
      .times(
        depositReserve.coinType === depositReserves.base?.coinType
          ? 1
          : new BigNumber(lst?.lstToSuiExchangeRate ?? 1).times(
              1 - +(lst?.redeemFeePercent ?? 0) / 100,
            ),
      );

    const exposure = getExposure(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    );
    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetTvlAmountUsd = tvlAmountUsd.minus(withdrawnAmountUsd);
    const targetBorrowedAmount = targetTvlAmountUsd
      .times(exposure.minus(1))
      .div(borrowReserve.price)
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    // --- End withdrawTx code ---

    const repaidAmount = borrowedAmount.minus(targetBorrowedAmount);

    // LST redeem fee
    if (depositReserves.lst !== undefined) {
      let lstRedeemFeeSui = repaidAmount
        .times(+(lst?.redeemFeePercent ?? 0) / 100)
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_UP);

      if (isSui(withdraw.coinType))
        lstRedeemFeeSui = lstRedeemFeeSui.plus(
          withdrawnAmount
            .times(+(lst?.redeemFeePercent ?? 0) / 100)
            .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_UP),
        );

      result = result.plus(lstRedeemFeeSui);
    }

    // Result
    const resultUsd = result.times(borrowReserve.price);
    const resultCurrency = resultUsd
      .div(currencyReserve.price)
      .decimalPlaces(currencyReserve.token.decimals, BigNumber.ROUND_DOWN);

    return resultCurrency;
  }, [
    obligation,
    hasPosition,
    value,
    currencyReserve.coinType,
    depositReserves.base,
    depositReserves.lst,
    lst?.redeemFeePercent,
    lst?.lstToSuiExchangeRate,
    getExposure,
    strategyType,
    getSimulatedObligation,
    getTvlAmount,
    defaultCurrencyReserve.price,
    borrowReserve.token.decimals,
    borrowReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  const depositAdjustWithdrawFeesAmount = useMemo(() => {
    if (
      ![
        StrategyType.USDC_sSUI_SUI_LOOPING,
        StrategyType.AUSD_sSUI_SUI_LOOPING,
        StrategyType.xBTC_sSUI_SUI_LOOPING,
      ].includes(strategyType)
    )
      return new BigNumber(0);

    const flashLoanObj = STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP[strategyType];

    // Ignoring LST redeem fees
    return depositAdjustWithdrawAdditionalDepositedAmount
      .times(flashLoanObj.feePercent / 100)
      .decimalPlaces(depositReserves.base!.token.decimals, BigNumber.ROUND_UP);
  }, [
    strategyType,
    depositAdjustWithdrawAdditionalDepositedAmount,
    depositReserves.base,
  ]);

  const adjustFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const deposits = obligation.deposits;
    const borrowedAmount =
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

    let result = new BigNumber(0);

    if (adjustExposure.gt(exposure)) {
      const { borrowedAmount: newBorrowedAmount } = simulateLoopToExposure(
        strategyType,
        deposits,
        borrowedAmount,
        undefined, // Don't pass targetBorrowedAmount
        adjustExposure, // Pass targetExposure
      );

      // Borrow fee
      const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;
      const borrowFeeAmount = new BigNumber(
        newBorrowedAmount.minus(borrowedAmount),
      ).times(
        new BigNumber(borrowFeePercent / 100).div(1 + borrowFeePercent / 100),
      );

      result = borrowFeeAmount.decimalPlaces(
        borrowReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );

      // Ignoring LST mint fees
    } else {
      result = new BigNumber(0); // No fees (ignoring LST redeem fees)
    }

    // Result
    const resultUsd = result.times(borrowReserve.price);
    const resultCurrency = resultUsd
      .div(currencyReserve.price)
      .decimalPlaces(currencyReserve.token.decimals, BigNumber.ROUND_DOWN);

    return resultCurrency;
  }, [
    obligation,
    hasPosition,
    adjustExposure,
    exposure,
    simulateLoopToExposure,
    strategyType,
    borrowReserve.config.borrowFeeBps,
    borrowReserve.token.decimals,
    borrowReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  // Submit
  const getSubmitButtonNoValueState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      if (!canAdjust)
        return {
          isDisabled: true,
          title: "Disabled until back at 100% health",
          description: "Please adjust your leverage",
        };
    }

    if (selectedTab === Tab.DEPOSIT) {
      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const safeDepositLimitMap: {
        base?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
        lst?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
      } = {
        base:
          depositReserves.base !== undefined
            ? getReserveSafeDepositLimit(depositReserves.base)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? getReserveSafeDepositLimit(depositReserves.lst)
            : undefined,
      };

      // Deposit
      for (const _key of ["base", "lst"]) {
        const key = _key as "base" | "lst";
        const reserve = depositReserves[key];
        if (!reserve) continue;

        if (
          new BigNumber(
            safeDepositLimitMap[key]!.safeDepositLimit.minus(
              reserve.depositedAmount,
            ),
          ).lte(0)
        )
          return {
            isDisabled: true,
            title: `${reserve.token.symbol} deposit limit reached`,
          };
        if (
          new BigNumber(
            safeDepositLimitMap[key]!.safeDepositLimitUsd.minus(
              reserve.depositedAmount.times(reserve.maxPrice),
            ).div(reserve.maxPrice),
          ).lte(0)
        )
          return {
            isDisabled: true,
            title: `${reserve.token.symbol} USD deposit limit reached`,
          };
        // "Cannot deposit borrowed asset" is not relevant here
        // "Max ${MAX_DEPOSITS_PER_OBLIGATION} deposit positions" is not relevant here
      }

      // Borrow
      if (exposure.gt(1)) {
        if (borrowReserve.borrowedAmount.gte(borrowReserve.config.borrowLimit))
          return {
            isDisabled: true,
            title: `${borrowReserve.token.symbol} borrow limit reached`,
          };
        if (
          new BigNumber(
            borrowReserve.borrowedAmount.times(borrowReserve.price),
          ).gte(borrowReserve.config.borrowLimitUsd)
        )
          return {
            isDisabled: true,
            title: `${borrowReserve.token.symbol} USD borrow limit reached`,
          };
        // "Cannot borrow deposited asset" is not relevant here
        // "Max ${MAX_BORROWS_PER_OBLIGATION} borrow positions" is not relevant here

        // Isolated - not relevant here
      }
    } else if (selectedTab === Tab.WITHDRAW) {
      // N/A
    } else if (selectedTab === Tab.ADJUST) {
      // TODO
    }

    return undefined;
  };
  const getSubmitButtonState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      const maxCalculations =
        selectedTab === Tab.DEPOSIT
          ? getMaxDepositCalculations(currencyReserve.coinType)
          : getMaxWithdrawCalculations(currencyReserve.coinType);

      for (const calc of maxCalculations) {
        if (new BigNumber(value).gt(calc.value))
          return { isDisabled: calc.isDisabled, title: calc.reason };
      }
    } else if (selectedTab === Tab.ADJUST) {
      // TODO
    }

    return undefined;
  };

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting) return { isDisabled: true, isLoading: true };

    if (
      getSubmitButtonNoValueState !== undefined &&
      getSubmitButtonNoValueState() !== undefined
    )
      return getSubmitButtonNoValueState() as SubmitButtonState;

    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      if (value === "") return { isDisabled: true, title: "Enter an amount" };
      if (new BigNumber(value).lt(0))
        return { isDisabled: true, title: "Enter a +ve amount" };
      if (new BigNumber(value).eq(0))
        return { isDisabled: true, title: "Enter a non-zero amount" };
    } else if (selectedTab === Tab.ADJUST && !canAdjust) {
      // N/A
    } else if (selectedTab === Tab.ADJUST && canAdjust) {
      // N/A
    }

    if (getSubmitButtonState())
      return getSubmitButtonState() as SubmitButtonState;

    return {
      title:
        selectedTab === Tab.DEPOSIT
          ? `Deposit ${formatToken(new BigNumber(value), {
              dp: currencyReserve.token.decimals,
              trimTrailingZeros: true,
            })} ${currencyReserve.token.symbol}`
          : selectedTab === Tab.WITHDRAW
            ? `Withdraw ${formatToken(new BigNumber(value), {
                dp: currencyReserve.token.decimals,
                trimTrailingZeros: true,
              })} ${currencyReserve.token.symbol}`
            : selectedTab === Tab.ADJUST
              ? `Adjust leverage to ${(!canAdjust
                  ? depositAdjustWithdrawExposure
                  : adjustExposure
                ).toFixed(1)}x`
              : "--", // Should not happen
    };
  })();

  const loopToExposureTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    _targetBorrowedAmount: BigNumber | undefined,
    _targetExposure: BigNumber | undefined, // Must be defined if _targetBorrowedAmount is undefined
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[loopToExposure] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          _targetBorrowedAmount: _targetBorrowedAmount?.toFixed(20),
          _targetExposure: _targetExposure?.toFixed(20),
        },
        null,
        2,
      ),
    );

    const loopingDepositReserve = (depositReserves.lst ??
      depositReserves.base)!; // Must have base if no LST

    //

    let deposits = cloneDeep(_deposits);
    let borrowedAmount = _borrowedAmount;

    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetBorrowedAmount =
      _targetBorrowedAmount ??
      tvlAmountUsd
        .times(_targetExposure!.minus(1))
        .div(borrowReserve.price)
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    console.log(
      `[loopToExposure] processed_args |`,
      JSON.stringify({
        tvlAmountUsd: tvlAmountUsd.toFixed(20),
        targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
      }),
    );

    // Base+LST or LST only
    if (loopingDepositReserve.coinType === depositReserves.lst?.coinType) {
      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          strategyType,
          getSimulatedObligation(strategyType, deposits, borrowedAmount),
        );
        const pendingBorrowedAmount =
          targetBorrowedAmount.minus(borrowedAmount);

        console.log(
          `[loopToExposure] ${i} start |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
              exposure: exposure.toFixed(20),
              pendingBorrowedAmount: pendingBorrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        if (pendingBorrowedAmount.lte(E)) break;

        // 1) Borrow SUI
        // 1.1) Max
        const stepMaxBorrowedAmount = getStepMaxBorrowedAmount(
          strategyType,
          deposits,
          borrowedAmount,
        )
          .times(0.9) // 10% buffer
          .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
        const stepMaxDepositedAmount = new BigNumber(
          stepMaxBorrowedAmount.minus(
            getLstMintFee(
              loopingDepositReserve.coinType,
              stepMaxBorrowedAmount,
            ),
          ),
        )
          .times(lst?.suiToLstExchangeRate ?? 1)
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

        console.log(
          `[loopToExposure] ${i} borrow_sui.max |`,
          JSON.stringify(
            {
              stepMaxBorrowedAmount: stepMaxBorrowedAmount.toFixed(20),
              stepMaxDepositedAmount: stepMaxDepositedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 1.2) Borrow
        const stepBorrowedAmount = BigNumber.min(
          pendingBorrowedAmount,
          stepMaxBorrowedAmount,
        ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepBorrowedAmount.eq(stepMaxBorrowedAmount);

        console.log(
          `[loopToExposure] ${i} borrow_sui.borrow |`,
          JSON.stringify(
            {
              stepBorrowedAmount: stepBorrowedAmount.toFixed(20),
              isMaxBorrow,
            },
            null,
            2,
          ),
        );

        const [borrowedCoin] = strategyBorrow(
          borrowReserve.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(borrowReserve.coinType),
          BigInt(
            stepBorrowedAmount
              .times(10 ** borrowReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
          transaction,
        );

        // 1.3) Update state
        borrowedAmount = borrowedAmount.plus(stepBorrowedAmount);

        console.log(
          `[loopToExposure] ${i} borrow_sui.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 2) Deposit LST
        // 2.1) Stake SUI for LST
        const stepLstCoin = lst!.client.mint(transaction, borrowedCoin);

        // 2.2) Deposit
        const stepDepositedAmount = new BigNumber(
          stepBorrowedAmount.minus(
            getLstMintFee(loopingDepositReserve.coinType, stepBorrowedAmount),
          ),
        )
          .times(lst?.suiToLstExchangeRate ?? 1)
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

        console.log(
          `[loopToExposure] ${i} deposit_lst.deposit |`,
          JSON.stringify(
            {
              stepDepositedAmount: stepDepositedAmount.toFixed(20),
              isMaxDeposit,
            },
            null,
            2,
          ),
        );

        strategyDeposit(
          stepLstCoin,
          loopingDepositReserve.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            loopingDepositReserve.coinType,
          ),
          transaction,
        );

        // 2.3) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: loopingDepositReserve.coinType,
          depositedAmount: stepDepositedAmount,
        });

        console.log(
          `[loopToExposure] ${i} deposit_lst.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );
      }
    }

    // Base only
    else if (
      loopingDepositReserve.coinType === depositReserves.base?.coinType
    ) {
      const borrowToBaseExchangeRate = new BigNumber(1); // Assume 1:1 exchange rate

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          strategyType,
          getSimulatedObligation(strategyType, deposits, borrowedAmount),
        );
        const pendingBorrowedAmount =
          targetBorrowedAmount.minus(borrowedAmount);

        console.log(
          `[loopToExposure] ${i} start |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
              exposure: exposure.toFixed(20),
              pendingBorrowedAmount: pendingBorrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        if (pendingBorrowedAmount.lte(E)) break;

        // 1) Borrow
        // 1.1) Max
        const stepMaxBorrowedAmount = getStepMaxBorrowedAmount(
          strategyType,
          deposits,
          borrowedAmount,
        )
          .times(0.9) // 10% buffer
          .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
        const stepMaxDepositedAmount = stepMaxBorrowedAmount
          .times(borrowToBaseExchangeRate)
          .decimalPlaces(
            loopingDepositReserve.token.decimals,
            BigNumber.ROUND_DOWN,
          );

        console.log(
          `[loopToExposure] ${i} borrow.max |`,
          JSON.stringify(
            {
              stepMaxBorrowedAmount: stepMaxBorrowedAmount.toFixed(20),
              stepMaxDepositedAmount: stepMaxDepositedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 1.2) Borrow
        const stepBorrowedAmount = BigNumber.min(
          pendingBorrowedAmount,
          stepMaxBorrowedAmount,
        ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepBorrowedAmount.eq(stepMaxBorrowedAmount);

        console.log(
          `[loopToExposure] ${i} borrow.borrow |`,
          JSON.stringify(
            {
              stepBorrowedAmount: stepBorrowedAmount.toFixed(20),
              isMaxBorrow,
            },
            null,
            2,
          ),
        );

        const [stepBorrowedCoin] = strategyBorrow(
          borrowReserve.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(borrowReserve.coinType),
          BigInt(
            stepBorrowedAmount
              .times(10 ** borrowReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
          transaction,
        );

        // 1.3) Update state
        borrowedAmount = borrowedAmount.plus(stepBorrowedAmount);

        console.log(
          `[loopToExposure] ${i} borrow.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 2) Deposit base
        // 2.1) Swap borrows for base
        const [coinA, coinB] = [
          steammClient.fullClient.zeroCoin(
            transaction,
            NORMALIZED_xBTC_COINTYPE,
          ),
          stepBorrowedCoin,
        ];

        await swapInSteammPool(
          steammClient,
          transaction,
          coinA,
          coinB,
          false,
          transaction.moveCall({
            target: "0x2::coin::value",
            typeArguments: [NORMALIZED_wBTC_COINTYPE],
            arguments: [stepBorrowedCoin],
          }),
          BigInt(
            // new BigNumber(
            //   stepBorrowedAmount.times(borrowToBaseExchangeRate).times(0.97),
            // ) // stepBorrowedAmount is an estimate for amountIn - multiply by borrow2base exchange rate, and apply a 3% buffer
            //   .times(10 ** depositReserves.base.token.decimals)
            //   .integerValue(BigNumber.ROUND_DOWN)
            //   .toString(),
            "1",
          ),
        );
        transaction.transferObjects([coinB], _address);
        const stepBaseCoin = coinA;

        // 2.2) Deposit
        const stepDepositedAmount = stepBorrowedAmount
          .times(borrowToBaseExchangeRate)
          .decimalPlaces(
            loopingDepositReserve.token.decimals,
            BigNumber.ROUND_DOWN,
          );
        const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

        console.log(
          `[loopToExposure] ${i} deposit.deposit |`,
          JSON.stringify(
            {
              stepDepositedAmount: stepDepositedAmount.toFixed(20),
              isMaxDeposit,
            },
            null,
            2,
          ),
        );

        strategyDeposit(
          stepBaseCoin,
          loopingDepositReserve.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            loopingDepositReserve.coinType,
          ),
          transaction,
        );

        // 2.3) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: loopingDepositReserve.coinType,
          depositedAmount: stepDepositedAmount,
        });

        console.log(
          `[loopToExposure] ${i} deposit.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );
      }
    } else {
      throw new Error("No LST or base reserve found"); // Should not happen
    }

    return { deposits, borrowedAmount, transaction };
  };

  const unloopToExposureTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    _targetBorrowedAmount: BigNumber | undefined,
    _targetExposure: BigNumber | undefined, // Must be defined if _targetBorrowedAmount is undefined
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[unloopToExposure] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          _targetBorrowedAmount: _targetBorrowedAmount?.toFixed(20),
          _targetExposure: _targetExposure?.toFixed(20),
        },
        null,
        2,
      ),
    );

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base
    const loopingDepositReserve = (depositReserves.lst ??
      depositReserves.base)!; // Must have base if no LST

    //

    let deposits = cloneDeep(_deposits);
    let borrowedAmount = _borrowedAmount;

    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetBorrowedAmount =
      _targetBorrowedAmount ??
      tvlAmountUsd
        .times(_targetExposure!.minus(1))
        .div(borrowReserve.price)
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    console.log(
      `[unloopToExposure] processed_args |`,
      JSON.stringify({
        tvlAmountUsd: tvlAmountUsd.toFixed(20),
        targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
      }),
    );

    if (borrowedAmount.eq(targetBorrowedAmount))
      return { deposits, borrowedAmount, transaction };

    const fullyRepayBorrowsUsingLst = async (
      maxWithdrawRemainingLstAndRedepositAsBase: boolean,
    ) => {
      if (depositReserves.lst === undefined)
        throw new Error("LST reserve not found");

      const fullRepaymentAmount = new BigNumber(
        new BigNumber(0.01).div(borrowReserve.price), // $0.01 in borrow coinType (still well over E borrows, e.g. E SUI)
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingLst] |`,
        JSON.stringify({
          borrowedAmount: borrowedAmount.toFixed(20),
          fullRepaymentAmount: fullRepaymentAmount.toFixed(20),
        }),
      );

      // 1) Withdraw LST
      const lstWithdrawnAmount = fullRepaymentAmount
        .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
        .div(lst?.lstToSuiExchangeRate ?? 1)
        .decimalPlaces(
          depositReserves.lst.token.decimals,
          BigNumber.ROUND_DOWN,
        );

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingLst] withdraw_lst |`,
        JSON.stringify({
          lstWithdrawnAmount: lstWithdrawnAmount.toFixed(20),
        }),
      );

      // 1.1) Withdraw
      const [withdrawnLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        BigInt(
          new BigNumber(
            lstWithdrawnAmount
              .times(10 ** LST_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(depositReserves.lst.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );

      // 1.2) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: lstWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingLst] withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Unstake LST for SUI
      const fullRepaymentCoin = lst!.client.redeem(
        transaction,
        withdrawnLstCoin,
      );

      // 3) Repay borrows
      // 3.1) Repay
      const repaidAmount = new BigNumber(
        new BigNumber(
          lstWithdrawnAmount.times(lst?.lstToSuiExchangeRate ?? 1),
        ).minus(
          getLstRedeemFee(depositReserves.lst.coinType, lstWithdrawnAmount),
        ),
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingLst] repay_borrows.repay |`,
        JSON.stringify(
          {
            repaidAmount: repaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      appData.suilendClient.repay(
        obligationId,
        borrowReserve.coinType,
        fullRepaymentCoin,
        transaction,
      );
      transaction.transferObjects([fullRepaymentCoin], _address); // Transfer remaining SUI to user

      // 2.3) Update state
      borrowedAmount = BigNumber.max(
        borrowedAmount.minus(repaidAmount),
        new BigNumber(0),
      );

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingLst] repay_borrows.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 3) Swap remaining borrow to LST and redeposit (not possible because coin is a mutable reference (?))

      // Max withdraw remaining LST and redeposit as base:
      if (maxWithdrawRemainingLstAndRedepositAsBase) {
        if (depositReserves.base === undefined)
          throw new Error("Base reserve not found");

        // 1) MAX withdraw LST
        const remainingLstWithdrawnAmount = (
          deposits.find((d) => d.coinType === depositReserves.lst!.coinType)
            ?.depositedAmount ?? new BigNumber(0)
        )
          .minus(lstWithdrawnAmount)
          .decimalPlaces(
            depositReserves.lst.token.decimals,
            BigNumber.ROUND_DOWN,
          );

        console.log(
          `[unloopToExposure.fullyRepayBorrowsUsingLst] max_withdraw_lst |`,
          JSON.stringify({
            remainingLstWithdrawnAmount:
              remainingLstWithdrawnAmount.toFixed(20),
          }),
        );

        // 1.1) MAX Withdraw
        const [withdrawnRemainingLstCoin] = strategyWithdraw(
          depositReserves.lst.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            depositReserves.lst.coinType,
          ),
          BigInt(MAX_U64.toString()),
          transaction,
        );

        // 1.2) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: depositReserves.lst.coinType,
          depositedAmount: remainingLstWithdrawnAmount.times(-1), // Should be 0 after this
        });

        console.log(
          `[unloopToExposure.fullyRepayBorrowsUsingLst] max_withdraw_lst.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 2) Swap LST for base and redeposit
        // 2.1) Get routers
        const routers = await cetusSdk.findRouters({
          from: depositReserves.lst.coinType,
          target: depositReserves.base.coinType,
          amount: new BN(
            remainingLstWithdrawnAmount
              .times(10 ** depositReserves.lst.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
          byAmountIn: true,
        });
        if (!routers) throw new Error("No swap quote found");

        console.log(
          `[unloopToExposure.fullyRepayBorrowsUsingLst] swap_lst_for_base.get_routers`,
          { routers },
        );

        // 2.2) Swap
        let baseCoin: TransactionObjectArgument;
        try {
          baseCoin = await cetusSdk.fixableRouterSwapV3({
            router: routers,
            inputCoin: withdrawnRemainingLstCoin,
            slippage: 3 / 100,
            txb: transaction,
            partner: CETUS_PARTNER_ID,
          });
        } catch (err) {
          throw new Error("No swap quote found");
        }

        // 3) Deposit base
        strategyDeposit(
          baseCoin,
          depositReserves.base.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            depositReserves.base.coinType,
          ),
          transaction,
        );
      }
    };

    const fullyRepayBorrowsUsingBase = async () => {
      if (depositReserves.base === undefined)
        throw new Error("Base reserve not found");

      const fullRepaymentAmount = new BigNumber(
        new BigNumber(0.01).div(borrowReserve.price), // $0.01 in borrow coinType (still well over E borrows, e.g. E SUI)
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingBase] |`,
        JSON.stringify({
          borrowedAmount: borrowedAmount.toFixed(20),
          fullRepaymentAmount: fullRepaymentAmount.toFixed(20),
        }),
      );

      // 1) MAX withdraw LST
      if (depositReserves.lst !== undefined) {
        // 1.1) MAX withdraw
        const [withdrawnMaxLstCoin] = strategyWithdraw(
          depositReserves.lst.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            depositReserves.lst.coinType,
          ),
          BigInt(MAX_U64.toString()),
          transaction,
        );

        // 1.2) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: depositReserves.lst.coinType,
          depositedAmount: (
            deposits.find((d) => d.coinType === depositReserves.lst!.coinType)
              ?.depositedAmount ?? new BigNumber(0)
          ).times(-1),
        });

        console.log(
          `[unloopToExposure.fullyRepayBorrowsUsingBase] max_withdraw_lst.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 1.3) Unstake LST for SUI
        const suiCoin = lst!.client.redeem(transaction, withdrawnMaxLstCoin);

        // 1.4) Transfer SUI to user
        transaction.transferObjects([suiCoin], _address);
      }

      // 2) Withdraw base
      const baseWithdrawnAmount = new BigNumber(
        fullRepaymentAmount.times(borrowReserve.price),
      )
        .div(depositReserves.base.price)
        .times(1.01); // 1% buffer

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingBase] withdraw_base |`,
        JSON.stringify(
          {
            baseWithdrawnAmount: baseWithdrawnAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2.1) Withdraw
      const [withdrawnBaseCoin] = strategyWithdraw(
        depositReserves.base.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.base.coinType,
        ),
        BigInt(
          new BigNumber(
            baseWithdrawnAmount
              .times(10 ** depositReserves.base.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(depositReserves.base.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );

      // 2.2) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.base.coinType,
        depositedAmount: baseWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingBase] withdraw_base.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 3) Swap base for borrow
      // 3.1) Get routers
      const routers = await cetusSdk.findRouters({
        from: depositReserves.base.coinType,
        target: borrowReserve.coinType,
        amount: new BN(
          baseWithdrawnAmount
            .times(10 ** depositReserves.base.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
        byAmountIn: true,
      });
      if (!routers) throw new Error("No swap quote found");

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingBase] swap_base_for_borrows.get_routers`,
        { routers },
      );

      // 3.2) Swap
      let borrowCoin: TransactionObjectArgument;
      try {
        borrowCoin = await cetusSdk.fixableRouterSwapV3({
          router: routers,
          inputCoin: withdrawnBaseCoin,
          slippage: 1 / 100,
          txb: transaction,
          partner: CETUS_PARTNER_ID,
        });
      } catch (err) {
        throw new Error("No swap quote found");
      }

      // 4) Repay borrows
      // 4.1) Repay
      const repaidAmount = fullRepaymentAmount;

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingBase] repay_borrows.repay |`,
        JSON.stringify(
          {
            repaidAmount: repaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      appData.suilendClient.repay(
        obligationId,
        borrowReserve.coinType,
        borrowCoin,
        transaction,
      );
      transaction.transferObjects([borrowCoin], _address); // Transfer remaining borrow to user

      // 4.2) Update state
      borrowedAmount = BigNumber.max(
        borrowedAmount.minus(repaidAmount),
        new BigNumber(0),
      );

      console.log(
        `[unloopToExposure.fullyRepayBorrowsUsingBase] repay_borrows.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 5) Swap remaining borrow to base and redeposit (not possible because coin is a mutable reference (?))
    };

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        getSimulatedObligation(strategyType, deposits, borrowedAmount),
      );
      const pendingBorrowedAmount = borrowedAmount.minus(targetBorrowedAmount);

      console.log(
        `[unloopToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingBorrowedAmount: pendingBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // Base+LST or LST only
      if (loopingDepositReserve.coinType === depositReserves.lst?.coinType) {
        // Target: 1x leverage
        if (targetBorrowedAmount.eq(0)) {
          if (depositReserve.coinType === depositReserves.base?.coinType) {
            const lstDeposit = deposits.find(
              (d) => d.coinType === depositReserves.lst!.coinType,
            )!;

            // Ran out of LST
            if (lstDeposit.depositedAmount.lte(E)) {
              // 1. MAX withdraws LST (transferred to user as SUI)
              // 2. Withdraws base to cover borrows
              // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
              await fullyRepayBorrowsUsingBase();
              break;
            }

            // Borrows almost fully repaid
            if (pendingBorrowedAmount.lte(E)) {
              try {
                // 1. Withdraws LST to cover borrows
                // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
                // 2. MAX withdraws remaining LST and redeposits as base
                await fullyRepayBorrowsUsingLst(true);
                break;
              } catch (err) {
                console.error(err);
              }

              // 1. MAX withdraws LST (transferred to user as SUI)
              // 2. Withdraws base to cover borrows
              // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
              await fullyRepayBorrowsUsingBase();
              break;
            }
          } else {
            // Borrows almost fully repaid
            if (pendingBorrowedAmount.lte(E)) {
              // 1. Withdraws LST to cover borrows
              // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
              await fullyRepayBorrowsUsingLst(false);
              break;
            }
          }
        } else {
          if (pendingBorrowedAmount.lte(E)) break;
        }

        // 1) Withdraw LST
        // 1.1) Max
        const stepMaxWithdrawnAmount = getStepMaxWithdrawnAmount(
          strategyType,
          deposits,
          borrowedAmount,
          loopingDepositReserve.coinType,
        )
          .times(0.9) // 10% buffer
          .decimalPlaces(
            loopingDepositReserve.token.decimals,
            BigNumber.ROUND_DOWN,
          );
        const stepMaxRepaidAmount = new BigNumber(
          new BigNumber(
            stepMaxWithdrawnAmount.times(lst?.lstToSuiExchangeRate ?? 1),
          ).minus(
            getLstRedeemFee(
              loopingDepositReserve.coinType,
              stepMaxWithdrawnAmount,
            ),
          ),
        ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

        console.log(
          `[unloopToExposure] ${i} withdraw_lst.max |`,
          JSON.stringify(
            {
              stepMaxWithdrawnAmount: stepMaxWithdrawnAmount.toFixed(20),
              stepMaxRepaidAmount: stepMaxRepaidAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 1.2) Withdraw
        const stepWithdrawnAmount = BigNumber.min(
          pendingBorrowedAmount,
          stepMaxRepaidAmount,
        )
          .times(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
          .div(lst?.lstToSuiExchangeRate ?? 1)
          .decimalPlaces(
            loopingDepositReserve.token.decimals,
            BigNumber.ROUND_DOWN,
          );
        const isMaxWithdraw = stepWithdrawnAmount.eq(stepMaxWithdrawnAmount);

        console.log(
          `[unloopToExposure] ${i} withdraw_lst.withdraw |`,
          JSON.stringify(
            {
              stepWithdrawnAmount: stepWithdrawnAmount.toFixed(20),
              isMaxWithdraw,
            },
            null,
            2,
          ),
        );

        const [stepWithdrawnCoin] = strategyWithdraw(
          loopingDepositReserve.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            loopingDepositReserve.coinType,
          ),
          BigInt(
            new BigNumber(
              stepWithdrawnAmount
                .times(10 ** loopingDepositReserve.token.decimals)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(loopingDepositReserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP)
              .toString(),
          ),
          transaction,
        );

        // 1.3) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: loopingDepositReserve.coinType,
          depositedAmount: stepWithdrawnAmount.times(-1),
        });

        console.log(
          `[unloopToExposure] ${i} withdraw_lst.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 2.1) Unstake LST for SUI
        const stepSuiCoin = lst!.client.redeem(transaction, stepWithdrawnCoin);

        // 3) Repay SUI
        // 3.1) Repay
        const stepRepaidAmount = new BigNumber(
          new BigNumber(
            stepWithdrawnAmount.times(lst?.lstToSuiExchangeRate ?? 1),
          ).minus(
            getLstRedeemFee(
              loopingDepositReserve.coinType,
              stepWithdrawnAmount,
            ),
          ),
        ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
        const isMaxRepay = stepRepaidAmount.eq(stepMaxRepaidAmount);

        console.log(
          `[unloopToExposure] ${i} repay_sui.repay |`,
          JSON.stringify(
            {
              stepRepaidAmount: stepRepaidAmount.toFixed(20),
              isMaxRepay,
            },
            null,
            2,
          ),
        );

        appData.suilendClient.repay(
          obligationId,
          borrowReserve.coinType,
          stepSuiCoin,
          transaction,
        );
        transaction.transferObjects([stepSuiCoin], _address);

        // 3.2) Update state
        borrowedAmount = borrowedAmount.minus(stepRepaidAmount);

        console.log(
          `[unloopToExposure] ${i} repay_sui.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );
      }

      // Base only
      else if (
        loopingDepositReserve.coinType === depositReserves.base?.coinType
      ) {
        const borrowToBaseExchangeRate = new BigNumber(1); // Assume 1:1 exchange rate

        // Target: 1x leverage
        if (targetBorrowedAmount.eq(0)) {
          // Borrows almost fully repaid
          if (pendingBorrowedAmount.lte(E)) {
            // 1. Withdraws base to cover borrows
            // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
            await fullyRepayBorrowsUsingBase();
            break;
          }
        } else {
          if (pendingBorrowedAmount.lte(E)) break;
        }

        // 1) Withdraw base
        // 1.1) Max
        const stepMaxWithdrawnAmount = getStepMaxWithdrawnAmount(
          strategyType,
          deposits,
          borrowedAmount,
          loopingDepositReserve.coinType,
        )
          .times(0.9) // 10% buffer
          .decimalPlaces(
            loopingDepositReserve.token.decimals,
            BigNumber.ROUND_DOWN,
          );
        const stepMaxRepaidAmount = stepMaxWithdrawnAmount
          .div(borrowToBaseExchangeRate)
          .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

        console.log(
          `[unloopToExposure] ${i} withdraw_base.max |`,
          JSON.stringify(
            {
              stepMaxWithdrawnAmount: stepMaxWithdrawnAmount.toFixed(20),
              stepMaxRepaidAmount: stepMaxRepaidAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 1.2) Withdraw
        const stepWithdrawnAmount = BigNumber.min(
          pendingBorrowedAmount,
          stepMaxRepaidAmount,
        )
          .times(borrowToBaseExchangeRate)
          .decimalPlaces(
            loopingDepositReserve.token.decimals,
            BigNumber.ROUND_DOWN,
          );
        const isMaxWithdraw = stepWithdrawnAmount.eq(stepMaxWithdrawnAmount);

        console.log(
          `[unloopToExposure] ${i} withdraw_base.withdraw |`,
          JSON.stringify(
            {
              stepWithdrawnAmount: stepWithdrawnAmount.toFixed(20),
              isMaxWithdraw,
            },
            null,
            2,
          ),
        );

        const [stepWithdrawnCoin] = strategyWithdraw(
          loopingDepositReserve.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            loopingDepositReserve.coinType,
          ),
          BigInt(
            new BigNumber(
              stepWithdrawnAmount
                .times(10 ** loopingDepositReserve.token.decimals)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(loopingDepositReserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP)
              .toString(),
          ),
          transaction,
        );

        // 1.3) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: loopingDepositReserve.coinType,
          depositedAmount: stepWithdrawnAmount.times(-1),
        });

        console.log(
          `[unloopToExposure] ${i} withdraw_base.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );

        // 2.1) Swap borrows for base
        const [coinA, coinB] = [
          stepWithdrawnCoin,
          steammClient.fullClient.zeroCoin(
            transaction,
            NORMALIZED_wBTC_COINTYPE,
          ),
        ];

        await swapInSteammPool(
          steammClient,
          transaction,
          coinA,
          coinB,
          true,
          transaction.moveCall({
            target: "0x2::coin::value",
            typeArguments: [NORMALIZED_xBTC_COINTYPE],
            arguments: [stepWithdrawnCoin],
          }),
          BigInt(
            // new BigNumber(
            //   stepWithdrawnAmount.div(borrowToBaseExchangeRate).times(0.97),
            // ) // stepWithdrawnAmount is an estimate for amountIn - divide by borrow2base exchange rate, and apply a 3% buffer
            //   .times(10 ** depositReserves.base.token.decimals)
            //   .integerValue(BigNumber.ROUND_DOWN)
            //   .toString(),
            "1",
          ),
        );
        transaction.transferObjects([coinA], _address);
        const stepBorrowCoin = coinB;

        // 3) Repay borrows
        // 3.1) Repay
        const stepRepaidAmount = stepWithdrawnAmount
          .div(borrowToBaseExchangeRate)
          .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
        const isMaxRepay = stepRepaidAmount.eq(stepMaxRepaidAmount);

        console.log(
          `[unloopToExposure] ${i} repay_borrows.repay |`,
          JSON.stringify(
            {
              stepRepaidAmount: stepRepaidAmount.toFixed(20),
              isMaxRepay,
            },
            null,
            2,
          ),
        );

        appData.suilendClient.repay(
          obligationId,
          borrowReserve.coinType,
          stepBorrowCoin,
          transaction,
        );
        transaction.transferObjects([stepBorrowCoin], _address);

        // 3.2) Update state
        borrowedAmount = borrowedAmount.minus(stepRepaidAmount);

        console.log(
          `[unloopToExposure] ${i} repay_borrows.update_state |`,
          JSON.stringify(
            {
              deposits: deposits.map((d) => ({
                coinType: d.coinType,
                depositedAmount: d.depositedAmount.toFixed(20),
              })),
              borrowedAmount: borrowedAmount.toFixed(20),
            },
            null,
            2,
          ),
        );
      } else {
        throw new Error("No LST or base reserve found"); // Should not happen
      }
    }

    return { deposits, borrowedAmount, transaction };
  };

  const depositTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    deposit: Deposit,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[deposit] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          deposit: {
            coinType: deposit.coinType,
            depositedAmount: deposit.depositedAmount.toFixed(20),
          },
        },
        null,
        2,
      ),
    );

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    //

    let deposits = cloneDeep(_deposits);
    const borrowedAmount = _borrowedAmount;

    // 1) Deposit
    // 1.1) SUI
    if (isSui(deposit.coinType)) {
      if (depositReserves.lst === undefined)
        throw new Error("LST reserve not found");

      const suiAmount = deposit.depositedAmount;
      const lstAmount = new BigNumber(
        suiAmount
          .minus(getLstMintFee(depositReserves.lst.coinType, suiAmount))
          .times(lst?.suiToLstExchangeRate ?? 1),
      ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

      // 1.1.1) Split coins
      const suiCoin = transaction.splitCoins(transaction.gas, [
        suiAmount
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      ]);

      // 1.1.2) Stake SUI for LST
      const lstCoin = lst!.client.mint(transaction, suiCoin);

      // 1.1.3) Deposit LST (1x exposure)
      strategyDeposit(
        lstCoin,
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        transaction,
      );

      // 1.1.4) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: lstAmount,
      });
    }

    // 1.2) LST
    else if (deposit.coinType === depositReserves.lst?.coinType) {
      // 1.2.1) Split coins
      const allCoinsLst = await getAllCoins(
        suiClient,
        _address,
        depositReserves.lst.coinType,
      );
      const mergeCoinLst = mergeAllCoins(
        depositReserves.lst.coinType,
        transaction,
        allCoinsLst,
      );

      const lstCoin = transaction.splitCoins(
        transaction.object(mergeCoinLst.coinObjectId),
        [
          BigInt(
            deposit.depositedAmount
              .times(10 ** LST_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      );

      // 1.2.2) Deposit LST (1x exposure)
      strategyDeposit(
        lstCoin,
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        transaction,
      );

      // 1.2.3) Update state
      deposits = addOrInsertDeposit(deposits, deposit);

      // 1.3) Other
    } else {
      const otherReserve = appData.reserveMap[deposit.coinType];

      // 1.3.1) Split coins
      const allCoinsOther = await getAllCoins(
        suiClient,
        _address,
        otherReserve.coinType,
      );
      const mergeCoinOther = mergeAllCoins(
        otherReserve.coinType,
        transaction,
        allCoinsOther,
      );

      const otherCoin = transaction.splitCoins(
        transaction.object(mergeCoinOther.coinObjectId),
        [
          BigInt(
            deposit.depositedAmount
              .times(10 ** otherReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      );

      // 1.3.2) Deposit other (1x exposure)
      strategyDeposit(
        otherCoin,
        otherReserve.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(otherReserve.coinType),
        transaction,
      );

      // 1.3.3) Update state
      deposits = addOrInsertDeposit(deposits, deposit);
    }

    console.log(
      `[deposit] deposit |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    return { deposits, borrowedAmount, transaction };
  };

  const depositAndLoopToExposureTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    deposit: Deposit,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[depositAndLoopToExposure] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          deposit: {
            coinType: deposit.coinType,
            depositedAmount: deposit.depositedAmount.toFixed(20),
          },
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    let borrowedAmount = _borrowedAmount;

    // 1) Deposit (1x exposure)
    // 1.1) Deposit
    const {
      deposits: newDeposits,
      borrowedAmount: newBorrowedAmount,
      transaction: newTransaction,
    } = await depositTx(
      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      borrowedAmount,
      deposit,
      transaction,
    );

    // 1.2) Update state
    deposits = newDeposits;
    borrowedAmount = newBorrowedAmount;
    transaction = newTransaction;

    if (targetExposure.gt(1)) {
      // 2) Loop to target exposure
      // 2.1) Loop
      const {
        deposits: newDeposits2,
        borrowedAmount: newBorrowedAmount2,
        transaction: newTransaction2,
      } = await loopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        borrowedAmount,
        undefined, // Don't pass targetBorrowedAmount
        targetExposure, // Pass targetExposure
        transaction,
      );

      // 2.2) Update state
      deposits = newDeposits2;
      borrowedAmount = newBorrowedAmount2;
      transaction = newTransaction2;
    }

    return { deposits, borrowedAmount, transaction };
  };

  const withdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    withdraw: Withdraw,
    transaction: Transaction,
    returnWithdrawnCoin?: boolean,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
    withdrawnCoin?: TransactionArgument;
  }> => {
    console.log(
      `[withdraw] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          withdraw: {
            coinType: withdraw.coinType,
            withdrawnAmount: withdraw.withdrawnAmount.toFixed(20),
          },
          returnWithdrawnCoin,
        },
        null,
        2,
      ),
    );

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    //

    let deposits = cloneDeep(_deposits);
    let borrowedAmount = _borrowedAmount;

    const withdrawnAmount = (
      depositReserve.coinType === depositReserves.base?.coinType
        ? withdraw.withdrawnAmount
        : isSui(withdraw.coinType)
          ? withdraw.withdrawnAmount
              .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
              .div(lst?.lstToSuiExchangeRate ?? 1)
          : withdraw.withdrawnAmount
    ).decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_DOWN);
    const withdrawnAmountUsd = withdrawnAmount
      .times(depositReserve.price)
      .times(
        depositReserve.coinType === depositReserves.base?.coinType
          ? 1
          : new BigNumber(lst?.lstToSuiExchangeRate ?? 1).times(
              1 - +(lst?.redeemFeePercent ?? 0) / 100,
            ),
      );

    const exposure = getExposure(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    );
    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetTvlAmountUsd = tvlAmountUsd.minus(withdrawnAmountUsd);
    const targetBorrowedAmount = targetTvlAmountUsd
      .times(exposure.minus(1))
      .div(borrowReserve.price)
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    console.log(
      `[withdraw] processed_args |`,
      JSON.stringify(
        {
          depositReserve_coinType: depositReserve.coinType,
          withdrawnAmount: withdrawnAmount.toFixed(20),
          withdrawnAmountUsd: withdrawnAmountUsd.toFixed(20),

          exposure: exposure.toFixed(20),
          tvlAmountUsd: tvlAmountUsd.toFixed(20),
          targetTvlAmountUsd: targetTvlAmountUsd.toFixed(20),
          targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 1) Unloop to targetBorrowedAmount borrows
    // 1.1) Unloop
    if (borrowedAmount.gt(targetBorrowedAmount)) {
      const {
        deposits: newDeposits,
        borrowedAmount: newBorrowedAmount,
        transaction: newTransaction,
      } = await unloopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        borrowedAmount,
        targetBorrowedAmount, // Pass targetBorrowedAmount
        undefined, // Don't pass targetExposure
        transaction,
      );

      // 1.2) Update state
      deposits = newDeposits;
      borrowedAmount = newBorrowedAmount;
      transaction = newTransaction;

      console.log(
        `[withdraw] unloop.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),

            targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    // 2) Withdraw base or LST
    // 2.1) Withdraw
    const [withdrawnCoin] = strategyWithdraw(
      depositReserve.coinType,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(depositReserve.coinType),
      BigInt(
        new BigNumber(
          withdrawnAmount
            .times(10 ** depositReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        )
          .div(depositReserve.cTokenExchangeRate)
          .integerValue(BigNumber.ROUND_UP)
          .toString(),
      ),
      transaction,
    );

    // 2.2) Update state
    deposits = addOrInsertDeposit(deposits, {
      coinType: depositReserve.coinType,
      depositedAmount: withdrawnAmount.times(-1),
    });

    const newExposure = getExposure(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    );
    const newTvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    ).times(defaultCurrencyReserve.price);

    console.log(
      `[withdraw] withdraw.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),

          exposure: exposure.toFixed(20),
          newExposure: newExposure.toFixed(20),

          tvlAmountUsd: tvlAmountUsd.toFixed(20),
          targetTvlAmountUsd: targetTvlAmountUsd.toFixed(20),
          newTvlAmountUsd: newTvlAmountUsd.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 3) Transfer coin to user, or return coin
    if (returnWithdrawnCoin)
      return { deposits, borrowedAmount, transaction, withdrawnCoin };
    else {
      if (depositReserve.coinType === depositReserves.base?.coinType) {
        // 3.1) Transfer base to user
        transaction.transferObjects([withdrawnCoin], _address);
      } else {
        if (isSui(withdraw.coinType)) {
          // 3.1) Unstake LST for SUI
          const suiWithdrawnCoin = lst!.client.redeem(
            transaction,
            withdrawnCoin,
          );

          // 3.2) Transfer SUI to user
          transaction.transferObjects([suiWithdrawnCoin], _address);
        } else {
          // 3.1) Transfer LST to user
          transaction.transferObjects([withdrawnCoin], _address);
        }
      }
    }

    return { deposits, borrowedAmount, transaction };
  };

  const maxWithdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    withdrawCoinType: string,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[maxWithdraw] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          withdrawCoinType,
        },
        null,
        2,
      ),
    );

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    //

    let deposits = cloneDeep(_deposits);
    let borrowedAmount = _borrowedAmount;

    // 1) Unloop to 1x (base+LST: no LST and no borrows, LST: no borrows)
    if (borrowedAmount.gt(0)) {
      // 1.1) Unloop
      const {
        deposits: newDeposits,
        borrowedAmount: newBorrowedAmount,
        transaction: newTransaction,
      } = await unloopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        borrowedAmount,
        undefined, // Don't pass targetBorrowedAmount
        new BigNumber(1), // Pass targetExposure
        transaction,
      );

      // 1.2) Update state
      deposits = newDeposits;
      borrowedAmount = newBorrowedAmount;
      transaction = newTransaction;

      console.log(
        `[maxWithdraw] unloop.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    // 2) MAX withdraw base or LST
    const [withdrawnCoin] = strategyWithdraw(
      depositReserve.coinType,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(depositReserve.coinType),
      BigInt(MAX_U64.toString()),
      transaction,
    );

    // 2.2) Update state
    deposits = [];

    console.log(
      `[maxWithdraw] max_withdraw.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 3) Transfer coin to user
    if (depositReserve.coinType === depositReserves.base?.coinType) {
      // 3.1) Transfer base to user
      transaction.transferObjects([withdrawnCoin], _address);
    } else {
      if (isSui(withdrawCoinType)) {
        // 3.1) Unstake LST for SUI
        const suiWithdrawnCoin = lst!.client.redeem(transaction, withdrawnCoin);

        // 3.2) Transfer SUI to user
        transaction.transferObjects([suiWithdrawnCoin], _address);
      } else {
        // 3.1) Transfer LST to user
        transaction.transferObjects([withdrawnCoin], _address);
      }
    }

    // 4) Claim rewards, swap for withdrawCoinType, and transfer to user
    if (hasClaimableRewards) {
      try {
        const txCopy = Transaction.from(transaction);
        await strategyClaimRewardsAndSwapForCoinType(
          _address,
          cetusSdk,
          CETUS_PARTNER_ID,
          rewardsMap,
          appData.reserveMap[withdrawCoinType],
          strategyOwnerCapId,
          false, // isDepositing (false = transfer to user)
          txCopy,
        );
        await dryRunTransaction(txCopy); // Throws error if fails

        transaction = txCopy;
      } catch (err) {
        // Don't block user if fails
        console.error(err);
      }
    }

    return { deposits, borrowedAmount, transaction };
  };

  const depositAdjustWithdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    additionalDepositedAmount: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[depositAdjustWithdraw] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          additionalDepositedAmount: additionalDepositedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    //

    let deposits = cloneDeep(_deposits);
    let borrowedAmount = _borrowedAmount;

    // 1) Flash loan borrow
    const flashLoanObj = STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP[strategyType];

    let borrowedBalanceA, borrowedBalanceB, receipt;
    if (flashLoanObj.provider === FlashLoanProvider.CETUS) {
      [borrowedBalanceA, borrowedBalanceB, receipt] = transaction.moveCall({
        target: `${CETUS_CONTRACT_PACKAGE_ID}::pool::flash_loan`,
        typeArguments: [flashLoanObj.coinTypeA, flashLoanObj.coinTypeB],
        arguments: [
          transaction.object(CETUS_GLOBAL_CONFIG_OBJECT_ID),
          transaction.object(flashLoanObj.poolId),
          transaction.pure.bool(flashLoanObj.borrowA),
          transaction.pure.u64(
            additionalDepositedAmount
              .times(10 ** depositReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      });
    } else if (flashLoanObj.provider === FlashLoanProvider.MMT) {
      [borrowedBalanceA, borrowedBalanceB, receipt] = transaction.moveCall({
        target: `${MMT_CONTRACT_PACKAGE_ID}::trade::flash_loan`,
        typeArguments: [flashLoanObj.coinTypeA, flashLoanObj.coinTypeB],
        arguments: [
          transaction.object(flashLoanObj.poolId),
          transaction.pure.u64(
            flashLoanObj.borrowA
              ? additionalDepositedAmount
                  .times(10 ** depositReserve.token.decimals)
                  .integerValue(BigNumber.ROUND_DOWN)
                  .toString()
              : 0,
          ),
          transaction.pure.u64(
            !flashLoanObj.borrowA
              ? 0
              : additionalDepositedAmount
                  .times(10 ** depositReserve.token.decimals)
                  .integerValue(BigNumber.ROUND_DOWN)
                  .toString(),
          ),
        ],
      });
    } else {
      throw new Error("Invalid flash loan provider");
    }

    // 2) Deposit additional (to get back up to 100% health, so the user can then unloop back down to the max leverage shown in the UI)
    // 2.1) Deposit
    strategyDeposit(
      flashLoanObj.borrowA ? borrowedBalanceA : borrowedBalanceB,
      depositReserve.coinType,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(depositReserve.coinType),
      transaction,
    );

    // 2.2) Update state
    deposits = addOrInsertDeposit(deposits, {
      coinType: depositReserve.coinType,
      depositedAmount: additionalDepositedAmount,
    });

    // 3) Unloop to max exposure
    // 3.1) Unloop
    const {
      deposits: newDeposits,
      borrowedAmount: newBorrowedAmount,
      transaction: newTransaction,
    } = await unloopToExposureTx(
      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      borrowedAmount,
      undefined, // Don't pass targetBorrowedAmount
      depositAdjustWithdrawExposure, // Pass targetExposure
      transaction,
    );

    // 3.2) Update state
    deposits = newDeposits;
    borrowedAmount = newBorrowedAmount;
    transaction = newTransaction;

    // 4) Repay flash loan + fee
    // 4.1) Withdraw additional + fee
    const {
      deposits: newDeposits2,
      borrowedAmount: newBorrowedAmount2,
      transaction: newTransaction2,
      withdrawnCoin: withdrawnAdditionalPlusFeeCoin,
    } = await withdrawTx(
      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      borrowedAmount,
      {
        coinType: depositReserve.coinType,
        withdrawnAmount: additionalDepositedAmount
          .times(1 + flashLoanObj.feePercent / 100)
          .decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_UP),
      },
      transaction,
      true,
    );
    if (!withdrawnAdditionalPlusFeeCoin)
      throw new Error("Withdrawn additional coin not found");

    // 4.2) Repay flash loan
    const emptyBalance = transaction.moveCall({
      target: `0x2::balance::zero`,
      typeArguments: [
        flashLoanObj.borrowA ? flashLoanObj.coinTypeB : flashLoanObj.coinTypeA,
      ],
      arguments: [],
    });
    if (flashLoanObj.provider === FlashLoanProvider.CETUS) {
      transaction.moveCall({
        target: `${CETUS_CONTRACT_PACKAGE_ID}::pool::repay_flash_loan`,
        typeArguments: [flashLoanObj.coinTypeA, flashLoanObj.coinTypeB],
        arguments: [
          transaction.object(CETUS_GLOBAL_CONFIG_OBJECT_ID),
          transaction.object(flashLoanObj.poolId),
          flashLoanObj.borrowA ? withdrawnAdditionalPlusFeeCoin : emptyBalance,
          flashLoanObj.borrowA ? emptyBalance : withdrawnAdditionalPlusFeeCoin,
          receipt,
        ],
      });
    } else if (flashLoanObj.provider === FlashLoanProvider.MMT) {
      transaction.moveCall({
        target: `${MMT_CONTRACT_PACKAGE_ID}::trade::repay_flash_loan`,
        typeArguments: [flashLoanObj.coinTypeA, flashLoanObj.coinTypeB],
        arguments: [
          transaction.object(flashLoanObj.poolId),
          receipt,
          flashLoanObj.borrowA ? withdrawnAdditionalPlusFeeCoin : emptyBalance,
          flashLoanObj.borrowA ? emptyBalance : withdrawnAdditionalPlusFeeCoin,
        ],
      });
    } else {
      throw new Error("Invalid flash loan provider");
    }

    // 4.3) Update state
    deposits = newDeposits2;
    borrowedAmount = newBorrowedAmount2;
    transaction = newTransaction2;

    return { deposits, borrowedAmount, transaction };
  };

  const adjustTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _borrowedAmount: BigNumber,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[adjust] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _borrowedAmount: _borrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    //

    const deposits = cloneDeep(_deposits);
    const borrowedAmount = _borrowedAmount;

    // 1) Loop or unloop to target exposure
    if (targetExposure.gt(exposure))
      return loopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        borrowedAmount,
        undefined, // Don't pass targetBorrowedAmount
        targetExposure, // Pass targetExposure
        transaction,
      );
    else if (targetExposure.lt(exposure))
      return unloopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        borrowedAmount,
        undefined, // Don't pass targetBorrowedAmount
        targetExposure, // Pass targetExposure
        transaction,
      );
    else return { deposits, borrowedAmount, transaction };
  };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (base, LST, SUI, and any other deposits/borrows) - required when borrowing or withdrawing
      await appData.suilendClient.refreshAll(
        transaction,
        undefined,
        Array.from(
          new Set([
            ...(strategyInfo.depositBaseCoinType !== undefined
              ? [strategyInfo.depositBaseCoinType]
              : []),
            ...(strategyInfo.depositLstCoinType !== undefined
              ? [strategyInfo.depositLstCoinType]
              : []),
            strategyInfo.borrowCoinType,
            ...(obligation?.deposits.map((deposit) => deposit.coinType) ?? []),
            ...(obligation?.borrows.map((borrow) => borrow.coinType) ?? []),
          ]),
        ),
      );

      // 2) Rebalance position if needed
      if (!!strategyOwnerCap && !!obligation) {
        try {
          const txCopy = Transaction.from(transaction);

          // Base
          if (depositReserves.base !== undefined) {
            const baseDeposit = obligation.deposits.find(
              (d) => d.coinType === depositReserves.base!.coinType,
            );

            // Base+LST
            if (depositReserves.lst !== undefined) {
              const lstDeposit = obligation.deposits.find(
                (d) => d.coinType === depositReserves.lst!.coinType,
              );
              const nonBaseNonLstDeposits = obligation.deposits.filter(
                (d) =>
                  d.coinType !== depositReserves.base!.coinType &&
                  d.coinType !== depositReserves.lst!.coinType,
              );

              // Base+LST: Non-base/non-LST deposit(s)
              if (nonBaseNonLstDeposits.some((d) => d.depositedAmount.gt(0))) {
                // Swap non-base/non-LST deposits (e.g. autoclaimed+deposited non-base/non-LST rewards) for LST
                await strategySwapSomeDepositsForCoinType(
                  strategyType,
                  cetusSdk,
                  CETUS_PARTNER_ID,
                  obligation,
                  [depositReserves.lst.coinType],
                  new BigNumber(100),
                  depositReserves.lst,
                  strategyOwnerCap.id,
                  txCopy,
                );
              }

              // Base+LST: Base and LST deposits only
              else if (
                baseDeposit?.depositedAmount.gt(0) &&
                lstDeposit?.depositedAmount.gt(0)
              ) {
                const borrowedAmount =
                  obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

                // Base+LST: Base and LST deposits only, and SUI borrows
                if (borrowedAmount.gt(0)) {
                  const borrowedAmountUsd = borrowedAmount.times(
                    borrowReserve.price,
                  );
                  const fullRepaymentAmount = borrowedAmount
                    .times(
                      borrowedAmountUsd.lt(1)
                        ? 1.1 // 10% buffer
                        : borrowedAmountUsd.lt(10)
                          ? 1.01 // 1% buffer
                          : 1.001, // 0.1% buffer
                    )
                    .decimalPlaces(
                      borrowReserve.token.decimals,
                      BigNumber.ROUND_DOWN,
                    );

                  const lstWithdrawnAmount = fullRepaymentAmount
                    .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
                    .div(lst?.lstToSuiExchangeRate ?? 1)
                    .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

                  const swapPercent = BigNumber.min(
                    new BigNumber(
                      lstDeposit.depositedAmount.minus(lstWithdrawnAmount),
                    )
                      .div(lstDeposit.depositedAmount)
                      .times(100),
                    3, // Max 3% of LST deposits swapped for base at a time
                  );

                  // console.log("XXXXXX", {
                  //   borrowedAmount: borrowedAmount.toFixed(20),
                  //   fullRepaymentAmount: fullRepaymentAmount.toFixed(20),
                  //   lstDepositedAmount: lstDeposit.depositedAmount.toFixed(20),
                  //   lstWithdrawnAmount: lstWithdrawnAmount.toFixed(20),
                  //   swapPercent: swapPercent.toFixed(20),
                  // });

                  // Swap percent is at least 0.5%
                  if (swapPercent.gte(0.5)) {
                    // Swap excess LST deposits for base
                    await strategySwapSomeDepositsForCoinType(
                      strategyType,
                      cetusSdk,
                      CETUS_PARTNER_ID,
                      obligation,
                      [depositReserves.base.coinType],
                      swapPercent,
                      depositReserves.base,
                      strategyOwnerCap.id,
                      txCopy,
                    );
                  }

                  // Swap percent is less than 0.5%
                  else {
                    // DO NOTHING
                  }
                }

                // Base+LST: Base and LST deposits only, and no SUI borrows
                else {
                  // DO NOTHING
                }
              }

              // Base+LST: Base deposit only (1x leverage)
              else if (baseDeposit?.depositedAmount.gt(0)) {
                // DO NOTHING
              }

              // Base+LST: LST deposit only
              else if (lstDeposit?.depositedAmount.gt(0)) {
                // Swap LST deposits (e.g. autoclaimed+deposited LST rewards) for base
                await strategySwapSomeDepositsForCoinType(
                  strategyType,
                  cetusSdk,
                  CETUS_PARTNER_ID,
                  obligation,
                  [depositReserves.base.coinType],
                  new BigNumber(100),
                  depositReserves.base,
                  strategyOwnerCap.id,
                  txCopy,
                );
              }

              // Base+LST: No deposits
              else {
                // DO NOTHING
              }
            }

            // Base only
            else {
              const nonBaseDeposits = obligation.deposits.filter(
                (d) => d.coinType !== depositReserves.base!.coinType,
              );

              // Base only: Non-base deposit(s)
              if (nonBaseDeposits.some((d) => d.depositedAmount.gt(0))) {
                // Swap non-base deposits (e.g. autoclaimed+deposited non-base rewards) for base
                await strategySwapSomeDepositsForCoinType(
                  strategyType,
                  cetusSdk,
                  CETUS_PARTNER_ID,
                  obligation,
                  [depositReserves.base.coinType],
                  new BigNumber(100),
                  depositReserves.base,
                  strategyOwnerCap.id,
                  txCopy,
                );
              }

              // Base only: Base deposit only
              else if (baseDeposit?.depositedAmount.gt(0)) {
                // DO NOTHING
              }

              // Base only: No deposits
              else {
                // DO NOTHING
              }
            }
          }

          // LST only
          else {
            const lstDeposit = obligation.deposits.find(
              (d) => d.coinType === depositReserves.lst!.coinType,
            );
            const nonLstDeposits = obligation.deposits.filter(
              (d) => d.coinType !== depositReserves.lst!.coinType,
            );

            // LST only: Non-LST deposit(s)
            if (nonLstDeposits.some((d) => d.depositedAmount.gt(0))) {
              // Swap non-LST deposits (e.g. autoclaimed+deposited non-LST rewards) for LST
              await strategySwapSomeDepositsForCoinType(
                strategyType,
                cetusSdk,
                CETUS_PARTNER_ID,
                obligation,
                [depositReserves.lst!.coinType], // Must have LST if no base
                new BigNumber(100),
                depositReserves.lst!, // Must have LST if no base
                strategyOwnerCap.id,
                txCopy,
              );
            }

            // LST only: LST deposit only
            else if (lstDeposit?.depositedAmount.gt(0)) {
              // DO NOTHING
            }

            // LST only: No deposits
            else {
              // DO NOTHING
            }
          }

          await dryRunTransaction(txCopy); // Throws error is fails

          transaction = txCopy;
        } catch (err) {
          // Don't block user if fails
        }
      }

      if (selectedTab === Tab.DEPOSIT) {
        const { strategyOwnerCapId, didCreate } =
          createStrategyOwnerCapIfNoneExists(
            strategyType,
            strategyOwnerCap,
            transaction,
          );

        // 3) Deposit
        const { transaction: depositTransaction } =
          await depositAndLoopToExposureTx(
            address,
            strategyOwnerCapId,
            obligation?.id,
            obligation?.deposits ?? [],
            (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
            {
              coinType: currencyReserve.coinType,
              depositedAmount: new BigNumber(value),
            },
            !!obligation && hasPosition(obligation)
              ? getExposure(strategyType, obligation)
              : new BigNumber(depositSliderValue),
            transaction,
          );
        transaction = depositTransaction;

        // 4) Rebalance LST
        if (lst) {
          lst.client.rebalance(
            transaction,
            lst.client.liquidStakingObject.weightHookId,
          );
        }

        if (didCreate)
          sendStrategyOwnerCapToUser(strategyOwnerCapId, address, transaction);

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeOut = getBalanceChange(
          res,
          address,
          currencyReserve.token,
          -1,
        );

        toast.success(
          [
            "Deposited",
            balanceChangeOut !== undefined
              ? formatToken(balanceChangeOut, {
                  dp: currencyReserve.token.decimals,
                  trimTrailingZeros: true,
                })
              : null,
            currencyReserve.token.symbol,
            `into the ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
          ]
            .filter(Boolean)
            .join(" "),
          {
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );

        // Set slider value (if initial deposit)
        if (!obligation || !hasPosition(obligation))
          setAdjustSliderValue(depositSliderValue);
      } else if (selectedTab === Tab.WITHDRAW) {
        if (!strategyOwnerCap || !obligation)
          throw Error("StrategyOwnerCap or Obligation not found");

        // 3) Withdraw
        const { transaction: withdrawTransaction } = !useMaxAmount
          ? await withdrawTx(
              address,
              strategyOwnerCap.id,
              obligation.id,
              obligation.deposits,
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
              {
                coinType: currencyReserve.coinType,
                withdrawnAmount: new BigNumber(value),
              },
              transaction,
            )
          : await maxWithdrawTx(
              address,
              strategyOwnerCap.id,
              obligation.id,
              obligation.deposits,
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
              currencyReserve.coinType,
              transaction,
            );
        transaction = withdrawTransaction;

        // 4) Rebalance LST
        if (lst) {
          lst.client.rebalance(
            transaction,
            lst.client.liquidStakingObject.weightHookId,
          );
        }

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeIn = getBalanceChange(
          res,
          address,
          currencyReserve.token,
        );

        toast.success(
          [
            "Withdrew",
            balanceChangeIn !== undefined
              ? formatToken(balanceChangeIn, {
                  dp: currencyReserve.token.decimals,
                  trimTrailingZeros: true,
                })
              : null,
            currencyReserve.token.symbol,
            `from the ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
          ]
            .filter(Boolean)
            .join(" "),
          {
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );

        if (useMaxAmount) {
          // Reset slider values
          setDepositSliderValue(defaultExposure.toFixed(1));
          setAdjustSliderValue(defaultExposure.toFixed(1));
        }
      } else if (selectedTab === Tab.ADJUST) {
        if (!strategyOwnerCap || !obligation)
          throw Error("StrategyOwnerCap or Obligation not found");

        // 3) Deposit-adjust-withdraw or adjust
        if (!canAdjust) {
          // Deposit-adjust-withdraw
          const { transaction: depositAdjustWithdrawTransaction } =
            await depositAdjustWithdrawTx(
              address,
              strategyOwnerCap.id,
              obligation.id,
              obligation.deposits,
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
              depositAdjustWithdrawAdditionalDepositedAmount,
              transaction,
            );
          transaction = depositAdjustWithdrawTransaction;
        } else {
          // Adjust
          const { transaction: adjustTransaction } = await adjustTx(
            address,
            strategyOwnerCap.id,
            obligation.id,
            obligation.deposits,
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
            adjustExposure,
            transaction,
          );
          transaction = adjustTransaction;
        }

        // 4) Rebalance LST
        if (lst) {
          lst.client.rebalance(
            transaction,
            lst.client.liquidStakingObject.weightHookId,
          );
        }

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success(
          `Adjusted leverage to ${(!canAdjust
            ? depositAdjustWithdrawExposure
            : adjustExposure
          ).toFixed(1)}x`,
          {
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );
      } else {
        throw new Error("Invalid tab");
      }

      setUseMaxAmount(false);
      setValue("");
    } catch (err) {
      showErrorToast(
        `Failed to ${
          selectedTab === Tab.DEPOSIT
            ? "deposit into the"
            : selectedTab === Tab.WITHDRAW
              ? "withdraw from the"
              : selectedTab === Tab.ADJUST
                ? "adjust"
                : "--" // Should not happen
        } ${strategyInfo.header.title} ${strategyInfo.header.type} strategy${
          selectedTab === Tab.ADJUST ? " leverage" : ""
        }`,
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
      refresh();
    }
  };

  return (
    <Dialog
      rootProps={{
        open: isOpen,
        onOpenChange: (open) => {
          if (!open) close();
        },
      }}
      trigger={children}
      dialogContentProps={{ className: "md:inset-x-10" }}
      dialogContentInnerClassName="max-w-max"
      dialogContentInnerChildrenWrapperClassName="pt-4"
      contentInnerDecorator={
        // More parameters
        <div
          className="absolute -right-[calc(1px+40px)] top-1/2 -translate-y-1/2 rounded-r-md bg-popover max-md:hidden"
          style={{ writingMode: "vertical-rl" }}
        >
          <Button
            className="h-fit w-10 rounded-l-none rounded-r-md px-0 py-3"
            labelClassName="uppercase"
            endIcon={<MoreDetailsIcon className="h-4 w-4" />}
            variant="secondary"
            onClick={() => setIsMoreDetailsOpen((o) => !o)}
          >
            More details
          </Button>
        </div>
      }
    >
      <Tabs
        className="-mr-2 mb-4"
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
        topEndDecorator={
          <DialogPrimitive.Close asChild>
            <Button
              className="shrink-0 text-muted-foreground"
              icon={<X className="h-5 w-5" />}
              variant="ghost"
              size="icon"
            >
              Close
            </Button>
          </DialogPrimitive.Close>
        }
      >
        <div className="mb-4 flex w-full flex-col gap-4 sm:h-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <StrategyHeader strategyType={strategyType} />

          {hasClaimableRewards && (
            <div className="flex w-max flex-row-reverse items-center gap-3 sm:flex-row">
              <div className="flex flex-row-reverse items-center gap-2 sm:flex-row">
                <TLabel>
                  {formatUsd(
                    Object.entries(rewardsMap).reduce(
                      (acc, [coinType, { amount }]) => {
                        const price =
                          appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                        return acc.plus(amount.times(price));
                      },
                      new BigNumber(0),
                    ),
                  )}
                </TLabel>
                <Tooltip
                  content={
                    <div className="flex flex-col gap-1">
                      {Object.entries(rewardsMap).map(
                        ([coinType, { amount }]) => (
                          <div
                            key={coinType}
                            className="flex flex-row items-center gap-2"
                          >
                            <TokenLogo
                              token={getToken(
                                coinType,
                                appData.coinMetadataMap[coinType],
                              )}
                              size={16}
                            />
                            <TLabelSans className="text-foreground">
                              {formatToken(amount, {
                                dp: appData.coinMetadataMap[coinType].decimals,
                              })}{" "}
                              {appData.coinMetadataMap[coinType].symbol}
                            </TLabelSans>
                          </div>
                        ),
                      )}
                    </div>
                  }
                >
                  <div className="w-max">
                    <TokenLogos
                      tokens={Object.keys(rewardsMap).map((coinType) =>
                        getToken(coinType, appData.coinMetadataMap[coinType]),
                      )}
                      size={16}
                    />
                  </div>
                </Tooltip>
              </div>

              <Button
                className="w-[134px]"
                labelClassName="uppercase"
                disabled={isCompoundingRewards}
                onClick={onCompoundRewardsClick}
              >
                {isCompoundingRewards ? (
                  <Spinner size="sm" />
                ) : (
                  <>Claim rewards</>
                )}
              </Button>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch",
            !!obligation && hasPosition(obligation)
              ? [
                  StrategyType.USDC_sSUI_SUI_LOOPING,
                  StrategyType.AUSD_sSUI_SUI_LOOPING,
                  StrategyType.xBTC_sSUI_SUI_LOOPING,
                ].includes(strategyType)
                ? "md:min-h-[calc(314px+20px+12px)]"
                : "md:min-h-[314px]"
              : [
                    StrategyType.USDC_sSUI_SUI_LOOPING,
                    StrategyType.AUSD_sSUI_SUI_LOOPING,
                    StrategyType.xBTC_sSUI_SUI_LOOPING,
                  ].includes(strategyType)
                ? "md:min-h-[calc(374px+20px+12px)]"
                : "md:min-h-[374px]",
          )}
          style={{
            height: `calc(100dvh - ${8 /* Top */}px - ${1 /* Border-top */}px - ${16 /* Padding-top */}px - ${42 /* Tabs */}px - ${16 /* Tabs margin-bottom */}px - ${40 /* Header */}px - ${hasClaimableRewards ? 16 + 32 : 0 /* Claim rewards */}px - ${16 /* Header margin-bottom */}px - ${16 /* Padding-bottom */}px - ${1 /* Border-bottom */}px - ${8 /* Bottom */}px)`,
          }}
        >
          <div className="flex h-full w-full max-w-[28rem] flex-col gap-4 md:h-auto md:w-[28rem]">
            {/* Amount */}
            {(selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) && (
              <div className="relative flex w-full flex-col">
                <div className="relative z-[2] w-full">
                  <StrategyInput
                    ref={inputRef}
                    value={value}
                    onChange={onValueChange}
                    reserveOptions={currencyReserveOptions}
                    reserve={currencyReserve}
                    onReserveChange={onCurrencyReserveChange}
                    tab={selectedTab}
                    useMaxAmount={useMaxAmount}
                    onMaxClick={useMaxValueWrapper}
                  />
                </div>

                <div className="relative z-[1] -mt-2 flex w-full flex-row flex-wrap justify-between gap-x-2 gap-y-1 rounded-b-md bg-primary/25 px-3 pb-2 pt-4">
                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5",
                      selectedTab === Tab.DEPOSIT && "cursor-pointer",
                    )}
                    onClick={
                      selectedTab === Tab.DEPOSIT
                        ? useMaxValueWrapper
                        : undefined
                    }
                  >
                    <Wallet className="h-3 w-3 text-foreground" />
                    <Tooltip
                      title={
                        currencyReserveBalance.gt(0)
                          ? `${formatToken(currencyReserveBalance, { dp: currencyReserve.token.decimals })} ${currencyReserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(currencyReserveBalance, {
                          exact: false,
                        })}{" "}
                        {currencyReserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>

                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5",
                      selectedTab === Tab.WITHDRAW && "cursor-pointer",
                    )}
                    onClick={
                      selectedTab === Tab.WITHDRAW
                        ? useMaxValueWrapper
                        : undefined
                    }
                  >
                    <Download className="h-3 w-3 text-foreground" />
                    <Tooltip
                      title={
                        !!obligation && hasPosition(obligation)
                          ? `${formatToken(
                              tvlAmount.times(
                                depositReserves.base !== undefined
                                  ? 1
                                  : isSui(currencyReserve.coinType)
                                    ? 1
                                    : (lst?.suiToLstExchangeRate ?? 1),
                              ),
                              { dp: currencyReserve.token.decimals },
                            )} ${currencyReserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(
                          tvlAmount.times(
                            depositReserves.base !== undefined
                              ? 1
                              : isSui(currencyReserve.coinType)
                                ? 1
                                : (lst?.suiToLstExchangeRate ?? 1),
                          ),
                          { exact: false },
                        )}{" "}
                        {currencyReserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Exposure */}
            {((selectedTab === Tab.DEPOSIT &&
              (!obligation || !hasPosition(obligation))) ||
              (selectedTab === Tab.ADJUST && canAdjust)) && (
              <div className="flex w-full flex-col gap-2">
                {/* Slider */}
                <div className="relative flex h-4 w-full flex-row items-center">
                  <div className="absolute inset-0 z-[1] rounded-full bg-card" />

                  <div
                    className="absolute inset-y-0 left-0 z-[2] max-w-full rounded-l-full bg-primary/25"
                    style={{
                      width: `calc(${16 / 2}px + ${new BigNumber(
                        new BigNumber(
                          (selectedTab === Tab.DEPOSIT
                            ? depositSliderValue
                            : adjustSliderValue) || 0,
                        ).minus(minExposure),
                      )
                        .div(maxExposure.minus(minExposure))
                        .times(100)}% - ${
                        (16 / 2) *
                        2 *
                        +new BigNumber(
                          new BigNumber(
                            (selectedTab === Tab.DEPOSIT
                              ? depositSliderValue
                              : adjustSliderValue) || 0,
                          ).minus(minExposure),
                        ).div(maxExposure.minus(minExposure))
                      }px)`,
                    }}
                  />
                  <div className="absolute inset-x-[calc(16px/2)] inset-y-0 z-[3]">
                    {Array.from({ length: 5 }).map((_, detentIndex, array) => (
                      <div
                        key={detentIndex}
                        className={cn(
                          "absolute inset-y-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2",
                          detentIndex !== 0 &&
                            detentIndex !== array.length - 1 &&
                            "rounded-[calc(4px/2)] bg-foreground",
                        )}
                        style={{
                          left: `${detentIndex * (100 / (array.length - 1))}%`,
                        }}
                      />
                    ))}
                  </div>

                  <input
                    className="relative z-[4] h-6 w-full min-w-0 appearance-none bg-[transparent] !shadow-none !outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[calc(16px/2)] [&::-webkit-slider-thumb]:bg-foreground"
                    type="range"
                    min={+minExposure}
                    max={+maxExposure}
                    step={10 ** -1} // 1dp
                    value={
                      (selectedTab === Tab.DEPOSIT
                        ? depositSliderValue
                        : adjustSliderValue) || "0"
                    }
                    onChange={(e) =>
                      (selectedTab === Tab.DEPOSIT
                        ? setDepositSliderValue
                        : setAdjustSliderValue)(e.target.value)
                    }
                    autoComplete="off"
                    disabled={
                      selectedTab === Tab.ADJUST &&
                      (!obligation || !hasPosition(obligation))
                    }
                  />
                </div>

                {/* Labels */}
                <div className="flex w-full flex-row items-center justify-between">
                  {/* Min */}
                  <div className="flex w-max flex-row justify-center">
                    <TBody>
                      {minExposure.toFixed(1, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>

                  {/* Max */}
                  <div className="flex w-max flex-row justify-center">
                    <TBody>
                      {maxExposure.toFixed(1, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>
                </div>
              </div>
            )}

            <div className="-m-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:pb-6">
              <div
                className="flex flex-col gap-3"
                style={{ "--bg-color": "hsl(var(--popover))" } as CSSProperties}
              >
                <LabelWithValue
                  label="Leverage"
                  value={
                    <>
                      {exposure.toFixed(selectedTab === Tab.ADJUST ? 6 : 1)}x
                      {selectedTab === Tab.ADJUST &&
                        `${exposure.toFixed(6)}x` !==
                          `${(!canAdjust ? depositAdjustWithdrawExposure : adjustExposure).toFixed(1)}x` && (
                          <>
                            <FromToArrow />
                            {(!canAdjust
                              ? depositAdjustWithdrawExposure
                              : adjustExposure
                            ).toFixed(1)}
                            x
                          </>
                        )}
                    </>
                  }
                  valueTooltip={
                    selectedTab === Tab.ADJUST ? undefined : (
                      <>{exposure.toFixed(6)}x</>
                    )
                  }
                  horizontal
                />

                <LabelWithValue
                  label="APR"
                  value={
                    <>
                      {formatPercent(aprPercent)}
                      {selectedTab === Tab.ADJUST &&
                        formatPercent(aprPercent) !==
                          formatPercent(
                            !canAdjust
                              ? depositAdjustWithdrawAprPercent
                              : adjustAprPercent,
                          ) && (
                          <>
                            <FromToArrow />
                            {formatPercent(
                              !canAdjust
                                ? depositAdjustWithdrawAprPercent
                                : adjustAprPercent,
                            )}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />

                <LabelWithValue
                  label="Health"
                  value={
                    <>
                      {formatPercent(healthPercent, {
                        dp: selectedTab === Tab.ADJUST ? 2 : 0,
                      })}
                      {selectedTab === Tab.ADJUST &&
                        formatNumber(healthPercent, { dp: 2 }) !==
                          formatNumber(
                            !canAdjust
                              ? depositAdjustWithdrawHealthPercent
                              : adjustHealthPercent,
                            { dp: !canAdjust ? 2 : 0 },
                          ) && (
                          <>
                            <FromToArrow />
                            {formatPercent(
                              !canAdjust
                                ? depositAdjustWithdrawHealthPercent
                                : adjustHealthPercent,
                              { dp: !canAdjust ? 2 : 0 },
                            )}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />

                {[
                  StrategyType.USDC_sSUI_SUI_LOOPING,
                  StrategyType.AUSD_sSUI_SUI_LOOPING,
                  StrategyType.xBTC_sSUI_SUI_LOOPING,
                ].includes(strategyType) && (
                  <LabelWithValue
                    label="Liquidation price"
                    value={
                      <>
                        {liquidationPrice !== null ? (
                          <>
                            <span className="text-muted-foreground">
                              {"1 SUI ≈ "}
                            </span>
                            {formatUsd(liquidationPrice)}
                          </>
                        ) : (
                          "--"
                        )}
                        {selectedTab === Tab.ADJUST &&
                          (liquidationPrice !== null
                            ? formatUsd(liquidationPrice)
                            : "--") !==
                            ((!canAdjust
                              ? depositAdjustWithdrawLiquidationPrice
                              : adjustLiquidationPrice) !== null
                              ? formatUsd(
                                  (!canAdjust
                                    ? depositAdjustWithdrawLiquidationPrice
                                    : adjustLiquidationPrice)!,
                                )
                              : "--") && (
                            <>
                              <FromToArrow />
                              {(!canAdjust
                                ? depositAdjustWithdrawLiquidationPrice
                                : adjustLiquidationPrice) !== null
                                ? formatUsd(
                                    (!canAdjust
                                      ? depositAdjustWithdrawLiquidationPrice
                                      : adjustLiquidationPrice)!,
                                  )
                                : "--"}
                            </>
                          )}
                      </>
                    }
                    horizontal
                  />
                )}

                {selectedTab === Tab.DEPOSIT ? (
                  <LabelWithValue
                    label="Deposit fee"
                    value={`${formatToken(
                      depositFeesAmount.times(
                        depositReserves.base !== undefined
                          ? 1
                          : isSui(currencyReserve.coinType)
                            ? 1
                            : (lst?.suiToLstExchangeRate ?? 1),
                      ),
                      {
                        dp: currencyReserve.token.decimals,
                        trimTrailingZeros: true,
                      },
                    )} ${currencyReserve.token.symbol}`}
                    horizontal
                  />
                ) : selectedTab === Tab.WITHDRAW ? (
                  <LabelWithValue
                    label={`Withdraw fee (${useMaxAmount ? "deducted" : "added"})`}
                    value={`${formatToken(
                      withdrawFeesAmount.times(
                        depositReserves.base !== undefined
                          ? 1
                          : isSui(currencyReserve.coinType)
                            ? 1
                            : (lst?.suiToLstExchangeRate ?? 1),
                      ),
                      {
                        dp: currencyReserve.token.decimals,
                        trimTrailingZeros: true,
                      },
                    )} ${currencyReserve.token.symbol}`}
                    horizontal
                  />
                ) : selectedTab === Tab.ADJUST && !canAdjust ? (
                  <LabelWithValue
                    label="Adjust fee"
                    value={`${formatToken(depositAdjustWithdrawFeesAmount, {
                      dp: (depositReserves.base ?? depositReserves.lst)!.token
                        .decimals,
                      trimTrailingZeros: true,
                    })} ${
                      (depositReserves.base ?? depositReserves.lst)!.token
                        .symbol
                    }`} // Shown as base or LST symbol (sSUI, USDC, AUSD, etc.)
                    horizontal
                  />
                ) : selectedTab === Tab.ADJUST && canAdjust ? (
                  <LabelWithValue
                    label="Adjust fee"
                    value={`${formatToken(adjustFeesAmount, {
                      dp: defaultCurrencyReserve.token.decimals,
                      trimTrailingZeros: true,
                    })} ${defaultCurrencyReserve.token.symbol}`} // Shown as defaultCurrencyReserve symbol (SUI, USDC, etc.)
                    horizontal
                  />
                ) : (
                  <></> // Should not happen
                )}
              </div>

              {!md && isMoreDetailsOpen && (
                <>
                  <Separator />
                  <LstStrategyDialogParametersPanel
                    strategyType={strategyType}
                  />
                </>
              )}
            </div>

            <div className="flex w-full flex-col gap-3">
              {!md && (
                <Collapsible
                  open={isMoreDetailsOpen}
                  onOpenChange={setIsMoreDetailsOpen}
                  title="More details"
                  hasSeparator
                />
              )}

              <div className="flex w-full flex-col gap-3">
                <Button
                  className="h-auto min-h-14 w-full rounded-md py-2"
                  labelClassName="text-wrap uppercase"
                  style={{ overflowWrap: "anywhere" }}
                  disabled={submitButtonState.isDisabled}
                  onClick={onSubmitClick}
                >
                  {submitButtonState.isLoading ? (
                    <Spinner size="md" />
                  ) : (
                    submitButtonState.title
                  )}
                  {submitButtonState.description && (
                    <span className="mt-0.5 block font-sans text-xs normal-case">
                      {submitButtonState.description}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Required to get the desired modal width on <md */}
            <div className="-mt-4 h-0 w-[28rem] max-w-full" />
          </div>

          {md && isMoreDetailsOpen && (
            <div className="flex h-[440px] w-[28rem] flex-col gap-4">
              <LstStrategyDialogParametersPanel strategyType={strategyType} />
            </div>
          )}
        </div>
      </Tabs>
    </Dialog>
  );
}
