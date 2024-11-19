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
} from "../../../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
  parseTypeName,
} from "../../../../_framework/util";
import { Bag } from "../../0x2/bag/structs";
import { UID } from "../../0x2/object/structs";
import { VecMap } from "../../0x2/vec-map/structs";
import { PKG_V1 } from "../index";
import { AdminCap } from "../liquid-staking/structs";
import { Version } from "../version/structs";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== WEIGHT =============================== */

export function isWEIGHT(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::weight::WEIGHT`;
}

export interface WEIGHTFields {
  dummyField: ToField<"bool">;
}

export type WEIGHTReified = Reified<WEIGHT, WEIGHTFields>;

export class WEIGHT implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::weight::WEIGHT`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = WEIGHT.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::weight::WEIGHT`;
  readonly $typeArgs: [];
  readonly $isPhantom = WEIGHT.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: WEIGHTFields) {
    this.$fullTypeName = composeSuiType(
      WEIGHT.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::weight::WEIGHT`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): WEIGHTReified {
    return {
      typeName: WEIGHT.$typeName,
      fullTypeName: composeSuiType(
        WEIGHT.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::weight::WEIGHT`,
      typeArgs: [] as [],
      isPhantom: WEIGHT.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => WEIGHT.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        WEIGHT.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => WEIGHT.fromBcs(data),
      bcs: WEIGHT.bcs,
      fromJSONField: (field: any) => WEIGHT.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => WEIGHT.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        WEIGHT.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        WEIGHT.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => WEIGHT.fetch(client, id),
      new: (fields: WEIGHTFields) => {
        return new WEIGHT([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return WEIGHT.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<WEIGHT>> {
    return phantom(WEIGHT.reified());
  }
  static get p() {
    return WEIGHT.phantom();
  }

  static get bcs() {
    return bcs.struct("WEIGHT", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): WEIGHT {
    return WEIGHT.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): WEIGHT {
    if (!isWEIGHT(item.type)) {
      throw new Error("not a WEIGHT type");
    }

    return WEIGHT.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): WEIGHT {
    return WEIGHT.fromFields(WEIGHT.bcs.parse(data));
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

  static fromJSONField(field: any): WEIGHT {
    return WEIGHT.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): WEIGHT {
    if (json.$typeName !== WEIGHT.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return WEIGHT.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): WEIGHT {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isWEIGHT(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a WEIGHT object`,
      );
    }
    return WEIGHT.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): WEIGHT {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isWEIGHT(data.bcs.type)) {
        throw new Error(`object at is not a WEIGHT object`);
      }

      return WEIGHT.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return WEIGHT.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<WEIGHT> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching WEIGHT object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isWEIGHT(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a WEIGHT object`);
    }

    return WEIGHT.fromSuiObjectData(res.data);
  }
}

/* ============================== WeightHook =============================== */

export function isWeightHook(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::weight::WeightHook` + "<");
}

export interface WeightHookFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  validatorAddressesAndWeights: ToField<VecMap<"address", "u64">>;
  totalWeight: ToField<"u64">;
  adminCap: ToField<AdminCap<P>>;
  version: ToField<Version>;
  extraFields: ToField<Bag>;
}

export type WeightHookReified<P extends PhantomTypeArgument> = Reified<
  WeightHook<P>,
  WeightHookFields<P>
>;

