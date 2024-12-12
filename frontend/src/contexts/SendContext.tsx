import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

import {
  NORMALIZED_BETA_SEND_COINTYPE,
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
  NORMALIZED_mSEND_12M_COINTYPE,
  NORMALIZED_mSEND_3M_COINTYPE,
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
  BURN_SEND_POINTS_EVENT_TYPE,
  BURN_SUILEND_CAPSULES_EVENT_TYPE,
  BluefinLeague,
  MsendObject,
  ROOTLETS_TYPE,
  SUILEND_CAPSULE_TYPE,
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
import bluefinSendTradersMakersJson from "../pages/send/trading/bluefin-send-traders-makers.json";
import bluefinSendTradersTakersJson from "../pages/send/trading/bluefin-send-traders-takers.json";

interface SendContext {
  mSendObjectMap: Record<string, MsendObject> | undefined;

  mSendCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  sendCoinMetadataMap: Record<string, CoinMetadata> | undefined;

  mSendBalanceMap: Record<string, BigNumber>;
  mSendCoinTypesWithBalance: string[];

  kioskClient: KioskClient;
  ownedKiosks: { kiosk: KioskData; kioskOwnerCap: KioskOwnerCap }[] | undefined;
  userAllocations:
    | {
        earlyUsers: { isInSnapshot: boolean };
        sendPoints: { owned: BigNumber; redeemedMsend: BigNumber | undefined };
        suilendCapsules: {
          ownedMap: Record<SuilendCapsuleRarity, BigNumber>;
          redeemedMsend: BigNumber | undefined;
        };
        save: { bridgedMsend: BigNumber | undefined };
        rootlets: {
          owned: BigNumber;
          msendOwning: BigNumber;
          redeemedMsend: BigNumber | undefined;
        };
        bluefinLeagues: { isInSnapshot: BluefinLeague | boolean };
        bluefinSendTraders: {
          makerVolumeUsd: BigNumber;
          takerVolumeUsd: BigNumber;
        };
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

  selectedMsendCoinType: string;
  setSelectedMsendCoinType: (coinType: string) => void;
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
  mSendCoinTypesWithBalance: [],

  kioskClient: new KioskClient({
    client: new SuiClient({ url: getFullnodeUrl("mainnet") }),
    network: Network.MAINNET,
  }),
  ownedKiosks: undefined,
  userAllocations: undefined,
  refreshUserAllocations: async () => {
    throw Error("SendContextProvider not initialized");
  },

  selectedMsendCoinType: "",
  setSelectedMsendCoinType: () => {
    throw Error("SendContextProvider not initialized");
  },
});

export const useSendContext = () => useContext(SendContext);
export const useLoadedSendContext = () => useSendContext() as LoadedSendContext;

export function SendContextProvider({ children }: PropsWithChildren) {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { data, getBalance } = useLoadedAppContext();

  // mSEND object map
  const [mSendObjectMap, setMsendObjectMap] = useState<
    Record<string, MsendObject> | undefined
  >(undefined);

  const isFetchingMsendObjectMapRef = useRef<boolean>(false);
  useEffect(() => {
    if (isFetchingMsendObjectMapRef.current) return;
    isFetchingMsendObjectMapRef.current = true;

    console.log("Fetching mSendObjectMap");

    (async () => {
      try {
        const mSendManagerObjectIds = NORMALIZED_mSEND_COINTYPES.map(
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
        for (let i = 0; i < NORMALIZED_mSEND_COINTYPES.length; i++) {
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
          const timeWeight = new BigNumber(
            penaltyEndTimeS.minus(currentTimeS),
          ).div(penaltyEndTimeS.minus(penaltyStartTimeS));

          const currentPenaltySui = penaltyEndTimeS.gt(currentTimeS)
            ? new BigNumber(startPenaltySui.times(timeWeight)).plus(
                endPenaltySui.times(new BigNumber(1).minus(timeWeight)),
              )
            : endPenaltySui;

          result[NORMALIZED_mSEND_COINTYPES[i]] = {
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

        setMsendObjectMap(result);
        console.log("Fetched mSendObjectMap", result);
      } catch (err) {
        console.error("Failed to fetch mSendObjectMap", err);
      }
    })();
  }, [suiClient]);

  // CoinMetadata
  const mSendCoinMetadataMap = useCoinMetadataMap(NORMALIZED_mSEND_COINTYPES);
  const sendCoinMetadataMap = useCoinMetadataMap([
    NORMALIZED_SEND_COINTYPE,
    NORMALIZED_BETA_SEND_COINTYPE, // TODO
  ]);

  // Balances
  const mSendBalanceMap = useMemo(
    () =>
      NORMALIZED_mSEND_COINTYPES.reduce(
        (acc, coinType) => ({ ...acc, [coinType]: getBalance(coinType) }),
        {} as Record<string, BigNumber>,
      ),
    [getBalance],
  );

  const mSendCoinTypesWithBalance = useMemo(
    () =>
      NORMALIZED_mSEND_COINTYPES.filter((coinType) =>
        mSendBalanceMap[coinType].gt(0),
      ),
    [mSendBalanceMap],
  );

  // User - Transactions since TGE
  const [transactionsSinceTgeMap, setTransactionsSinceTgeMap] = useState<
    Record<
      string,
      | {
          from: SuiTransactionBlockResponse[];
          to: SuiTransactionBlockResponse[];
        }
      | undefined
    >
  >({});

  const fetchTransactionsSinceTge = useCallback(
    async (_address: string) => {
      console.log("Fetching transactionsSinceTge", _address);

      try {
        const userTransactions = await Promise.all([
          queryTransactionBlocksAfter(
            suiClient,
            { FromAddress: _address },
            TGE_TIMESTAMP_MS,
          ),
          queryTransactionBlocksAfter(
            suiClient,
            { ToAddress: _address },
            TGE_TIMESTAMP_MS,
          ),
        ]);

        const result = { from: userTransactions[0], to: userTransactions[1] };

        setTransactionsSinceTgeMap((prev) => ({ ...prev, [_address]: result }));
        console.log("Fetched transactionsSinceTge", _address, result);
      } catch (err) {
        console.error("Failed to fetch transactionsSinceTge", err);
      }
    },
    [suiClient],
  );

  const isFetchingTransactionsSinceTgeRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (isFetchingTransactionsSinceTgeRef.current.includes(address)) return;
    isFetchingTransactionsSinceTgeRef.current.push(address);

    fetchTransactionsSinceTge(address);
  }, [address, fetchTransactionsSinceTge]);

  const transactionsSinceTge = useMemo(
    () => (!address ? undefined : transactionsSinceTgeMap[address]),
    [address, transactionsSinceTgeMap],
  );

  // User - Kiosks
  const kioskClient = useMemo(
    () => new KioskClient({ client: suiClient, network: Network.MAINNET }),
    [suiClient],
  );

  const [ownedKiosksMap, setOwnedKiosksMap] = useState<
    Record<
      string,
      { kiosk: KioskData; kioskOwnerCap: KioskOwnerCap }[] | undefined
    >
  >({});

  const fetchOwnedKiosks = useCallback(
    async (_address: string) => {
      console.log("Fetching ownedKiosks", _address);

      try {
        const allKioskOwnerCaps = [];
        let cursor = undefined;
        let hasNextPage = true;
        while (hasNextPage) {
          const kiosks = await kioskClient.getOwnedKiosks({
            address: _address,
            pagination: {
              cursor,
            },
          });

          allKioskOwnerCaps.push(...kiosks.kioskOwnerCaps);
          cursor = kiosks.nextCursor ?? undefined;
          hasNextPage = kiosks.hasNextPage;
        }

        const result = await Promise.all(
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

        setOwnedKiosksMap((prev) => ({ ...prev, [_address]: result }));
        console.log("Fetched ownedKiosks", _address, result);

        return result; // Used when fetching mSEND-owning Rootlets
      } catch (err) {
        console.error("Failed to fetch ownedKiosks", err);
      }
    },
    [kioskClient],
  );

  const isFetchingOwnedKiosksRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (isFetchingOwnedKiosksRef.current.includes(address)) return;
    isFetchingOwnedKiosksRef.current.push(address);

    fetchOwnedKiosks(address);
  }, [address, fetchOwnedKiosks]);

  const ownedKiosks = useMemo(
    () => (!address ? undefined : ownedKiosksMap[address]),
    [address, ownedKiosksMap],
  );

  // User - Suilend Capsules
  const [ownedSuilendCapsulesMapMap, setOwnedSuilendCapsulesMapMap] = useState<
    Record<string, Record<SuilendCapsuleRarity, BigNumber>>
  >({});

  const fetchOwnedSuilendCapsulesMap = useCallback(
    async (_address: string) => {
      console.log("Fetching ownedSuilendCapsulesMap", _address);

      try {
        const objs = await getOwnedObjectsOfType(
          suiClient,
          _address,
          SUILEND_CAPSULE_TYPE,
        );

        const result = {
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

        setOwnedSuilendCapsulesMapMap((prev) => ({
          ...prev,
          [_address]: result,
        }));
        console.log("Fetched ownedSuilendCapsulesMap", _address, result);
      } catch (err) {
        console.error("Failed to fetch ownedSuilendCapsulesMap", err);
      }
    },
    [suiClient],
  );

  const isFetchingOwnedSuilendCapsulesMapRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (isFetchingOwnedSuilendCapsulesMapRef.current.includes(address)) return;
    isFetchingOwnedSuilendCapsulesMapRef.current.push(address);

    fetchOwnedSuilendCapsulesMap(address);
  }, [address, fetchOwnedSuilendCapsulesMap]);

  const ownedSuilendCapsulesMap = useMemo(
    () => (!address ? undefined : ownedSuilendCapsulesMapMap[address]),
    [address, ownedSuilendCapsulesMapMap],
  );

  // User - Rootlets
  const [mSendOwningRootletsMap, setMsendOwningRootletsMap] = useState<
    Record<string, BigNumber>
  >({});

  const fetchMsendOwningRootlets = useCallback(
    async (
      _address: string,
      _mSendCoinMetadataMap: Record<string, CoinMetadata>,
      _ownedKiosks: {
        kiosk: KioskData;
        kioskOwnerCap: KioskOwnerCap;
      }[],
    ) => {
      console.log("Fetching mSendOwningRootlets", _address);

      try {
        const rootletsObjectIds = _ownedKiosks
          .reduce(
            (acc, { kiosk }) => [
              ...acc,
              ...kiosk.items.filter(
                (item) => item.type === ROOTLETS_TYPE && !item.listing,
              ),
            ],
            [] as KioskItem[],
          )
          .map((item) => item.objectId);

        let result = new BigNumber(0);
        for (const rootletsObjectId of rootletsObjectIds) {
          const objs = await getOwnedObjectsOfType(
            suiClient,
            rootletsObjectId,
            `0x2::coin::Coin<${NORMALIZED_mSEND_3M_COINTYPE}>`,
          );

          const ownedMsend = objs.reduce(
            (acc, obj) =>
              acc.plus(
                new BigNumber((obj.data?.content as any).fields.balance).div(
                  10 **
                    _mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE]
                      .decimals,
                ),
              ),
            new BigNumber(0),
          );
          if (ownedMsend.gt(0)) result = result.plus(1);
        }

        setMsendOwningRootletsMap((prev) => ({ ...prev, [_address]: result }));
        console.log("Fetched mSendOwningRootlets", _address, result);
      } catch (err) {
        console.error("Failed to fetch mSendOwningRootlets", err);
      }
    },
    [suiClient],
  );

  const isFetchingMsendOwningRootletsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (!mSendCoinMetadataMap) return;
    if (!ownedKiosks) return;

    if (isFetchingMsendOwningRootletsRef.current.includes(address)) return;
    isFetchingMsendOwningRootletsRef.current.push(address);

    fetchMsendOwningRootlets(address, mSendCoinMetadataMap, ownedKiosks);
  }, [address, mSendCoinMetadataMap, ownedKiosks, fetchMsendOwningRootlets]);

  const mSendOwningRootlets = useMemo(
    () => (!address ? undefined : mSendOwningRootletsMap[address]),
    [address, mSendOwningRootletsMap],
  );

  // User - Allocations
  const userAllocations = useMemo(() => {
    if (!address) return undefined;

    if (!mSendCoinMetadataMap) return undefined;
    if (ownedKiosks === undefined) return undefined;
    if (ownedSuilendCapsulesMap === undefined) return undefined;
    if (mSendOwningRootlets === undefined) return undefined;

    // Early Users
    const isInEarlyUsersSnapshot = earlyUsersJson.includes(address);

    // SEND Points
    const ownedSendPoints = getPointsStats(
      NORMALIZED_SEND_POINTS_S1_COINTYPE,
      data.rewardMap,
      data.obligations,
    ).totalPoints.total;

    const redeemedSendPointsMsend = transactionsSinceTge?.from.reduce(
      (acc, transaction) => {
        const transactionRedeemedMsend = (transaction.events ?? [])
          .filter((event) => event.type === BURN_SEND_POINTS_EVENT_TYPE)
          .reduce(
            (acc2, event) =>
              acc2.plus(
                new BigNumber((event.parsedJson as any).claim_amount).div(
                  10 **
                    mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE].decimals,
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionRedeemedMsend);
      },
      new BigNumber(0),
    );

    // Suilend Capsules
    const redeemedSuilendCapsulesMsend = transactionsSinceTge?.from.reduce(
      (acc, transaction) => {
        const transactionRedeemedMsend = (transaction.events ?? [])
          .filter((event) => event.type === BURN_SUILEND_CAPSULES_EVENT_TYPE)
          .reduce(
            (acc2, event) =>
              acc2.plus(
                new BigNumber((event.parsedJson as any).claim_amount).div(
                  10 **
                    mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE].decimals,
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionRedeemedMsend);
      },
      new BigNumber(0),
    );

    // Save
    const bridgedSaveMsend = transactionsSinceTge?.to.reduce(
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
                NORMALIZED_mSEND_12M_COINTYPE,
          )
          .reduce(
            (acc2, balanceChange) =>
              acc2.plus(
                new BigNumber(balanceChange.amount).div(
                  10 **
                    mSendCoinMetadataMap[NORMALIZED_mSEND_12M_COINTYPE]
                      .decimals,
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionBridgedMsend);
      },
      new BigNumber(0),
    );

    // Rootlets
    const ownedRootlets = new BigNumber(
      ownedKiosks.reduce(
        (acc, { kiosk }) => [
          ...acc,
          ...kiosk.items.filter((item) => item.type === ROOTLETS_TYPE),
        ],
        [] as KioskItem[],
      ).length,
    );

    const redeemedRootletsMsend = transactionsSinceTge?.from.reduce(
      (acc, transaction) => {
        const mSendBalanceChanges = (transaction.balanceChanges ?? []).filter(
          (balanceChange) =>
            normalizeStructTag(balanceChange.coinType) ===
            NORMALIZED_mSEND_3M_COINTYPE,
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
                    mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE].decimals,
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionRedeemedMsend);
      },
      new BigNumber(0),
    );

    // Bluefin Leagues
    const isInBluefinLeaguesSnapshot = bluefinLeaguesGoldJson.includes(address)
      ? BluefinLeague.GOLD
      : bluefinLeaguesPlatinumJson.includes(address)
        ? BluefinLeague.PLATINUM
        : bluefinLeaguesBlackJson.includes(address)
          ? BluefinLeague.BLACK
          : bluefinLeaguesSapphireJson.includes(address)
            ? BluefinLeague.SAPPHIRE
            : false;

    // Bluefin SEND Traders
    const bluefinSendTradersMakerVolumeUsd = new BigNumber(
      (bluefinSendTradersMakersJson as Record<string, number>)[address] ?? 0,
    );
    const bluefinSendTradersTakerVolumeUsd = new BigNumber(
      (bluefinSendTradersTakersJson as Record<string, number>)[address] ?? 0,
    );

    // Prime Machin
    const ownedPrimeMachin = new BigNumber(
      (primeMachinJson as Record<string, number>)[address] ?? 0,
    );

    // Egg
    const ownedEgg = new BigNumber(
      (eggJson as Record<string, number>)[address] ?? 0,
    );

    // DoubleUp Citizen
    const ownedDoubleUpCitizen = new BigNumber(
      (doubleUpCitizenJson as Record<string, number>)[address] ?? 0,
    );

    // Kumo
    const ownedKumo = new BigNumber(
      (kumoJson as Record<string, number>)[address] ?? 0,
    );

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
        msendOwning: mSendOwningRootlets,
        redeemedMsend: redeemedRootletsMsend,
      },
      bluefinLeagues: { isInSnapshot: isInBluefinLeaguesSnapshot },
      bluefinSendTraders: {
        makerVolumeUsd: bluefinSendTradersMakerVolumeUsd,
        takerVolumeUsd: bluefinSendTradersTakerVolumeUsd,
      },
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
  }, [
    address,
    mSendCoinMetadataMap,
    transactionsSinceTge,
    ownedKiosks,
    data.rewardMap,
    data.obligations,
    ownedSuilendCapsulesMap,
    mSendOwningRootlets,
  ]);

  const refreshUserAllocations = useCallback(async () => {
    if (!address) return;

    if (!mSendCoinMetadataMap) return;

    fetchTransactionsSinceTge(address);
    const newOwnedKiosks = await fetchOwnedKiosks(address);

    fetchOwnedSuilendCapsulesMap(address);
    fetchMsendOwningRootlets(address, mSendCoinMetadataMap, newOwnedKiosks!);
  }, [
    address,
    mSendCoinMetadataMap,
    fetchTransactionsSinceTge,
    fetchOwnedSuilendCapsulesMap,
    fetchOwnedKiosks,
    fetchMsendOwningRootlets,
  ]);

  // Selected mSEND
  const [selectedMsendCoinType, setSelectedMsendCoinType] = useState<string>(
    NORMALIZED_mSEND_3M_COINTYPE,
  );

  useEffect(() => {
    if (mSendCoinTypesWithBalance.length === 0) return;

    if (!mSendCoinTypesWithBalance.includes(selectedMsendCoinType))
      setSelectedMsendCoinType(mSendCoinTypesWithBalance[0]);
  }, [mSendCoinTypesWithBalance, selectedMsendCoinType]);

  // Context
  const contextValue: SendContext = useMemo(
    () => ({
      mSendObjectMap,

      mSendCoinMetadataMap,
      sendCoinMetadataMap,

      mSendBalanceMap,

      kioskClient,
      ownedKiosks,
      userAllocations,
      refreshUserAllocations,

      selectedMsendCoinType,
      setSelectedMsendCoinType,

      mSendCoinTypesWithBalance,
    }),
    [
      mSendObjectMap,
      mSendCoinMetadataMap,
      sendCoinMetadataMap,
      mSendBalanceMap,
      kioskClient,
      ownedKiosks,
      userAllocations,
      refreshUserAllocations,
      selectedMsendCoinType,
      setSelectedMsendCoinType,
      mSendCoinTypesWithBalance,
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
