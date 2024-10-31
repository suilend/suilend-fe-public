export const msPerYear = 31556952000; // Approx. 1000 * 60 * 60 * 24 * 365;

export const TWITTER = "@suilendprotocol";

export const TITLE = "Suilend | Lend and borrow crypto on Sui";
export const DESCRIPTION =
  "Money market built on the best chain for developers.";

export const TOAST_DURATION = 4 * 1000;
export const TX_TOAST_DURATION = 10 * 1000;

export const SUI_GAS_MIN = 0.05;

export const FIRST_DEPOSIT_DIALOG_START_DATE = new Date("2024-07-02T13:15:00Z");

export enum Rpc {
  TRITON_ONE = "tritonOne",
  FULL_NODE = "fullNode",
  ALL_THAT_NODE = "allThatNode",
  CUSTOM = "custom",
}

export const RPCS = [
  {
    id: Rpc.TRITON_ONE,
    name: "Triton One",
    url: `https://solendf-suishar-0c55.mainnet.sui.rpcpool.com/${
      process.env.NEXT_PUBLIC_SUI_TRITON_ONE_DEV_API_KEY ?? ""
    }`,
  },
  {
    id: Rpc.FULL_NODE,
    name: "Full Node",
    url: "https://fullnode.mainnet.sui.io:443",
  },
  {
    id: Rpc.ALL_THAT_NODE,
    name: "All That Node",
    url: "https://sui-mainnet-rpc.allthatnode.com",
  },
  {
    id: Rpc.CUSTOM,
    name: "Custom",
    url: "",
  },
];

export enum Explorer {
  SUI_SCAN = "suiScan",
  SUI_VISION = "suiVision",
}

export const EXPLORERS = [
  {
    id: Explorer.SUI_SCAN,
    name: "Suiscan",
    buildAddressUrl: (address: string) =>
      `https://suiscan.xyz/mainnet/account/${address}`,
    buildObjectUrl: (id: string) => `https://suiscan.xyz/mainnet/object/${id}`,
    buildCoinUrl: (coinType: string) =>
      `https://suiscan.xyz/mainnet/coin/${coinType}`,
    buildTxUrl: (digest: string) => `https://suiscan.xyz/mainnet/tx/${digest}`,
  },
  {
    id: Explorer.SUI_VISION,
    name: "SuiVision",
    buildAddressUrl: (address: string) =>
      `https://suivision.xyz/account/${address}`,
    buildObjectUrl: (id: string) => `https://suivision.xyz/object/${id}`,
    buildCoinUrl: (coinType: string) =>
      `https://suivision.xyz/coin/${coinType}`,
    buildTxUrl: (digest: string) => `https://suivision.xyz/txblock/${digest}`,
  },
];
