import * as reified from "../../_framework/reified";
import {
  AdminCap,
  LiquidStakingInfo,
} from "../../_dependencies/source/0x0/liquid-staking/structs";
import { Balance } from "../../_dependencies/source/0x2/balance/structs";
import { SUI } from "../../_dependencies/source/0x2/sui/structs";
import {
  PhantomReified,
  Reified,
  StructClass,
  ToField,
  ToTypeStr,
  decodeFromFields,
  decodeFromFieldsWithTypes,
  decodeFromJSONField,
  phantom,
  ToTypeStr as ToPhantom,
} from "../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
} from "../../_framework/util";
import { PKG_V1 } from "../index";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== STAKER =============================== */

export function isSTAKER(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::staker::STAKER`;
}

export interface STAKERFields {
  dummyField: ToField<"bool">;
}

export type STAKERReified = Reified<STAKER, STAKERFields>;

export class STAKER implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::staker::STAKER`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = STAKER.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::staker::STAKER`;
  readonly $typeArgs: [];
  readonly $isPhantom = STAKER.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: STAKERFields) {
    this.$fullTypeName = composeSuiType(
      STAKER.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::staker::STAKER`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): STAKERReified {
    return {
      typeName: STAKER.$typeName,
      fullTypeName: composeSuiType(
        STAKER.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::staker::STAKER`,
      typeArgs: [] as [],
      isPhantom: STAKER.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => STAKER.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        STAKER.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => STAKER.fromBcs(data),
      bcs: STAKER.bcs,
      fromJSONField: (field: any) => STAKER.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => STAKER.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        STAKER.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        STAKER.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => STAKER.fetch(client, id),
      new: (fields: STAKERFields) => {
        return new STAKER([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return STAKER.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<STAKER>> {
    return phantom(STAKER.reified());
  }
  static get p() {
    return STAKER.phantom();
  }

  static get bcs() {
    return bcs.struct("STAKER", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): STAKER {
    return STAKER.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): STAKER {
    if (!isSTAKER(item.type)) {
      throw new Error("not a STAKER type");
    }

    return STAKER.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): STAKER {
    return STAKER.fromFields(STAKER.bcs.parse(data));
  }

  toJSONField() {
    return {
      dummyField: this.dummyField,
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): STAKER {
    return STAKER.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): STAKER {
    if (json.$typeName !== STAKER.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return STAKER.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): STAKER {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSTAKER(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a STAKER object`,
      );
    }
    return STAKER.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): STAKER {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isSTAKER(data.bcs.type)) {
        throw new Error(`object at is not a STAKER object`);
      }

      return STAKER.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return STAKER.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<STAKER> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching STAKER object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSTAKER(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a STAKER object`);
    }

    return STAKER.fromSuiObjectData(res.data);
  }
}

/* ============================== Staker =============================== */

export function isStaker(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::staker::Staker`;
}

export interface StakerFields {
  admin: ToField<AdminCap<ToPhantom<STAKER>>>;
  liquidStakingInfo: ToField<LiquidStakingInfo<ToPhantom<STAKER>>>;
  lstBalance: ToField<Balance<ToPhantom<STAKER>>>;
  suiBalance: ToField<Balance<ToPhantom<SUI>>>;
  liabilities: ToField<"u64">;
}

export type StakerReified = Reified<Staker, StakerFields>;

