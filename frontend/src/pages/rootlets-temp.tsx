import { useState } from "react";

import { useSettingsContext } from "@suilend/frontend-sui-next";

export default function RootletsTemp() {
  const { suiClient } = useSettingsContext();

  const [objectId, setObjectId] = useState<string>("");

  const onCheck = async () => {
    const allObjs = [];
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const objs = await suiClient.getOwnedObjects({
        owner: objectId,
        cursor,
        options: { showContent: true },
      });

      allObjs.push(...objs.data);
      cursor = objs.nextCursor;
      hasNextPage = objs.hasNextPage;
    }

    console.log("Rootlets NFT owned objects:", allObjs);
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
