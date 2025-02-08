import * as reified from "../../_framework/reified";
import { TypeName } from "../../_dependencies/source/0x1/type-name/structs";
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
} from "../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
  parseTypeName,
} from "../../_framework/util";
import { Vector } from "../../_framework/vector";
import { Decimal } from "../decimal/structs";
import { PKG_V1, PKG_V11 } from "../index";
import { UserRewardManager } from "../liquidity-mining/structs";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== Borrow =============================== */

export function isBorrow(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::obligation::Borrow`;
}

export interface BorrowFields {
  coinType: ToField<TypeName>;
  reserveArrayIndex: ToField<"u64">;
  borrowedAmount: ToField<Decimal>;
  cumulativeBorrowRate: ToField<Decimal>;
  marketValue: ToField<Decimal>;
  userRewardManagerIndex: ToField<"u64">;
}

export type BorrowReified = Reified<Borrow, BorrowFields>;

export class Borrow implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::obligation::Borrow`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = Borrow.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::obligation::Borrow`;
  readonly $typeArgs: [];
  readonly $isPhantom = Borrow.$isPhantom;

  readonly coinType: ToField<TypeName>;
  readonly reserveArrayIndex: ToField<"u64">;
  readonly borrowedAmount: ToField<Decimal>;
  readonly cumulativeBorrowRate: ToField<Decimal>;
  readonly marketValue: ToField<Decimal>;
  readonly userRewardManagerIndex: ToField<"u64">;

  private constructor(typeArgs: [], fields: BorrowFields) {
    this.$fullTypeName = composeSuiType(
      Borrow.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::obligation::Borrow`;
    this.$typeArgs = typeArgs;

    this.coinType = fields.coinType;
    this.reserveArrayIndex = fields.reserveArrayIndex;
    this.borrowedAmount = fields.borrowedAmount;
    this.cumulativeBorrowRate = fields.cumulativeBorrowRate;
    this.marketValue = fields.marketValue;
    this.userRewardManagerIndex = fields.userRewardManagerIndex;
  }

  static reified(): BorrowReified {
    return {
      typeName: Borrow.$typeName,
      fullTypeName: composeSuiType(
        Borrow.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::obligation::Borrow`,
      typeArgs: [] as [],
      isPhantom: Borrow.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => Borrow.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Borrow.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => Borrow.fromBcs(data),
      bcs: Borrow.bcs,
      fromJSONField: (field: any) => Borrow.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => Borrow.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Borrow.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Borrow.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => Borrow.fetch(client, id),
      new: (fields: BorrowFields) => {
        return new Borrow([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Borrow.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<Borrow>> {
    return phantom(Borrow.reified());
  }
  static get p() {
    return Borrow.phantom();
  }

  static get bcs() {
    return bcs.struct("Borrow", {
      coin_type: TypeName.bcs,
      reserve_array_index: bcs.u64(),
      borrowed_amount: Decimal.bcs,
      cumulative_borrow_rate: Decimal.bcs,
      market_value: Decimal.bcs,
      user_reward_manager_index: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): Borrow {
    return Borrow.reified().new({
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveArrayIndex: decodeFromFields("u64", fields.reserve_array_index),
      borrowedAmount: decodeFromFields(
        Decimal.reified(),
        fields.borrowed_amount,
      ),
      cumulativeBorrowRate: decodeFromFields(
        Decimal.reified(),
        fields.cumulative_borrow_rate,
      ),
      marketValue: decodeFromFields(Decimal.reified(), fields.market_value),
      userRewardManagerIndex: decodeFromFields(
        "u64",
        fields.user_reward_manager_index,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): Borrow {
    if (!isBorrow(item.type)) {
      throw new Error("not a Borrow type");
    }

    return Borrow.reified().new({
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveArrayIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reserve_array_index,
      ),
      borrowedAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrowed_amount,
      ),
      cumulativeBorrowRate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.cumulative_borrow_rate,
      ),
      marketValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.market_value,
      ),
      userRewardManagerIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.user_reward_manager_index,
      ),
    });
  }

  static fromBcs(data: Uint8Array): Borrow {
    return Borrow.fromFields(Borrow.bcs.parse(data));
  }

  toJSONField() {
    return {
      coinType: this.coinType.toJSONField(),
      reserveArrayIndex: this.reserveArrayIndex.toString(),
      borrowedAmount: this.borrowedAmount.toJSONField(),
      cumulativeBorrowRate: this.cumulativeBorrowRate.toJSONField(),
      marketValue: this.marketValue.toJSONField(),
      userRewardManagerIndex: this.userRewardManagerIndex.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): Borrow {
    return Borrow.reified().new({
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveArrayIndex: decodeFromJSONField("u64", field.reserveArrayIndex),
      borrowedAmount: decodeFromJSONField(
        Decimal.reified(),
        field.borrowedAmount,
      ),
      cumulativeBorrowRate: decodeFromJSONField(
        Decimal.reified(),
        field.cumulativeBorrowRate,
      ),
      marketValue: decodeFromJSONField(Decimal.reified(), field.marketValue),
      userRewardManagerIndex: decodeFromJSONField(
        "u64",
        field.userRewardManagerIndex,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): Borrow {
    if (json.$typeName !== Borrow.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return Borrow.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): Borrow {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isBorrow(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Borrow object`,
      );
    }
    return Borrow.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): Borrow {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isBorrow(data.bcs.type)) {
        throw new Error(`object at is not a Borrow object`);
      }

      return Borrow.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Borrow.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<Borrow> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Borrow object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isBorrow(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Borrow object`);
    }

    return Borrow.fromSuiObjectData(res.data);
  }
}

/* ============================== BorrowRecord =============================== */

export function isBorrowRecord(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::obligation::BorrowRecord`;
}

export interface BorrowRecordFields {
  coinType: ToField<TypeName>;
  reserveArrayIndex: ToField<"u64">;
  borrowedAmount: ToField<Decimal>;
  cumulativeBorrowRate: ToField<Decimal>;
  marketValue: ToField<Decimal>;
  userRewardManagerIndex: ToField<"u64">;
}

