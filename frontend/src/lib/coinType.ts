import { normalizeStructTag } from "@mysten/sui/utils";

const TISM_COINTYPE =
  "0x6612c8419c70a706612e154ffcc0ef21b3fec6e4008b4b775ceae4e894d3484d::tism::TISM";
const OCTO_COINTYPE =
  "0x4b6d48afff2948c3ccc67191cf0ef175637472b007c1a8601fa18e16e236909c::octo::OCTO";

export const NORMALIZED_TISM_COINTYPE = normalizeStructTag(TISM_COINTYPE);
export const NORMALIZED_OCTO_COINTYPE = normalizeStructTag(OCTO_COINTYPE);
