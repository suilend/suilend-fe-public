import * as reified from "../../_framework/reified";
import { TypeName } from "../../_dependencies/source/0x1/type-name/structs";
import { ObjectTable } from "../../_dependencies/source/0x2/object-table/structs";
import { ID, UID } from "../../_dependencies/source/0x2/object/structs";
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
  fieldToJSON,
  phantom,
  ToTypeStr as ToPhantom,
} from "../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
  parseTypeName,
} from "../../_framework/util";
import { Vector } from "../../_framework/vector";
import { Decimal } from "../decimal/structs";
import { PKG_V1 } from "../index";
import { Obligation } from "../obligation/structs";
import { RateLimiter } from "../rate-limiter/structs";
import { Reserve } from "../reserve/structs";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== MintEvent =============================== */

export function isMintEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::MintEvent`;
}

export interface MintEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  liquidityAmount: ToField<"u64">;
  ctokenAmount: ToField<"u64">;
}

export type MintEventReified = Reified<MintEvent, MintEventFields>;

export class MintEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::MintEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = MintEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::MintEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = MintEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly liquidityAmount: ToField<"u64">;
  readonly ctokenAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: MintEventFields) {
    this.$fullTypeName = composeSuiType(
      MintEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::MintEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.liquidityAmount = fields.liquidityAmount;
    this.ctokenAmount = fields.ctokenAmount;
  }

  static reified(): MintEventReified {
    return {
      typeName: MintEvent.$typeName,
      fullTypeName: composeSuiType(
        MintEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::MintEvent`,
      typeArgs: [] as [],
      isPhantom: MintEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => MintEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        MintEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => MintEvent.fromBcs(data),
      bcs: MintEvent.bcs,
      fromJSONField: (field: any) => MintEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => MintEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        MintEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        MintEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        MintEvent.fetch(client, id),
      new: (fields: MintEventFields) => {
        return new MintEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return MintEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<MintEvent>> {
    return phantom(MintEvent.reified());
  }
  static get p() {
    return MintEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("MintEvent", {
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
      liquidity_amount: bcs.u64(),
      ctoken_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): MintEvent {
    return MintEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      liquidityAmount: decodeFromFields("u64", fields.liquidity_amount),
      ctokenAmount: decodeFromFields("u64", fields.ctoken_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): MintEvent {
    if (!isMintEvent(item.type)) {
      throw new Error("not a MintEvent type");
    }

    return MintEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      liquidityAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidity_amount,
      ),
      ctokenAmount: decodeFromFieldsWithTypes("u64", item.fields.ctoken_amount),
    });
  }

  static fromBcs(data: Uint8Array): MintEvent {
    return MintEvent.fromFields(MintEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      liquidityAmount: this.liquidityAmount.toString(),
      ctokenAmount: this.ctokenAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): MintEvent {
    return MintEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      liquidityAmount: decodeFromJSONField("u64", field.liquidityAmount),
      ctokenAmount: decodeFromJSONField("u64", field.ctokenAmount),
    });
  }

  static fromJSON(json: Record<string, any>): MintEvent {
    if (json.$typeName !== MintEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return MintEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): MintEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isMintEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a MintEvent object`,
      );
    }
    return MintEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): MintEvent {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isMintEvent(data.bcs.type)) {
        throw new Error(`object at is not a MintEvent object`);
      }

      return MintEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return MintEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<MintEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching MintEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isMintEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a MintEvent object`);
    }

    return MintEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== RedeemEvent =============================== */

export function isRedeemEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::RedeemEvent`;
}

export interface RedeemEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  ctokenAmount: ToField<"u64">;
  liquidityAmount: ToField<"u64">;
}

export type RedeemEventReified = Reified<RedeemEvent, RedeemEventFields>;

export class RedeemEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::RedeemEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = RedeemEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::RedeemEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = RedeemEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly ctokenAmount: ToField<"u64">;
  readonly liquidityAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: RedeemEventFields) {
    this.$fullTypeName = composeSuiType(
      RedeemEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::RedeemEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.ctokenAmount = fields.ctokenAmount;
    this.liquidityAmount = fields.liquidityAmount;
  }

  static reified(): RedeemEventReified {
    return {
      typeName: RedeemEvent.$typeName,
      fullTypeName: composeSuiType(
        RedeemEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::RedeemEvent`,
      typeArgs: [] as [],
      isPhantom: RedeemEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        RedeemEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        RedeemEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => RedeemEvent.fromBcs(data),
      bcs: RedeemEvent.bcs,
      fromJSONField: (field: any) => RedeemEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => RedeemEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        RedeemEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        RedeemEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        RedeemEvent.fetch(client, id),
      new: (fields: RedeemEventFields) => {
        return new RedeemEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return RedeemEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<RedeemEvent>> {
    return phantom(RedeemEvent.reified());
  }
  static get p() {
    return RedeemEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("RedeemEvent", {
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
      ctoken_amount: bcs.u64(),
      liquidity_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): RedeemEvent {
    return RedeemEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      ctokenAmount: decodeFromFields("u64", fields.ctoken_amount),
      liquidityAmount: decodeFromFields("u64", fields.liquidity_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): RedeemEvent {
    if (!isRedeemEvent(item.type)) {
      throw new Error("not a RedeemEvent type");
    }

    return RedeemEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      ctokenAmount: decodeFromFieldsWithTypes("u64", item.fields.ctoken_amount),
      liquidityAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidity_amount,
      ),
    });
  }

  static fromBcs(data: Uint8Array): RedeemEvent {
    return RedeemEvent.fromFields(RedeemEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      ctokenAmount: this.ctokenAmount.toString(),
      liquidityAmount: this.liquidityAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): RedeemEvent {
    return RedeemEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      ctokenAmount: decodeFromJSONField("u64", field.ctokenAmount),
      liquidityAmount: decodeFromJSONField("u64", field.liquidityAmount),
    });
  }

  static fromJSON(json: Record<string, any>): RedeemEvent {
    if (json.$typeName !== RedeemEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return RedeemEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): RedeemEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isRedeemEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a RedeemEvent object`,
      );
    }
    return RedeemEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): RedeemEvent {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isRedeemEvent(data.bcs.type)) {
        throw new Error(`object at is not a RedeemEvent object`);
      }

      return RedeemEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return RedeemEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<RedeemEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching RedeemEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isRedeemEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a RedeemEvent object`);
    }

    return RedeemEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== BorrowEvent =============================== */

