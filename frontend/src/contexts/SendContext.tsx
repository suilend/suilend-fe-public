import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import {
  KioskClient,
  KioskData,
  KioskItem,
  KioskOwnerCap,
  Network,
} from "@mysten/kiosk";
import {
  CoinMetadata,
  SuiClient,
  SuiTransactionBlockResponse,
  getFullnodeUrl,
} from "@mysten/sui/client";
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

  kioskClient: KioskClient;
  ownedKiosksWithKioskOwnerCaps:
    | { kiosk: KioskData; kioskOwnerCap: KioskOwnerCap }[]
    | undefined;
  userAllocations:
    | {
        earlyUsers: { isInSnapshot: boolean };
        sendPoints: { owned: BigNumber; redeemedMsend: BigNumber };
        suilendCapsules: {
          ownedMap: Record<SuilendCapsuleRarity, BigNumber>;
          redeemedMsend: BigNumber;
        };
        save: { bridgedMsend: BigNumber };
        rootlets: {
          owned: BigNumber;
          msendOwning: BigNumber;
          redeemedMsend: BigNumber;
        };
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

  userClaimedSendMap: Record<string, BigNumber> | undefined;
  refreshUserClaimedSendMap: () => Promise<void>;
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

  kioskClient: new KioskClient({
    client: new SuiClient({ url: getFullnodeUrl("mainnet") }),
    network: Network.MAINNET,
  }),
  ownedKiosksWithKioskOwnerCaps: undefined,
  userAllocations: undefined,
  refreshUserAllocations: async () => {
    throw Error("SendContextProvider not initialized");
  },

  userClaimedSendMap: undefined,
  refreshUserClaimedSendMap: async () => {
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

  const ownedKiosksWithKioskOwnerCapsFetcher = async () => {
    if (!address) return undefined;

    const allKioskOwnerCaps = [];
    let cursor = undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const kiosks = await kioskClient.getOwnedKiosks({
        address: address,
        pagination: {
          cursor,
        },
      });

      allKioskOwnerCaps.push(...kiosks.kioskOwnerCaps);
      cursor = kiosks.nextCursor ?? undefined;
      hasNextPage = kiosks.hasNextPage;
    }

    const allKiosksWithKioskOwnerCaps = await Promise.all(
      allKioskOwnerCaps
        .filter((kioskOwnerCap) => kioskOwnerCap.isPersonal)
        .map((kioskOwnerCap) =>
          (async () => {
            const kiosk = await kioskClient.getKiosk({
              id: kioskOwnerCap.kioskId,
            });

            return { kiosk, kioskOwnerCap };
          })(),
        ),
    );

    return allKiosksWithKioskOwnerCaps;
  };

  const {
    data: ownedKiosksWithKioskOwnerCaps,
    mutate: mutateOwnedKiosksWithKioskOwnerCaps,
  } = useSWR<{ kiosk: KioskData; kioskOwnerCap: KioskOwnerCap }[] | undefined>(
    `ownedKiosksWithKioskOwnerCaps-${address}`,
    ownedKiosksWithKioskOwnerCapsFetcher,
    {
      onSuccess: (data) => {
        console.log("Refreshed ownedKiosksWithKioskOwnerCaps", data);
      },
      onError: (err) => {
        console.error("Failed to refresh ownedKiosksWithKioskOwnerCaps", err);
      },
    },
  );

  useEffect(() => {
    mutateOwnedKiosksWithKioskOwnerCaps();
  }, [mutateOwnedKiosksWithKioskOwnerCaps, address, kioskClient]);

  // User - Allocations
  const userAllocationsFetcher = async () => {
    if (!address) return undefined;

    if (mSendCoinMetadataMap === undefined || sendCoinMetadataMap === undefined)
      return undefined;
    if (transactionsSinceTge === undefined) return undefined;
    if (ownedKiosksWithKioskOwnerCaps === undefined) return undefined;

    // Early Users
    const isInEarlyUsersSnapshot = earlyUsersJson.includes(address);

    // SEND Points
    const ownedSendPoints = getPointsStats(
      NORMALIZED_BETA_SEND_POINTS_COINTYPE, //TODO
      data.rewardMap,
      data.obligations,
    ).totalPoints.total;

    const redeemedSendPointsMsend = transactionsSinceTge.from.reduce(
      (acc, transaction) => {
        const transactionRedeemedMsend = (transaction.events ?? [])
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

        return acc.plus(transactionRedeemedMsend);
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

    const redeemedSuilendCapsulesMsend = transactionsSinceTge.from.reduce(
      (acc, transaction) => {
        const transactionRedeemedMsend = (transaction.events ?? [])
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

        return acc.plus(transactionRedeemedMsend);
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
              (balanceChange.owner as any)?.AddressOwner === address &&
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
    const rootletsKioskItems = ownedKiosksWithKioskOwnerCaps.reduce(
      (acc, { kiosk }) => [
        ...acc,
        ...kiosk.items.filter(
          (item) => item.type === ROOTLETS_TYPE && !item.listing,
        ),
      ],
      [] as KioskItem[],
    );

    const ownedRootlets = new BigNumber(rootletsKioskItems.length);

    const msendOwningRootlets = await (async () => {
      let result = new BigNumber(0);

      const rootletsObjectIds = rootletsKioskItems.map((item) => item.objectId);
      for (const rootletsObjectId of rootletsObjectIds) {
        const objs = await getOwnedObjectsOfType(
          suiClient,
          rootletsObjectId,
          `0x2::coin::Coin<${NORMALIZED_BETA_mSEND_COINTYPE}>`, // TODO
        );

        const ownedMsend = objs.reduce(
          (acc, obj) =>
            acc.plus(
              new BigNumber((obj.data?.content as any).fields.balance).div(
                10 **
                  mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE].decimals, // TODO
              ),
            ),
          new BigNumber(0),
        );
        if (ownedMsend.gt(0)) result = result.plus(1);
      }

      return result;
    })();

    const redeemedRootletsMsend = transactionsSinceTge.from.reduce(
      (acc, transaction) => {
        const mSendBalanceChanges = (transaction.balanceChanges ?? []).filter(
          (balanceChange) =>
            normalizeStructTag(balanceChange.coinType) ===
            NORMALIZED_BETA_mSEND_COINTYPE, // TODO
        );

        const isRootletsRedeemTransaction =
          mSendBalanceChanges.some(
            (balanceChange) =>
              (balanceChange.owner as any)?.AddressOwner !== address &&
              new BigNumber(balanceChange.amount).lt(0),
          ) &&
          mSendBalanceChanges.some(
            (balanceChange) =>
              (balanceChange.owner as any)?.AddressOwner === address &&
              new BigNumber(balanceChange.amount).gt(0),
          );
        if (!isRootletsRedeemTransaction) return acc;

        const transactionRedeemedMsend = mSendBalanceChanges
          .filter(
            (balanceChange) =>
              (balanceChange.owner as any)?.AddressOwner === address,
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

        return acc.plus(transactionRedeemedMsend);
      },
      new BigNumber(0),
    );

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

      return ownedKiosksWithKioskOwnerCaps.reduce(
        (acc, { kiosk }) =>
          acc.plus(
            kiosk.items.filter(
              (item) => item.type === PRIME_MACHIN_TYPE && !item.listing,
            ).length,
          ),
        new BigNumber(0),
      );
    })();

    // Egg
    const ownedEgg = (() => {
      if (Object.keys(eggJson).length > 0)
        return new BigNumber((eggJson as Record<string, number>)[address] ?? 0);

      return ownedKiosksWithKioskOwnerCaps.reduce(
        (acc, { kiosk }) =>
          acc.plus(
            kiosk.items.filter(
              (item) => item.type === EGG_TYPE && !item.listing,
            ).length,
          ),
        new BigNumber(0),
      );
    })();

    // DoubleUp Citizen
    const ownedDoubleUpCitizen = await (async () => {
      if (Object.keys(doubleUpCitizenJson).length > 0)
        return new BigNumber(
          (doubleUpCitizenJson as Record<string, number>)[address] ?? 0,
        );

      const ownedKioskItemsOfType = ownedKiosksWithKioskOwnerCaps.reduce(
        (acc, { kiosk }) =>
          acc.plus(
            kiosk.items.filter(
              (item) => item.type === DOUBLEUP_CITIZEN_TYPE && !item.listing,
            ).length,
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

      return ownedKiosksWithKioskOwnerCaps.reduce(
        (acc, { kiosk }) =>
          acc.plus(
            kiosk.items.filter(
              (item) => item.type === KUMO_TYPE && !item.listing,
            ).length,
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
        redeemedMsend: redeemedSendPointsMsend,
      },
      suilendCapsules: {
        ownedMap: ownedSuilendCapsulesMap,
        redeemedMsend: redeemedSuilendCapsulesMsend,
      },
      save: { bridgedMsend: bridgedSaveMsend },
      rootlets: {
        owned: ownedRootlets,
        msendOwning: msendOwningRootlets,
        redeemedMsend: redeemedRootletsMsend,
      },
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
    ownedKiosksWithKioskOwnerCaps,
    data.rewardMap,
    data.obligations,
  ]);

  const refreshUserAllocations = useCallback(async () => {
    await mutateTransactionsSinceTge();
    await mutateUserAllocations();
  }, [mutateTransactionsSinceTge, mutateUserAllocations]);

  // User - Claimed SEND
  const userClaimedSendMapFetcher = async () => {
    if (!address) return undefined;

    if (sendCoinMetadataMap === undefined) return undefined;
    if (transactionsSinceTge === undefined) return undefined;

    const result: Record<string, BigNumber> = {};
    for (let i = 0; i < mSEND_COINTYPES.length; i++) {
      const claimedSend = transactionsSinceTge.from.reduce(
        (acc, transaction) => {
          const transactionClaimedSend = (transaction.events ?? [])
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

          return acc.plus(transactionClaimedSend);
        },
        new BigNumber(0),
      );

      result[mSEND_COINTYPES[i]] = claimedSend;
    }

    return result;
  };

  const { data: userClaimedSendMap, mutate: mutateUserClaimedSendMap } = useSWR<
    SendContext["userClaimedSendMap"]
  >(`userClaimedSendMap-${address}`, userClaimedSendMapFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed userClaimedSendMap", data);
    },
    onError: (err) => {
      console.error("Failed to refresh userClaimedSendMap", err);
    },
  });

  useEffect(() => {
    mutateUserClaimedSendMap();
  }, [
    mutateUserClaimedSendMap,
    address,
    sendCoinMetadataMap,
    transactionsSinceTge,
  ]);

  const refreshUserClaimedSendMap = useCallback(async () => {
    await mutateTransactionsSinceTge();
    await mutateUserClaimedSendMap();
  }, [mutateTransactionsSinceTge, mutateUserClaimedSendMap]);

  // Context
  const contextValue: SendContext = useMemo(
    () => ({
      mSendObjectMap,

      mSendCoinMetadataMap,
      sendCoinMetadataMap,

      mSendBalanceMap,

      totalAllocatedPoints,
      bluefinSendTradersTotalVolumeUsd,

      kioskClient,
      ownedKiosksWithKioskOwnerCaps,
      userAllocations,
      refreshUserAllocations,

      userClaimedSendMap,
      refreshUserClaimedSendMap,
    }),
    [
      mSendObjectMap,
      mSendCoinMetadataMap,
      sendCoinMetadataMap,
      mSendBalanceMap,
      totalAllocatedPoints,
      bluefinSendTradersTotalVolumeUsd,
      kioskClient,
      ownedKiosksWithKioskOwnerCaps,
      userAllocations,
      refreshUserAllocations,
      userClaimedSendMap,
      refreshUserClaimedSendMap,
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
