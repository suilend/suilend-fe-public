import * as reified from "../../_framework/reified";
import { TypeName } from "../../_dependencies/source/0x1/type-name/structs";
import {
  Balance,
  Supply,
} from "../../_dependencies/source/0x2/balance/structs";
import { ID, UID } from "../../_dependencies/source/0x2/object/structs";
import { PriceIdentifier } from "../../_dependencies/source/0x8d97f1cd6ac663735be08d1d2b6d02a159e711586461306ce60a2b7a6a565a9e/price-identifier/structs";
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
import { Cell } from "../cell/structs";
import { Decimal } from "../decimal/structs";
import { PKG_V1, PKG_V8 } from "../index";
import { PoolRewardManager } from "../liquidity-mining/structs";
import { ReserveConfig } from "../reserve-config/structs";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== BalanceKey =============================== */

export function isBalanceKey(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::reserve::BalanceKey`;
}

export interface BalanceKeyFields {
  dummyField: ToField<"bool">;
}

export type BalanceKeyReified = Reified<BalanceKey, BalanceKeyFields>;

export class BalanceKey implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::reserve::BalanceKey`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = BalanceKey.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::reserve::BalanceKey`;
  readonly $typeArgs: [];
  readonly $isPhantom = BalanceKey.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: BalanceKeyFields) {
    this.$fullTypeName = composeSuiType(
      BalanceKey.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::reserve::BalanceKey`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): BalanceKeyReified {
    return {
      typeName: BalanceKey.$typeName,
      fullTypeName: composeSuiType(
        BalanceKey.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::reserve::BalanceKey`,
      typeArgs: [] as [],
      isPhantom: BalanceKey.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        BalanceKey.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        BalanceKey.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => BalanceKey.fromBcs(data),
      bcs: BalanceKey.bcs,
      fromJSONField: (field: any) => BalanceKey.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => BalanceKey.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        BalanceKey.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        BalanceKey.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        BalanceKey.fetch(client, id),
      new: (fields: BalanceKeyFields) => {
        return new BalanceKey([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return BalanceKey.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<BalanceKey>> {
    return phantom(BalanceKey.reified());
  }
  static get p() {
    return BalanceKey.phantom();
  }

  static get bcs() {
    return bcs.struct("BalanceKey", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): BalanceKey {
    return BalanceKey.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): BalanceKey {
    if (!isBalanceKey(item.type)) {
      throw new Error("not a BalanceKey type");
    }

    return BalanceKey.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): BalanceKey {
    return BalanceKey.fromFields(BalanceKey.bcs.parse(data));
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

  static fromJSONField(field: any): BalanceKey {
    return BalanceKey.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): BalanceKey {
    if (json.$typeName !== BalanceKey.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return BalanceKey.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): BalanceKey {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isBalanceKey(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a BalanceKey object`,
      );
    }
    return BalanceKey.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): BalanceKey {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isBalanceKey(data.bcs.type)) {
        throw new Error(`object at is not a BalanceKey object`);
      }

      return BalanceKey.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return BalanceKey.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<BalanceKey> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching BalanceKey object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isBalanceKey(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a BalanceKey object`);
    }

    return BalanceKey.fromSuiObjectData(res.data);
  }
}

/* ============================== Balances =============================== */

export function isBalances(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::reserve::Balances` + "<");
}

export interface BalancesFields<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> {
  availableAmount: ToField<Balance<T>>;
  ctokenSupply: ToField<Supply<ToPhantom<CToken<P, T>>>>;
  fees: ToField<Balance<T>>;
  ctokenFees: ToField<Balance<ToPhantom<CToken<P, T>>>>;
  depositedCtokens: ToField<Balance<ToPhantom<CToken<P, T>>>>;
}

export type BalancesReified<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> = Reified<Balances<P, T>, BalancesFields<P, T>>;

export class Balances<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::reserve::Balances`;
  static readonly $numTypeParams = 2;
  static readonly $isPhantom = [true, true] as const;

  readonly $typeName = Balances.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::reserve::Balances<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>];
  readonly $isPhantom = Balances.$isPhantom;

  readonly availableAmount: ToField<Balance<T>>;
  readonly ctokenSupply: ToField<Supply<ToPhantom<CToken<P, T>>>>;
  readonly fees: ToField<Balance<T>>;
  readonly ctokenFees: ToField<Balance<ToPhantom<CToken<P, T>>>>;
  readonly depositedCtokens: ToField<Balance<ToPhantom<CToken<P, T>>>>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>],
    fields: BalancesFields<P, T>,
  ) {
    this.$fullTypeName = composeSuiType(
      Balances.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::reserve::Balances<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
    this.$typeArgs = typeArgs;

    this.availableAmount = fields.availableAmount;
    this.ctokenSupply = fields.ctokenSupply;
    this.fees = fields.fees;
    this.ctokenFees = fields.ctokenFees;
    this.depositedCtokens = fields.depositedCtokens;
  }

  static reified<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): BalancesReified<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return {
      typeName: Balances.$typeName,
      fullTypeName: composeSuiType(
        Balances.$typeName,
        ...[extractType(P), extractType(T)],
      ) as `${typeof PKG_V1}::reserve::Balances<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}, ${PhantomToTypeStr<ToPhantomTypeArgument<T>>}>`,
      typeArgs: [extractType(P), extractType(T)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
        PhantomToTypeStr<ToPhantomTypeArgument<T>>,
      ],
      isPhantom: Balances.$isPhantom,
      reifiedTypeArgs: [P, T],
      fromFields: (fields: Record<string, any>) =>
        Balances.fromFields([P, T], fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Balances.fromFieldsWithTypes([P, T], item),
      fromBcs: (data: Uint8Array) => Balances.fromBcs([P, T], data),
      bcs: Balances.bcs,
      fromJSONField: (field: any) => Balances.fromJSONField([P, T], field),
      fromJSON: (json: Record<string, any>) => Balances.fromJSON([P, T], json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Balances.fromSuiParsedData([P, T], content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Balances.fromSuiObjectData([P, T], content),
      fetch: async (client: SuiClient, id: string) =>
        Balances.fetch(client, [P, T], id),
      new: (
        fields: BalancesFields<
          ToPhantomTypeArgument<P>,
          ToPhantomTypeArgument<T>
        >,
      ) => {
        return new Balances([extractType(P), extractType(T)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Balances.reified;
  }

  static phantom<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): PhantomReified<
    ToTypeStr<Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>>
  > {
    return phantom(Balances.reified(P, T));
  }
  static get p() {
    return Balances.phantom;
  }

  static get bcs() {
    return bcs.struct("Balances", {
      available_amount: Balance.bcs,
      ctoken_supply: Supply.bcs,
      fees: Balance.bcs,
      ctoken_fees: Balance.bcs,
      deposited_ctokens: Balance.bcs,
    });
  }

  static fromFields<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    fields: Record<string, any>,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return Balances.reified(typeArgs[0], typeArgs[1]).new({
      availableAmount: decodeFromFields(
        Balance.reified(typeArgs[1]),
        fields.available_amount,
      ),
      ctokenSupply: decodeFromFields(
        Supply.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        fields.ctoken_supply,
      ),
      fees: decodeFromFields(Balance.reified(typeArgs[1]), fields.fees),
      ctokenFees: decodeFromFields(
        Balance.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        fields.ctoken_fees,
      ),
      depositedCtokens: decodeFromFields(
        Balance.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        fields.deposited_ctokens,
      ),
    });
  }

  static fromFieldsWithTypes<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    item: FieldsWithTypes,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (!isBalances(item.type)) {
      throw new Error("not a Balances type");
    }
    assertFieldsWithTypesArgsMatch(item, typeArgs);

    return Balances.reified(typeArgs[0], typeArgs[1]).new({
      availableAmount: decodeFromFieldsWithTypes(
        Balance.reified(typeArgs[1]),
        item.fields.available_amount,
      ),
      ctokenSupply: decodeFromFieldsWithTypes(
        Supply.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        item.fields.ctoken_supply,
      ),
      fees: decodeFromFieldsWithTypes(
        Balance.reified(typeArgs[1]),
        item.fields.fees,
      ),
      ctokenFees: decodeFromFieldsWithTypes(
        Balance.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        item.fields.ctoken_fees,
      ),
      depositedCtokens: decodeFromFieldsWithTypes(
        Balance.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        item.fields.deposited_ctokens,
      ),
    });
  }

  static fromBcs<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: Uint8Array,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return Balances.fromFields(typeArgs, Balances.bcs.parse(data));
  }

  toJSONField() {
    return {
      availableAmount: this.availableAmount.toJSONField(),
      ctokenSupply: this.ctokenSupply.toJSONField(),
      fees: this.fees.toJSONField(),
      ctokenFees: this.ctokenFees.toJSONField(),
      depositedCtokens: this.depositedCtokens.toJSONField(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    field: any,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return Balances.reified(typeArgs[0], typeArgs[1]).new({
      availableAmount: decodeFromJSONField(
        Balance.reified(typeArgs[1]),
        field.availableAmount,
      ),
      ctokenSupply: decodeFromJSONField(
        Supply.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        field.ctokenSupply,
      ),
      fees: decodeFromJSONField(Balance.reified(typeArgs[1]), field.fees),
      ctokenFees: decodeFromJSONField(
        Balance.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        field.ctokenFees,
      ),
      depositedCtokens: decodeFromJSONField(
        Balance.reified(
          reified.phantom(CToken.reified(typeArgs[0], typeArgs[1])),
        ),
        field.depositedCtokens,
      ),
    });
  }

  static fromJSON<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    json: Record<string, any>,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (json.$typeName !== Balances.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Balances.$typeName, ...typeArgs.map(extractType)),
      json.$typeArgs,
      typeArgs,
    );

    return Balances.fromJSONField(typeArgs, json);
  }

  static fromSuiParsedData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    content: SuiParsedData,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isBalances(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Balances object`,
      );
    }
    return Balances.fromFieldsWithTypes(typeArgs, content);
  }

  static fromSuiObjectData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: SuiObjectData,
  ): Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isBalances(data.bcs.type)) {
        throw new Error(`object at is not a Balances object`);
      }

      const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs;
      if (gotTypeArgs.length !== 2) {
        throw new Error(
          `type argument mismatch: expected 2 type arguments but got ${gotTypeArgs.length}`,
        );
      }
      for (let i = 0; i < 2; i++) {
        const gotTypeArg = compressSuiType(gotTypeArgs[i]);
        const expectedTypeArg = compressSuiType(extractType(typeArgs[i]));
        if (gotTypeArg !== expectedTypeArg) {
          throw new Error(
            `type argument mismatch at position ${i}: expected '${expectedTypeArg}' but got '${gotTypeArg}'`,
          );
        }
      }

      return Balances.fromBcs(typeArgs, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Balances.fromSuiParsedData(typeArgs, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    client: SuiClient,
    typeArgs: [P, T],
    id: string,
  ): Promise<Balances<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Balances object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isBalances(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Balances object`);
    }

    return Balances.fromSuiObjectData(typeArgs, res.data);
  }
}

/* ============================== CToken =============================== */

export function isCToken(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::reserve::CToken` + "<");
}