export class Staker implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::staker::Staker`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = Staker.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::staker::Staker`;
  readonly $typeArgs: [];
  readonly $isPhantom = Staker.$isPhantom;

  readonly admin: ToField<AdminCap<ToPhantom<STAKER>>>;
  readonly liquidStakingInfo: ToField<LiquidStakingInfo<ToPhantom<STAKER>>>;
  readonly lstBalance: ToField<Balance<ToPhantom<STAKER>>>;
  readonly suiBalance: ToField<Balance<ToPhantom<SUI>>>;
  readonly liabilities: ToField<"u64">;

  private constructor(typeArgs: [], fields: StakerFields) {
    this.$fullTypeName = composeSuiType(
      Staker.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::staker::Staker`;
    this.$typeArgs = typeArgs;

    this.admin = fields.admin;
    this.liquidStakingInfo = fields.liquidStakingInfo;
    this.lstBalance = fields.lstBalance;
    this.suiBalance = fields.suiBalance;
    this.liabilities = fields.liabilities;
  }

  static reified(): StakerReified {
    return {
      typeName: Staker.$typeName,
      fullTypeName: composeSuiType(
        Staker.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::staker::Staker`,
      typeArgs: [] as [],
      isPhantom: Staker.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => Staker.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Staker.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => Staker.fromBcs(data),
      bcs: Staker.bcs,
      fromJSONField: (field: any) => Staker.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => Staker.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Staker.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Staker.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => Staker.fetch(client, id),
      new: (fields: StakerFields) => {
        return new Staker([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Staker.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<Staker>> {
    return phantom(Staker.reified());
  }
  static get p() {
    return Staker.phantom();
  }

  static get bcs() {
    return bcs.struct("Staker", {
      admin: AdminCap.bcs,
      liquid_staking_info: LiquidStakingInfo.bcs,
      lst_balance: Balance.bcs,
      sui_balance: Balance.bcs,
      liabilities: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): Staker {
    return Staker.reified().new({
      admin: decodeFromFields(
        AdminCap.reified(reified.phantom(STAKER.reified())),
        fields.admin,
      ),
      liquidStakingInfo: decodeFromFields(
        LiquidStakingInfo.reified(reified.phantom(STAKER.reified())),
        fields.liquid_staking_info,
      ),
      lstBalance: decodeFromFields(
        Balance.reified(reified.phantom(STAKER.reified())),
        fields.lst_balance,
      ),
      suiBalance: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.sui_balance,
      ),
      liabilities: decodeFromFields("u64", fields.liabilities),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): Staker {
    if (!isStaker(item.type)) {
      throw new Error("not a Staker type");
    }

    return Staker.reified().new({
      admin: decodeFromFieldsWithTypes(
        AdminCap.reified(reified.phantom(STAKER.reified())),
        item.fields.admin,
      ),
      liquidStakingInfo: decodeFromFieldsWithTypes(
        LiquidStakingInfo.reified(reified.phantom(STAKER.reified())),
        item.fields.liquid_staking_info,
      ),
      lstBalance: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(STAKER.reified())),
        item.fields.lst_balance,
      ),
      suiBalance: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.sui_balance,
      ),
      liabilities: decodeFromFieldsWithTypes("u64", item.fields.liabilities),
    });
  }

  static fromBcs(data: Uint8Array): Staker {
    return Staker.fromFields(Staker.bcs.parse(data));
  }

  toJSONField() {
    return {
      admin: this.admin.toJSONField(),
      liquidStakingInfo: this.liquidStakingInfo.toJSONField(),
      lstBalance: this.lstBalance.toJSONField(),
      suiBalance: this.suiBalance.toJSONField(),
      liabilities: this.liabilities.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): Staker {
    return Staker.reified().new({
      admin: decodeFromJSONField(
        AdminCap.reified(reified.phantom(STAKER.reified())),
        field.admin,
      ),
      liquidStakingInfo: decodeFromJSONField(
        LiquidStakingInfo.reified(reified.phantom(STAKER.reified())),
        field.liquidStakingInfo,
      ),
      lstBalance: decodeFromJSONField(
        Balance.reified(reified.phantom(STAKER.reified())),
        field.lstBalance,
      ),
      suiBalance: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.suiBalance,
      ),
      liabilities: decodeFromJSONField("u64", field.liabilities),
    });
  }

  static fromJSON(json: Record<string, any>): Staker {
    if (json.$typeName !== Staker.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return Staker.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): Staker {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isStaker(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Staker object`,
      );
    }
    return Staker.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): Staker {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isStaker(data.bcs.type)) {
        throw new Error(`object at is not a Staker object`);
      }

      return Staker.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Staker.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<Staker> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Staker object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isStaker(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Staker object`);
    }

    return Staker.fromSuiObjectData(res.data);
  }
}
