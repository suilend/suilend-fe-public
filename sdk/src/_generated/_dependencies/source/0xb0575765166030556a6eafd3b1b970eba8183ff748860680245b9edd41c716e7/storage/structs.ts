import * as reified from "../../../../_framework/reified";
import {
  PhantomReified,
  Reified,
  StructClass,
  ToField,
  ToTypeStr,
  decodeFromFields,
  decodeFromFieldsWithTypes,
  decodeFromJSONField,
  fieldToJSON,
  phantom,
  ToTypeStr as ToPhantom,
} from "../../../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
} from "../../../../_framework/util";
import { Vector } from "../../../../_framework/vector";
import { Option } from "../../0x1/option/structs";
import { Bag } from "../../0x2/bag/structs";
import { Balance } from "../../0x2/balance/structs";
import { ID } from "../../0x2/object/structs";
import { SUI } from "../../0x2/sui/structs";
import {
  FungibleStakedSui,
  PoolTokenExchangeRate,
  StakedSui,
} from "../../0x3/staking-pool/structs";
import { PKG_V1 } from "../index";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== Storage =============================== */

export function isStorage(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::storage::Storage`;
}

export interface StorageFields {
  suiPool: ToField<Balance<ToPhantom<SUI>>>;
  validatorInfos: ToField<Vector<ValidatorInfo>>;
  totalSuiSupply: ToField<"u64">;
  lastRefreshEpoch: ToField<"u64">;
  extraFields: ToField<Bag>;
}

export type StorageReified = Reified<Storage, StorageFields>;

export class Storage implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::storage::Storage`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = Storage.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::storage::Storage`;
  readonly $typeArgs: [];
  readonly $isPhantom = Storage.$isPhantom;

  readonly suiPool: ToField<Balance<ToPhantom<SUI>>>;
  readonly validatorInfos: ToField<Vector<ValidatorInfo>>;
  readonly totalSuiSupply: ToField<"u64">;
  readonly lastRefreshEpoch: ToField<"u64">;
  readonly extraFields: ToField<Bag>;

  private constructor(typeArgs: [], fields: StorageFields) {
    this.$fullTypeName = composeSuiType(
      Storage.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::storage::Storage`;
    this.$typeArgs = typeArgs;

    this.suiPool = fields.suiPool;
    this.validatorInfos = fields.validatorInfos;
    this.totalSuiSupply = fields.totalSuiSupply;
    this.lastRefreshEpoch = fields.lastRefreshEpoch;
    this.extraFields = fields.extraFields;
  }

  static reified(): StorageReified {
    return {
      typeName: Storage.$typeName,
      fullTypeName: composeSuiType(
        Storage.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::storage::Storage`,
      typeArgs: [] as [],
      isPhantom: Storage.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => Storage.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Storage.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => Storage.fromBcs(data),
      bcs: Storage.bcs,
      fromJSONField: (field: any) => Storage.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => Storage.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Storage.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Storage.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => Storage.fetch(client, id),
      new: (fields: StorageFields) => {
        return new Storage([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Storage.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<Storage>> {
    return phantom(Storage.reified());
  }
  static get p() {
    return Storage.phantom();
  }

  static get bcs() {
    return bcs.struct("Storage", {
      sui_pool: Balance.bcs,
      validator_infos: bcs.vector(ValidatorInfo.bcs),
      total_sui_supply: bcs.u64(),
      last_refresh_epoch: bcs.u64(),
      extra_fields: Bag.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): Storage {
    return Storage.reified().new({
      suiPool: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.sui_pool,
      ),
      validatorInfos: decodeFromFields(
        reified.vector(ValidatorInfo.reified()),
        fields.validator_infos,
      ),
      totalSuiSupply: decodeFromFields("u64", fields.total_sui_supply),
      lastRefreshEpoch: decodeFromFields("u64", fields.last_refresh_epoch),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): Storage {
    if (!isStorage(item.type)) {
      throw new Error("not a Storage type");
    }

    return Storage.reified().new({
      suiPool: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.sui_pool,
      ),
      validatorInfos: decodeFromFieldsWithTypes(
        reified.vector(ValidatorInfo.reified()),
        item.fields.validator_infos,
      ),
      totalSuiSupply: decodeFromFieldsWithTypes(
        "u64",
        item.fields.total_sui_supply,
      ),
      lastRefreshEpoch: decodeFromFieldsWithTypes(
        "u64",
        item.fields.last_refresh_epoch,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs(data: Uint8Array): Storage {
    return Storage.fromFields(Storage.bcs.parse(data));
  }

  toJSONField() {
    return {
      suiPool: this.suiPool.toJSONField(),
      validatorInfos: fieldToJSON<Vector<ValidatorInfo>>(
        `vector<${ValidatorInfo.$typeName}>`,
        this.validatorInfos,
      ),
      totalSuiSupply: this.totalSuiSupply.toString(),
      lastRefreshEpoch: this.lastRefreshEpoch.toString(),
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

  static fromJSONField(field: any): Storage {
    return Storage.reified().new({
      suiPool: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.suiPool,
      ),
      validatorInfos: decodeFromJSONField(
        reified.vector(ValidatorInfo.reified()),
        field.validatorInfos,
      ),
      totalSuiSupply: decodeFromJSONField("u64", field.totalSuiSupply),
      lastRefreshEpoch: decodeFromJSONField("u64", field.lastRefreshEpoch),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON(json: Record<string, any>): Storage {
    if (json.$typeName !== Storage.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return Storage.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): Storage {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isStorage(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Storage object`,
      );
    }
    return Storage.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): Storage {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isStorage(data.bcs.type)) {
        throw new Error(`object at is not a Storage object`);
      }

      return Storage.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Storage.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<Storage> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Storage object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isStorage(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Storage object`);
    }

    return Storage.fromSuiObjectData(res.data);
  }
}

/* ============================== ValidatorInfo =============================== */

export function isValidatorInfo(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::storage::ValidatorInfo`;
}