export class WeightHook<P extends PhantomTypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::weight::WeightHook`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = WeightHook.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::weight::WeightHook<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = WeightHook.$isPhantom;

  readonly id: ToField<UID>;
  readonly validatorAddressesAndWeights: ToField<VecMap<"address", "u64">>;
  readonly totalWeight: ToField<"u64">;
  readonly adminCap: ToField<AdminCap<P>>;
  readonly version: ToField<Version>;
  readonly extraFields: ToField<Bag>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: WeightHookFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      WeightHook.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::weight::WeightHook<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.validatorAddressesAndWeights = fields.validatorAddressesAndWeights;
    this.totalWeight = fields.totalWeight;
    this.adminCap = fields.adminCap;
    this.version = fields.version;
    this.extraFields = fields.extraFields;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): WeightHookReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: WeightHook.$typeName,
      fullTypeName: composeSuiType(
        WeightHook.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::weight::WeightHook<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: WeightHook.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        WeightHook.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        WeightHook.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => WeightHook.fromBcs(P, data),
      bcs: WeightHook.bcs,
      fromJSONField: (field: any) => WeightHook.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) => WeightHook.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        WeightHook.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        WeightHook.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        WeightHook.fetch(client, P, id),
      new: (fields: WeightHookFields<ToPhantomTypeArgument<P>>) => {
        return new WeightHook([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return WeightHook.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<WeightHook<ToPhantomTypeArgument<P>>>> {
    return phantom(WeightHook.reified(P));
  }
  static get p() {
    return WeightHook.phantom;
  }

  static get bcs() {
    return bcs.struct("WeightHook", {
      id: UID.bcs,
      validator_addresses_and_weights: VecMap.bcs(
        bcs
          .bytes(32)
          .transform({
            input: (val: string) => fromHEX(val),
            output: (val: Uint8Array) => toHEX(val),
          }),
        bcs.u64(),
      ),
      total_weight: bcs.u64(),
      admin_cap: AdminCap.bcs,
      version: Version.bcs,
      extra_fields: Bag.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): WeightHook<ToPhantomTypeArgument<P>> {
    return WeightHook.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      validatorAddressesAndWeights: decodeFromFields(
        VecMap.reified("address", "u64"),
        fields.validator_addresses_and_weights,
      ),
      totalWeight: decodeFromFields("u64", fields.total_weight),
      adminCap: decodeFromFields(AdminCap.reified(typeArg), fields.admin_cap),
      version: decodeFromFields(Version.reified(), fields.version),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): WeightHook<ToPhantomTypeArgument<P>> {
    if (!isWeightHook(item.type)) {
      throw new Error("not a WeightHook type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return WeightHook.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      validatorAddressesAndWeights: decodeFromFieldsWithTypes(
        VecMap.reified("address", "u64"),
        item.fields.validator_addresses_and_weights,
      ),
      totalWeight: decodeFromFieldsWithTypes("u64", item.fields.total_weight),
      adminCap: decodeFromFieldsWithTypes(
        AdminCap.reified(typeArg),
        item.fields.admin_cap,
      ),
      version: decodeFromFieldsWithTypes(
        Version.reified(),
        item.fields.version,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): WeightHook<ToPhantomTypeArgument<P>> {
    return WeightHook.fromFields(typeArg, WeightHook.bcs.parse(data));
  }

  toJSONField() {
    return {
      id: this.id,
      validatorAddressesAndWeights:
        this.validatorAddressesAndWeights.toJSONField(),
      totalWeight: this.totalWeight.toString(),
      adminCap: this.adminCap.toJSONField(),
      version: this.version.toJSONField(),
      extraFields: this.extraFields.toJSONField(),
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
  ): WeightHook<ToPhantomTypeArgument<P>> {
    return WeightHook.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      validatorAddressesAndWeights: decodeFromJSONField(
        VecMap.reified("address", "u64"),
        field.validatorAddressesAndWeights,
      ),
      totalWeight: decodeFromJSONField("u64", field.totalWeight),
      adminCap: decodeFromJSONField(AdminCap.reified(typeArg), field.adminCap),
      version: decodeFromJSONField(Version.reified(), field.version),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): WeightHook<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== WeightHook.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(WeightHook.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return WeightHook.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): WeightHook<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isWeightHook(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a WeightHook object`,
      );
    }
    return WeightHook.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): WeightHook<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isWeightHook(data.bcs.type)) {
        throw new Error(`object at is not a WeightHook object`);
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

      return WeightHook.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return WeightHook.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<WeightHook<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching WeightHook object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isWeightHook(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a WeightHook object`);
    }

    return WeightHook.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== WeightHookAdminCap =============================== */

export function isWeightHookAdminCap(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::weight::WeightHookAdminCap` + "<");
}

export interface WeightHookAdminCapFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
}

export type WeightHookAdminCapReified<P extends PhantomTypeArgument> = Reified<
  WeightHookAdminCap<P>,
  WeightHookAdminCapFields<P>
>;

export class WeightHookAdminCap<P extends PhantomTypeArgument>
  implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::weight::WeightHookAdminCap`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = WeightHookAdminCap.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::weight::WeightHookAdminCap<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = WeightHookAdminCap.$isPhantom;

  readonly id: ToField<UID>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: WeightHookAdminCapFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      WeightHookAdminCap.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::weight::WeightHookAdminCap<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): WeightHookAdminCapReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: WeightHookAdminCap.$typeName,
      fullTypeName: composeSuiType(
        WeightHookAdminCap.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::weight::WeightHookAdminCap<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: WeightHookAdminCap.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        WeightHookAdminCap.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        WeightHookAdminCap.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => WeightHookAdminCap.fromBcs(P, data),
      bcs: WeightHookAdminCap.bcs,
      fromJSONField: (field: any) => WeightHookAdminCap.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) =>
        WeightHookAdminCap.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        WeightHookAdminCap.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        WeightHookAdminCap.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        WeightHookAdminCap.fetch(client, P, id),
      new: (fields: WeightHookAdminCapFields<ToPhantomTypeArgument<P>>) => {
        return new WeightHookAdminCap([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return WeightHookAdminCap.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<WeightHookAdminCap<ToPhantomTypeArgument<P>>>> {
    return phantom(WeightHookAdminCap.reified(P));
  }
  static get p() {
    return WeightHookAdminCap.phantom;
  }

  static get bcs() {
    return bcs.struct("WeightHookAdminCap", {
      id: UID.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    return WeightHookAdminCap.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    if (!isWeightHookAdminCap(item.type)) {
      throw new Error("not a WeightHookAdminCap type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return WeightHookAdminCap.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    return WeightHookAdminCap.fromFields(
      typeArg,
      WeightHookAdminCap.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      id: this.id,
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
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    return WeightHookAdminCap.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== WeightHookAdminCap.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(WeightHookAdminCap.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return WeightHookAdminCap.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isWeightHookAdminCap(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a WeightHookAdminCap object`,
      );
    }
    return WeightHookAdminCap.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): WeightHookAdminCap<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isWeightHookAdminCap(data.bcs.type)
      ) {
        throw new Error(`object at is not a WeightHookAdminCap object`);
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

      return WeightHookAdminCap.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return WeightHookAdminCap.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<WeightHookAdminCap<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching WeightHookAdminCap object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isWeightHookAdminCap(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a WeightHookAdminCap object`);
    }

    return WeightHookAdminCap.fromSuiObjectData(typeArg, res.data);
  }
}
