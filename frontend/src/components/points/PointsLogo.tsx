import {
  COINTYPE_LOGO_MAP,
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
} from "@suilend/frontend-sui";

import TokenLogo from "@/components/shared/TokenLogo";

export default function PointsLogo() {
  return (
    <TokenLogo
      className="h-4 w-4"
      token={{
        coinType: NORMALIZED_SEND_POINTS_S1_COINTYPE,
        symbol: "SEND Points S1",
        iconUrl: COINTYPE_LOGO_MAP[NORMALIZED_SEND_POINTS_S1_COINTYPE],
      }}
    />
  );
}
