import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import { KioskClient, KioskData, Network } from "@mysten/kiosk";
import { CoinMetadata, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import useSWR from "swr";

import {
  NORMALIZED_BETA_SEND_COINTYPE,
  NORMALIZED_BETA_SEND_POINTS_COINTYPE,
  NORMALIZED_BETA_mSEND_COINTYPE,
  NORMALIZED_mSEND_COINTYPES,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import useCoinMetadataMap from "@suilend/frontend-sui-next/hooks/useCoinMetadataMap";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { getPointsStats } from "@/lib/points";
import {
  BETA_SUILEND_CAPSULE_TYPE,
  BURN_SEND_POINTS_EVENT_TYPE,
  BURN_SUILEND_CAPSULES_EVENT_TYPE,
  DOUBLEUP_CITIZEN_TYPE,
  EGG_TYPE,
  KUMO_TYPE,
  MsendObject,
  PRIME_MACHIN_TYPE,
  REDEEM_SEND_EVENT_TYPE,
  ROOTLETS_TYPE,
  SuilendCapsuleRarity,
  TGE_TIMESTAMP_MS,
  WORMHOLE_TRANSFER_REDEEMED_EVENT_TYPE,
  mSEND_COINTYPE_MANAGER_MAP,
} from "@/lib/send";
import {
  getOwnedObjectsOfType,
  queryTransactionBlocksAfter,
} from "@/lib/transactions";

import earlyUsersJson from "../pages/send/lending/early-users.json";
import animaJson from "../pages/send/nft/anima.json";
import doubleUpCitizenJson from "../pages/send/nft/doubleup-citizen.json";
import eggJson from "../pages/send/nft/egg.json";
import kumoJson from "../pages/send/nft/kumo.json";
import primeMachinJson from "../pages/send/nft/prime-machin.json";
import aaaJson from "../pages/send/token/aaa.json";
import fudJson from "../pages/send/token/fud.json";
import octoJson from "../pages/send/token/octo.json";
import tismJson from "../pages/send/token/tism.json";
import bluefinLeaguesBlackJson from "../pages/send/trading/bluefin-leagues-black.json";
import bluefinLeaguesGoldJson from "../pages/send/trading/bluefin-leagues-gold.json";
import bluefinLeaguesPlatinumJson from "../pages/send/trading/bluefin-leagues-platinum.json";
import bluefinLeaguesSapphireJson from "../pages/send/trading/bluefin-leagues-sapphire.json";
import bluefinSendTradersJson from "../pages/send/trading/bluefin-send-traders.json";

interface SendContext {
  mSendObjectMap: Record<string, MsendObject> | undefined;

  mSendCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  sendCoinMetadataMap: Record<string, CoinMetadata> | undefined;

  mSendBalanceMap: Record<string, BigNumber>;

  totalAllocatedPoints: BigNumber;
  bluefinSendTradersTotalVolumeUsd: BigNumber;

  userAllocations:
    | {
        earlyUsers: { isInSnapshot: boolean };
        sendPoints: { owned: BigNumber; claimedMsend: BigNumber };
        suilendCapsules: {
          ownedMap: Record<SuilendCapsuleRarity, BigNumber>;
          claimedMsend: BigNumber;
        };
        save: { bridgedMsend: BigNumber };
        rootlets: { owned: BigNumber };
        bluefinLeagues: { isInSnapshot: boolean };
        bluefinSendTraders: { volumeUsd: BigNumber | undefined };
        primeMachin: { owned: BigNumber };
        egg: { owned: BigNumber };
        doubleUpCitizen: { owned: BigNumber };
        kumo: { owned: BigNumber };
        anima: { isInSnapshot: boolean | undefined };
        fud: { isInSnapshot: boolean };
        aaa: { isInSnapshot: boolean };
        octo: { isInSnapshot: boolean };
        tism: { isInSnapshot: boolean };
      }
    | undefined;
  refreshUserAllocations: () => Promise<void>;

  userRedeemedSendMap: Record<string, BigNumber> | undefined;
  refreshUserRedeemedSendMap: () => Promise<void>;
}
type LoadedSendContext = SendContext & {
  mSendObjectMap: Record<string, MsendObject>;

  mSendCoinMetadataMap: Record<string, CoinMetadata>;
  sendCoinMetadataMap: Record<string, CoinMetadata>;
};

const SendContext = createContext<SendContext>({
  mSendObjectMap: undefined,

  mSendCoinMetadataMap: undefined,
  sendCoinMetadataMap: undefined,

  mSendBalanceMap: {},

  totalAllocatedPoints: new BigNumber(0),
  bluefinSendTradersTotalVolumeUsd: new BigNumber(0),

  userAllocations: undefined,
  refreshUserAllocations: async () => {
    throw Error("SendContextProvider not initialized");
  },

  userRedeemedSendMap: undefined,
  refreshUserRedeemedSendMap: async () => {
    throw Error("SendContextProvider not initialized");
  },
});

export const useSendContext = () => useContext(SendContext);
export const useLoadedSendContext = () => useSendContext() as LoadedSendContext;

export function SendContextProvider({ children }: PropsWithChildren) {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { data, getBalance } = useLoadedAppContext();

  const mSEND_COINTYPES = [NORMALIZED_BETA_mSEND_COINTYPE]; // TODO: Use NORMALIZED_mSEND_COINTYPES

  // mSend object map
  const mSendObjectMapFetcher = async () => {
    const mSendManagerObjectIds = mSEND_COINTYPES.map(
      (coinType) => mSEND_COINTYPE_MANAGER_MAP[coinType],
    );
    const objs = await Promise.all(
      mSendManagerObjectIds.map((objectId) =>
        suiClient.getObject({
          id: objectId,
          options: {
            showContent: true,
          },
        }),
      ),
    );

    const result: Record<string, MsendObject> = {};
    for (let i = 0; i < mSEND_COINTYPES.length; i++) {
      const obj = objs[i];

      const penaltyStartTimeS = new BigNumber(
        (obj.data?.content as any).fields.start_time_s,
      );
      const penaltyEndTimeS = new BigNumber(
        (obj.data?.content as any).fields.end_time_s,
      );

      const startPenaltySui = new BigNumber(
        (obj.data?.content as any).fields.start_penalty_numerator,
      ).div((obj.data?.content as any).fields.penalty_denominator);
      const endPenaltySui = new BigNumber(
        (obj.data?.content as any).fields.end_penalty_numerator,
      ).div((obj.data?.content as any).fields.penalty_denominator);

      const currentTimeS = Date.now() / 1000;
      const timeWeight = new BigNumber(penaltyEndTimeS.minus(currentTimeS)).div(
        penaltyEndTimeS.minus(penaltyStartTimeS),
      );

      const currentPenaltySui = penaltyEndTimeS.gt(currentTimeS)
        ? new BigNumber(startPenaltySui.times(timeWeight)).plus(
            endPenaltySui.times(new BigNumber(1).minus(timeWeight)),
          )
        : endPenaltySui;

      result[mSEND_COINTYPES[i]] = {
        penaltyStartTimeS,
        penaltyEndTimeS,

        startPenaltySui: new BigNumber(1)
          .times(10 ** 6)
          .times(startPenaltySui)
          .div(10 ** SUI_DECIMALS),
        endPenaltySui: new BigNumber(1)
          .times(10 ** 6)
          .times(endPenaltySui)
          .div(10 ** SUI_DECIMALS),
        currentPenaltySui: new BigNumber(1)
          .times(10 ** 6)
          .times(currentPenaltySui)
          .div(10 ** SUI_DECIMALS),
      };
    }

    return result;
  };

  const { data: mSendObjectMap, mutate: mutateSendObjectMap } = useSWR<
    Record<string, MsendObject> | undefined
  >("mSendObjectMap", mSendObjectMapFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed mSendObjectMap", data);
    },
    onError: (err) => {
      console.error("Failed to refresh mSendObjectMap", err);
    },
  });

  // CoinMetadata
  const mSendCoinMetadataMap = useCoinMetadataMap(NORMALIZED_mSEND_COINTYPES);
  const sendCoinMetadataMap = useCoinMetadataMap([
    NORMALIZED_BETA_SEND_COINTYPE,
  ]); // TODO

  // Balances
  const mSendBalanceMap = useMemo(
    () =>
      NORMALIZED_mSEND_COINTYPES.reduce(
        (acc, coinType) => ({ ...acc, [coinType]: getBalance(coinType) }),
        {} as Record<string, BigNumber>,
      ),
    [getBalance],
  );

  // Total allocated SEND Points
  const totalAllocatedPoints = useMemo(() => {
    let result = new BigNumber(0);
    for (const reserve of data.lendingMarket.reserves) {
      for (const pr of [
        ...reserve.depositsPoolRewardManager.poolRewards,
        ...reserve.borrowsPoolRewardManager.poolRewards,
      ]) {
        if (
          normalizeStructTag(pr.coinType) ===
          NORMALIZED_BETA_SEND_POINTS_COINTYPE // TODO
        )
          result = result.plus(pr.allocatedRewards);
      }
    }

    return result;
  }, [data.lendingMarket.reserves]);

  // Bluefin SEND Traders total volume
  const bluefinSendTradersTotalVolumeUsd = useMemo(
    () =>
      Object.values(bluefinSendTradersJson as number[]).reduce(
        (acc, volumeUsd) => acc.plus(volumeUsd),
        new BigNumber(0),
      ),
    [],
  );

  // User - Transactions since TGE
  const transactionsSinceTgeFetcher = async () => {
    if (!address) return undefined;

    const userTransactions = await Promise.all([
      queryTransactionBlocksAfter(
        suiClient,
        { FromAddress: address },
        TGE_TIMESTAMP_MS,
      ),
      queryTransactionBlocksAfter(
        suiClient,
        { ToAddress: address },
        TGE_TIMESTAMP_MS,
      ),
    ]);

    return { from: userTransactions[0], to: userTransactions[1] };
  };

  const { data: transactionsSinceTge, mutate: mutateTransactionsSinceTge } =
    useSWR<
      | {
          from: SuiTransactionBlockResponse[];
          to: SuiTransactionBlockResponse[];
        }
      | undefined
    >(`transactionsSinceTge-${address}`, transactionsSinceTgeFetcher, {
      onSuccess: (data) => {
        console.log("Refreshed transactionsSinceTge", data);
      },
      onError: (err) => {
        console.error("Failed to refresh transactionsSinceTge", err);
      },
    });

  useEffect(() => {
    mutateTransactionsSinceTge();
  }, [mutateTransactionsSinceTge, address, suiClient]);

  // User - Kiosks
  const kioskClient = useMemo(
    () => new KioskClient({ client: suiClient, network: Network.MAINNET }),
    [suiClient],
  );

  const ownedKiosksFetcher = async () => {
    if (!address) return undefined;

    const allKioskIds = [];
    let cursor = undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const kiosks = await kioskClient.getOwnedKiosks({
        address: address,
        pagination: {
          cursor,
        },
      });

      allKioskIds.push(...kiosks.kioskIds);
      cursor = kiosks.nextCursor ?? undefined;
      hasNextPage = kiosks.hasNextPage;
    }

    const allKiosks = await Promise.all(
      allKioskIds.map((kioskId) => kioskClient.getKiosk({ id: kioskId })),
    );

    return allKiosks;
  };

  const { data: ownedKiosks, mutate: mutateOwnedKiosks } = useSWR<
    KioskData[] | undefined
  >(`ownedKiosks-${address}`, ownedKiosksFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed ownedKiosks", data);
    },
    onError: (err) => {
      console.error("Failed to refresh ownedKiosks", err);
    },
  });

  useEffect(() => {
    mutateOwnedKiosks();
  }, [mutateOwnedKiosks, address, kioskClient]);

  // User - Allocations
  const userAllocationsFetcher = async () => {
    if (!address) return undefined;

    if (mSendCoinMetadataMap === undefined || sendCoinMetadataMap === undefined)
      return undefined;
    if (transactionsSinceTge === undefined) return undefined;
    if (ownedKiosks === undefined) return undefined;

    // Early Users
    const isInEarlyUsersSnapshot = earlyUsersJson.includes(address);

    // SEND Points
    const ownedSendPoints = getPointsStats(data.rewardMap, data.obligations)
      .totalPoints.total;

    const claimedSendPointsMsend = transactionsSinceTge.from.reduce(
      (acc, transaction) => {
        const transactionClaimedMsend = (transaction.events ?? [])
          .filter((event) => event.type === BURN_SEND_POINTS_EVENT_TYPE)
          .reduce(
            (acc2, event) =>
              acc2.plus(
                new BigNumber((event.parsedJson as any).claim_amount).div(
                  10 **
                    mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE]
                      .decimals, // TODO
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionClaimedMsend);
      },
      new BigNumber(0),
    );

    // Suilend Capsules
    const ownedSuilendCapsulesMap = await (async () => {
      const objs = await getOwnedObjectsOfType(
        suiClient,
        address,
        BETA_SUILEND_CAPSULE_TYPE, // TODO
      );

      return {
        [SuilendCapsuleRarity.COMMON]: new BigNumber(
          objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleRarity.COMMON,
          ).length,
        ),
        [SuilendCapsuleRarity.UNCOMMON]: new BigNumber(
          objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleRarity.UNCOMMON,
          ).length,
        ),
        [SuilendCapsuleRarity.RARE]: new BigNumber(
          objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleRarity.RARE,
          ).length,
        ),
      };
    })();

    const claimedSuilendCapsulesMsend = transactionsSinceTge.from.reduce(
      (acc, transaction) => {
        const transactionClaimedMsend = (transaction.events ?? [])
          .filter((event) => event.type === BURN_SUILEND_CAPSULES_EVENT_TYPE)
          .reduce(
            (acc2, event) =>
              acc2.plus(
                new BigNumber((event.parsedJson as any).claim_amount).div(
                  10 **
                    mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE]
                      .decimals, // TODO
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionClaimedMsend);
      },
      new BigNumber(0),
    );

    // Save
    const bridgedSaveMsend = transactionsSinceTge.to.reduce(
      (acc, transaction) => {
        const hasWormholeEvent = !!(transaction.events ?? []).find(
          (event) => event.type === WORMHOLE_TRANSFER_REDEEMED_EVENT_TYPE,
        );
        if (!hasWormholeEvent) return acc;

        const transactionBridgedMsend = (transaction.balanceChanges ?? [])
          .filter(
            (balanceChange) =>
              normalizeStructTag(balanceChange.coinType) ===
              NORMALIZED_BETA_mSEND_COINTYPE, // TODO
          )
          .reduce(
            (acc2, balanceChange) =>
              acc2.plus(
                new BigNumber(balanceChange.amount).div(
                  10 **
                    mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE]
                      .decimals, // TODO
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionBridgedMsend);
      },
      new BigNumber(0),
    );

    // Rootlets
    const ownedRootlets = (() => {
      // TODO: Fetch how many rootlets have allocations
      // TODO: Fetch how many rootlets have allocations claimed
      return ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(
            kiosk.items.filter((item) => item.type === ROOTLETS_TYPE).length,
          ),
        new BigNumber(0),
      );
    })();

    // Bluefin Leagues
    const isInBluefinLeaguesSnapshot =
      bluefinLeaguesGoldJson.includes(address) ||
      bluefinLeaguesPlatinumJson.includes(address) ||
      bluefinLeaguesBlackJson.includes(address) ||
      bluefinLeaguesSapphireJson.includes(address);

    // Bluefin SEND Traders
    const bluefinSendTradersVolumeUsd = (() => {
      if (Object.keys(bluefinSendTradersJson).length > 0)
        return new BigNumber(
          (bluefinSendTradersJson as Record<string, number>)[address] ?? 0,
        );

      return undefined;
    })();

    // Prime Machin
    const ownedPrimeMachin = (() => {
      if (Object.keys(primeMachinJson).length > 0)
        return new BigNumber(
          (primeMachinJson as Record<string, number>)[address] ?? 0,
        );

      return ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(
            kiosk.items.filter((item) => item.type === PRIME_MACHIN_TYPE)
              .length,
          ),
        new BigNumber(0),
      );
    })();

    // Egg
    const ownedEgg = (() => {
      if (Object.keys(eggJson).length > 0)
        return new BigNumber((eggJson as Record<string, number>)[address] ?? 0);

      return ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(kiosk.items.filter((item) => item.type === EGG_TYPE).length),
        new BigNumber(0),
      );
    })();

    // DoubleUp Citizen
    const ownedDoubleUpCitizen = await (async () => {
      if (Object.keys(doubleUpCitizenJson).length > 0)
        return new BigNumber(
          (doubleUpCitizenJson as Record<string, number>)[address] ?? 0,
        );

      const ownedKioskItemsOfType = ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(
            kiosk.items.filter((item) => item.type === DOUBLEUP_CITIZEN_TYPE)
              .length,
          ),
        new BigNumber(0),
      );
      const objs = await getOwnedObjectsOfType(
        suiClient,
        address,
        DOUBLEUP_CITIZEN_TYPE,
      );

      return ownedKioskItemsOfType.plus(objs.length);
    })();

    // Kumo
    const ownedKumo = (() => {
      if (Object.keys(kumoJson).length > 0)
        return new BigNumber(
          (kumoJson as Record<string, number>)[address] ?? 0,
        );

      return ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(
            kiosk.items.filter((item) => item.type === KUMO_TYPE).length,
          ),
        new BigNumber(0),
      );
    })();

    // Anima
    const isInAnimaSnapshot = (() => {
      if (animaJson.length > 0)
        return (animaJson as string[]).includes(address);

      return undefined;
    })();

    // FUD
    const isInFudSnapshot = fudJson.includes(address);

    // AAA
    const isInAaaSnapshot = aaaJson.includes(address);

    // OCTO
    const isInOctoSnapshot = octoJson.includes(address);

    // TISM
    const isInTismSnapshot = tismJson.includes(address);

    return {
      earlyUsers: { isInSnapshot: isInEarlyUsersSnapshot },
      sendPoints: {
        owned: ownedSendPoints,
        claimedMsend: claimedSendPointsMsend,
      },
      suilendCapsules: {
        ownedMap: ownedSuilendCapsulesMap,
        claimedMsend: claimedSuilendCapsulesMsend,
      },
      save: { bridgedMsend: bridgedSaveMsend },
      rootlets: { owned: ownedRootlets },
      bluefinLeagues: { isInSnapshot: isInBluefinLeaguesSnapshot },
      bluefinSendTraders: { volumeUsd: bluefinSendTradersVolumeUsd },
      primeMachin: { owned: ownedPrimeMachin },
      egg: { owned: ownedEgg },
      doubleUpCitizen: { owned: ownedDoubleUpCitizen },
      kumo: { owned: ownedKumo },
      anima: { isInSnapshot: isInAnimaSnapshot },
      fud: { isInSnapshot: isInFudSnapshot },
      aaa: { isInSnapshot: isInAaaSnapshot },
      octo: { isInSnapshot: isInOctoSnapshot },
      tism: { isInSnapshot: isInTismSnapshot },
    };
  };

  const { data: userAllocations, mutate: mutateUserAllocations } = useSWR<
    SendContext["userAllocations"]
  >(`userAllocations-${address}`, userAllocationsFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed userAllocations", data);
    },
    onError: (err) => {
      console.error("Failed to refresh userAllocations", err);
    },
  });

  useEffect(() => {
    mutateUserAllocations();
  }, [
    mutateUserAllocations,
    address,
    mSendCoinMetadataMap,
    sendCoinMetadataMap,
    transactionsSinceTge,
    ownedKiosks,
    data.rewardMap,
    data.obligations,
  ]);

  const refreshUserAllocations = useCallback(async () => {
    await mutateTransactionsSinceTge();
    await mutateUserAllocations();
  }, [mutateTransactionsSinceTge, mutateUserAllocations]);

  // User - Redeemed SEND
  const userRedeemedSendMapFetcher = async () => {
    if (!address) return undefined;

    if (sendCoinMetadataMap === undefined) return undefined;
    if (transactionsSinceTge === undefined) return undefined;

    const result: Record<string, BigNumber> = {};
    for (let i = 0; i < mSEND_COINTYPES.length; i++) {
      const redeemedSend = transactionsSinceTge.from.reduce(
        (acc, transaction) => {
          const transactionRedeemedSend = (transaction.events ?? [])
            .filter(
              (event) =>
                event.type ===
                `${REDEEM_SEND_EVENT_TYPE}<${mSEND_COINTYPES[i]}, ${NORMALIZED_BETA_SEND_COINTYPE}, 0x2::sui::SUI>`, // TODO
            )
            .reduce(
              (acc2, event) =>
                acc2.plus(
                  new BigNumber((event.parsedJson as any).withdraw_amount).div(
                    10 **
                      sendCoinMetadataMap[NORMALIZED_BETA_SEND_COINTYPE]
                        .decimals, // TODO
                  ),
                ),
              new BigNumber(0),
            );

          return acc.plus(transactionRedeemedSend);
        },
        new BigNumber(0),
      );

      result[mSEND_COINTYPES[i]] = redeemedSend;
    }

    return result;
  };

  const { data: userRedeemedSendMap, mutate: mutateUserRedeemedSendMap } =
    useSWR<SendContext["userRedeemedSendMap"]>(
      `userSend-${address}`,
      userRedeemedSendMapFetcher,
      {
        onSuccess: (data) => {
          console.log("Refreshed userRedeemedSendMap", data);
        },
        onError: (err) => {
          console.error("Failed to refresh userRedeemedSendMap", err);
        },
      },
    );

  useEffect(() => {
    mutateUserRedeemedSendMap();
  }, [
    mutateUserRedeemedSendMap,
    address,
    sendCoinMetadataMap,
    transactionsSinceTge,
  ]);

  const refreshUserRedeemedSendMap = useCallback(async () => {
    await mutateTransactionsSinceTge();
    await mutateUserRedeemedSendMap();
  }, [mutateTransactionsSinceTge, mutateUserRedeemedSendMap]);

  // Context
  const contextValue: SendContext = useMemo(
    () => ({
      mSendObjectMap,

      mSendCoinMetadataMap,
      sendCoinMetadataMap,

      mSendBalanceMap,

      totalAllocatedPoints,
      bluefinSendTradersTotalVolumeUsd,

      userAllocations,
      refreshUserAllocations,

      userRedeemedSendMap,
      refreshUserRedeemedSendMap,
    }),
    [
      mSendObjectMap,
      mSendCoinMetadataMap,
      sendCoinMetadataMap,
      mSendBalanceMap,
      totalAllocatedPoints,
      bluefinSendTradersTotalVolumeUsd,
      userAllocations,
      refreshUserAllocations,
      userRedeemedSendMap,
      refreshUserRedeemedSendMap,
    ],
  );

  return (
    <SendContext.Provider value={contextValue}>
      {mSendObjectMap !== undefined &&
      mSendCoinMetadataMap !== undefined &&
      sendCoinMetadataMap !== undefined ? (
        children
      ) : (
        <FullPageSpinner />
      )}
    </SendContext.Provider>
  );
}