export interface CTokenFields<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> {
  dummyField: ToField<"bool">;
}

export type CTokenReified<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> = Reified<CToken<P, T>, CTokenFields<P, T>>;

export class CToken<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::reserve::CToken`;
  static readonly $numTypeParams = 2;
  static readonly $isPhantom = [true, true] as const;

  readonly $typeName = CToken.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::reserve::CToken<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>];
  readonly $isPhantom = CToken.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>],
    fields: CTokenFields<P, T>,
  ) {
    this.$fullTypeName = composeSuiType(
      CToken.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::reserve::CToken<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): CTokenReified<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return {
      typeName: CToken.$typeName,
      fullTypeName: composeSuiType(
        CToken.$typeName,
        ...[extractType(P), extractType(T)],
      ) as `${typeof PKG_V1}::reserve::CToken<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}, ${PhantomToTypeStr<ToPhantomTypeArgument<T>>}>`,
      typeArgs: [extractType(P), extractType(T)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
        PhantomToTypeStr<ToPhantomTypeArgument<T>>,
      ],
      isPhantom: CToken.$isPhantom,
      reifiedTypeArgs: [P, T],
      fromFields: (fields: Record<string, any>) =>
        CToken.fromFields([P, T], fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        CToken.fromFieldsWithTypes([P, T], item),
      fromBcs: (data: Uint8Array) => CToken.fromBcs([P, T], data),
      bcs: CToken.bcs,
      fromJSONField: (field: any) => CToken.fromJSONField([P, T], field),
      fromJSON: (json: Record<string, any>) => CToken.fromJSON([P, T], json),
      fromSuiParsedData: (content: SuiParsedData) =>
        CToken.fromSuiParsedData([P, T], content),
      fromSuiObjectData: (content: SuiObjectData) =>
        CToken.fromSuiObjectData([P, T], content),
      fetch: async (client: SuiClient, id: string) =>
        CToken.fetch(client, [P, T], id),
      new: (
        fields: CTokenFields<
          ToPhantomTypeArgument<P>,
          ToPhantomTypeArgument<T>
        >,
      ) => {
        return new CToken([extractType(P), extractType(T)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return CToken.reified;
  }

  static phantom<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): PhantomReified<
    ToTypeStr<CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>>
  > {
    return phantom(CToken.reified(P, T));
  }
  static get p() {
    return CToken.phantom;
  }

  static get bcs() {
    return bcs.struct("CToken", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    fields: Record<string, any>,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return CToken.reified(typeArgs[0], typeArgs[1]).new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    item: FieldsWithTypes,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (!isCToken(item.type)) {
      throw new Error("not a CToken type");
    }
    assertFieldsWithTypesArgsMatch(item, typeArgs);

    return CToken.reified(typeArgs[0], typeArgs[1]).new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: Uint8Array,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return CToken.fromFields(typeArgs, CToken.bcs.parse(data));
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

  static fromJSONField<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    field: any,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return CToken.reified(typeArgs[0], typeArgs[1]).new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    json: Record<string, any>,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (json.$typeName !== CToken.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(CToken.$typeName, ...typeArgs.map(extractType)),
      json.$typeArgs,
      typeArgs,
    );

    return CToken.fromJSONField(typeArgs, json);
  }

  static fromSuiParsedData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    content: SuiParsedData,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isCToken(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a CToken object`,
      );
    }
    return CToken.fromFieldsWithTypes(typeArgs, content);
  }

  static fromSuiObjectData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: SuiObjectData,
  ): CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isCToken(data.bcs.type)) {
        throw new Error(`object at is not a CToken object`);
      }

      const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs;
      if (gotTypeArgs.length !== 2) {
        throw new Error(
          `type argument mismatch: expected 2 type arguments but got ${gotTypeArgs.length}`,
        );
      }
      for (let i = 0; i < 2; i++) {
        const gotTypeArg = compressSuiType(gotTypeArgs[i]);
        const expectedTypeArg = compressSuiType(extractType(typeArgs[i]));
        if (gotTypeArg !== expectedTypeArg) {
          throw new Error(
            `type argument mismatch at position ${i}: expected '${expectedTypeArg}' but got '${gotTypeArg}'`,
          );
        }
      }

      return CToken.fromBcs(typeArgs, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return CToken.fromSuiParsedData(typeArgs, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    client: SuiClient,
    typeArgs: [P, T],
    id: string,
  ): Promise<CToken<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching CToken object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isCToken(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a CToken object`);
    }

    return CToken.fromSuiObjectData(typeArgs, res.data);
  }
}

/* ============================== ClaimStakingRewardsEvent =============================== */

export function isClaimStakingRewardsEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V8}::reserve::ClaimStakingRewardsEvent`;
}

export interface ClaimStakingRewardsEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  amount: ToField<"u64">;
}

