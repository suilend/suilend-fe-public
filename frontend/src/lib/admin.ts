export const getPoolInfo = (
  steammPoolInfos: any[] | undefined,
  coinType: string,
) => steammPoolInfos?.find((poolInfo) => poolInfo.lpTokenType === coinType);

export const getQuoterName = (quoterType: string) =>
  quoterType.endsWith("omm::OracleQuoter")
    ? "Oracle V1"
    : quoterType.endsWith("omm_v2::OracleQuoterV2")
      ? "Oracle V2"
      : "CPMM";
