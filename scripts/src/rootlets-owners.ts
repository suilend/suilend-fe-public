import fs from "fs";

async function main() {
  const rootletsJsonPath = "json/rootlets-owners-202501013-raw.json";

  const kiosks = JSON.parse(
    fs.readFileSync(rootletsJsonPath, "utf-8"),
  ) as Record<string, Record<string, string>>;

  console.log(Object.entries(kiosks).length);

  // V1
  const resultV1: Record<string, number> = {};
  for (const kiosk of Object.values(kiosks)) {
    const address = kiosk.owner;
    const owned = Object.keys(kiosk).filter((key) => key !== "owner").length;

    resultV1[address] = (resultV1[address] ?? 0) + owned;
  }

  console.log(JSON.stringify(resultV1));

  // V2
  const resultV2: string[] = [];
  for (const kiosk of Object.values(kiosks)) {
    const address = kiosk.owner;
    const owned = Object.keys(kiosk).filter((key) => key !== "owner").length;

    for (let i = 0; i < owned; i++) resultV2.push(address);
  }

  console.log(JSON.stringify(resultV2));
}
main();
