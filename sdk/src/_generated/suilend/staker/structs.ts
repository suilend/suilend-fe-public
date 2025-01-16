import * as reified from "../../_framework/reified";
import { Balance } from "../../_dependencies/source/0x2/balance/structs";
import { SUI } from "../../_dependencies/source/0x2/sui/structs";
import {
  AdminCap,
  LiquidStakingInfo,
} from "../../_dependencies/source/0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7/liquid-staking/structs";
import {
  PhantomReified,
  PhantomToTypeStr,
  PhantomTypeArgument,
  Reified,
  StructClass,
  ToField,
  ToPhantomTypeArgument,
  ToTypeStr,
  assertFieldsWithTypesArgsMatch,
  assertReifiedTypeArgsMatch,
  decodeFromFields,
  decodeFromFieldsWithTypes,
  decodeFromJSONField,
  extractType,
  phantom,
  ToTypeStr as ToPhantom,
} from "../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
  parseTypeName,
} from "../../_framework/util";
import { PKG_V8 } from "../index";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== Staker =============================== */

export function isStaker(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V8}::staker::Staker` + "<");
}

export interface StakerFields<P extends PhantomTypeArgument> {
  admin: ToField<AdminCap<P>>;
  liquidStakingInfo: ToField<LiquidStakingInfo<P>>;
  lstBalance: ToField<Balance<P>>;
  suiBalance: ToField<Balance<ToPhantom<SUI>>>;
  liabilities: ToField<"u64">;
}

export type StakerReified<P extends PhantomTypeArgument> = Reified<
  Staker<P>,
  StakerFields<P>
>;

export class Staker<P extends PhantomTypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V8}::staker::Staker`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = Staker.$typeName;
  readonly $fullTypeName: `${typeof PKG_V8}::staker::Staker<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = Staker.$isPhantom;

  readonly admin: ToField<AdminCap<P>>;
  readonly liquidStakingInfo: ToField<LiquidStakingInfo<P>>;
  readonly lstBalance: ToField<Balance<P>>;
  readonly suiBalance: ToField<Balance<ToPhantom<SUI>>>;
  readonly liabilities: ToField<"u64">;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: StakerFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      Staker.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V8}::staker::Staker<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.admin = fields.admin;
    this.liquidStakingInfo = fields.liquidStakingInfo;
    this.lstBalance = fields.lstBalance;
    this.suiBalance = fields.suiBalance;
    this.liabilities = fields.liabilities;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): StakerReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: Staker.$typeName,
      fullTypeName: composeSuiType(
        Staker.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V8}::staker::Staker<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: Staker.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) => Staker.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Staker.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => Staker.fromBcs(P, data),
      bcs: Staker.bcs,
      fromJSONField: (field: any) => Staker.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) => Staker.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Staker.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Staker.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        Staker.fetch(client, P, id),
      new: (fields: StakerFields<ToPhantomTypeArgument<P>>) => {
        return new Staker([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Staker.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<Staker<ToPhantomTypeArgument<P>>>> {
    return phantom(Staker.reified(P));
  }
  static get p() {
    return Staker.phantom;
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

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): Staker<ToPhantomTypeArgument<P>> {
    return Staker.reified(typeArg).new({
      admin: decodeFromFields(AdminCap.reified(typeArg), fields.admin),
      liquidStakingInfo: decodeFromFields(
        LiquidStakingInfo.reified(typeArg),
        fields.liquid_staking_info,
      ),
      lstBalance: decodeFromFields(
        Balance.reified(typeArg),
        fields.lst_balance,
      ),
      suiBalance: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.sui_balance,
      ),
      liabilities: decodeFromFields("u64", fields.liabilities),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): Staker<ToPhantomTypeArgument<P>> {
    if (!isStaker(item.type)) {
      throw new Error("not a Staker type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return Staker.reified(typeArg).new({
      admin: decodeFromFieldsWithTypes(
        AdminCap.reified(typeArg),
        item.fields.admin,
      ),
      liquidStakingInfo: decodeFromFieldsWithTypes(
        LiquidStakingInfo.reified(typeArg),
        item.fields.liquid_staking_info,
      ),
      lstBalance: decodeFromFieldsWithTypes(
        Balance.reified(typeArg),
        item.fields.lst_balance,
      ),
      suiBalance: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.sui_balance,
      ),
      liabilities: decodeFromFieldsWithTypes("u64", item.fields.liabilities),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): Staker<ToPhantomTypeArgument<P>> {
    return Staker.fromFields(typeArg, Staker.bcs.parse(data));
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

  static fromJSONField<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    field: any,
  ): Staker<ToPhantomTypeArgument<P>> {
    return Staker.reified(typeArg).new({
      admin: decodeFromJSONField(AdminCap.reified(typeArg), field.admin),
      liquidStakingInfo: decodeFromJSONField(
        LiquidStakingInfo.reified(typeArg),
        field.liquidStakingInfo,
      ),
      lstBalance: decodeFromJSONField(
        Balance.reified(typeArg),
        field.lstBalance,
      ),
      suiBalance: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.suiBalance,
      ),
      liabilities: decodeFromJSONField("u64", field.liabilities),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): Staker<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== Staker.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Staker.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return Staker.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): Staker<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isStaker(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Staker object`,
      );
    }
    return Staker.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): Staker<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isStaker(data.bcs.type)) {
        throw new Error(`object at is not a Staker object`);
      }

      const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs;
      if (gotTypeArgs.length !== 1) {
        throw new Error(
          `type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`,
        );
      }
      const gotTypeArg = compressSuiType(gotTypeArgs[0]);
      const expectedTypeArg = compressSuiType(extractType(typeArg));
      if (gotTypeArg !== compressSuiType(extractType(typeArg))) {
        throw new Error(
          `type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`,
        );
      }

      return Staker.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Staker.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<Staker<ToPhantomTypeArgument<P>>> {
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

    return Staker.fromSuiObjectData(typeArg, res.data);
  }
}