export type ClaimStakingRewardsEventReified = Reified<
  ClaimStakingRewardsEvent,
  ClaimStakingRewardsEventFields
>;

export class ClaimStakingRewardsEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V8}::reserve::ClaimStakingRewardsEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ClaimStakingRewardsEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V8}::reserve::ClaimStakingRewardsEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = ClaimStakingRewardsEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly amount: ToField<"u64">;

  private constructor(typeArgs: [], fields: ClaimStakingRewardsEventFields) {
    this.$fullTypeName = composeSuiType(
      ClaimStakingRewardsEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V8}::reserve::ClaimStakingRewardsEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.amount = fields.amount;
  }

  static reified(): ClaimStakingRewardsEventReified {
    return {
      typeName: ClaimStakingRewardsEvent.$typeName,
      fullTypeName: composeSuiType(
        ClaimStakingRewardsEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V8}::reserve::ClaimStakingRewardsEvent`,
      typeArgs: [] as [],
      isPhantom: ClaimStakingRewardsEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ClaimStakingRewardsEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ClaimStakingRewardsEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ClaimStakingRewardsEvent.fromBcs(data),
      bcs: ClaimStakingRewardsEvent.bcs,
      fromJSONField: (field: any) =>
        ClaimStakingRewardsEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        ClaimStakingRewardsEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ClaimStakingRewardsEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ClaimStakingRewardsEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ClaimStakingRewardsEvent.fetch(client, id),
      new: (fields: ClaimStakingRewardsEventFields) => {
        return new ClaimStakingRewardsEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ClaimStakingRewardsEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ClaimStakingRewardsEvent>> {
    return phantom(ClaimStakingRewardsEvent.reified());
  }
  static get p() {
    return ClaimStakingRewardsEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("ClaimStakingRewardsEvent", {
      lending_market_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      coin_type: TypeName.bcs,
      reserve_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): ClaimStakingRewardsEvent {
    return ClaimStakingRewardsEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      amount: decodeFromFields("u64", fields.amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ClaimStakingRewardsEvent {
    if (!isClaimStakingRewardsEvent(item.type)) {
      throw new Error("not a ClaimStakingRewardsEvent type");
    }

    return ClaimStakingRewardsEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      amount: decodeFromFieldsWithTypes("u64", item.fields.amount),
    });
  }

  static fromBcs(data: Uint8Array): ClaimStakingRewardsEvent {
    return ClaimStakingRewardsEvent.fromFields(
      ClaimStakingRewardsEvent.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      amount: this.amount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): ClaimStakingRewardsEvent {
    return ClaimStakingRewardsEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      amount: decodeFromJSONField("u64", field.amount),
    });
  }

  static fromJSON(json: Record<string, any>): ClaimStakingRewardsEvent {
    if (json.$typeName !== ClaimStakingRewardsEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ClaimStakingRewardsEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ClaimStakingRewardsEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isClaimStakingRewardsEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ClaimStakingRewardsEvent object`,
      );
    }
    return ClaimStakingRewardsEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ClaimStakingRewardsEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isClaimStakingRewardsEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a ClaimStakingRewardsEvent object`);
      }

      return ClaimStakingRewardsEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ClaimStakingRewardsEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<ClaimStakingRewardsEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ClaimStakingRewardsEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isClaimStakingRewardsEvent(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a ClaimStakingRewardsEvent object`,
      );
    }

    return ClaimStakingRewardsEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== InterestUpdateEvent =============================== */

