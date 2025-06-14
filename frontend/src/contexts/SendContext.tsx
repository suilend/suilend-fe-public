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
  BalanceChange,
  CoinMetadata,
  SuiClient,
  SuiObjectResponse,
  SuiTransactionBlockResponse,
  getFullnodeUrl,
} from "@mysten/sui/client";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { LENDING_MARKETS } from "@suilend/sdk";
import {
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
  NORMALIZED_SEND_POINTS_S2_COINTYPE,
  NORMALIZED_STEAMM_POINTS_COINTYPE,
  NORMALIZED_mSEND_COINTYPES,
  NORMALIZED_mSEND_SERIES_1_COINTYPE,
  NORMALIZED_mSEND_SERIES_3_COINTYPE,
  NORMALIZED_mSEND_SERIES_4_COINTYPE,
} from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";
import useCoinMetadataMap from "@suilend/sui-fe-next/hooks/useCoinMetadataMap";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useLoadedUserContext } from "@/contexts/UserContext";
import {
  BURN_SEND_POINTS_S1_EVENT_TYPE,
  BURN_SUILEND_CAPSULES_S1_EVENT_TYPE,
  BluefinLeague,
  MsendObject,
  ROOTLETS_TYPE,
  SUILEND_CAPSULE_TYPE,
  SuilendCapsuleS1Rarity,
  SuilendCapsuleS2Rarity,
} from "@/lib/mSend";
import { getPointsStats } from "@/lib/points";
import {
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
  mSendCoinMetadata: CoinMetadata | undefined;
  mSendBalanceMap: Record<string, BigNumber>;
  mSendCoinTypesWithBalance: string[];

  kioskClient: KioskClient;
  ownedKiosks: { kiosk: KioskData; kioskOwnerCap: KioskOwnerCap }[] | undefined;
  rawUserAllocationsS1:
    | {
        earlyUsers: { isInSnapshot: boolean };
        sendPointsS1: {
          owned: BigNumber;
          redeemedMsend: BigNumber | undefined;
        };
        suilendCapsulesS1: {
          ownedObjectsMap: Record<SuilendCapsuleS1Rarity, SuiObjectResponse[]>;
          redeemedMsend: BigNumber | undefined;
        };
        save: { bridgedMsend: BigNumber | undefined };
        rootlets: {
          ownedMsendObjectsMap: Record<
            string,
            {
              objs: SuiObjectResponse[];
              ownedMsendMap: Record<string, BigNumber>;
            }
          >; // Series 1 & 4
          redeemedMsend: Record<string, BigNumber> | undefined; // Series 1 & 4
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
  rawUserAllocationsS2:
    | {
        sendPointsS2: { owned: BigNumber };
        steammPoints: { owned: BigNumber };
        suilendCapsulesS2: {
          ownedObjectsMap: Record<SuilendCapsuleS2Rarity, SuiObjectResponse[]>;
        };
      }
    | undefined;
  refreshRawUserAllocations: () => Promise<void>;

  selectedMsendCoinType: string;
  setSelectedMsendCoinType: (coinType: string) => void;
}
type LoadedSendContext = SendContext & {
  mSendObjectMap: Record<string, MsendObject>;
  mSendCoinMetadata: CoinMetadata;
};

const SendContext = createContext<SendContext>({
  mSendObjectMap: undefined,
  mSendCoinMetadata: undefined,
  mSendBalanceMap: {},
  mSendCoinTypesWithBalance: [],

  kioskClient: new KioskClient({
    client: new SuiClient({ url: getFullnodeUrl("mainnet") }),
    network: Network.MAINNET,
  }),
  ownedKiosks: undefined,
  rawUserAllocationsS1: undefined,
  rawUserAllocationsS2: undefined,
  refreshRawUserAllocations: async () => {
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
  const { allUserData, getBalance } = useLoadedUserContext();

  const userDataMainMarket = allUserData[LENDING_MARKETS[0].id];
  const userDataSteammLmMarket = allUserData[LENDING_MARKETS[1].id];

  // mSEND - object map
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

  // mSEND - coinMetadata
  const mSendCoinMetadataMap = useCoinMetadataMap([
    NORMALIZED_mSEND_SERIES_1_COINTYPE,
  ]); // Works for all mSEND coinTypes
  const mSendCoinMetadata: CoinMetadata | undefined = useMemo(
    () => mSendCoinMetadataMap?.[NORMALIZED_mSEND_SERIES_1_COINTYPE],
    [mSendCoinMetadataMap],
  );

  // mSEND - Balances
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

  // User - Suilend Capsules (S1 and S2)
  const [
    ownedSuilendCapsulesObjectsMapMap,
    setOwnedSuilendCapsulesObjectsMapMap,
  ] = useState<
    Record<
      string,
      {
        s1: Record<SuilendCapsuleS1Rarity, SuiObjectResponse[]>;
        s2: Record<SuilendCapsuleS2Rarity, SuiObjectResponse[]>;
      }
    >
  >({});

  const fetchOwnedSuilendCapsulesObjectsMap = useCallback(
    async (_address: string) => {
      console.log("Fetching ownedSuilendCapsulesObjectsMap", _address);

      try {
        const objs = await getOwnedObjectsOfType(
          suiClient,
          _address,
          SUILEND_CAPSULE_TYPE,
        );

        const resultS1: Record<SuilendCapsuleS1Rarity, SuiObjectResponse[]> = {
          [SuilendCapsuleS1Rarity.COMMON]: objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleS1Rarity.COMMON,
          ),
          [SuilendCapsuleS1Rarity.UNCOMMON]: objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleS1Rarity.UNCOMMON,
          ),
          [SuilendCapsuleS1Rarity.RARE]: objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleS1Rarity.RARE,
          ),
        };
        console.log("S1 capsules owned:", resultS1);

        const resultS2: Record<SuilendCapsuleS2Rarity, SuiObjectResponse[]> = {
          [SuilendCapsuleS2Rarity.COMMON]: objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleS2Rarity.COMMON,
          ),
          [SuilendCapsuleS2Rarity.UNCOMMON]: objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleS2Rarity.UNCOMMON,
          ),
          [SuilendCapsuleS2Rarity.RARE]: objs.filter(
            (obj) =>
              (obj.data?.content as any).fields.rarity ===
              SuilendCapsuleS2Rarity.RARE,
          ),
        };
        console.log("S2 capsules owned:", resultS2);

        setOwnedSuilendCapsulesObjectsMapMap((prev) => ({
          ...prev,
          [_address]: { s1: resultS1, s2: resultS2 },
        }));
        console.log("Fetched ownedSuilendCapsulesObjectsMap", _address, {
          s1: resultS1,
          s2: resultS2,
        });
      } catch (err) {
        console.error("Failed to fetch ownedSuilendCapsulesObjectsMap", err);
      }
    },
    [suiClient],
  );

  const isFetchingOwnedSuilendCapsulesObjectsMapRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (isFetchingOwnedSuilendCapsulesObjectsMapRef.current.includes(address))
      return;
    isFetchingOwnedSuilendCapsulesObjectsMapRef.current.push(address);

    fetchOwnedSuilendCapsulesObjectsMap(address);
  }, [address, fetchOwnedSuilendCapsulesObjectsMap]);

  const ownedSuilendCapsulesObjectsMap = useMemo(
    () => (!address ? undefined : ownedSuilendCapsulesObjectsMapMap[address]),
    [address, ownedSuilendCapsulesObjectsMapMap],
  );

  // User - Rootlets
  const [rootletsOwnedMsendObjectsMapMap, setRootletsOwnedMsendObjectsMapMap] =
    useState<
      Record<
        string,
        Record<
          string,
          {
            objs: SuiObjectResponse[];
            ownedMsendMap: Record<string, BigNumber>;
          }
        >
      >
    >({});

  const fetchRootletsOwnedMsendObjectsMap = useCallback(
    async (
      _address: string,
      _mSendCoinMetadata: CoinMetadata,
      _ownedKiosks: {
        kiosk: KioskData;
        kioskOwnerCap: KioskOwnerCap;
      }[],
    ) => {
      console.log("Fetching rootletsOwnedMsendObjectsMap", _address);

      try {
        const rootletsObjectIds = _ownedKiosks
          .reduce(
            (acc, { kiosk }) => [
              ...acc,
              ...kiosk.items.filter((item) => item.type === ROOTLETS_TYPE),
            ],
            [] as KioskItem[],
          )
          .map((item) => item.objectId);

        const resultEntries = (
          await Promise.all(
            rootletsObjectIds.map(async (rootletsObjectId) => {
              const [objsSeries1, objsSeries4] = await Promise.all([
                getOwnedObjectsOfType(
                  suiClient,
                  rootletsObjectId,
                  `0x2::coin::Coin<${NORMALIZED_mSEND_SERIES_1_COINTYPE}>`,
                ),
                getOwnedObjectsOfType(
                  suiClient,
                  rootletsObjectId,
                  `0x2::coin::Coin<${NORMALIZED_mSEND_SERIES_4_COINTYPE}>`,
                ),
              ]);

              const ownedMsendMap: Record<string, BigNumber> = {
                [NORMALIZED_mSEND_SERIES_1_COINTYPE]: objsSeries1
                  .reduce(
                    (acc, obj) =>
                      acc.plus(
                        new BigNumber(
                          (obj.data?.content as any).fields.balance,
                        ),
                      ),
                    new BigNumber(0),
                  )
                  .div(10 ** _mSendCoinMetadata.decimals),
                [NORMALIZED_mSEND_SERIES_4_COINTYPE]: objsSeries4
                  .reduce(
                    (acc, obj) =>
                      acc.plus(
                        new BigNumber(
                          (obj.data?.content as any).fields.balance,
                        ),
                      ),
                    new BigNumber(0),
                  )
                  .div(10 ** _mSendCoinMetadata.decimals),
              };
              if (Object.values(ownedMsendMap).every((owned) => owned.eq(0)))
                return undefined;

              return [
                rootletsObjectId,
                {
                  objs: [...objsSeries1, ...objsSeries4],
                  ownedMsendMap,
                },
              ];
            }),
          )
        ).filter(Boolean) as [
          string,
          {
            objs: SuiObjectResponse[];
            ownedMsendMap: Record<string, BigNumber>;
          },
        ][];
        const result = Object.fromEntries(resultEntries);

        setRootletsOwnedMsendObjectsMapMap((prev) => ({
          ...prev,
          [_address]: result,
        }));

        setRootletsOwnedMsendObjectsMapMap((prev) => ({
          ...prev,
          [_address]: result,
        }));
        console.log("Fetched rootletsOwnedMsendObjectsMap", _address, result);
      } catch (err) {
        console.error("Failed to fetch rootletsOwnedMsendObjectsMap", err);
      }
    },
    [suiClient],
  );

  const isFetchingRootletsOwnedMsendObjectsMapRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;

    if (!mSendCoinMetadata) return;
    if (!ownedKiosks) return;

    if (isFetchingRootletsOwnedMsendObjectsMapRef.current.includes(address))
      return;
    isFetchingRootletsOwnedMsendObjectsMapRef.current.push(address);

    fetchRootletsOwnedMsendObjectsMap(address, mSendCoinMetadata, ownedKiosks);
  }, [
    address,
    mSendCoinMetadata,
    ownedKiosks,
    fetchRootletsOwnedMsendObjectsMap,
  ]);

  const rootletsOwnedMsendObjectsMap = useMemo(
    () => (!address ? undefined : rootletsOwnedMsendObjectsMapMap[address]),
    [address, rootletsOwnedMsendObjectsMapMap],
  );

  // User - Allocations
  // S1
  const rawUserAllocationsS1 = useMemo(() => {
    if (!address) return undefined;

    if (!mSendCoinMetadata) return undefined;
    if (ownedKiosks === undefined) return undefined;
    if (ownedSuilendCapsulesObjectsMap === undefined) return undefined;
    if (rootletsOwnedMsendObjectsMap === undefined) return undefined;

    // Early Users
    const isInEarlyUsersSnapshot = earlyUsersJson.includes(address);

    // SEND Points (S1)
    const ownedSendPointsS1 = getPointsStats(
      NORMALIZED_SEND_POINTS_S1_COINTYPE,
      userDataMainMarket.rewardMap,
      userDataMainMarket.obligations,
    ).totalPoints.total;

    const redeemedSendPointsS1Msend = transactionsSinceTge?.from.reduce(
      (acc, transaction) => {
        const transactionRedeemedMsend = (transaction.events ?? [])
          .filter((event) => event.type === BURN_SEND_POINTS_S1_EVENT_TYPE)
          .reduce(
            (acc2, event) =>
              acc2.plus(
                new BigNumber((event.parsedJson as any).claim_amount).div(
                  10 ** mSendCoinMetadata.decimals,
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionRedeemedMsend);
      },
      new BigNumber(0),
    );

    // Suilend Capsules (S1)
    const redeemedSuilendCapsulesS1Msend = transactionsSinceTge?.from.reduce(
      (acc, transaction) => {
        const transactionRedeemedMsend = (transaction.events ?? [])
          .filter((event) => event.type === BURN_SUILEND_CAPSULES_S1_EVENT_TYPE)
          .reduce(
            (acc2, event) =>
              acc2.plus(
                new BigNumber((event.parsedJson as any).claim_amount).div(
                  10 ** mSendCoinMetadata.decimals,
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
                NORMALIZED_mSEND_SERIES_3_COINTYPE,
          )
          .reduce(
            (acc2, balanceChange) =>
              acc2.plus(
                new BigNumber(balanceChange.amount).div(
                  10 ** mSendCoinMetadata.decimals,
                ),
              ),
            new BigNumber(0),
          );

        return acc.plus(transactionBridgedMsend);
      },
      new BigNumber(0),
    );

    // Rootlets
    const redeemedRootletsMsend = transactionsSinceTge?.from.reduce(
      (acc, transaction) => {
        const mSendCoinTypes = Object.keys(acc);

        const mSendBalanceChangesMap: Record<string, BalanceChange[]> = {};
        for (const coinType of mSendCoinTypes) {
          mSendBalanceChangesMap[coinType] = (
            transaction.balanceChanges ?? []
          ).filter(
            (balanceChange) =>
              normalizeStructTag(balanceChange.coinType) === coinType,
          );
        }
        const mSendBalanceChanges: BalanceChange[] = Object.values(
          mSendBalanceChangesMap,
        ).flat();

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

        const transactionTotalRedeemedMsendMap: Record<string, BigNumber> = {};
        for (const coinType of mSendCoinTypes) {
          transactionTotalRedeemedMsendMap[coinType] = mSendBalanceChangesMap[
            coinType
          ]
            .filter(
              (balanceChange) =>
                (balanceChange.owner as any)?.AddressOwner === address,
            )
            .reduce(
              (acc2, balanceChange) =>
                acc2.plus(
                  new BigNumber(balanceChange.amount).div(
                    10 ** mSendCoinMetadata.decimals,
                  ),
                ),
              new BigNumber(0),
            );
        }

        const transactionSendPointsSuilendCapsulesRedeemedMsendMap: Record<
          string,
          BigNumber
        > = {
          [NORMALIZED_mSEND_SERIES_1_COINTYPE]: (transaction.events ?? [])
            .filter(
              (event) =>
                event.type === BURN_SEND_POINTS_S1_EVENT_TYPE ||
                event.type === BURN_SUILEND_CAPSULES_S1_EVENT_TYPE,
            )
            .reduce(
              (acc2, event) =>
                acc2.plus(
                  new BigNumber((event.parsedJson as any).claim_amount).div(
                    10 ** mSendCoinMetadata.decimals,
                  ),
                ),
              new BigNumber(0),
            ),
          [NORMALIZED_mSEND_SERIES_4_COINTYPE]: new BigNumber(0),
        };

        const result: Record<string, BigNumber> = {};
        for (const coinType of mSendCoinTypes) {
          result[coinType] = acc[coinType].plus(
            transactionTotalRedeemedMsendMap[coinType].minus(
              transactionSendPointsSuilendCapsulesRedeemedMsendMap[coinType],
            ),
          );
        }

        return result;
      },
      {
        [NORMALIZED_mSEND_SERIES_1_COINTYPE]: new BigNumber(0),
        [NORMALIZED_mSEND_SERIES_4_COINTYPE]: new BigNumber(0),
      },
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
      sendPointsS1: {
        owned: ownedSendPointsS1,
        redeemedMsend: redeemedSendPointsS1Msend,
      },
      suilendCapsulesS1: {
        ownedObjectsMap: ownedSuilendCapsulesObjectsMap.s1,
        redeemedMsend: redeemedSuilendCapsulesS1Msend,
      },
      save: { bridgedMsend: bridgedSaveMsend },
      rootlets: {
        ownedMsendObjectsMap: rootletsOwnedMsendObjectsMap,
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
    mSendCoinMetadata,
    transactionsSinceTge,
    ownedKiosks,
    userDataMainMarket.rewardMap,
    userDataMainMarket.obligations,
    ownedSuilendCapsulesObjectsMap,
    rootletsOwnedMsendObjectsMap,
  ]);

  // S2
  const rawUserAllocationsS2 = useMemo(() => {
    if (!address) return undefined;

    if (!mSendCoinMetadata) return undefined;
    if (ownedSuilendCapsulesObjectsMap === undefined) return undefined;

    // SEND Points (S2)
    const ownedSendPointsS2 = getPointsStats(
      NORMALIZED_SEND_POINTS_S2_COINTYPE,
      userDataMainMarket.rewardMap,
      userDataMainMarket.obligations,
    ).totalPoints.total;

    // const redeemedSendPointsS1Msend = transactionsSinceTge?.from.reduce(
    //   (acc, transaction) => {
    //     const transactionRedeemedMsend = (transaction.events ?? [])
    //       .filter((event) => event.type === BURN_SEND_POINTS_S1_EVENT_TYPE)
    //       .reduce(
    //         (acc2, event) =>
    //           acc2.plus(
    //             new BigNumber((event.parsedJson as any).claim_amount).div(
    //               10 **
    //                 mSendCoinMetadata.decimals,
    //             ),
    //           ),
    //         new BigNumber(0),
    //       );

    //     return acc.plus(transactionRedeemedMsend);
    //   },
    //   new BigNumber(0),
    // );

    // STEAMM Points
    const ownedSteammPoints = getPointsStats(
      NORMALIZED_STEAMM_POINTS_COINTYPE,
      userDataSteammLmMarket.rewardMap,
      userDataSteammLmMarket.obligations,
    ).totalPoints.total;

    // Suilend Capsules (S2)
    // const redeemedSuilendCapsulesS1Msend = transactionsSinceTge?.from.reduce(
    //   (acc, transaction) => {
    //     const transactionRedeemedMsend = (transaction.events ?? [])
    //       .filter((event) => event.type === BURN_SUILEND_CAPSULES_S1_EVENT_TYPE)
    //       .reduce(
    //         (acc2, event) =>
    //           acc2.plus(
    //             new BigNumber((event.parsedJson as any).claim_amount).div(
    //               10 **
    //                 mSendCoinMetadata.decimals,
    //             ),
    //           ),
    //         new BigNumber(0),
    //       );

    //     return acc.plus(transactionRedeemedMsend);
    //   },
    //   new BigNumber(0),
    // );

    return {
      sendPointsS2: {
        owned: ownedSendPointsS2,
      },
      steammPoints: {
        owned: ownedSteammPoints,
      },
      suilendCapsulesS2: {
        ownedObjectsMap: ownedSuilendCapsulesObjectsMap.s2,
      },
    };
  }, [
    address,
    mSendCoinMetadata,
    ownedSuilendCapsulesObjectsMap,
    userDataMainMarket.rewardMap,
    userDataMainMarket.obligations,
    userDataSteammLmMarket.rewardMap,
    userDataSteammLmMarket.obligations,
  ]);

  // Refresh
  const refreshRawUserAllocations = useCallback(async () => {
    if (!address) return;

    if (!mSendCoinMetadata) return;

    fetchTransactionsSinceTge(address);
    const newOwnedKiosks = await fetchOwnedKiosks(address);

    fetchOwnedSuilendCapsulesObjectsMap(address);
    fetchRootletsOwnedMsendObjectsMap(
      address,
      mSendCoinMetadata,
      newOwnedKiosks!,
    );
  }, [
    address,
    mSendCoinMetadata,
    fetchTransactionsSinceTge,
    fetchOwnedSuilendCapsulesObjectsMap,
    fetchOwnedKiosks,
    fetchRootletsOwnedMsendObjectsMap,
  ]);

  // Selected mSEND
  const [selectedMsendCoinType, setSelectedMsendCoinType] = useState<string>(
    NORMALIZED_mSEND_SERIES_1_COINTYPE,
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
      mSendCoinMetadata,
      mSendBalanceMap,
      mSendCoinTypesWithBalance,

      kioskClient,
      ownedKiosks,
      rawUserAllocationsS1,
      rawUserAllocationsS2,
      refreshRawUserAllocations,

      selectedMsendCoinType,
      setSelectedMsendCoinType,
    }),
    [
      mSendObjectMap,
      mSendCoinMetadata,
      mSendBalanceMap,
      mSendCoinTypesWithBalance,
      kioskClient,
      ownedKiosks,
      rawUserAllocationsS1,
      rawUserAllocationsS2,
      refreshRawUserAllocations,
      selectedMsendCoinType,
      setSelectedMsendCoinType,
    ],
  );

  return (
    <SendContext.Provider value={contextValue}>
      {mSendObjectMap !== undefined && mSendCoinMetadata !== undefined ? (
        children
      ) : (
        <FullPageSpinner />
      )}
    </SendContext.Provider>
  );
}
