import fs from "fs";

const NAME = "@suilend/sdk";

// 1. Update package.json
import packageJson from "./package.json";
const newPackageJson = Object.assign({}, packageJson) as any;

newPackageJson["name"] = NAME;
newPackageJson["private"] = false;
newPackageJson["main"] = "./index.js";

const exportsMap: Record<string, string> = {
  ".": "./index.js",
};
const files = (
  fs.readdirSync("./dist/", { recursive: true }) as string[]
).filter((file) => file !== "index.js" && file.endsWith(".js"));
for (const file of files) {
  const fileName = file.substring(
    0,
    file.endsWith("index.js")
      ? file.lastIndexOf("/index.js")
      : file.lastIndexOf(".js"),
  );
  exportsMap[`./${fileName}`] = `./${file}`;
}
newPackageJson["exports"] = exportsMap;

newPackageJson["types"] = "./index.js";

fs.writeFileSync("./dist/package.json", JSON.stringify(newPackageJson), "utf8");

// 2. Copy README.md
fs.cpSync("./README.md", "./dist/README.md");