export function isInterestUpdateEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::reserve::InterestUpdateEvent`;
}

export interface InterestUpdateEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  cumulativeBorrowRate: ToField<Decimal>;
  availableAmount: ToField<"u64">;
  borrowedAmount: ToField<Decimal>;
  unclaimedSpreadFees: ToField<Decimal>;
  ctokenSupply: ToField<"u64">;
  borrowInterestPaid: ToField<Decimal>;
  spreadFee: ToField<Decimal>;
  supplyInterestEarned: ToField<Decimal>;
  borrowInterestPaidUsdEstimate: ToField<Decimal>;
  protocolFeeUsdEstimate: ToField<Decimal>;
  supplyInterestEarnedUsdEstimate: ToField<Decimal>;
}

export type InterestUpdateEventReified = Reified<
  InterestUpdateEvent,
  InterestUpdateEventFields
>;

export class InterestUpdateEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::reserve::InterestUpdateEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = InterestUpdateEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::reserve::InterestUpdateEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = InterestUpdateEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly cumulativeBorrowRate: ToField<Decimal>;
  readonly availableAmount: ToField<"u64">;
  readonly borrowedAmount: ToField<Decimal>;
  readonly unclaimedSpreadFees: ToField<Decimal>;
  readonly ctokenSupply: ToField<"u64">;
  readonly borrowInterestPaid: ToField<Decimal>;
  readonly spreadFee: ToField<Decimal>;
  readonly supplyInterestEarned: ToField<Decimal>;
  readonly borrowInterestPaidUsdEstimate: ToField<Decimal>;
  readonly protocolFeeUsdEstimate: ToField<Decimal>;
  readonly supplyInterestEarnedUsdEstimate: ToField<Decimal>;

  private constructor(typeArgs: [], fields: InterestUpdateEventFields) {
    this.$fullTypeName = composeSuiType(
      InterestUpdateEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::reserve::InterestUpdateEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.cumulativeBorrowRate = fields.cumulativeBorrowRate;
    this.availableAmount = fields.availableAmount;
    this.borrowedAmount = fields.borrowedAmount;
    this.unclaimedSpreadFees = fields.unclaimedSpreadFees;
    this.ctokenSupply = fields.ctokenSupply;
    this.borrowInterestPaid = fields.borrowInterestPaid;
    this.spreadFee = fields.spreadFee;
    this.supplyInterestEarned = fields.supplyInterestEarned;
    this.borrowInterestPaidUsdEstimate = fields.borrowInterestPaidUsdEstimate;
    this.protocolFeeUsdEstimate = fields.protocolFeeUsdEstimate;
    this.supplyInterestEarnedUsdEstimate =
      fields.supplyInterestEarnedUsdEstimate;
  }

  static reified(): InterestUpdateEventReified {
    return {
      typeName: InterestUpdateEvent.$typeName,
      fullTypeName: composeSuiType(
        InterestUpdateEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::reserve::InterestUpdateEvent`,
      typeArgs: [] as [],
      isPhantom: InterestUpdateEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        InterestUpdateEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        InterestUpdateEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => InterestUpdateEvent.fromBcs(data),
      bcs: InterestUpdateEvent.bcs,
      fromJSONField: (field: any) => InterestUpdateEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        InterestUpdateEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        InterestUpdateEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        InterestUpdateEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        InterestUpdateEvent.fetch(client, id),
      new: (fields: InterestUpdateEventFields) => {
        return new InterestUpdateEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return InterestUpdateEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<InterestUpdateEvent>> {
    return phantom(InterestUpdateEvent.reified());
  }
  static get p() {
    return InterestUpdateEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("InterestUpdateEvent", {
      lending_market_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      coin_type: TypeName.bcs,
      reserve_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      cumulative_borrow_rate: Decimal.bcs,
      available_amount: bcs.u64(),
      borrowed_amount: Decimal.bcs,
      unclaimed_spread_fees: Decimal.bcs,
      ctoken_supply: bcs.u64(),
      borrow_interest_paid: Decimal.bcs,
      spread_fee: Decimal.bcs,
      supply_interest_earned: Decimal.bcs,
      borrow_interest_paid_usd_estimate: Decimal.bcs,
      protocol_fee_usd_estimate: Decimal.bcs,
      supply_interest_earned_usd_estimate: Decimal.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): InterestUpdateEvent {
    return InterestUpdateEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      cumulativeBorrowRate: decodeFromFields(
        Decimal.reified(),
        fields.cumulative_borrow_rate,
      ),
      availableAmount: decodeFromFields("u64", fields.available_amount),
      borrowedAmount: decodeFromFields(
        Decimal.reified(),
        fields.borrowed_amount,
      ),
      unclaimedSpreadFees: decodeFromFields(
        Decimal.reified(),
        fields.unclaimed_spread_fees,
      ),
      ctokenSupply: decodeFromFields("u64", fields.ctoken_supply),
      borrowInterestPaid: decodeFromFields(
        Decimal.reified(),
        fields.borrow_interest_paid,
      ),
      spreadFee: decodeFromFields(Decimal.reified(), fields.spread_fee),
      supplyInterestEarned: decodeFromFields(
        Decimal.reified(),
        fields.supply_interest_earned,
      ),
      borrowInterestPaidUsdEstimate: decodeFromFields(
        Decimal.reified(),
        fields.borrow_interest_paid_usd_estimate,
      ),
      protocolFeeUsdEstimate: decodeFromFields(
        Decimal.reified(),
        fields.protocol_fee_usd_estimate,
      ),
      supplyInterestEarnedUsdEstimate: decodeFromFields(
        Decimal.reified(),
        fields.supply_interest_earned_usd_estimate,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): InterestUpdateEvent {
    if (!isInterestUpdateEvent(item.type)) {
      throw new Error("not a InterestUpdateEvent type");
    }

    return InterestUpdateEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      cumulativeBorrowRate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.cumulative_borrow_rate,
      ),
      availableAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.available_amount,
      ),
      borrowedAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrowed_amount,
      ),
      unclaimedSpreadFees: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.unclaimed_spread_fees,
      ),
      ctokenSupply: decodeFromFieldsWithTypes("u64", item.fields.ctoken_supply),
      borrowInterestPaid: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrow_interest_paid,
      ),
      spreadFee: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.spread_fee,
      ),
      supplyInterestEarned: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.supply_interest_earned,
      ),
      borrowInterestPaidUsdEstimate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrow_interest_paid_usd_estimate,
      ),
      protocolFeeUsdEstimate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.protocol_fee_usd_estimate,
      ),
      supplyInterestEarnedUsdEstimate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.supply_interest_earned_usd_estimate,
      ),
    });
  }

  static fromBcs(data: Uint8Array): InterestUpdateEvent {
    return InterestUpdateEvent.fromFields(InterestUpdateEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      cumulativeBorrowRate: this.cumulativeBorrowRate.toJSONField(),
      availableAmount: this.availableAmount.toString(),
      borrowedAmount: this.borrowedAmount.toJSONField(),
      unclaimedSpreadFees: this.unclaimedSpreadFees.toJSONField(),
      ctokenSupply: this.ctokenSupply.toString(),
      borrowInterestPaid: this.borrowInterestPaid.toJSONField(),
      spreadFee: this.spreadFee.toJSONField(),
      supplyInterestEarned: this.supplyInterestEarned.toJSONField(),
      borrowInterestPaidUsdEstimate:
        this.borrowInterestPaidUsdEstimate.toJSONField(),
      protocolFeeUsdEstimate: this.protocolFeeUsdEstimate.toJSONField(),
      supplyInterestEarnedUsdEstimate:
        this.supplyInterestEarnedUsdEstimate.toJSONField(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): InterestUpdateEvent {
    return InterestUpdateEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      cumulativeBorrowRate: decodeFromJSONField(
        Decimal.reified(),
        field.cumulativeBorrowRate,
      ),
      availableAmount: decodeFromJSONField("u64", field.availableAmount),
      borrowedAmount: decodeFromJSONField(
        Decimal.reified(),
        field.borrowedAmount,
      ),
      unclaimedSpreadFees: decodeFromJSONField(
        Decimal.reified(),
        field.unclaimedSpreadFees,
      ),
      ctokenSupply: decodeFromJSONField("u64", field.ctokenSupply),
      borrowInterestPaid: decodeFromJSONField(
        Decimal.reified(),
        field.borrowInterestPaid,
      ),
      spreadFee: decodeFromJSONField(Decimal.reified(), field.spreadFee),
      supplyInterestEarned: decodeFromJSONField(
        Decimal.reified(),
        field.supplyInterestEarned,
      ),
      borrowInterestPaidUsdEstimate: decodeFromJSONField(
        Decimal.reified(),
        field.borrowInterestPaidUsdEstimate,
      ),
      protocolFeeUsdEstimate: decodeFromJSONField(
        Decimal.reified(),
        field.protocolFeeUsdEstimate,
      ),
      supplyInterestEarnedUsdEstimate: decodeFromJSONField(
        Decimal.reified(),
        field.supplyInterestEarnedUsdEstimate,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): InterestUpdateEvent {
    if (json.$typeName !== InterestUpdateEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return InterestUpdateEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): InterestUpdateEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isInterestUpdateEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a InterestUpdateEvent object`,
      );
    }
    return InterestUpdateEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): InterestUpdateEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isInterestUpdateEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a InterestUpdateEvent object`);
      }

      return InterestUpdateEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return InterestUpdateEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<InterestUpdateEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching InterestUpdateEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isInterestUpdateEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a InterestUpdateEvent object`);
    }

    return InterestUpdateEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== LiquidityRequest =============================== */

export function isLiquidityRequest(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V8}::reserve::LiquidityRequest` + "<");
}

export interface LiquidityRequestFields<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> {
  amount: ToField<"u64">;
  fee: ToField<"u64">;
}

export type LiquidityRequestReified<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> = Reified<LiquidityRequest<P, T>, LiquidityRequestFields<P, T>>;