export function isBorrowEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::BorrowEvent`;
}

export interface BorrowEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  obligationId: ToField<"address">;
  liquidityAmount: ToField<"u64">;
  originationFeeAmount: ToField<"u64">;
}

export type BorrowEventReified = Reified<BorrowEvent, BorrowEventFields>;

export class BorrowEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::BorrowEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = BorrowEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::BorrowEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = BorrowEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly liquidityAmount: ToField<"u64">;
  readonly originationFeeAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: BorrowEventFields) {
    this.$fullTypeName = composeSuiType(
      BorrowEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::BorrowEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.obligationId = fields.obligationId;
    this.liquidityAmount = fields.liquidityAmount;
    this.originationFeeAmount = fields.originationFeeAmount;
  }

  static reified(): BorrowEventReified {
    return {
      typeName: BorrowEvent.$typeName,
      fullTypeName: composeSuiType(
        BorrowEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::BorrowEvent`,
      typeArgs: [] as [],
      isPhantom: BorrowEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        BorrowEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        BorrowEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => BorrowEvent.fromBcs(data),
      bcs: BorrowEvent.bcs,
      fromJSONField: (field: any) => BorrowEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => BorrowEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        BorrowEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        BorrowEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        BorrowEvent.fetch(client, id),
      new: (fields: BorrowEventFields) => {
        return new BorrowEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return BorrowEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<BorrowEvent>> {
    return phantom(BorrowEvent.reified());
  }
  static get p() {
    return BorrowEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("BorrowEvent", {
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
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      liquidity_amount: bcs.u64(),
      origination_fee_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): BorrowEvent {
    return BorrowEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      liquidityAmount: decodeFromFields("u64", fields.liquidity_amount),
      originationFeeAmount: decodeFromFields(
        "u64",
        fields.origination_fee_amount,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): BorrowEvent {
    if (!isBorrowEvent(item.type)) {
      throw new Error("not a BorrowEvent type");
    }

    return BorrowEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      liquidityAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidity_amount,
      ),
      originationFeeAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.origination_fee_amount,
      ),
    });
  }

  static fromBcs(data: Uint8Array): BorrowEvent {
    return BorrowEvent.fromFields(BorrowEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      obligationId: this.obligationId,
      liquidityAmount: this.liquidityAmount.toString(),
      originationFeeAmount: this.originationFeeAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): BorrowEvent {
    return BorrowEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      liquidityAmount: decodeFromJSONField("u64", field.liquidityAmount),
      originationFeeAmount: decodeFromJSONField(
        "u64",
        field.originationFeeAmount,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): BorrowEvent {
    if (json.$typeName !== BorrowEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return BorrowEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): BorrowEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isBorrowEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a BorrowEvent object`,
      );
    }
    return BorrowEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): BorrowEvent {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isBorrowEvent(data.bcs.type)) {
        throw new Error(`object at is not a BorrowEvent object`);
      }

      return BorrowEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return BorrowEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<BorrowEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching BorrowEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isBorrowEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a BorrowEvent object`);
    }

    return BorrowEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== ClaimRewardEvent =============================== */

export function isClaimRewardEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::ClaimRewardEvent`;
}

export interface ClaimRewardEventFields {
  lendingMarketId: ToField<"address">;
  reserveId: ToField<"address">;
  obligationId: ToField<"address">;
  isDepositReward: ToField<"bool">;
  poolRewardId: ToField<"address">;
  coinType: ToField<TypeName>;
  liquidityAmount: ToField<"u64">;
}

export type ClaimRewardEventReified = Reified<
  ClaimRewardEvent,
  ClaimRewardEventFields
>;

export class ClaimRewardEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::ClaimRewardEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ClaimRewardEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::ClaimRewardEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = ClaimRewardEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly reserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly isDepositReward: ToField<"bool">;
  readonly poolRewardId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly liquidityAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: ClaimRewardEventFields) {
    this.$fullTypeName = composeSuiType(
      ClaimRewardEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::ClaimRewardEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.reserveId = fields.reserveId;
    this.obligationId = fields.obligationId;
    this.isDepositReward = fields.isDepositReward;
    this.poolRewardId = fields.poolRewardId;
    this.coinType = fields.coinType;
    this.liquidityAmount = fields.liquidityAmount;
  }

  static reified(): ClaimRewardEventReified {
    return {
      typeName: ClaimRewardEvent.$typeName,
      fullTypeName: composeSuiType(
        ClaimRewardEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::ClaimRewardEvent`,
      typeArgs: [] as [],
      isPhantom: ClaimRewardEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ClaimRewardEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ClaimRewardEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ClaimRewardEvent.fromBcs(data),
      bcs: ClaimRewardEvent.bcs,
      fromJSONField: (field: any) => ClaimRewardEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => ClaimRewardEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ClaimRewardEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ClaimRewardEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ClaimRewardEvent.fetch(client, id),
      new: (fields: ClaimRewardEventFields) => {
        return new ClaimRewardEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ClaimRewardEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ClaimRewardEvent>> {
    return phantom(ClaimRewardEvent.reified());
  }
  static get p() {
    return ClaimRewardEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("ClaimRewardEvent", {
      lending_market_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      reserve_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      is_deposit_reward: bcs.bool(),
      pool_reward_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      coin_type: TypeName.bcs,
      liquidity_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): ClaimRewardEvent {
    return ClaimRewardEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      reserveId: decodeFromFields("address", fields.reserve_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      isDepositReward: decodeFromFields("bool", fields.is_deposit_reward),
      poolRewardId: decodeFromFields("address", fields.pool_reward_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      liquidityAmount: decodeFromFields("u64", fields.liquidity_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ClaimRewardEvent {
    if (!isClaimRewardEvent(item.type)) {
      throw new Error("not a ClaimRewardEvent type");
    }

    return ClaimRewardEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      isDepositReward: decodeFromFieldsWithTypes(
        "bool",
        item.fields.is_deposit_reward,
      ),
      poolRewardId: decodeFromFieldsWithTypes(
        "address",
        item.fields.pool_reward_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      liquidityAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidity_amount,
      ),
    });
  }

  static fromBcs(data: Uint8Array): ClaimRewardEvent {
    return ClaimRewardEvent.fromFields(ClaimRewardEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      reserveId: this.reserveId,
      obligationId: this.obligationId,
      isDepositReward: this.isDepositReward,
      poolRewardId: this.poolRewardId,
      coinType: this.coinType.toJSONField(),
      liquidityAmount: this.liquidityAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): ClaimRewardEvent {
    return ClaimRewardEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      reserveId: decodeFromJSONField("address", field.reserveId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      isDepositReward: decodeFromJSONField("bool", field.isDepositReward),
      poolRewardId: decodeFromJSONField("address", field.poolRewardId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      liquidityAmount: decodeFromJSONField("u64", field.liquidityAmount),
    });
  }

  static fromJSON(json: Record<string, any>): ClaimRewardEvent {
    if (json.$typeName !== ClaimRewardEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ClaimRewardEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ClaimRewardEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isClaimRewardEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ClaimRewardEvent object`,
      );
    }
    return ClaimRewardEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ClaimRewardEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isClaimRewardEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a ClaimRewardEvent object`);
      }

      return ClaimRewardEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ClaimRewardEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<ClaimRewardEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ClaimRewardEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isClaimRewardEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a ClaimRewardEvent object`);
    }

    return ClaimRewardEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== DepositEvent =============================== */

export function isDepositEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::DepositEvent`;
}

export interface DepositEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  obligationId: ToField<"address">;
  ctokenAmount: ToField<"u64">;
}

export type DepositEventReified = Reified<DepositEvent, DepositEventFields>;

export class DepositEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::DepositEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = DepositEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::DepositEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = DepositEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly ctokenAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: DepositEventFields) {
    this.$fullTypeName = composeSuiType(
      DepositEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::DepositEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.obligationId = fields.obligationId;
    this.ctokenAmount = fields.ctokenAmount;
  }

  static reified(): DepositEventReified {
    return {
      typeName: DepositEvent.$typeName,
      fullTypeName: composeSuiType(
        DepositEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::DepositEvent`,
      typeArgs: [] as [],
      isPhantom: DepositEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        DepositEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        DepositEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => DepositEvent.fromBcs(data),
      bcs: DepositEvent.bcs,
      fromJSONField: (field: any) => DepositEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => DepositEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        DepositEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        DepositEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        DepositEvent.fetch(client, id),
      new: (fields: DepositEventFields) => {
        return new DepositEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return DepositEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<DepositEvent>> {
    return phantom(DepositEvent.reified());
  }
  static get p() {
    return DepositEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("DepositEvent", {
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
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      ctoken_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): DepositEvent {
    return DepositEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      ctokenAmount: decodeFromFields("u64", fields.ctoken_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): DepositEvent {
    if (!isDepositEvent(item.type)) {
      throw new Error("not a DepositEvent type");
    }

    return DepositEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      ctokenAmount: decodeFromFieldsWithTypes("u64", item.fields.ctoken_amount),
    });
  }

  static fromBcs(data: Uint8Array): DepositEvent {
    return DepositEvent.fromFields(DepositEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      obligationId: this.obligationId,
      ctokenAmount: this.ctokenAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): DepositEvent {
    return DepositEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      ctokenAmount: decodeFromJSONField("u64", field.ctokenAmount),
    });
  }

  static fromJSON(json: Record<string, any>): DepositEvent {
    if (json.$typeName !== DepositEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return DepositEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): DepositEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isDepositEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a DepositEvent object`,
      );
    }
    return DepositEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): DepositEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isDepositEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a DepositEvent object`);
      }

      return DepositEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return DepositEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<DepositEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching DepositEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isDepositEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a DepositEvent object`);
    }

    return DepositEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== ForgiveEvent =============================== */

export function isForgiveEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::ForgiveEvent`;
}

export interface ForgiveEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  obligationId: ToField<"address">;
  liquidityAmount: ToField<"u64">;
}

export type ForgiveEventReified = Reified<ForgiveEvent, ForgiveEventFields>;

export class ForgiveEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::ForgiveEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ForgiveEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::ForgiveEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = ForgiveEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly liquidityAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: ForgiveEventFields) {
    this.$fullTypeName = composeSuiType(
      ForgiveEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::ForgiveEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.obligationId = fields.obligationId;
    this.liquidityAmount = fields.liquidityAmount;
  }

  static reified(): ForgiveEventReified {
    return {
      typeName: ForgiveEvent.$typeName,
      fullTypeName: composeSuiType(
        ForgiveEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::ForgiveEvent`,
      typeArgs: [] as [],
      isPhantom: ForgiveEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ForgiveEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ForgiveEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ForgiveEvent.fromBcs(data),
      bcs: ForgiveEvent.bcs,
      fromJSONField: (field: any) => ForgiveEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => ForgiveEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ForgiveEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ForgiveEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ForgiveEvent.fetch(client, id),
      new: (fields: ForgiveEventFields) => {
        return new ForgiveEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ForgiveEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ForgiveEvent>> {
    return phantom(ForgiveEvent.reified());
  }
  static get p() {
    return ForgiveEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("ForgiveEvent", {
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
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      liquidity_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): ForgiveEvent {
    return ForgiveEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      liquidityAmount: decodeFromFields("u64", fields.liquidity_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ForgiveEvent {
    if (!isForgiveEvent(item.type)) {
      throw new Error("not a ForgiveEvent type");
    }

    return ForgiveEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      liquidityAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidity_amount,
      ),
    });
  }

  static fromBcs(data: Uint8Array): ForgiveEvent {
    return ForgiveEvent.fromFields(ForgiveEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      obligationId: this.obligationId,
      liquidityAmount: this.liquidityAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): ForgiveEvent {
    return ForgiveEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      liquidityAmount: decodeFromJSONField("u64", field.liquidityAmount),
    });
  }

  static fromJSON(json: Record<string, any>): ForgiveEvent {
    if (json.$typeName !== ForgiveEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ForgiveEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ForgiveEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isForgiveEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ForgiveEvent object`,
      );
    }
    return ForgiveEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ForgiveEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isForgiveEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a ForgiveEvent object`);
      }

      return ForgiveEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ForgiveEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<ForgiveEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ForgiveEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isForgiveEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a ForgiveEvent object`);
    }

    return ForgiveEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== LENDING_MARKET =============================== */

export function isLENDING_MARKET(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::LENDING_MARKET`;
}

export interface LENDING_MARKETFields {
  dummyField: ToField<"bool">;
}

export type LENDING_MARKETReified = Reified<
  LENDING_MARKET,
  LENDING_MARKETFields
>;

export class LENDING_MARKET implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::LENDING_MARKET`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = LENDING_MARKET.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::LENDING_MARKET`;
  readonly $typeArgs: [];
  readonly $isPhantom = LENDING_MARKET.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: LENDING_MARKETFields) {
    this.$fullTypeName = composeSuiType(
      LENDING_MARKET.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::LENDING_MARKET`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): LENDING_MARKETReified {
    return {
      typeName: LENDING_MARKET.$typeName,
      fullTypeName: composeSuiType(
        LENDING_MARKET.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::LENDING_MARKET`,
      typeArgs: [] as [],
      isPhantom: LENDING_MARKET.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        LENDING_MARKET.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LENDING_MARKET.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => LENDING_MARKET.fromBcs(data),
      bcs: LENDING_MARKET.bcs,
      fromJSONField: (field: any) => LENDING_MARKET.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => LENDING_MARKET.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LENDING_MARKET.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LENDING_MARKET.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        LENDING_MARKET.fetch(client, id),
      new: (fields: LENDING_MARKETFields) => {
        return new LENDING_MARKET([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LENDING_MARKET.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<LENDING_MARKET>> {
    return phantom(LENDING_MARKET.reified());
  }
  static get p() {
    return LENDING_MARKET.phantom();
  }

  static get bcs() {
    return bcs.struct("LENDING_MARKET", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): LENDING_MARKET {
    return LENDING_MARKET.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): LENDING_MARKET {
    if (!isLENDING_MARKET(item.type)) {
      throw new Error("not a LENDING_MARKET type");
    }

    return LENDING_MARKET.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): LENDING_MARKET {
    return LENDING_MARKET.fromFields(LENDING_MARKET.bcs.parse(data));
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

  static fromJSONField(field: any): LENDING_MARKET {
    return LENDING_MARKET.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): LENDING_MARKET {
    if (json.$typeName !== LENDING_MARKET.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return LENDING_MARKET.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): LENDING_MARKET {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLENDING_MARKET(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LENDING_MARKET object`,
      );
    }
    return LENDING_MARKET.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): LENDING_MARKET {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLENDING_MARKET(data.bcs.type)
      ) {
        throw new Error(`object at is not a LENDING_MARKET object`);
      }

      return LENDING_MARKET.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LENDING_MARKET.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<LENDING_MARKET> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LENDING_MARKET object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLENDING_MARKET(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a LENDING_MARKET object`);
    }

    return LENDING_MARKET.fromSuiObjectData(res.data);
  }
}

/* ============================== LendingMarket =============================== */

export function isLendingMarket(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::lending_market::LendingMarket` + "<");
}

export interface LendingMarketFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  version: ToField<"u64">;
  reserves: ToField<Vector<Reserve<P>>>;
  obligations: ToField<ObjectTable<ToPhantom<ID>, ToPhantom<Obligation<P>>>>;
  rateLimiter: ToField<RateLimiter>;
  feeReceiver: ToField<"address">;
  badDebtUsd: ToField<Decimal>;
  badDebtLimitUsd: ToField<Decimal>;
}

export type LendingMarketReified<P extends PhantomTypeArgument> = Reified<
  LendingMarket<P>,
  LendingMarketFields<P>
>;

export class LendingMarket<P extends PhantomTypeArgument>
  implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::LendingMarket`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = LendingMarket.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::LendingMarket<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = LendingMarket.$isPhantom;

  readonly id: ToField<UID>;
  readonly version: ToField<"u64">;
  readonly reserves: ToField<Vector<Reserve<P>>>;
  readonly obligations: ToField<
    ObjectTable<ToPhantom<ID>, ToPhantom<Obligation<P>>>
  >;
  readonly rateLimiter: ToField<RateLimiter>;
  readonly feeReceiver: ToField<"address">;
  readonly badDebtUsd: ToField<Decimal>;
  readonly badDebtLimitUsd: ToField<Decimal>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: LendingMarketFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      LendingMarket.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::LendingMarket<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.version = fields.version;
    this.reserves = fields.reserves;
    this.obligations = fields.obligations;
    this.rateLimiter = fields.rateLimiter;
    this.feeReceiver = fields.feeReceiver;
    this.badDebtUsd = fields.badDebtUsd;
    this.badDebtLimitUsd = fields.badDebtLimitUsd;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): LendingMarketReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: LendingMarket.$typeName,
      fullTypeName: composeSuiType(
        LendingMarket.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::lending_market::LendingMarket<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: LendingMarket.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        LendingMarket.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LendingMarket.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => LendingMarket.fromBcs(P, data),
      bcs: LendingMarket.bcs,
      fromJSONField: (field: any) => LendingMarket.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) => LendingMarket.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LendingMarket.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LendingMarket.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        LendingMarket.fetch(client, P, id),
      new: (fields: LendingMarketFields<ToPhantomTypeArgument<P>>) => {
        return new LendingMarket([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LendingMarket.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<LendingMarket<ToPhantomTypeArgument<P>>>> {
    return phantom(LendingMarket.reified(P));
  }
  static get p() {
    return LendingMarket.phantom;
  }

  static get bcs() {
    return bcs.struct("LendingMarket", {
      id: UID.bcs,
      version: bcs.u64(),
      reserves: bcs.vector(Reserve.bcs),
      obligations: ObjectTable.bcs,
      rate_limiter: RateLimiter.bcs,
      fee_receiver: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      bad_debt_usd: Decimal.bcs,
      bad_debt_limit_usd: Decimal.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    return LendingMarket.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      version: decodeFromFields("u64", fields.version),
      reserves: decodeFromFields(
        reified.vector(Reserve.reified(typeArg)),
        fields.reserves,
      ),
      obligations: decodeFromFields(
        ObjectTable.reified(
          reified.phantom(ID.reified()),
          reified.phantom(Obligation.reified(typeArg)),
        ),
        fields.obligations,
      ),
      rateLimiter: decodeFromFields(RateLimiter.reified(), fields.rate_limiter),
      feeReceiver: decodeFromFields("address", fields.fee_receiver),
      badDebtUsd: decodeFromFields(Decimal.reified(), fields.bad_debt_usd),
      badDebtLimitUsd: decodeFromFields(
        Decimal.reified(),
        fields.bad_debt_limit_usd,
      ),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    if (!isLendingMarket(item.type)) {
      throw new Error("not a LendingMarket type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return LendingMarket.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      version: decodeFromFieldsWithTypes("u64", item.fields.version),
      reserves: decodeFromFieldsWithTypes(
        reified.vector(Reserve.reified(typeArg)),
        item.fields.reserves,
      ),
      obligations: decodeFromFieldsWithTypes(
        ObjectTable.reified(
          reified.phantom(ID.reified()),
          reified.phantom(Obligation.reified(typeArg)),
        ),
        item.fields.obligations,
      ),
      rateLimiter: decodeFromFieldsWithTypes(
        RateLimiter.reified(),
        item.fields.rate_limiter,
      ),
      feeReceiver: decodeFromFieldsWithTypes(
        "address",
        item.fields.fee_receiver,
      ),
      badDebtUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.bad_debt_usd,
      ),
      badDebtLimitUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.bad_debt_limit_usd,
      ),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    return LendingMarket.fromFields(typeArg, LendingMarket.bcs.parse(data));
  }

  toJSONField() {
    return {
      id: this.id,
      version: this.version.toString(),
      reserves: fieldToJSON<Vector<Reserve<P>>>(
        `vector<${Reserve.$typeName}<${this.$typeArgs[0]}>>`,
        this.reserves,
      ),
      obligations: this.obligations.toJSONField(),
      rateLimiter: this.rateLimiter.toJSONField(),
      feeReceiver: this.feeReceiver,
      badDebtUsd: this.badDebtUsd.toJSONField(),
      badDebtLimitUsd: this.badDebtLimitUsd.toJSONField(),
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
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    return LendingMarket.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      version: decodeFromJSONField("u64", field.version),
      reserves: decodeFromJSONField(
        reified.vector(Reserve.reified(typeArg)),
        field.reserves,
      ),
      obligations: decodeFromJSONField(
        ObjectTable.reified(
          reified.phantom(ID.reified()),
          reified.phantom(Obligation.reified(typeArg)),
        ),
        field.obligations,
      ),
      rateLimiter: decodeFromJSONField(
        RateLimiter.reified(),
        field.rateLimiter,
      ),
      feeReceiver: decodeFromJSONField("address", field.feeReceiver),
      badDebtUsd: decodeFromJSONField(Decimal.reified(), field.badDebtUsd),
      badDebtLimitUsd: decodeFromJSONField(
        Decimal.reified(),
        field.badDebtLimitUsd,
      ),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== LendingMarket.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(LendingMarket.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return LendingMarket.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLendingMarket(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LendingMarket object`,
      );
    }
    return LendingMarket.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): LendingMarket<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLendingMarket(data.bcs.type)
      ) {
        throw new Error(`object at is not a LendingMarket object`);
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

      return LendingMarket.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LendingMarket.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<LendingMarket<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LendingMarket object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLendingMarket(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a LendingMarket object`);
    }

    return LendingMarket.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== LendingMarketOwnerCap =============================== */

export function isLendingMarketOwnerCap(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(
    `${PKG_V1}::lending_market::LendingMarketOwnerCap` + "<",
  );
}

export interface LendingMarketOwnerCapFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  lendingMarketId: ToField<ID>;
}

export type LendingMarketOwnerCapReified<P extends PhantomTypeArgument> =
  Reified<LendingMarketOwnerCap<P>, LendingMarketOwnerCapFields<P>>;

export class LendingMarketOwnerCap<P extends PhantomTypeArgument>
  implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::LendingMarketOwnerCap`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = LendingMarketOwnerCap.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::LendingMarketOwnerCap<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = LendingMarketOwnerCap.$isPhantom;

  readonly id: ToField<UID>;
  readonly lendingMarketId: ToField<ID>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: LendingMarketOwnerCapFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      LendingMarketOwnerCap.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::LendingMarketOwnerCap<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.lendingMarketId = fields.lendingMarketId;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): LendingMarketOwnerCapReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: LendingMarketOwnerCap.$typeName,
      fullTypeName: composeSuiType(
        LendingMarketOwnerCap.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::lending_market::LendingMarketOwnerCap<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: LendingMarketOwnerCap.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        LendingMarketOwnerCap.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LendingMarketOwnerCap.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => LendingMarketOwnerCap.fromBcs(P, data),
      bcs: LendingMarketOwnerCap.bcs,
      fromJSONField: (field: any) =>
        LendingMarketOwnerCap.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) =>
        LendingMarketOwnerCap.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LendingMarketOwnerCap.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LendingMarketOwnerCap.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        LendingMarketOwnerCap.fetch(client, P, id),
      new: (fields: LendingMarketOwnerCapFields<ToPhantomTypeArgument<P>>) => {
        return new LendingMarketOwnerCap([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LendingMarketOwnerCap.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<
    ToTypeStr<LendingMarketOwnerCap<ToPhantomTypeArgument<P>>>
  > {
    return phantom(LendingMarketOwnerCap.reified(P));
  }
  static get p() {
    return LendingMarketOwnerCap.phantom;
  }

  static get bcs() {
    return bcs.struct("LendingMarketOwnerCap", {
      id: UID.bcs,
      lending_market_id: ID.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    return LendingMarketOwnerCap.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      lendingMarketId: decodeFromFields(ID.reified(), fields.lending_market_id),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    if (!isLendingMarketOwnerCap(item.type)) {
      throw new Error("not a LendingMarketOwnerCap type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return LendingMarketOwnerCap.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      lendingMarketId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.lending_market_id,
      ),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    return LendingMarketOwnerCap.fromFields(
      typeArg,
      LendingMarketOwnerCap.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      id: this.id,
      lendingMarketId: this.lendingMarketId,
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
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    return LendingMarketOwnerCap.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      lendingMarketId: decodeFromJSONField(ID.reified(), field.lendingMarketId),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== LendingMarketOwnerCap.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(LendingMarketOwnerCap.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return LendingMarketOwnerCap.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLendingMarketOwnerCap(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LendingMarketOwnerCap object`,
      );
    }
    return LendingMarketOwnerCap.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): LendingMarketOwnerCap<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLendingMarketOwnerCap(data.bcs.type)
      ) {
        throw new Error(`object at is not a LendingMarketOwnerCap object`);
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

      return LendingMarketOwnerCap.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LendingMarketOwnerCap.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<LendingMarketOwnerCap<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LendingMarketOwnerCap object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLendingMarketOwnerCap(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a LendingMarketOwnerCap object`,
      );
    }

    return LendingMarketOwnerCap.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== LiquidateEvent =============================== */

export function isLiquidateEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::LiquidateEvent`;
}

export interface LiquidateEventFields {
  lendingMarketId: ToField<"address">;
  repayReserveId: ToField<"address">;
  withdrawReserveId: ToField<"address">;
  obligationId: ToField<"address">;
  repayCoinType: ToField<TypeName>;
  withdrawCoinType: ToField<TypeName>;
  repayAmount: ToField<"u64">;
  withdrawAmount: ToField<"u64">;
  protocolFeeAmount: ToField<"u64">;
  liquidatorBonusAmount: ToField<"u64">;
}

export type LiquidateEventReified = Reified<
  LiquidateEvent,
  LiquidateEventFields
>;

export class LiquidateEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::LiquidateEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = LiquidateEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::LiquidateEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = LiquidateEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly repayReserveId: ToField<"address">;
  readonly withdrawReserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly repayCoinType: ToField<TypeName>;
  readonly withdrawCoinType: ToField<TypeName>;
  readonly repayAmount: ToField<"u64">;
  readonly withdrawAmount: ToField<"u64">;
  readonly protocolFeeAmount: ToField<"u64">;
  readonly liquidatorBonusAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: LiquidateEventFields) {
    this.$fullTypeName = composeSuiType(
      LiquidateEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::LiquidateEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.repayReserveId = fields.repayReserveId;
    this.withdrawReserveId = fields.withdrawReserveId;
    this.obligationId = fields.obligationId;
    this.repayCoinType = fields.repayCoinType;
    this.withdrawCoinType = fields.withdrawCoinType;
    this.repayAmount = fields.repayAmount;
    this.withdrawAmount = fields.withdrawAmount;
    this.protocolFeeAmount = fields.protocolFeeAmount;
    this.liquidatorBonusAmount = fields.liquidatorBonusAmount;
  }

  static reified(): LiquidateEventReified {
    return {
      typeName: LiquidateEvent.$typeName,
      fullTypeName: composeSuiType(
        LiquidateEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::LiquidateEvent`,
      typeArgs: [] as [],
      isPhantom: LiquidateEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        LiquidateEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LiquidateEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => LiquidateEvent.fromBcs(data),
      bcs: LiquidateEvent.bcs,
      fromJSONField: (field: any) => LiquidateEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => LiquidateEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LiquidateEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LiquidateEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        LiquidateEvent.fetch(client, id),
      new: (fields: LiquidateEventFields) => {
        return new LiquidateEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LiquidateEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<LiquidateEvent>> {
    return phantom(LiquidateEvent.reified());
  }
  static get p() {
    return LiquidateEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("LiquidateEvent", {
      lending_market_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      repay_reserve_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      withdraw_reserve_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      repay_coin_type: TypeName.bcs,
      withdraw_coin_type: TypeName.bcs,
      repay_amount: bcs.u64(),
      withdraw_amount: bcs.u64(),
      protocol_fee_amount: bcs.u64(),
      liquidator_bonus_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): LiquidateEvent {
    return LiquidateEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      repayReserveId: decodeFromFields("address", fields.repay_reserve_id),
      withdrawReserveId: decodeFromFields(
        "address",
        fields.withdraw_reserve_id,
      ),
      obligationId: decodeFromFields("address", fields.obligation_id),
      repayCoinType: decodeFromFields(
        TypeName.reified(),
        fields.repay_coin_type,
      ),
      withdrawCoinType: decodeFromFields(
        TypeName.reified(),
        fields.withdraw_coin_type,
      ),
      repayAmount: decodeFromFields("u64", fields.repay_amount),
      withdrawAmount: decodeFromFields("u64", fields.withdraw_amount),
      protocolFeeAmount: decodeFromFields("u64", fields.protocol_fee_amount),
      liquidatorBonusAmount: decodeFromFields(
        "u64",
        fields.liquidator_bonus_amount,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): LiquidateEvent {
    if (!isLiquidateEvent(item.type)) {
      throw new Error("not a LiquidateEvent type");
    }

    return LiquidateEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      repayReserveId: decodeFromFieldsWithTypes(
        "address",
        item.fields.repay_reserve_id,
      ),
      withdrawReserveId: decodeFromFieldsWithTypes(
        "address",
        item.fields.withdraw_reserve_id,
      ),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      repayCoinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.repay_coin_type,
      ),
      withdrawCoinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.withdraw_coin_type,
      ),
      repayAmount: decodeFromFieldsWithTypes("u64", item.fields.repay_amount),
      withdrawAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.withdraw_amount,
      ),
      protocolFeeAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.protocol_fee_amount,
      ),
      liquidatorBonusAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidator_bonus_amount,
      ),
    });
  }

  static fromBcs(data: Uint8Array): LiquidateEvent {
    return LiquidateEvent.fromFields(LiquidateEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      repayReserveId: this.repayReserveId,
      withdrawReserveId: this.withdrawReserveId,
      obligationId: this.obligationId,
      repayCoinType: this.repayCoinType.toJSONField(),
      withdrawCoinType: this.withdrawCoinType.toJSONField(),
      repayAmount: this.repayAmount.toString(),
      withdrawAmount: this.withdrawAmount.toString(),
      protocolFeeAmount: this.protocolFeeAmount.toString(),
      liquidatorBonusAmount: this.liquidatorBonusAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): LiquidateEvent {
    return LiquidateEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      repayReserveId: decodeFromJSONField("address", field.repayReserveId),
      withdrawReserveId: decodeFromJSONField(
        "address",
        field.withdrawReserveId,
      ),
      obligationId: decodeFromJSONField("address", field.obligationId),
      repayCoinType: decodeFromJSONField(
        TypeName.reified(),
        field.repayCoinType,
      ),
      withdrawCoinType: decodeFromJSONField(
        TypeName.reified(),
        field.withdrawCoinType,
      ),
      repayAmount: decodeFromJSONField("u64", field.repayAmount),
      withdrawAmount: decodeFromJSONField("u64", field.withdrawAmount),
      protocolFeeAmount: decodeFromJSONField("u64", field.protocolFeeAmount),
      liquidatorBonusAmount: decodeFromJSONField(
        "u64",
        field.liquidatorBonusAmount,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): LiquidateEvent {
    if (json.$typeName !== LiquidateEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return LiquidateEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): LiquidateEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLiquidateEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LiquidateEvent object`,
      );
    }
    return LiquidateEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): LiquidateEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLiquidateEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a LiquidateEvent object`);
      }

      return LiquidateEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LiquidateEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<LiquidateEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LiquidateEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLiquidateEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a LiquidateEvent object`);
    }

    return LiquidateEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== ObligationOwnerCap =============================== */

export function isObligationOwnerCap(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::lending_market::ObligationOwnerCap` + "<");
}

export interface ObligationOwnerCapFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  obligationId: ToField<ID>;
}

export type ObligationOwnerCapReified<P extends PhantomTypeArgument> = Reified<
  ObligationOwnerCap<P>,
  ObligationOwnerCapFields<P>
>;

export class ObligationOwnerCap<P extends PhantomTypeArgument>
  implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::ObligationOwnerCap`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = ObligationOwnerCap.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::ObligationOwnerCap<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = ObligationOwnerCap.$isPhantom;

  readonly id: ToField<UID>;
  readonly obligationId: ToField<ID>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: ObligationOwnerCapFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      ObligationOwnerCap.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::ObligationOwnerCap<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.obligationId = fields.obligationId;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): ObligationOwnerCapReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: ObligationOwnerCap.$typeName,
      fullTypeName: composeSuiType(
        ObligationOwnerCap.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::lending_market::ObligationOwnerCap<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: ObligationOwnerCap.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        ObligationOwnerCap.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ObligationOwnerCap.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => ObligationOwnerCap.fromBcs(P, data),
      bcs: ObligationOwnerCap.bcs,
      fromJSONField: (field: any) => ObligationOwnerCap.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) =>
        ObligationOwnerCap.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ObligationOwnerCap.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ObligationOwnerCap.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        ObligationOwnerCap.fetch(client, P, id),
      new: (fields: ObligationOwnerCapFields<ToPhantomTypeArgument<P>>) => {
        return new ObligationOwnerCap([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ObligationOwnerCap.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<ObligationOwnerCap<ToPhantomTypeArgument<P>>>> {
    return phantom(ObligationOwnerCap.reified(P));
  }
  static get p() {
    return ObligationOwnerCap.phantom;
  }

  static get bcs() {
    return bcs.struct("ObligationOwnerCap", {
      id: UID.bcs,
      obligation_id: ID.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    return ObligationOwnerCap.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      obligationId: decodeFromFields(ID.reified(), fields.obligation_id),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    if (!isObligationOwnerCap(item.type)) {
      throw new Error("not a ObligationOwnerCap type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return ObligationOwnerCap.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      obligationId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.obligation_id,
      ),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    return ObligationOwnerCap.fromFields(
      typeArg,
      ObligationOwnerCap.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      id: this.id,
      obligationId: this.obligationId,
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
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    return ObligationOwnerCap.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      obligationId: decodeFromJSONField(ID.reified(), field.obligationId),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== ObligationOwnerCap.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(ObligationOwnerCap.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return ObligationOwnerCap.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isObligationOwnerCap(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ObligationOwnerCap object`,
      );
    }
    return ObligationOwnerCap.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): ObligationOwnerCap<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isObligationOwnerCap(data.bcs.type)
      ) {
        throw new Error(`object at is not a ObligationOwnerCap object`);
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

      return ObligationOwnerCap.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ObligationOwnerCap.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<ObligationOwnerCap<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ObligationOwnerCap object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isObligationOwnerCap(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a ObligationOwnerCap object`);
    }

    return ObligationOwnerCap.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== RateLimiterExemption =============================== */

export function isRateLimiterExemption(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(
    `${PKG_V1}::lending_market::RateLimiterExemption` + "<",
  );
}

export interface RateLimiterExemptionFields<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> {
  amount: ToField<"u64">;
}

export type RateLimiterExemptionReified<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> = Reified<RateLimiterExemption<P, T>, RateLimiterExemptionFields<P, T>>;

export class RateLimiterExemption<
  P extends PhantomTypeArgument,
  T extends PhantomTypeArgument,
> implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::RateLimiterExemption`;
  static readonly $numTypeParams = 2;
  static readonly $isPhantom = [true, true] as const;

  readonly $typeName = RateLimiterExemption.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::RateLimiterExemption<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>];
  readonly $isPhantom = RateLimiterExemption.$isPhantom;

  readonly amount: ToField<"u64">;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>, PhantomToTypeStr<T>],
    fields: RateLimiterExemptionFields<P, T>,
  ) {
    this.$fullTypeName = composeSuiType(
      RateLimiterExemption.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::RateLimiterExemption<${PhantomToTypeStr<P>}, ${PhantomToTypeStr<T>}>`;
    this.$typeArgs = typeArgs;

    this.amount = fields.amount;
  }

  static reified<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): RateLimiterExemptionReified<
    ToPhantomTypeArgument<P>,
    ToPhantomTypeArgument<T>
  > {
    return {
      typeName: RateLimiterExemption.$typeName,
      fullTypeName: composeSuiType(
        RateLimiterExemption.$typeName,
        ...[extractType(P), extractType(T)],
      ) as `${typeof PKG_V1}::lending_market::RateLimiterExemption<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}, ${PhantomToTypeStr<ToPhantomTypeArgument<T>>}>`,
      typeArgs: [extractType(P), extractType(T)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
        PhantomToTypeStr<ToPhantomTypeArgument<T>>,
      ],
      isPhantom: RateLimiterExemption.$isPhantom,
      reifiedTypeArgs: [P, T],
      fromFields: (fields: Record<string, any>) =>
        RateLimiterExemption.fromFields([P, T], fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        RateLimiterExemption.fromFieldsWithTypes([P, T], item),
      fromBcs: (data: Uint8Array) => RateLimiterExemption.fromBcs([P, T], data),
      bcs: RateLimiterExemption.bcs,
      fromJSONField: (field: any) =>
        RateLimiterExemption.fromJSONField([P, T], field),
      fromJSON: (json: Record<string, any>) =>
        RateLimiterExemption.fromJSON([P, T], json),
      fromSuiParsedData: (content: SuiParsedData) =>
        RateLimiterExemption.fromSuiParsedData([P, T], content),
      fromSuiObjectData: (content: SuiObjectData) =>
        RateLimiterExemption.fromSuiObjectData([P, T], content),
      fetch: async (client: SuiClient, id: string) =>
        RateLimiterExemption.fetch(client, [P, T], id),
      new: (
        fields: RateLimiterExemptionFields<
          ToPhantomTypeArgument<P>,
          ToPhantomTypeArgument<T>
        >,
      ) => {
        return new RateLimiterExemption(
          [extractType(P), extractType(T)],
          fields,
        );
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return RateLimiterExemption.reified;
  }

  static phantom<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    P: P,
    T: T,
  ): PhantomReified<
    ToTypeStr<
      RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>
    >
  > {
    return phantom(RateLimiterExemption.reified(P, T));
  }
  static get p() {
    return RateLimiterExemption.phantom;
  }

  static get bcs() {
    return bcs.struct("RateLimiterExemption", {
      amount: bcs.u64(),
    });
  }

  static fromFields<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    fields: Record<string, any>,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return RateLimiterExemption.reified(typeArgs[0], typeArgs[1]).new({
      amount: decodeFromFields("u64", fields.amount),
    });
  }

  static fromFieldsWithTypes<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    item: FieldsWithTypes,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (!isRateLimiterExemption(item.type)) {
      throw new Error("not a RateLimiterExemption type");
    }
    assertFieldsWithTypesArgsMatch(item, typeArgs);

    return RateLimiterExemption.reified(typeArgs[0], typeArgs[1]).new({
      amount: decodeFromFieldsWithTypes("u64", item.fields.amount),
    });
  }

  static fromBcs<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: Uint8Array,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return RateLimiterExemption.fromFields(
      typeArgs,
      RateLimiterExemption.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
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

  static fromJSONField<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    field: any,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    return RateLimiterExemption.reified(typeArgs[0], typeArgs[1]).new({
      amount: decodeFromJSONField("u64", field.amount),
    });
  }

  static fromJSON<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    json: Record<string, any>,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (json.$typeName !== RateLimiterExemption.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(
        RateLimiterExemption.$typeName,
        ...typeArgs.map(extractType),
      ),
      json.$typeArgs,
      typeArgs,
    );

    return RateLimiterExemption.fromJSONField(typeArgs, json);
  }

  static fromSuiParsedData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    content: SuiParsedData,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isRateLimiterExemption(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a RateLimiterExemption object`,
      );
    }
    return RateLimiterExemption.fromFieldsWithTypes(typeArgs, content);
  }

  static fromSuiObjectData<
    P extends PhantomReified<PhantomTypeArgument>,
    T extends PhantomReified<PhantomTypeArgument>,
  >(
    typeArgs: [P, T],
    data: SuiObjectData,
  ): RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isRateLimiterExemption(data.bcs.type)
      ) {
        throw new Error(`object at is not a RateLimiterExemption object`);
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

      return RateLimiterExemption.fromBcs(typeArgs, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return RateLimiterExemption.fromSuiParsedData(typeArgs, data.content);
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
    RateLimiterExemption<ToPhantomTypeArgument<P>, ToPhantomTypeArgument<T>>
  > {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching RateLimiterExemption object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isRateLimiterExemption(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a RateLimiterExemption object`,
      );
    }

    return RateLimiterExemption.fromSuiObjectData(typeArgs, res.data);
  }
}

/* ============================== RepayEvent =============================== */

export function isRepayEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::RepayEvent`;
}

export interface RepayEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  obligationId: ToField<"address">;
  liquidityAmount: ToField<"u64">;
}

export type RepayEventReified = Reified<RepayEvent, RepayEventFields>;

export class RepayEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::RepayEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = RepayEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::RepayEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = RepayEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly liquidityAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: RepayEventFields) {
    this.$fullTypeName = composeSuiType(
      RepayEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::RepayEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.obligationId = fields.obligationId;
    this.liquidityAmount = fields.liquidityAmount;
  }

  static reified(): RepayEventReified {
    return {
      typeName: RepayEvent.$typeName,
      fullTypeName: composeSuiType(
        RepayEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::RepayEvent`,
      typeArgs: [] as [],
      isPhantom: RepayEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        RepayEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        RepayEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => RepayEvent.fromBcs(data),
      bcs: RepayEvent.bcs,
      fromJSONField: (field: any) => RepayEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => RepayEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        RepayEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        RepayEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        RepayEvent.fetch(client, id),
      new: (fields: RepayEventFields) => {
        return new RepayEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return RepayEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<RepayEvent>> {
    return phantom(RepayEvent.reified());
  }
  static get p() {
    return RepayEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("RepayEvent", {
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
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      liquidity_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): RepayEvent {
    return RepayEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      liquidityAmount: decodeFromFields("u64", fields.liquidity_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): RepayEvent {
    if (!isRepayEvent(item.type)) {
      throw new Error("not a RepayEvent type");
    }

    return RepayEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      liquidityAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.liquidity_amount,
      ),
    });
  }

  static fromBcs(data: Uint8Array): RepayEvent {
    return RepayEvent.fromFields(RepayEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      obligationId: this.obligationId,
      liquidityAmount: this.liquidityAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): RepayEvent {
    return RepayEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      liquidityAmount: decodeFromJSONField("u64", field.liquidityAmount),
    });
  }

  static fromJSON(json: Record<string, any>): RepayEvent {
    if (json.$typeName !== RepayEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return RepayEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): RepayEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isRepayEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a RepayEvent object`,
      );
    }
    return RepayEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): RepayEvent {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isRepayEvent(data.bcs.type)) {
        throw new Error(`object at is not a RepayEvent object`);
      }

      return RepayEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return RepayEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<RepayEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching RepayEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isRepayEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a RepayEvent object`);
    }

    return RepayEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== WithdrawEvent =============================== */

export function isWithdrawEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::lending_market::WithdrawEvent`;
}

export interface WithdrawEventFields {
  lendingMarketId: ToField<"address">;
  coinType: ToField<TypeName>;
  reserveId: ToField<"address">;
  obligationId: ToField<"address">;
  ctokenAmount: ToField<"u64">;
}

export type WithdrawEventReified = Reified<WithdrawEvent, WithdrawEventFields>;

export class WithdrawEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::lending_market::WithdrawEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = WithdrawEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::lending_market::WithdrawEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = WithdrawEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly coinType: ToField<TypeName>;
  readonly reserveId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly ctokenAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: WithdrawEventFields) {
    this.$fullTypeName = composeSuiType(
      WithdrawEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::lending_market::WithdrawEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.coinType = fields.coinType;
    this.reserveId = fields.reserveId;
    this.obligationId = fields.obligationId;
    this.ctokenAmount = fields.ctokenAmount;
  }

  static reified(): WithdrawEventReified {
    return {
      typeName: WithdrawEvent.$typeName,
      fullTypeName: composeSuiType(
        WithdrawEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::lending_market::WithdrawEvent`,
      typeArgs: [] as [],
      isPhantom: WithdrawEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        WithdrawEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        WithdrawEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => WithdrawEvent.fromBcs(data),
      bcs: WithdrawEvent.bcs,
      fromJSONField: (field: any) => WithdrawEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => WithdrawEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        WithdrawEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        WithdrawEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        WithdrawEvent.fetch(client, id),
      new: (fields: WithdrawEventFields) => {
        return new WithdrawEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return WithdrawEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<WithdrawEvent>> {
    return phantom(WithdrawEvent.reified());
  }
  static get p() {
    return WithdrawEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("WithdrawEvent", {
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
      obligation_id: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      ctoken_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): WithdrawEvent {
    return WithdrawEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveId: decodeFromFields("address", fields.reserve_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      ctokenAmount: decodeFromFields("u64", fields.ctoken_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): WithdrawEvent {
    if (!isWithdrawEvent(item.type)) {
      throw new Error("not a WithdrawEvent type");
    }

    return WithdrawEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveId: decodeFromFieldsWithTypes("address", item.fields.reserve_id),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      ctokenAmount: decodeFromFieldsWithTypes("u64", item.fields.ctoken_amount),
    });
  }

  static fromBcs(data: Uint8Array): WithdrawEvent {
    return WithdrawEvent.fromFields(WithdrawEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      coinType: this.coinType.toJSONField(),
      reserveId: this.reserveId,
      obligationId: this.obligationId,
      ctokenAmount: this.ctokenAmount.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): WithdrawEvent {
    return WithdrawEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveId: decodeFromJSONField("address", field.reserveId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      ctokenAmount: decodeFromJSONField("u64", field.ctokenAmount),
    });
  }

  static fromJSON(json: Record<string, any>): WithdrawEvent {
    if (json.$typeName !== WithdrawEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return WithdrawEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): WithdrawEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isWithdrawEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a WithdrawEvent object`,
      );
    }
    return WithdrawEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): WithdrawEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isWithdrawEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a WithdrawEvent object`);
      }

      return WithdrawEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return WithdrawEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<WithdrawEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching WithdrawEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isWithdrawEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a WithdrawEvent object`);
    }

    return WithdrawEvent.fromSuiObjectData(res.data);
  }
}