export type BorrowRecordReified = Reified<BorrowRecord, BorrowRecordFields>;

export class BorrowRecord implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::obligation::BorrowRecord`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = BorrowRecord.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::obligation::BorrowRecord`;
  readonly $typeArgs: [];
  readonly $isPhantom = BorrowRecord.$isPhantom;

  readonly coinType: ToField<TypeName>;
  readonly reserveArrayIndex: ToField<"u64">;
  readonly borrowedAmount: ToField<Decimal>;
  readonly cumulativeBorrowRate: ToField<Decimal>;
  readonly marketValue: ToField<Decimal>;
  readonly userRewardManagerIndex: ToField<"u64">;

  private constructor(typeArgs: [], fields: BorrowRecordFields) {
    this.$fullTypeName = composeSuiType(
      BorrowRecord.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::obligation::BorrowRecord`;
    this.$typeArgs = typeArgs;

    this.coinType = fields.coinType;
    this.reserveArrayIndex = fields.reserveArrayIndex;
    this.borrowedAmount = fields.borrowedAmount;
    this.cumulativeBorrowRate = fields.cumulativeBorrowRate;
    this.marketValue = fields.marketValue;
    this.userRewardManagerIndex = fields.userRewardManagerIndex;
  }

  static reified(): BorrowRecordReified {
    return {
      typeName: BorrowRecord.$typeName,
      fullTypeName: composeSuiType(
        BorrowRecord.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::obligation::BorrowRecord`,
      typeArgs: [] as [],
      isPhantom: BorrowRecord.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        BorrowRecord.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        BorrowRecord.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => BorrowRecord.fromBcs(data),
      bcs: BorrowRecord.bcs,
      fromJSONField: (field: any) => BorrowRecord.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => BorrowRecord.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        BorrowRecord.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        BorrowRecord.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        BorrowRecord.fetch(client, id),
      new: (fields: BorrowRecordFields) => {
        return new BorrowRecord([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return BorrowRecord.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<BorrowRecord>> {
    return phantom(BorrowRecord.reified());
  }
  static get p() {
    return BorrowRecord.phantom();
  }

  static get bcs() {
    return bcs.struct("BorrowRecord", {
      coin_type: TypeName.bcs,
      reserve_array_index: bcs.u64(),
      borrowed_amount: Decimal.bcs,
      cumulative_borrow_rate: Decimal.bcs,
      market_value: Decimal.bcs,
      user_reward_manager_index: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): BorrowRecord {
    return BorrowRecord.reified().new({
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveArrayIndex: decodeFromFields("u64", fields.reserve_array_index),
      borrowedAmount: decodeFromFields(
        Decimal.reified(),
        fields.borrowed_amount,
      ),
      cumulativeBorrowRate: decodeFromFields(
        Decimal.reified(),
        fields.cumulative_borrow_rate,
      ),
      marketValue: decodeFromFields(Decimal.reified(), fields.market_value),
      userRewardManagerIndex: decodeFromFields(
        "u64",
        fields.user_reward_manager_index,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): BorrowRecord {
    if (!isBorrowRecord(item.type)) {
      throw new Error("not a BorrowRecord type");
    }

    return BorrowRecord.reified().new({
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveArrayIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reserve_array_index,
      ),
      borrowedAmount: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.borrowed_amount,
      ),
      cumulativeBorrowRate: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.cumulative_borrow_rate,
      ),
      marketValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.market_value,
      ),
      userRewardManagerIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.user_reward_manager_index,
      ),
    });
  }

  static fromBcs(data: Uint8Array): BorrowRecord {
    return BorrowRecord.fromFields(BorrowRecord.bcs.parse(data));
  }

  toJSONField() {
    return {
      coinType: this.coinType.toJSONField(),
      reserveArrayIndex: this.reserveArrayIndex.toString(),
      borrowedAmount: this.borrowedAmount.toJSONField(),
      cumulativeBorrowRate: this.cumulativeBorrowRate.toJSONField(),
      marketValue: this.marketValue.toJSONField(),
      userRewardManagerIndex: this.userRewardManagerIndex.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): BorrowRecord {
    return BorrowRecord.reified().new({
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveArrayIndex: decodeFromJSONField("u64", field.reserveArrayIndex),
      borrowedAmount: decodeFromJSONField(
        Decimal.reified(),
        field.borrowedAmount,
      ),
      cumulativeBorrowRate: decodeFromJSONField(
        Decimal.reified(),
        field.cumulativeBorrowRate,
      ),
      marketValue: decodeFromJSONField(Decimal.reified(), field.marketValue),
      userRewardManagerIndex: decodeFromJSONField(
        "u64",
        field.userRewardManagerIndex,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): BorrowRecord {
    if (json.$typeName !== BorrowRecord.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return BorrowRecord.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): BorrowRecord {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isBorrowRecord(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a BorrowRecord object`,
      );
    }
    return BorrowRecord.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): BorrowRecord {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isBorrowRecord(data.bcs.type)
      ) {
        throw new Error(`object at is not a BorrowRecord object`);
      }

      return BorrowRecord.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return BorrowRecord.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<BorrowRecord> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching BorrowRecord object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isBorrowRecord(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a BorrowRecord object`);
    }

    return BorrowRecord.fromSuiObjectData(res.data);
  }
}

/* ============================== Deposit =============================== */

export function isDeposit(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::obligation::Deposit`;
}

export interface DepositFields {
  coinType: ToField<TypeName>;
  reserveArrayIndex: ToField<"u64">;
  depositedCtokenAmount: ToField<"u64">;
  marketValue: ToField<Decimal>;
  userRewardManagerIndex: ToField<"u64">;
  attributedBorrowValue: ToField<Decimal>;
}

export type DepositReified = Reified<Deposit, DepositFields>;

export class Deposit implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::obligation::Deposit`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = Deposit.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::obligation::Deposit`;
  readonly $typeArgs: [];
  readonly $isPhantom = Deposit.$isPhantom;

  readonly coinType: ToField<TypeName>;
  readonly reserveArrayIndex: ToField<"u64">;
  readonly depositedCtokenAmount: ToField<"u64">;
  readonly marketValue: ToField<Decimal>;
  readonly userRewardManagerIndex: ToField<"u64">;
  readonly attributedBorrowValue: ToField<Decimal>;

  private constructor(typeArgs: [], fields: DepositFields) {
    this.$fullTypeName = composeSuiType(
      Deposit.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::obligation::Deposit`;
    this.$typeArgs = typeArgs;

    this.coinType = fields.coinType;
    this.reserveArrayIndex = fields.reserveArrayIndex;
    this.depositedCtokenAmount = fields.depositedCtokenAmount;
    this.marketValue = fields.marketValue;
    this.userRewardManagerIndex = fields.userRewardManagerIndex;
    this.attributedBorrowValue = fields.attributedBorrowValue;
  }

  static reified(): DepositReified {
    return {
      typeName: Deposit.$typeName,
      fullTypeName: composeSuiType(
        Deposit.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::obligation::Deposit`,
      typeArgs: [] as [],
      isPhantom: Deposit.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => Deposit.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Deposit.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => Deposit.fromBcs(data),
      bcs: Deposit.bcs,
      fromJSONField: (field: any) => Deposit.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => Deposit.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Deposit.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Deposit.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => Deposit.fetch(client, id),
      new: (fields: DepositFields) => {
        return new Deposit([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Deposit.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<Deposit>> {
    return phantom(Deposit.reified());
  }
  static get p() {
    return Deposit.phantom();
  }

  static get bcs() {
    return bcs.struct("Deposit", {
      coin_type: TypeName.bcs,
      reserve_array_index: bcs.u64(),
      deposited_ctoken_amount: bcs.u64(),
      market_value: Decimal.bcs,
      user_reward_manager_index: bcs.u64(),
      attributed_borrow_value: Decimal.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): Deposit {
    return Deposit.reified().new({
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveArrayIndex: decodeFromFields("u64", fields.reserve_array_index),
      depositedCtokenAmount: decodeFromFields(
        "u64",
        fields.deposited_ctoken_amount,
      ),
      marketValue: decodeFromFields(Decimal.reified(), fields.market_value),
      userRewardManagerIndex: decodeFromFields(
        "u64",
        fields.user_reward_manager_index,
      ),
      attributedBorrowValue: decodeFromFields(
        Decimal.reified(),
        fields.attributed_borrow_value,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): Deposit {
    if (!isDeposit(item.type)) {
      throw new Error("not a Deposit type");
    }

    return Deposit.reified().new({
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveArrayIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reserve_array_index,
      ),
      depositedCtokenAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.deposited_ctoken_amount,
      ),
      marketValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.market_value,
      ),
      userRewardManagerIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.user_reward_manager_index,
      ),
      attributedBorrowValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.attributed_borrow_value,
      ),
    });
  }

  static fromBcs(data: Uint8Array): Deposit {
    return Deposit.fromFields(Deposit.bcs.parse(data));
  }

  toJSONField() {
    return {
      coinType: this.coinType.toJSONField(),
      reserveArrayIndex: this.reserveArrayIndex.toString(),
      depositedCtokenAmount: this.depositedCtokenAmount.toString(),
      marketValue: this.marketValue.toJSONField(),
      userRewardManagerIndex: this.userRewardManagerIndex.toString(),
      attributedBorrowValue: this.attributedBorrowValue.toJSONField(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): Deposit {
    return Deposit.reified().new({
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveArrayIndex: decodeFromJSONField("u64", field.reserveArrayIndex),
      depositedCtokenAmount: decodeFromJSONField(
        "u64",
        field.depositedCtokenAmount,
      ),
      marketValue: decodeFromJSONField(Decimal.reified(), field.marketValue),
      userRewardManagerIndex: decodeFromJSONField(
        "u64",
        field.userRewardManagerIndex,
      ),
      attributedBorrowValue: decodeFromJSONField(
        Decimal.reified(),
        field.attributedBorrowValue,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): Deposit {
    if (json.$typeName !== Deposit.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return Deposit.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): Deposit {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isDeposit(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Deposit object`,
      );
    }
    return Deposit.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): Deposit {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isDeposit(data.bcs.type)) {
        throw new Error(`object at is not a Deposit object`);
      }

      return Deposit.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Deposit.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<Deposit> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Deposit object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isDeposit(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Deposit object`);
    }

    return Deposit.fromSuiObjectData(res.data);
  }
}

/* ============================== DepositRecord =============================== */

export function isDepositRecord(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::obligation::DepositRecord`;
}

export interface DepositRecordFields {
  coinType: ToField<TypeName>;
  reserveArrayIndex: ToField<"u64">;
  depositedCtokenAmount: ToField<"u64">;
  marketValue: ToField<Decimal>;
  userRewardManagerIndex: ToField<"u64">;
  attributedBorrowValue: ToField<Decimal>;
}

export type DepositRecordReified = Reified<DepositRecord, DepositRecordFields>;

export class DepositRecord implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::obligation::DepositRecord`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = DepositRecord.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::obligation::DepositRecord`;
  readonly $typeArgs: [];
  readonly $isPhantom = DepositRecord.$isPhantom;

  readonly coinType: ToField<TypeName>;
  readonly reserveArrayIndex: ToField<"u64">;
  readonly depositedCtokenAmount: ToField<"u64">;
  readonly marketValue: ToField<Decimal>;
  readonly userRewardManagerIndex: ToField<"u64">;
  readonly attributedBorrowValue: ToField<Decimal>;

  private constructor(typeArgs: [], fields: DepositRecordFields) {
    this.$fullTypeName = composeSuiType(
      DepositRecord.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::obligation::DepositRecord`;
    this.$typeArgs = typeArgs;

    this.coinType = fields.coinType;
    this.reserveArrayIndex = fields.reserveArrayIndex;
    this.depositedCtokenAmount = fields.depositedCtokenAmount;
    this.marketValue = fields.marketValue;
    this.userRewardManagerIndex = fields.userRewardManagerIndex;
    this.attributedBorrowValue = fields.attributedBorrowValue;
  }

  static reified(): DepositRecordReified {
    return {
      typeName: DepositRecord.$typeName,
      fullTypeName: composeSuiType(
        DepositRecord.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::obligation::DepositRecord`,
      typeArgs: [] as [],
      isPhantom: DepositRecord.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        DepositRecord.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        DepositRecord.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => DepositRecord.fromBcs(data),
      bcs: DepositRecord.bcs,
      fromJSONField: (field: any) => DepositRecord.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => DepositRecord.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        DepositRecord.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        DepositRecord.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        DepositRecord.fetch(client, id),
      new: (fields: DepositRecordFields) => {
        return new DepositRecord([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return DepositRecord.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<DepositRecord>> {
    return phantom(DepositRecord.reified());
  }
  static get p() {
    return DepositRecord.phantom();
  }

  static get bcs() {
    return bcs.struct("DepositRecord", {
      coin_type: TypeName.bcs,
      reserve_array_index: bcs.u64(),
      deposited_ctoken_amount: bcs.u64(),
      market_value: Decimal.bcs,
      user_reward_manager_index: bcs.u64(),
      attributed_borrow_value: Decimal.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): DepositRecord {
    return DepositRecord.reified().new({
      coinType: decodeFromFields(TypeName.reified(), fields.coin_type),
      reserveArrayIndex: decodeFromFields("u64", fields.reserve_array_index),
      depositedCtokenAmount: decodeFromFields(
        "u64",
        fields.deposited_ctoken_amount,
      ),
      marketValue: decodeFromFields(Decimal.reified(), fields.market_value),
      userRewardManagerIndex: decodeFromFields(
        "u64",
        fields.user_reward_manager_index,
      ),
      attributedBorrowValue: decodeFromFields(
        Decimal.reified(),
        fields.attributed_borrow_value,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): DepositRecord {
    if (!isDepositRecord(item.type)) {
      throw new Error("not a DepositRecord type");
    }

    return DepositRecord.reified().new({
      coinType: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.coin_type,
      ),
      reserveArrayIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reserve_array_index,
      ),
      depositedCtokenAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.deposited_ctoken_amount,
      ),
      marketValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.market_value,
      ),
      userRewardManagerIndex: decodeFromFieldsWithTypes(
        "u64",
        item.fields.user_reward_manager_index,
      ),
      attributedBorrowValue: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.attributed_borrow_value,
      ),
    });
  }

  static fromBcs(data: Uint8Array): DepositRecord {
    return DepositRecord.fromFields(DepositRecord.bcs.parse(data));
  }

  toJSONField() {
    return {
      coinType: this.coinType.toJSONField(),
      reserveArrayIndex: this.reserveArrayIndex.toString(),
      depositedCtokenAmount: this.depositedCtokenAmount.toString(),
      marketValue: this.marketValue.toJSONField(),
      userRewardManagerIndex: this.userRewardManagerIndex.toString(),
      attributedBorrowValue: this.attributedBorrowValue.toJSONField(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): DepositRecord {
    return DepositRecord.reified().new({
      coinType: decodeFromJSONField(TypeName.reified(), field.coinType),
      reserveArrayIndex: decodeFromJSONField("u64", field.reserveArrayIndex),
      depositedCtokenAmount: decodeFromJSONField(
        "u64",
        field.depositedCtokenAmount,
      ),
      marketValue: decodeFromJSONField(Decimal.reified(), field.marketValue),
      userRewardManagerIndex: decodeFromJSONField(
        "u64",
        field.userRewardManagerIndex,
      ),
      attributedBorrowValue: decodeFromJSONField(
        Decimal.reified(),
        field.attributedBorrowValue,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): DepositRecord {
    if (json.$typeName !== DepositRecord.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return DepositRecord.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): DepositRecord {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isDepositRecord(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a DepositRecord object`,
      );
    }
    return DepositRecord.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): DepositRecord {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isDepositRecord(data.bcs.type)
      ) {
        throw new Error(`object at is not a DepositRecord object`);
      }

      return DepositRecord.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return DepositRecord.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<DepositRecord> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching DepositRecord object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isDepositRecord(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a DepositRecord object`);
    }

    return DepositRecord.fromSuiObjectData(res.data);
  }
}

/* ============================== ExistStaleOracles =============================== */

export function isExistStaleOracles(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V11}::obligation::ExistStaleOracles`;
}

export interface ExistStaleOraclesFields {
  dummyField: ToField<"bool">;
}

export type ExistStaleOraclesReified = Reified<
  ExistStaleOracles,
  ExistStaleOraclesFields
>;

export class ExistStaleOracles implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V11}::obligation::ExistStaleOracles`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ExistStaleOracles.$typeName;
  readonly $fullTypeName: `${typeof PKG_V11}::obligation::ExistStaleOracles`;
  readonly $typeArgs: [];
  readonly $isPhantom = ExistStaleOracles.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: ExistStaleOraclesFields) {
    this.$fullTypeName = composeSuiType(
      ExistStaleOracles.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V11}::obligation::ExistStaleOracles`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): ExistStaleOraclesReified {
    return {
      typeName: ExistStaleOracles.$typeName,
      fullTypeName: composeSuiType(
        ExistStaleOracles.$typeName,
        ...[],
      ) as `${typeof PKG_V11}::obligation::ExistStaleOracles`,
      typeArgs: [] as [],
      isPhantom: ExistStaleOracles.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ExistStaleOracles.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ExistStaleOracles.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ExistStaleOracles.fromBcs(data),
      bcs: ExistStaleOracles.bcs,
      fromJSONField: (field: any) => ExistStaleOracles.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => ExistStaleOracles.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ExistStaleOracles.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ExistStaleOracles.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ExistStaleOracles.fetch(client, id),
      new: (fields: ExistStaleOraclesFields) => {
        return new ExistStaleOracles([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ExistStaleOracles.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ExistStaleOracles>> {
    return phantom(ExistStaleOracles.reified());
  }
  static get p() {
    return ExistStaleOracles.phantom();
  }

  static get bcs() {
    return bcs.struct("ExistStaleOracles", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): ExistStaleOracles {
    return ExistStaleOracles.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ExistStaleOracles {
    if (!isExistStaleOracles(item.type)) {
      throw new Error("not a ExistStaleOracles type");
    }

    return ExistStaleOracles.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): ExistStaleOracles {
    return ExistStaleOracles.fromFields(ExistStaleOracles.bcs.parse(data));
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

  static fromJSONField(field: any): ExistStaleOracles {
    return ExistStaleOracles.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): ExistStaleOracles {
    if (json.$typeName !== ExistStaleOracles.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ExistStaleOracles.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ExistStaleOracles {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isExistStaleOracles(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ExistStaleOracles object`,
      );
    }
    return ExistStaleOracles.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ExistStaleOracles {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isExistStaleOracles(data.bcs.type)
      ) {
        throw new Error(`object at is not a ExistStaleOracles object`);
      }

      return ExistStaleOracles.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ExistStaleOracles.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<ExistStaleOracles> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ExistStaleOracles object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isExistStaleOracles(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a ExistStaleOracles object`);
    }

    return ExistStaleOracles.fromSuiObjectData(res.data);
  }
}

/* ============================== Obligation =============================== */

export function isObligation(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::obligation::Obligation` + "<");
}

export interface ObligationFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  lendingMarketId: ToField<ID>;
  deposits: ToField<Vector<Deposit>>;
  borrows: ToField<Vector<Borrow>>;
  depositedValueUsd: ToField<Decimal>;
  allowedBorrowValueUsd: ToField<Decimal>;
  unhealthyBorrowValueUsd: ToField<Decimal>;
  superUnhealthyBorrowValueUsd: ToField<Decimal>;
  unweightedBorrowedValueUsd: ToField<Decimal>;
  weightedBorrowedValueUsd: ToField<Decimal>;
  weightedBorrowedValueUpperBoundUsd: ToField<Decimal>;
  borrowingIsolatedAsset: ToField<"bool">;
  userRewardManagers: ToField<Vector<UserRewardManager>>;
  badDebtUsd: ToField<Decimal>;
  closable: ToField<"bool">;
}

export type ObligationReified<P extends PhantomTypeArgument> = Reified<
  Obligation<P>,
  ObligationFields<P>
>;

export class Obligation<P extends PhantomTypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::obligation::Obligation`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = Obligation.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::obligation::Obligation<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = Obligation.$isPhantom;

  readonly id: ToField<UID>;
  readonly lendingMarketId: ToField<ID>;
  readonly deposits: ToField<Vector<Deposit>>;
  readonly borrows: ToField<Vector<Borrow>>;
  readonly depositedValueUsd: ToField<Decimal>;
  readonly allowedBorrowValueUsd: ToField<Decimal>;
  readonly unhealthyBorrowValueUsd: ToField<Decimal>;
  readonly superUnhealthyBorrowValueUsd: ToField<Decimal>;
  readonly unweightedBorrowedValueUsd: ToField<Decimal>;
  readonly weightedBorrowedValueUsd: ToField<Decimal>;
  readonly weightedBorrowedValueUpperBoundUsd: ToField<Decimal>;
  readonly borrowingIsolatedAsset: ToField<"bool">;
  readonly userRewardManagers: ToField<Vector<UserRewardManager>>;
  readonly badDebtUsd: ToField<Decimal>;
  readonly closable: ToField<"bool">;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: ObligationFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      Obligation.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::obligation::Obligation<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.lendingMarketId = fields.lendingMarketId;
    this.deposits = fields.deposits;
    this.borrows = fields.borrows;
    this.depositedValueUsd = fields.depositedValueUsd;
    this.allowedBorrowValueUsd = fields.allowedBorrowValueUsd;
    this.unhealthyBorrowValueUsd = fields.unhealthyBorrowValueUsd;
    this.superUnhealthyBorrowValueUsd = fields.superUnhealthyBorrowValueUsd;
    this.unweightedBorrowedValueUsd = fields.unweightedBorrowedValueUsd;
    this.weightedBorrowedValueUsd = fields.weightedBorrowedValueUsd;
    this.weightedBorrowedValueUpperBoundUsd =
      fields.weightedBorrowedValueUpperBoundUsd;
    this.borrowingIsolatedAsset = fields.borrowingIsolatedAsset;
    this.userRewardManagers = fields.userRewardManagers;
    this.badDebtUsd = fields.badDebtUsd;
    this.closable = fields.closable;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): ObligationReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: Obligation.$typeName,
      fullTypeName: composeSuiType(
        Obligation.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::obligation::Obligation<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: Obligation.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        Obligation.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Obligation.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => Obligation.fromBcs(P, data),
      bcs: Obligation.bcs,
      fromJSONField: (field: any) => Obligation.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) => Obligation.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Obligation.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Obligation.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        Obligation.fetch(client, P, id),
      new: (fields: ObligationFields<ToPhantomTypeArgument<P>>) => {
        return new Obligation([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Obligation.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<Obligation<ToPhantomTypeArgument<P>>>> {
    return phantom(Obligation.reified(P));
  }
  static get p() {
    return Obligation.phantom;
  }

  static get bcs() {
    return bcs.struct("Obligation", {
      id: UID.bcs,
      lending_market_id: ID.bcs,
      deposits: bcs.vector(Deposit.bcs),
      borrows: bcs.vector(Borrow.bcs),
      deposited_value_usd: Decimal.bcs,
      allowed_borrow_value_usd: Decimal.bcs,
      unhealthy_borrow_value_usd: Decimal.bcs,
      super_unhealthy_borrow_value_usd: Decimal.bcs,
      unweighted_borrowed_value_usd: Decimal.bcs,
      weighted_borrowed_value_usd: Decimal.bcs,
      weighted_borrowed_value_upper_bound_usd: Decimal.bcs,
      borrowing_isolated_asset: bcs.bool(),
      user_reward_managers: bcs.vector(UserRewardManager.bcs),
      bad_debt_usd: Decimal.bcs,
      closable: bcs.bool(),
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): Obligation<ToPhantomTypeArgument<P>> {
    return Obligation.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      lendingMarketId: decodeFromFields(ID.reified(), fields.lending_market_id),
      deposits: decodeFromFields(
        reified.vector(Deposit.reified()),
        fields.deposits,
      ),
      borrows: decodeFromFields(
        reified.vector(Borrow.reified()),
        fields.borrows,
      ),
      depositedValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.deposited_value_usd,
      ),
      allowedBorrowValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.allowed_borrow_value_usd,
      ),
      unhealthyBorrowValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.unhealthy_borrow_value_usd,
      ),
      superUnhealthyBorrowValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.super_unhealthy_borrow_value_usd,
      ),
      unweightedBorrowedValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.unweighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.weighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUpperBoundUsd: decodeFromFields(
        Decimal.reified(),
        fields.weighted_borrowed_value_upper_bound_usd,
      ),
      borrowingIsolatedAsset: decodeFromFields(
        "bool",
        fields.borrowing_isolated_asset,
      ),
      userRewardManagers: decodeFromFields(
        reified.vector(UserRewardManager.reified()),
        fields.user_reward_managers,
      ),
      badDebtUsd: decodeFromFields(Decimal.reified(), fields.bad_debt_usd),
      closable: decodeFromFields("bool", fields.closable),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): Obligation<ToPhantomTypeArgument<P>> {
    if (!isObligation(item.type)) {
      throw new Error("not a Obligation type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return Obligation.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      lendingMarketId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.lending_market_id,
      ),
      deposits: decodeFromFieldsWithTypes(
        reified.vector(Deposit.reified()),
        item.fields.deposits,
      ),
      borrows: decodeFromFieldsWithTypes(
        reified.vector(Borrow.reified()),
        item.fields.borrows,
      ),
      depositedValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.deposited_value_usd,
      ),
      allowedBorrowValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.allowed_borrow_value_usd,
      ),
      unhealthyBorrowValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.unhealthy_borrow_value_usd,
      ),
      superUnhealthyBorrowValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.super_unhealthy_borrow_value_usd,
      ),
      unweightedBorrowedValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.unweighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.weighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUpperBoundUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.weighted_borrowed_value_upper_bound_usd,
      ),
      borrowingIsolatedAsset: decodeFromFieldsWithTypes(
        "bool",
        item.fields.borrowing_isolated_asset,
      ),
      userRewardManagers: decodeFromFieldsWithTypes(
        reified.vector(UserRewardManager.reified()),
        item.fields.user_reward_managers,
      ),
      badDebtUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.bad_debt_usd,
      ),
      closable: decodeFromFieldsWithTypes("bool", item.fields.closable),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): Obligation<ToPhantomTypeArgument<P>> {
    return Obligation.fromFields(typeArg, Obligation.bcs.parse(data));
  }

  toJSONField() {
    return {
      id: this.id,
      lendingMarketId: this.lendingMarketId,
      deposits: fieldToJSON<Vector<Deposit>>(
        `vector<${Deposit.$typeName}>`,
        this.deposits,
      ),
      borrows: fieldToJSON<Vector<Borrow>>(
        `vector<${Borrow.$typeName}>`,
        this.borrows,
      ),
      depositedValueUsd: this.depositedValueUsd.toJSONField(),
      allowedBorrowValueUsd: this.allowedBorrowValueUsd.toJSONField(),
      unhealthyBorrowValueUsd: this.unhealthyBorrowValueUsd.toJSONField(),
      superUnhealthyBorrowValueUsd:
        this.superUnhealthyBorrowValueUsd.toJSONField(),
      unweightedBorrowedValueUsd: this.unweightedBorrowedValueUsd.toJSONField(),
      weightedBorrowedValueUsd: this.weightedBorrowedValueUsd.toJSONField(),
      weightedBorrowedValueUpperBoundUsd:
        this.weightedBorrowedValueUpperBoundUsd.toJSONField(),
      borrowingIsolatedAsset: this.borrowingIsolatedAsset,
      userRewardManagers: fieldToJSON<Vector<UserRewardManager>>(
        `vector<${UserRewardManager.$typeName}>`,
        this.userRewardManagers,
      ),
      badDebtUsd: this.badDebtUsd.toJSONField(),
      closable: this.closable,
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
  ): Obligation<ToPhantomTypeArgument<P>> {
    return Obligation.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      lendingMarketId: decodeFromJSONField(ID.reified(), field.lendingMarketId),
      deposits: decodeFromJSONField(
        reified.vector(Deposit.reified()),
        field.deposits,
      ),
      borrows: decodeFromJSONField(
        reified.vector(Borrow.reified()),
        field.borrows,
      ),
      depositedValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.depositedValueUsd,
      ),
      allowedBorrowValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.allowedBorrowValueUsd,
      ),
      unhealthyBorrowValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.unhealthyBorrowValueUsd,
      ),
      superUnhealthyBorrowValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.superUnhealthyBorrowValueUsd,
      ),
      unweightedBorrowedValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.unweightedBorrowedValueUsd,
      ),
      weightedBorrowedValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.weightedBorrowedValueUsd,
      ),
      weightedBorrowedValueUpperBoundUsd: decodeFromJSONField(
        Decimal.reified(),
        field.weightedBorrowedValueUpperBoundUsd,
      ),
      borrowingIsolatedAsset: decodeFromJSONField(
        "bool",
        field.borrowingIsolatedAsset,
      ),
      userRewardManagers: decodeFromJSONField(
        reified.vector(UserRewardManager.reified()),
        field.userRewardManagers,
      ),
      badDebtUsd: decodeFromJSONField(Decimal.reified(), field.badDebtUsd),
      closable: decodeFromJSONField("bool", field.closable),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): Obligation<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== Obligation.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Obligation.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return Obligation.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): Obligation<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isObligation(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Obligation object`,
      );
    }
    return Obligation.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): Obligation<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isObligation(data.bcs.type)) {
        throw new Error(`object at is not a Obligation object`);
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

      return Obligation.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Obligation.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<Obligation<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Obligation object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isObligation(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Obligation object`);
    }

    return Obligation.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== ObligationDataEvent =============================== */

export function isObligationDataEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::obligation::ObligationDataEvent`;
}

export interface ObligationDataEventFields {
  lendingMarketId: ToField<"address">;
  obligationId: ToField<"address">;
  deposits: ToField<Vector<DepositRecord>>;
  borrows: ToField<Vector<BorrowRecord>>;
  depositedValueUsd: ToField<Decimal>;
  allowedBorrowValueUsd: ToField<Decimal>;
  unhealthyBorrowValueUsd: ToField<Decimal>;
  superUnhealthyBorrowValueUsd: ToField<Decimal>;
  unweightedBorrowedValueUsd: ToField<Decimal>;
  weightedBorrowedValueUsd: ToField<Decimal>;
  weightedBorrowedValueUpperBoundUsd: ToField<Decimal>;
  borrowingIsolatedAsset: ToField<"bool">;
  badDebtUsd: ToField<Decimal>;
  closable: ToField<"bool">;
}

export type ObligationDataEventReified = Reified<
  ObligationDataEvent,
  ObligationDataEventFields
>;

export class ObligationDataEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::obligation::ObligationDataEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ObligationDataEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::obligation::ObligationDataEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = ObligationDataEvent.$isPhantom;

  readonly lendingMarketId: ToField<"address">;
  readonly obligationId: ToField<"address">;
  readonly deposits: ToField<Vector<DepositRecord>>;
  readonly borrows: ToField<Vector<BorrowRecord>>;
  readonly depositedValueUsd: ToField<Decimal>;
  readonly allowedBorrowValueUsd: ToField<Decimal>;
  readonly unhealthyBorrowValueUsd: ToField<Decimal>;
  readonly superUnhealthyBorrowValueUsd: ToField<Decimal>;
  readonly unweightedBorrowedValueUsd: ToField<Decimal>;
  readonly weightedBorrowedValueUsd: ToField<Decimal>;
  readonly weightedBorrowedValueUpperBoundUsd: ToField<Decimal>;
  readonly borrowingIsolatedAsset: ToField<"bool">;
  readonly badDebtUsd: ToField<Decimal>;
  readonly closable: ToField<"bool">;

  private constructor(typeArgs: [], fields: ObligationDataEventFields) {
    this.$fullTypeName = composeSuiType(
      ObligationDataEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::obligation::ObligationDataEvent`;
    this.$typeArgs = typeArgs;

    this.lendingMarketId = fields.lendingMarketId;
    this.obligationId = fields.obligationId;
    this.deposits = fields.deposits;
    this.borrows = fields.borrows;
    this.depositedValueUsd = fields.depositedValueUsd;
    this.allowedBorrowValueUsd = fields.allowedBorrowValueUsd;
    this.unhealthyBorrowValueUsd = fields.unhealthyBorrowValueUsd;
    this.superUnhealthyBorrowValueUsd = fields.superUnhealthyBorrowValueUsd;
    this.unweightedBorrowedValueUsd = fields.unweightedBorrowedValueUsd;
    this.weightedBorrowedValueUsd = fields.weightedBorrowedValueUsd;
    this.weightedBorrowedValueUpperBoundUsd =
      fields.weightedBorrowedValueUpperBoundUsd;
    this.borrowingIsolatedAsset = fields.borrowingIsolatedAsset;
    this.badDebtUsd = fields.badDebtUsd;
    this.closable = fields.closable;
  }

  static reified(): ObligationDataEventReified {
    return {
      typeName: ObligationDataEvent.$typeName,
      fullTypeName: composeSuiType(
        ObligationDataEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::obligation::ObligationDataEvent`,
      typeArgs: [] as [],
      isPhantom: ObligationDataEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ObligationDataEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ObligationDataEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ObligationDataEvent.fromBcs(data),
      bcs: ObligationDataEvent.bcs,
      fromJSONField: (field: any) => ObligationDataEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        ObligationDataEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ObligationDataEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ObligationDataEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ObligationDataEvent.fetch(client, id),
      new: (fields: ObligationDataEventFields) => {
        return new ObligationDataEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ObligationDataEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ObligationDataEvent>> {
    return phantom(ObligationDataEvent.reified());
  }
  static get p() {
    return ObligationDataEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("ObligationDataEvent", {
      lending_market_id: bcs
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
      deposits: bcs.vector(DepositRecord.bcs),
      borrows: bcs.vector(BorrowRecord.bcs),
      deposited_value_usd: Decimal.bcs,
      allowed_borrow_value_usd: Decimal.bcs,
      unhealthy_borrow_value_usd: Decimal.bcs,
      super_unhealthy_borrow_value_usd: Decimal.bcs,
      unweighted_borrowed_value_usd: Decimal.bcs,
      weighted_borrowed_value_usd: Decimal.bcs,
      weighted_borrowed_value_upper_bound_usd: Decimal.bcs,
      borrowing_isolated_asset: bcs.bool(),
      bad_debt_usd: Decimal.bcs,
      closable: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): ObligationDataEvent {
    return ObligationDataEvent.reified().new({
      lendingMarketId: decodeFromFields("address", fields.lending_market_id),
      obligationId: decodeFromFields("address", fields.obligation_id),
      deposits: decodeFromFields(
        reified.vector(DepositRecord.reified()),
        fields.deposits,
      ),
      borrows: decodeFromFields(
        reified.vector(BorrowRecord.reified()),
        fields.borrows,
      ),
      depositedValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.deposited_value_usd,
      ),
      allowedBorrowValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.allowed_borrow_value_usd,
      ),
      unhealthyBorrowValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.unhealthy_borrow_value_usd,
      ),
      superUnhealthyBorrowValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.super_unhealthy_borrow_value_usd,
      ),
      unweightedBorrowedValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.unweighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUsd: decodeFromFields(
        Decimal.reified(),
        fields.weighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUpperBoundUsd: decodeFromFields(
        Decimal.reified(),
        fields.weighted_borrowed_value_upper_bound_usd,
      ),
      borrowingIsolatedAsset: decodeFromFields(
        "bool",
        fields.borrowing_isolated_asset,
      ),
      badDebtUsd: decodeFromFields(Decimal.reified(), fields.bad_debt_usd),
      closable: decodeFromFields("bool", fields.closable),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ObligationDataEvent {
    if (!isObligationDataEvent(item.type)) {
      throw new Error("not a ObligationDataEvent type");
    }

    return ObligationDataEvent.reified().new({
      lendingMarketId: decodeFromFieldsWithTypes(
        "address",
        item.fields.lending_market_id,
      ),
      obligationId: decodeFromFieldsWithTypes(
        "address",
        item.fields.obligation_id,
      ),
      deposits: decodeFromFieldsWithTypes(
        reified.vector(DepositRecord.reified()),
        item.fields.deposits,
      ),
      borrows: decodeFromFieldsWithTypes(
        reified.vector(BorrowRecord.reified()),
        item.fields.borrows,
      ),
      depositedValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.deposited_value_usd,
      ),
      allowedBorrowValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.allowed_borrow_value_usd,
      ),
      unhealthyBorrowValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.unhealthy_borrow_value_usd,
      ),
      superUnhealthyBorrowValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.super_unhealthy_borrow_value_usd,
      ),
      unweightedBorrowedValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.unweighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.weighted_borrowed_value_usd,
      ),
      weightedBorrowedValueUpperBoundUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.weighted_borrowed_value_upper_bound_usd,
      ),
      borrowingIsolatedAsset: decodeFromFieldsWithTypes(
        "bool",
        item.fields.borrowing_isolated_asset,
      ),
      badDebtUsd: decodeFromFieldsWithTypes(
        Decimal.reified(),
        item.fields.bad_debt_usd,
      ),
      closable: decodeFromFieldsWithTypes("bool", item.fields.closable),
    });
  }

  static fromBcs(data: Uint8Array): ObligationDataEvent {
    return ObligationDataEvent.fromFields(ObligationDataEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      lendingMarketId: this.lendingMarketId,
      obligationId: this.obligationId,
      deposits: fieldToJSON<Vector<DepositRecord>>(
        `vector<${DepositRecord.$typeName}>`,
        this.deposits,
      ),
      borrows: fieldToJSON<Vector<BorrowRecord>>(
        `vector<${BorrowRecord.$typeName}>`,
        this.borrows,
      ),
      depositedValueUsd: this.depositedValueUsd.toJSONField(),
      allowedBorrowValueUsd: this.allowedBorrowValueUsd.toJSONField(),
      unhealthyBorrowValueUsd: this.unhealthyBorrowValueUsd.toJSONField(),
      superUnhealthyBorrowValueUsd:
        this.superUnhealthyBorrowValueUsd.toJSONField(),
      unweightedBorrowedValueUsd: this.unweightedBorrowedValueUsd.toJSONField(),
      weightedBorrowedValueUsd: this.weightedBorrowedValueUsd.toJSONField(),
      weightedBorrowedValueUpperBoundUsd:
        this.weightedBorrowedValueUpperBoundUsd.toJSONField(),
      borrowingIsolatedAsset: this.borrowingIsolatedAsset,
      badDebtUsd: this.badDebtUsd.toJSONField(),
      closable: this.closable,
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): ObligationDataEvent {
    return ObligationDataEvent.reified().new({
      lendingMarketId: decodeFromJSONField("address", field.lendingMarketId),
      obligationId: decodeFromJSONField("address", field.obligationId),
      deposits: decodeFromJSONField(
        reified.vector(DepositRecord.reified()),
        field.deposits,
      ),
      borrows: decodeFromJSONField(
        reified.vector(BorrowRecord.reified()),
        field.borrows,
      ),
      depositedValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.depositedValueUsd,
      ),
      allowedBorrowValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.allowedBorrowValueUsd,
      ),
      unhealthyBorrowValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.unhealthyBorrowValueUsd,
      ),
      superUnhealthyBorrowValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.superUnhealthyBorrowValueUsd,
      ),
      unweightedBorrowedValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.unweightedBorrowedValueUsd,
      ),
      weightedBorrowedValueUsd: decodeFromJSONField(
        Decimal.reified(),
        field.weightedBorrowedValueUsd,
      ),
      weightedBorrowedValueUpperBoundUsd: decodeFromJSONField(
        Decimal.reified(),
        field.weightedBorrowedValueUpperBoundUsd,
      ),
      borrowingIsolatedAsset: decodeFromJSONField(
        "bool",
        field.borrowingIsolatedAsset,
      ),
      badDebtUsd: decodeFromJSONField(Decimal.reified(), field.badDebtUsd),
      closable: decodeFromJSONField("bool", field.closable),
    });
  }

  static fromJSON(json: Record<string, any>): ObligationDataEvent {
    if (json.$typeName !== ObligationDataEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ObligationDataEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ObligationDataEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isObligationDataEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ObligationDataEvent object`,
      );
    }
    return ObligationDataEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ObligationDataEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isObligationDataEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a ObligationDataEvent object`);
      }

      return ObligationDataEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ObligationDataEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<ObligationDataEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ObligationDataEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isObligationDataEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a ObligationDataEvent object`);
    }

    return ObligationDataEvent.fromSuiObjectData(res.data);
  }
}