export class LiquidityRequest<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V8}::reserve::LiquidityRequest`;
  static readonly $numTypeParams = 2;
  static readonly $isPhantom = [true, true] as const;

  readonly $typeName = LiquidityRequest.$typeName;
  readonly $fullTypeName: `${typeof PKG_V8}::reserve::LiquidityRequest<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>];
  readonly $isPhantom = LiquidityRequest.$isPhantom;

  readonly amount: ToField<"u64">;
  readonly fee: ToField<"u64">;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>],
    fields: LiquidityRequestFields<P, T>,
  ) {
    this.$fullTypeName = composeSuiType(
      LiquidityRequest.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V8}::reserve::LiquidityRequest<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
    this.$typeArgs = typeArgs;

    this.amount = fields.amount;
    this.fee = fields.fee;
  }

  static reified<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): LiquidityRequestReified<
    ToPhantomTypeArgument<P>,
    ToPhantomTypeArgument<T>
  > {
    return {
      typeName: LiquidityRequest.$typeName,
      fullTypeName: composeSuiType(
        LiquidityRequest.$typeName,
        ...[extractType(P), extractType(T)],
      ) as `${typeof PKG_V8}::reserve::LiquidityRequest<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}, ${PhantomToTypeStr<ToPhantomTypeArgument<T>>}>`,
      typeArgs: [extractType(P), extractType(T)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
        PhantomToTypeStr<ToPhantomTypeArgument<T>>,
      ],
      isPhantom: LiquidityRequest.$isPhantom,
      reifiedTypeArgs: [P, T],
      fromFields: (fields: Record<string, any>) =>
        LiquidityRequest.fromFields([P, T], fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LiquidityRequest.fromFieldsWithTypes([P, T], item),
      fromBcs: (data: Uint8Array) => LiquidityRequest.fromBcs([P, T], data),
      bcs: LiquidityRequest.bcs,
      fromJSONField: (field: any) =>
        LiquidityRequest.fromJSONField([P, T], field),
      fromJSON: (json: Record<string, any>) =>
        LiquidityRequest.fromJSON([P, T], json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LiquidityRequest.fromSuiParsedData([P, T], content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LiquidityRequest.fromSuiObjectData([P, T], content),
      fetch: async (client: SuiClient, id: string) =>
        LiquidityRequest.fetch(client, [P, T], id),
      new: (
        fields: LiquidityRequestFields<
          ToPhantomTypeArgument<P>,
          ToPhantomTypeArgument<T>
        >,
      ) => {
        return new LiquidityRequest([extractType(P), extractType(T)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LiquidityRequest.reified;
  }

  static phantom<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): PhantomReified<
    ToTypeStr<
      LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>
    >
  > {
    return phantom(LiquidityRequest.reified(P, T));
  }
  static get p() {
    return LiquidityRequest.phantom;
  }

  static get bcs() {
    return bcs.struct("LiquidityRequest", {
      amount: bcs.u64(),
      fee: bcs.u64(),
    });
  }

  static fromFields<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    fields: Record<string, any>,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return LiquidityRequest.reified(typeArgs[0], typeArgs[1]).new({
      amount: decodeFromFields("u64", fields.amount),
      fee: decodeFromFields("u64", fields.fee),
    });
  }

  static fromFieldsWithTypes<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    item: FieldsWithTypes,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (!isLiquidityRequest(item.type)) {
      throw new Error("not a LiquidityRequest type");
    }
    assertFieldsWithTypesArgsMatch(item, typeArgs);

    return LiquidityRequest.reified(typeArgs[0], typeArgs[1]).new({
      amount: decodeFromFieldsWithTypes("u64", item.fields.amount),
      fee: decodeFromFieldsWithTypes("u64", item.fields.fee),
    });
  }

  static fromBcs<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: Uint8Array,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return LiquidityRequest.fromFields(
      typeArgs,
      LiquidityRequest.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      amount: this.amount.toString(),
      fee: this.fee.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    field: any,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return LiquidityRequest.reified(typeArgs[0], typeArgs[1]).new({
      amount: decodeFromJSONField("u64", field.amount),
      fee: decodeFromJSONField("u64", field.fee),
    });
  }

  static fromJSON<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    json: Record<string, any>,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (json.$typeName !== LiquidityRequest.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(LiquidityRequest.$typeName, ...typeArgs.map(extractType)),
      json.$typeArgs,
      typeArgs,
    );

    return LiquidityRequest.fromJSONField(typeArgs, json);
  }

  static fromSuiParsedData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    content: SuiParsedData,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLiquidityRequest(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LiquidityRequest object`,
      );
    }
    return LiquidityRequest.fromFieldsWithTypes(typeArgs, content);
  }

  static fromSuiObjectData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: SuiObjectData,
  ): LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLiquidityRequest(data.bcs.type)
      ) {
        throw new Error(`object at is not a LiquidityRequest object`);
      }

      const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs;
      if (gotTypeArgs.length !== 2) {
        throw new Error(
          `type argument mismatch: expected 2 type arguments but got ${gotTypeArgs.length}`,
        );
      }
      for (let i = 0; i < 2; i++) {
        const gotTypeArg = compressSuiType(gotTypeArgs[i]);
        const expectedTypeArg = compressSuiType(extractType(typeArgs[i]));
        if (gotTypeArg !== expectedTypeArg) {
          throw new Error(
            `type argument mismatch at position ${i}: expected '${expectedTypeArg}' but got '${gotTypeArg}'`,
          );
        }
      }

      return LiquidityRequest.fromBcs(typeArgs, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LiquidityRequest.fromSuiParsedData(typeArgs, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    client: SuiClient,
    typeArgs: [P, T],
    id: string,
  ): Promise<
    LiquidityRequest<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>
  > {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LiquidityRequest object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLiquidityRequest(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a LiquidityRequest object`);
    }

    return LiquidityRequest.fromSuiObjectData(typeArgs, res.data);
  }
}

/* ============================== Reserve =============================== */