export interface ValidatorInfoFields {
  stakingPoolId: ToField<ID>;
  validatorAddress: ToField<"address">;
  activeStake: ToField<Option<FungibleStakedSui>>;
  inactiveStake: ToField<Option<StakedSui>>;
  exchangeRate: ToField<PoolTokenExchangeRate>;
  totalSuiAmount: ToField<"u64">;
  extraFields: ToField<Bag>;
}

export type ValidatorInfoReified = Reified<ValidatorInfo, ValidatorInfoFields>;

export class ValidatorInfo implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::storage::ValidatorInfo`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ValidatorInfo.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::storage::ValidatorInfo`;
  readonly $typeArgs: [];
  readonly $isPhantom = ValidatorInfo.$isPhantom;

  readonly stakingPoolId: ToField<ID>;
  readonly validatorAddress: ToField<"address">;
  readonly activeStake: ToField<Option<FungibleStakedSui>>;
  readonly inactiveStake: ToField<Option<StakedSui>>;
  readonly exchangeRate: ToField<PoolTokenExchangeRate>;
  readonly totalSuiAmount: ToField<"u64">;
  readonly extraFields: ToField<Bag>;

  private constructor(typeArgs: [], fields: ValidatorInfoFields) {
    this.$fullTypeName = composeSuiType(
      ValidatorInfo.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::storage::ValidatorInfo`;
    this.$typeArgs = typeArgs;

    this.stakingPoolId = fields.stakingPoolId;
    this.validatorAddress = fields.validatorAddress;
    this.activeStake = fields.activeStake;
    this.inactiveStake = fields.inactiveStake;
    this.exchangeRate = fields.exchangeRate;
    this.totalSuiAmount = fields.totalSuiAmount;
    this.extraFields = fields.extraFields;
  }

  static reified(): ValidatorInfoReified {
    return {
      typeName: ValidatorInfo.$typeName,
      fullTypeName: composeSuiType(
        ValidatorInfo.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::storage::ValidatorInfo`,
      typeArgs: [] as [],
      isPhantom: ValidatorInfo.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ValidatorInfo.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ValidatorInfo.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ValidatorInfo.fromBcs(data),
      bcs: ValidatorInfo.bcs,
      fromJSONField: (field: any) => ValidatorInfo.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => ValidatorInfo.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ValidatorInfo.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ValidatorInfo.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ValidatorInfo.fetch(client, id),
      new: (fields: ValidatorInfoFields) => {
        return new ValidatorInfo([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ValidatorInfo.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ValidatorInfo>> {
    return phantom(ValidatorInfo.reified());
  }
  static get p() {
    return ValidatorInfo.phantom();
  }

  static get bcs() {
    return bcs.struct("ValidatorInfo", {
      staking_pool_id: ID.bcs,
      validator_address: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
      active_stake: Option.bcs(FungibleStakedSui.bcs),
      inactive_stake: Option.bcs(StakedSui.bcs),
      exchange_rate: PoolTokenExchangeRate.bcs,
      total_sui_amount: bcs.u64(),
      extra_fields: Bag.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): ValidatorInfo {
    return ValidatorInfo.reified().new({
      stakingPoolId: decodeFromFields(ID.reified(), fields.staking_pool_id),
      validatorAddress: decodeFromFields("address", fields.validator_address),
      activeStake: decodeFromFields(
        Option.reified(FungibleStakedSui.reified()),
        fields.active_stake,
      ),
      inactiveStake: decodeFromFields(
        Option.reified(StakedSui.reified()),
        fields.inactive_stake,
      ),
      exchangeRate: decodeFromFields(
        PoolTokenExchangeRate.reified(),
        fields.exchange_rate,
      ),
      totalSuiAmount: decodeFromFields("u64", fields.total_sui_amount),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ValidatorInfo {
    if (!isValidatorInfo(item.type)) {
      throw new Error("not a ValidatorInfo type");
    }

    return ValidatorInfo.reified().new({
      stakingPoolId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.staking_pool_id,
      ),
      validatorAddress: decodeFromFieldsWithTypes(
        "address",
        item.fields.validator_address,
      ),
      activeStake: decodeFromFieldsWithTypes(
        Option.reified(FungibleStakedSui.reified()),
        item.fields.active_stake,
      ),
      inactiveStake: decodeFromFieldsWithTypes(
        Option.reified(StakedSui.reified()),
        item.fields.inactive_stake,
      ),
      exchangeRate: decodeFromFieldsWithTypes(
        PoolTokenExchangeRate.reified(),
        item.fields.exchange_rate,
      ),
      totalSuiAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.total_sui_amount,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs(data: Uint8Array): ValidatorInfo {
    return ValidatorInfo.fromFields(ValidatorInfo.bcs.parse(data));
  }

  toJSONField() {
    return {
      stakingPoolId: this.stakingPoolId,
      validatorAddress: this.validatorAddress,
      activeStake: fieldToJSON<Option<FungibleStakedSui>>(
        `${Option.$typeName}<${FungibleStakedSui.$typeName}>`,
        this.activeStake,
      ),
      inactiveStake: fieldToJSON<Option<StakedSui>>(
        `${Option.$typeName}<${StakedSui.$typeName}>`,
        this.inactiveStake,
      ),
      exchangeRate: this.exchangeRate.toJSONField(),
      totalSuiAmount: this.totalSuiAmount.toString(),
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

  static fromJSONField(field: any): ValidatorInfo {
    return ValidatorInfo.reified().new({
      stakingPoolId: decodeFromJSONField(ID.reified(), field.stakingPoolId),
      validatorAddress: decodeFromJSONField("address", field.validatorAddress),
      activeStake: decodeFromJSONField(
        Option.reified(FungibleStakedSui.reified()),
        field.activeStake,
      ),
      inactiveStake: decodeFromJSONField(
        Option.reified(StakedSui.reified()),
        field.inactiveStake,
      ),
      exchangeRate: decodeFromJSONField(
        PoolTokenExchangeRate.reified(),
        field.exchangeRate,
      ),
      totalSuiAmount: decodeFromJSONField("u64", field.totalSuiAmount),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON(json: Record<string, any>): ValidatorInfo {
    if (json.$typeName !== ValidatorInfo.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ValidatorInfo.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ValidatorInfo {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isValidatorInfo(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ValidatorInfo object`,
      );
    }
    return ValidatorInfo.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ValidatorInfo {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isValidatorInfo(data.bcs.type)
      ) {
        throw new Error(`object at is not a ValidatorInfo object`);
      }

      return ValidatorInfo.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ValidatorInfo.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<ValidatorInfo> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ValidatorInfo object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isValidatorInfo(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a ValidatorInfo object`);
    }

    return ValidatorInfo.fromSuiObjectData(res.data);
  }
}
