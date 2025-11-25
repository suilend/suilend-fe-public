export const FALLBACK_PYTH_ENDPOINT =
  process.env.NODE_ENV === "development"
    ? `https://savefin-pythnet-79a0.mainnet.pythnet.rpcpool.com/${process.env.NEXT_PUBLIC_PYTHNET_TRITON_ONE_DEV_API_KEY}`
    : "https://savefin-pythnet-79a0.mainnet.pythnet.rpcpool.com";