export function isReserve(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::reserve::Reserve` + "<");
}

export interface ReserveFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  lendingMarketId: ToField<ID>;
  arrayIndex: ToField<"u64">;
  coinType: ToField<TypeName>;
  config: ToField<Cell<ReserveConfig>>;
  mintDecimals: ToField<"u8">;
  priceIdentifier: ToField<PriceIdentifier>;
  price: ToField<Decimal>;
  smoothedPrice: ToField<Decimal>;
  priceLastUpdateTimestampS: ToField<"u64">;
  availableAmount: ToField<"u64">;
  ctokenSupply: ToField<"u64">;
  borrowedAmount: ToField<Decimal>;
  cumulativeBorrowRate: ToField<Decimal>;
  interestLastUpdateTimestampS: ToField<"u64">;
  unclaimedSpreadFees: ToField<Decimal>;
  attributedBorrowValue: ToField<Decimal>;
  depositsPoolRewardManager: ToField<PoolRewardManager>;
  borrowsPoolRewardManager: ToField<PoolRewardManager>;
}

export type ReserveReified<P extends PhantomTypeArgument> = Reified<
  Reserve<P>,
  ReserveFields<P>
>;

export class Reserve<P extends PhantomTypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::reserve::Reserve`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = Reserve.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::reserve::Reserve<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = Reserve.$isPhantom;

  readonly id: ToField<UID>;
  readonly lendingMarketId: ToField<ID>;
  readonly arrayIndex: ToField<"u64">;
  readonly coinType: ToField<TypeName>;
  readonly config: ToField<Cell<ReserveConfig>>;
  readonly mintDecimals: ToField<"u8">;
  readonly priceIdentifier: ToField<PriceIdentifier>;
  readonly price: ToField<Decimal>;
  readonly smoothedPrice: ToField<Decimal>;
  readonly priceLastUpdateTimestampS: ToField<"u64">;
  readonly availableAmount: ToField<"u64">;
  readonly ctokenSupply: ToField<"u64">;
  readonly borrowedAmount: ToField<Decimal>;
  readonly cumulativeBorrowRate: ToField<Decimal>;
  readonly interestLastUpdateTimestampS: ToField<"u64">;
  readonly unclaimedSpreadFees: ToField<Decimal>;
  readonly attributedBorrowValue: ToField<Decimal>;
  readonly depositsPoolRewardManager: ToField<PoolRewardManager>;
  readonly borrowsPoolRewardManager: ToField<PoolRewardManager>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: ReserveFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      Reserve.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::reserve::Reserve<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.lendingMarketId = fields.lendingMarketId;
    this.arrayIndex = fields.arrayIndex;
    this.coinType = fields.coinType;
    this.config = fields.config;
    this.mintDecimals = fields.mintDecimals;
    this.priceIdentifier = fields.priceIdentifier;
    this.price = fields.price;
    this.smoothedPrice = fields.smoothedPrice;
    this.priceLastUpdateTimestampS = fields.priceLastUpdateTimestampS;
    this.availableAmount = fields.availableAmount;
    this.ctokenSupply = fields.ctokenSupply;
    this.borrowedAmount = fields.borrowedAmount;
    this.cumulativeBorrowRate = fields.cumulativeBorrowRate;
    this.interestLastUpdateTimestampS = fields.interestLastUpdateTimestampS;
    this.unclaimedSpreadFees = fields.unclaimedSpreadFees;
    this.attributedBorrowValue = fields.attributedBorrowValue;
    this.depositsPoolRewardManager = fields.depositsPoolRewardManager;
    this.borrowsPoolRewardManager = fields.borrowsPoolRewardManager;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): ReserveReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: Reserve.$typeName,
      fullTypeName: composeSuiType(
        Reserve.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::reserve::Reserve<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: Reserve.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        Reserve.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Reserve.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => Reserve.fromBcs(P, data),
      bcs: Reserve.bcs,
      fromJSONField: (field: any) => Reserve.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) => Reserve.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Reserve.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Reserve.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        Reserve.fetch(client, P, id),
      new: (fields: ReserveFields<ToPhantomTypeArgument<P>>) => {
        return new Reserve([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Reserve.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<Reserve<ToPhantomTypeArgument<P>>>> {
    return phantom(Reserve.reified(P));
  }
  static get p() {
    return Reserve.phantom;
  }

  static get bcs() {
    return bcs.struct("Reserve", {
      id: UID.bcs,
      lending_market_id: ID.bcs,
      array_index: bcs.u64(),
      coin_type: TypeName.bcs,
      config: Cell.bcs(ReserveConfig.bcs),
      mint_decimals: bcs.u8(),
      price_identifier: PriceIdentifier.bcs,
      price: Decimal.bcs,
      smoothed_price: Decimal.bcs,
      price_last_update_timestamp_s: bcs.u64(),
      available_amount: bcs.u64(),
      ctoken_supply: bcs.u64(),
      borrowed_amount: Decimal.bcs,
      cumulative_borrow_rate: Decimal.bcs,
      interest_last_update_timestamp_s: bcs.u64(),
      unclaimed_spread_fees: Decimal.bcs,
      attributed_borrow_value: Decimal.bcs,
      deposits_pool_reward_manager: PoolRewardManager.bcs,
      borrows_pool_reward_manager: PoolRewardManager.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): Reserve<ToPhantomTypeArgument<P>> {
    return Reserve.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      lendingMarketId: decodeFromFields(ID.reified(), fields.lending_market_id),
      arrayIndex: decodeFromFields("u64", fields.array_index),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      config: decodeFromFields(
        Cell.reified(ReserveConfig.reified()),
        fields.config,
      ),
      mintDecimals: decodeFromFields("u8", fields.mint_decimals),
      priceIdentifier: decodeFromFields(
        PriceIdentifier.reified(),
        fields.price_identifier,
      ),
      price: decodeFromFields(Decimal.reified(), fields.price),
      smoothedPrice: decodeFromFields(Decimal.reified(), fields.smoothed_price),
      priceLastUpdateTimestampS: decodeFromFields(
        "u64",
        fields.price_last_update_timestamp_s,
      ),
      availableAmount: decodeFromFields("u64", fields.available_amount),
      ctokenSupply: decodeFromFields("u64", fields.ctoken_supply),
      borrowedAmount: decodeFromFields(
        Decimal.reified(),
        fields.borrowed_amount,
      ),
      cumulativeBorrowRate: decodeFromFields(
        Decimal.reified(),
        fields.cumulative_borrow_rate,
      ),
      interestLastUpdateTimestampS: decodeFromFields(
        "u64",
        fields.interest_last_update_timestamp_s,
      ),
      unclaimedSpreadFees: decodeFromFields(
        Decimal.reified(),
        fields.unclaimed_spread_fees,
      ),
      attributedBorrowValue: decodeFromFields(
        Decimal.reified(),
        fields.attributed_borrow_value,
      ),
      depositsPoolRewardManager: decodeFromFields(
        PoolRewardManager.reified(),
        fields.deposits_pool_reward_manager,
      ),
      borrowsPoolRewardManager: decodeFromFields(
        PoolRewardManager.reified(),
        fields.borrows_pool_reward_manager,
      ),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): Reserve<ToPhantomTypeArgument<P>> {
    if (!isReserve(item.type)) {
      throw new Error("not a Reserve type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return Reserve.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      lendingMarketId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.lending_market_id,
      ),
      arrayIndex: decodeFromFieldsWithTypes("u64", item.fields.array_index),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      config: decodeFromFieldsWithTypes(
        Cell.reified(ReserveConfig.reified()),
        item.fields.config,
      ),
      mintDecimals: decodeFromFieldsWithTypes("u8", item.fields.mint_decimals),
      priceIdentifier: decodeFromFieldsWithTypes(
        PriceIdentifier.reified(),
        item.fields.price_identifier,
      ),
      price: decodeFromFieldsWithTypes(Decimal.reified(), item.fields.price),
      smoothedPrice: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.smoothed_price,
      ),
      priceLastUpdateTimestampS: decodeFromFieldsWithTypes(
        "u64",
        item.fields.price_last_update_timestamp_s,
      ),
      availableAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.available_amount,
      ),
      ctokenSupply: decodeFromFieldsWithTypes("u64", item.fields.ctoken_supply),
      borrowedAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrowed_amount,
      ),
      cumulativeBorrowRate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.cumulative_borrow_rate,
      ),
      interestLastUpdateTimestampS: decodeFromFieldsWithTypes(
        "u64",
        item.fields.interest_last_update_timestamp_s,
      ),
      unclaimedSpreadFees: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.unclaimed_spread_fees,
      ),
      attributedBorrowValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.attributed_borrow_value,
      ),
      depositsPoolRewardManager: decodeFromFieldsWithTypes(
        PoolRewardManager.reified(),
        item.fields.deposits_pool_reward_manager,
      ),
      borrowsPoolRewardManager: decodeFromFieldsWithTypes(
        PoolRewardManager.reified(),
        item.fields.borrows_pool_reward_manager,
      ),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): Reserve<ToPhantomTypeArgument<P>> {
    return Reserve.fromFields(typeArg, Reserve.bcs.parse(data));
  }

  toJSONField() {
    return {
      id: this.id,
      lendingMarketId: this.lendingMarketId,
      arrayIndex: this.arrayIndex.toString(),
      coinType: this.coinType.toJSONField(),
      config: this.config.toJSONField(),
      mintDecimals: this.mintDecimals,
      priceIdentifier: this.priceIdentifier.toJSONField(),
      price: this.price.toJSONField(),
      smoothedPrice: this.smoothedPrice.toJSONField(),
      priceLastUpdateTimestampS: this.priceLastUpdateTimestampS.toString(),
      availableAmount: this.availableAmount.toString(),
      ctokenSupply: this.ctokenSupply.toString(),
      borrowedAmount: this.borrowedAmount.toJSONField(),
      cumulativeBorrowRate: this.cumulativeBorrowRate.toJSONField(),
      interestLastUpdateTimestampS:
        this.interestLastUpdateTimestampS.toString(),
      unclaimedSpreadFees: this.unclaimedSpreadFees.toJSONField(),
      attributedBorrowValue: this.attributedBorrowValue.toJSONField(),
      depositsPoolRewardManager: this.depositsPoolRewardManager.toJSONField(),
      borrowsPoolRewardManager: this.borrowsPoolRewardManager.toJSONField(),
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
  ): Reserve<ToPhantomTypeArgument<P>> {
    return Reserve.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      lendingMarketId: decodeFromJSONField(ID.reified(), field.lendingMarketId),
      arrayIndex: decodeFromJSONField("u64", field.arrayIndex),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      config: decodeFromJSONField(
        Cell.reified(ReserveConfig.reified()),
        field.config,
      ),
      mintDecimals: decodeFromJSONField("u8", field.mintDecimals),
      priceIdentifier: decodeFromJSONField(
        PriceIdentifier.reified(),
        field.priceIdentifier,
      ),
      price: decodeFromJSONField(Decimal.reified(), field.price),
      smoothedPrice: decodeFromJSONField(
        Decimal.reified(),
        field.smoothedPrice,
      ),
      priceLastUpdateTimestampS: decodeFromJSONField(
        "u64",
        field.priceLastUpdateTimestampS,
      ),
      availableAmount: decodeFromJSONField("u64", field.availableAmount),
      ctokenSupply: decodeFromJSONField("u64", field.ctokenSupply),
      borrowedAmount: decodeFromJSONField(
        Decimal.reified(),
        field.borrowedAmount,
      ),
      cumulativeBorrowRate: decodeFromJSONField(
        Decimal.reified(),
        field.cumulativeBorrowRate,
      ),
      interestLastUpdateTimestampS: decodeFromJSONField(
        "u64",
        field.interestLastUpdateTimestampS,
      ),
      unclaimedSpreadFees: decodeFromJSONField(
        Decimal.reified(),
        field.unclaimedSpreadFees,
      ),
      attributedBorrowValue: decodeFromJSONField(
        Decimal.reified(),
        field.attributedBorrowValue,
      ),
      depositsPoolRewardManager: decodeFromJSONField(
        PoolRewardManager.reified(),
        field.depositsPoolRewardManager,
      ),
      borrowsPoolRewardManager: decodeFromJSONField(
        PoolRewardManager.reified(),
        field.borrowsPoolRewardManager,
      ),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): Reserve<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== Reserve.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Reserve.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return Reserve.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): Reserve<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isReserve(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Reserve object`,
      );
    }
    return Reserve.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): Reserve<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isReserve(data.bcs.type)) {
        throw new Error(`object at is not a Reserve object`);
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

      return Reserve.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Reserve.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<Reserve<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Reserve object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isReserve(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Reserve object`);
    }

    return Reserve.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== ReserveAssetDataEvent =============================== */

