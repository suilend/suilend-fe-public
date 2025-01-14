import * as sprungsui from "./sprungsui/structs";
import { StructClassLoader } from "../../../_framework/loader";

export function registerClasses(loader: StructClassLoader) {
  loader.register(sprungsui.SPRUNGSUI);
}
