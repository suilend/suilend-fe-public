import { useState } from "react";

import { NORMALIZED_mSEND_3M_COINTYPE } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import { getOwnedObjectsOfType } from "@/lib/transactions";

export default function RootletsTemp() {
  const { suiClient } = useSettingsContext();

  const [objectId, setObjectId] = useState<string>("");

  const onCheck = async () => {
    const objs = await getOwnedObjectsOfType(
      suiClient,
      objectId,
      `0x2::coin::Coin<${NORMALIZED_mSEND_3M_COINTYPE}>`,
    );

    console.log("Rootlets NFT owned mSEND:", objs);
  };

  return (
    <div className="flex w-full flex-row gap-4">
      <input
        className="flex-1 text-sm text-background"
        type="text"
        value={objectId}
        onChange={(e) => setObjectId(e.target.value)}
      />
      <button onClick={onCheck}>Check</button>
    </div>
  );
}