export function isReserveAssetDataEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::reserve::ReserveAssetDataEvent`;
}

export interface ReserveAssetDataEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  availableAmount: ToField<Decimal>;
  supplyAmount: ToField<Decimal>;
  borrowedAmount: ToField<Decimal>;
  availableAmountUsdEstimate: ToField<Decimal>;
  supplyAmountUsdEstimate: ToField<Decimal>;
  borrowedAmountUsdEstimate: ToField<Decimal>;
  borrowApr: ToField<Decimal>;
  supplyApr: ToField<Decimal>;
  ctokenSupply: ToField<"u64">;
  cumulativeBorrowRate: ToField<Decimal>;
  price: ToField<Decimal>;
  smoothedPrice: ToField<Decimal>;
  priceLastUpdateTimestampS: ToField<"u64">;
}

export type ReserveAssetDataEventReified = Reified<
  ReserveAssetDataEvent,
  ReserveAssetDataEventFields
>;

export class ReserveAssetDataEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::reserve::ReserveAssetDataEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ReserveAssetDataEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::reserve::ReserveAssetDataEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = ReserveAssetDataEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly availableAmount: ToField<Decimal>;
  readonly supplyAmount: ToField<Decimal>;
  readonly borrowedAmount: ToField<Decimal>;
  readonly availableAmountUsdEstimate: ToField<Decimal>;
  readonly supplyAmountUsdEstimate: ToField<Decimal>;
  readonly borrowedAmountUsdEstimate: ToField<Decimal>;
  readonly borrowApr: ToField<Decimal>;
  readonly supplyApr: ToField<Decimal>;
  readonly ctokenSupply: ToField<"u64">;
  readonly cumulativeBorrowRate: ToField<Decimal>;
  readonly price: ToField<Decimal>;
  readonly smoothedPrice: ToField<Decimal>;
  readonly priceLastUpdateTimestampS: ToField<"u64">;

  private constructor(typeArgs: [], fields: ReserveAssetDataEventFields) {
    this.$fullTypeName = composeSuiType(
      ReserveAssetDataEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::reserve::ReserveAssetDataEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.availableAmount = fields.availableAmount;
    this.supplyAmount = fields.supplyAmount;
    this.borrowedAmount = fields.borrowedAmount;
    this.availableAmountUsdEstimate = fields.availableAmountUsdEstimate;
    this.supplyAmountUsdEstimate = fields.supplyAmountUsdEstimate;
    this.borrowedAmountUsdEstimate = fields.borrowedAmountUsdEstimate;
    this.borrowApr = fields.borrowApr;
    this.supplyApr = fields.supplyApr;
    this.ctokenSupply = fields.ctokenSupply;
    this.cumulativeBorrowRate = fields.cumulativeBorrowRate;
    this.price = fields.price;
    this.smoothedPrice = fields.smoothedPrice;
    this.priceLastUpdateTimestampS = fields.priceLastUpdateTimestampS;
  }

  static reified(): ReserveAssetDataEventReified {
    return {
      typeName: ReserveAssetDataEvent.$typeName,
      fullTypeName: composeSuiType(
        ReserveAssetDataEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::reserve::ReserveAssetDataEvent`,
      typeArgs: [] as [],
      isPhantom: ReserveAssetDataEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ReserveAssetDataEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ReserveAssetDataEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ReserveAssetDataEvent.fromBcs(data),
      bcs: ReserveAssetDataEvent.bcs,
      fromJSONField: (field: any) => ReserveAssetDataEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        ReserveAssetDataEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ReserveAssetDataEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ReserveAssetDataEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ReserveAssetDataEvent.fetch(client, id),
      new: (fields: ReserveAssetDataEventFields) => {
        return new ReserveAssetDataEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ReserveAssetDataEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ReserveAssetDataEvent>> {
    return phantom(ReserveAssetDataEvent.reified());
  }
  static get p() {
    return ReserveAssetDataEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("ReserveAssetDataEvent", {
      lending_market_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      coin_type: TypeName.bcs,
      reserve_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      available_amount: Decimal.bcs,
      supply_amount: Decimal.bcs,
      borrowed_amount: Decimal.bcs,
      available_amount_usd_estimate: Decimal.bcs,
      supply_amount_usd_estimate: Decimal.bcs,
      borrowed_amount_usd_estimate: Decimal.bcs,
      borrow_apr: Decimal.bcs,
      supply_apr: Decimal.bcs,
      ctoken_supply: bcs.u64(),
      cumulative_borrow_rate: Decimal.bcs,
      price: Decimal.bcs,
      smoothed_price: Decimal.bcs,
      price_last_update_timestamp_s: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): ReserveAssetDataEvent {
    return ReserveAssetDataEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      availableAmount: decodeFromFields(
        Decimal.reified(),
        fields.available_amount,
      ),
      supplyAmount: decodeFromFields(Decimal.reified(), fields.supply_amount),
      borrowedAmount: decodeFromFields(
        Decimal.reified(),
        fields.borrowed_amount,
      ),
      availableAmountUsdEstimate: decodeFromFields(
        Decimal.reified(),
        fields.available_amount_usd_estimate,
      ),
      supplyAmountUsdEstimate: decodeFromFields(
        Decimal.reified(),
        fields.supply_amount_usd_estimate,
      ),
      borrowedAmountUsdEstimate: decodeFromFields(
        Decimal.reified(),
        fields.borrowed_amount_usd_estimate,
      ),
      borrowApr: decodeFromFields(Decimal.reified(), fields.borrow_apr),
      supplyApr: decodeFromFields(Decimal.reified(), fields.supply_apr),
      ctokenSupply: decodeFromFields("u64", fields.ctoken_supply),
      cumulativeBorrowRate: decodeFromFields(
        Decimal.reified(),
        fields.cumulative_borrow_rate,
      ),
      price: decodeFromFields(Decimal.reified(), fields.price),
      smoothedPrice: decodeFromFields(Decimal.reified(), fields.smoothed_price),
      priceLastUpdateTimestampS: decodeFromFields(
        "u64",
        fields.price_last_update_timestamp_s,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ReserveAssetDataEvent {
    if (!isReserveAssetDataEvent(item.type)) {
      throw new Error("not a ReserveAssetDataEvent type");
    }

    return ReserveAssetDataEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      availableAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.available_amount,
      ),
      supplyAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.supply_amount,
      ),
      borrowedAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrowed_amount,
      ),
      availableAmountUsdEstimate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.available_amount_usd_estimate,
      ),
      supplyAmountUsdEstimate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.supply_amount_usd_estimate,
      ),
      borrowedAmountUsdEstimate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrowed_amount_usd_estimate,
      ),
      borrowApr: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrow_apr,
      ),
      supplyApr: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.supply_apr,
      ),
      ctokenSupply: decodeFromFieldsWithTypes("u64", item.fields.ctoken_supply),
      cumulativeBorrowRate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.cumulative_borrow_rate,
      ),
      price: decodeFromFieldsWithTypes(Decimal.reified(), item.fields.price),
      smoothedPrice: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.smoothed_price,
      ),
      priceLastUpdateTimestampS: decodeFromFieldsWithTypes(
        "u64",
        item.fields.price_last_update_timestamp_s,
      ),
    });
  }

  static fromBcs(data: Uint8Array): ReserveAssetDataEvent {
    return ReserveAssetDataEvent.fromFields(
      ReserveAssetDataEvent.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      availableAmount: this.availableAmount.toJSONField(),
      supplyAmount: this.supplyAmount.toJSONField(),
      borrowedAmount: this.borrowedAmount.toJSONField(),
      availableAmountUsdEstimate: this.availableAmountUsdEstimate.toJSONField(),
      supplyAmountUsdEstimate: this.supplyAmountUsdEstimate.toJSONField(),
      borrowedAmountUsdEstimate: this.borrowedAmountUsdEstimate.toJSONField(),
      borrowApr: this.borrowApr.toJSONField(),
      supplyApr: this.supplyApr.toJSONField(),
      ctokenSupply: this.ctokenSupply.toString(),
      cumulativeBorrowRate: this.cumulativeBorrowRate.toJSONField(),
      price: this.price.toJSONField(),
      smoothedPrice: this.smoothedPrice.toJSONField(),
      priceLastUpdateTimestampS: this.priceLastUpdateTimestampS.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): ReserveAssetDataEvent {
    return ReserveAssetDataEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      availableAmount: decodeFromJSONField(
        Decimal.reified(),
        field.availableAmount,
      ),
      supplyAmount: decodeFromJSONField(Decimal.reified(), field.supplyAmount),
      borrowedAmount: decodeFromJSONField(
        Decimal.reified(),
        field.borrowedAmount,
      ),
      availableAmountUsdEstimate: decodeFromJSONField(
        Decimal.reified(),
        field.availableAmountUsdEstimate,
      ),
      supplyAmountUsdEstimate: decodeFromJSONField(
        Decimal.reified(),
        field.supplyAmountUsdEstimate,
      ),
      borrowedAmountUsdEstimate: decodeFromJSONField(
        Decimal.reified(),
        field.borrowedAmountUsdEstimate,
      ),
      borrowApr: decodeFromJSONField(Decimal.reified(), field.borrowApr),
      supplyApr: decodeFromJSONField(Decimal.reified(), field.supplyApr),
      ctokenSupply: decodeFromJSONField("u64", field.ctokenSupply),
      cumulativeBorrowRate: decodeFromJSONField(
        Decimal.reified(),
        field.cumulativeBorrowRate,
      ),
      price: decodeFromJSONField(Decimal.reified(), field.price),
      smoothedPrice: decodeFromJSONField(
        Decimal.reified(),
        field.smoothedPrice,
      ),
      priceLastUpdateTimestampS: decodeFromJSONField(
        "u64",
        field.priceLastUpdateTimestampS,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): ReserveAssetDataEvent {
    if (json.$typeName !== ReserveAssetDataEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ReserveAssetDataEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ReserveAssetDataEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isReserveAssetDataEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ReserveAssetDataEvent object`,
      );
    }
    return ReserveAssetDataEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ReserveAssetDataEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isReserveAssetDataEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a ReserveAssetDataEvent object`);
      }

      return ReserveAssetDataEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ReserveAssetDataEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<ReserveAssetDataEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ReserveAssetDataEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isReserveAssetDataEvent(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a ReserveAssetDataEvent object`,
      );
    }

    return ReserveAssetDataEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== StakerKey =============================== */

export function isStakerKey(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V8}::reserve::StakerKey`;
}

export interface StakerKeyFields {
  dummyField: ToField<"bool">;
}

export type StakerKeyReified = Reified<StakerKey, StakerKeyFields>;

export class StakerKey implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V8}::reserve::StakerKey`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = StakerKey.$typeName;
  readonly $fullTypeName: `${typeof PKG_V8}::reserve::StakerKey`;
  readonly $typeArgs: [];
  readonly $isPhantom = StakerKey.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: StakerKeyFields) {
    this.$fullTypeName = composeSuiType(
      StakerKey.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V8}::reserve::StakerKey`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): StakerKeyReified {
    return {
      typeName: StakerKey.$typeName,
      fullTypeName: composeSuiType(
        StakerKey.$typeName,
        ...[],
      ) as `${typeof PKG_V8}::reserve::StakerKey`,
      typeArgs: [] as [],
      isPhantom: StakerKey.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => StakerKey.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        StakerKey.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => StakerKey.fromBcs(data),
      bcs: StakerKey.bcs,
      fromJSONField: (field: any) => StakerKey.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => StakerKey.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        StakerKey.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        StakerKey.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        StakerKey.fetch(client, id),
      new: (fields: StakerKeyFields) => {
        return new StakerKey([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return StakerKey.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<StakerKey>> {
    return phantom(StakerKey.reified());
  }
  static get p() {
    return StakerKey.phantom();
  }

  static get bcs() {
    return bcs.struct("StakerKey", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): StakerKey {
    return StakerKey.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): StakerKey {
    if (!isStakerKey(item.type)) {
      throw new Error("not a StakerKey type");
    }

    return StakerKey.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): StakerKey {
    return StakerKey.fromFields(StakerKey.bcs.parse(data));
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

  static fromJSONField(field: any): StakerKey {
    return StakerKey.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): StakerKey {
    if (json.$typeName !== StakerKey.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return StakerKey.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): StakerKey {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isStakerKey(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a StakerKey object`,
      );
    }
    return StakerKey.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): StakerKey {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isStakerKey(data.bcs.type)) {
        throw new Error(`object at is not a StakerKey object`);
      }

      return StakerKey.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return StakerKey.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<StakerKey> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching StakerKey object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isStakerKey(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a StakerKey object`);
    }

    return StakerKey.fromSuiObjectData(res.data);
  }
}
