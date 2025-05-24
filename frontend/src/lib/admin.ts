export const getPoolInfo = (
  steammPoolInfos: any[] | undefined,
  coinType: string,
) => steammPoolInfos?.find((poolInfo) => poolInfo.lpTokenType === coinType);

export const getQuoterName = (quoterType: string) =>
  quoterType.endsWith("omm::OracleQuoter")
    ? "OMMv0.1"
    : quoterType.endsWith("omm_v2::OracleQuoterV2")
      ? "OMM"
      : "CPMM";
