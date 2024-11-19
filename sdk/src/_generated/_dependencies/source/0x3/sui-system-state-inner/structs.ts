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
  phantom,
  ToTypeStr as ToPhantom,
} from "../../../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
} from "../../../../_framework/util";
import { Bag } from "../../0x2/bag/structs";
import { Balance } from "../../0x2/balance/structs";
import { SUI } from "../../0x2/sui/structs";
import { VecMap } from "../../0x2/vec-map/structs";
import { VecSet } from "../../0x2/vec-set/structs";
import { PKG_V17 } from "../index";
import { StakeSubsidy } from "../stake-subsidy/structs";
import { StorageFund } from "../storage-fund/structs";
import { ValidatorSet } from "../validator-set/structs";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== SuiSystemStateInner =============================== */

export function isSuiSystemStateInner(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::sui_system_state_inner::SuiSystemStateInner`;
}

export interface SuiSystemStateInnerFields {
  epoch: ToField<"u64">;
  protocolVersion: ToField<"u64">;
  systemStateVersion: ToField<"u64">;
  validators: ToField<ValidatorSet>;
  storageFund: ToField<StorageFund>;
  parameters: ToField<SystemParameters>;
  referenceGasPrice: ToField<"u64">;
  validatorReportRecords: ToField<VecMap<"address", VecSet<"address">>>;
  stakeSubsidy: ToField<StakeSubsidy>;
  safeMode: ToField<"bool">;
  safeModeStorageRewards: ToField<Balance<ToPhantom<SUI>>>;
  safeModeComputationRewards: ToField<Balance<ToPhantom<SUI>>>;
  safeModeStorageRebates: ToField<"u64">;
  safeModeNonRefundableStorageFee: ToField<"u64">;
  epochStartTimestampMs: ToField<"u64">;
  extraFields: ToField<Bag>;
}

export type SuiSystemStateInnerReified = Reified<
  SuiSystemStateInner,
  SuiSystemStateInnerFields
>;

export class SuiSystemStateInner implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::sui_system_state_inner::SuiSystemStateInner`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SuiSystemStateInner.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::sui_system_state_inner::SuiSystemStateInner`;
  readonly $typeArgs: [];
  readonly $isPhantom = SuiSystemStateInner.$isPhantom;

  readonly epoch: ToField<"u64">;
  readonly protocolVersion: ToField<"u64">;
  readonly systemStateVersion: ToField<"u64">;
  readonly validators: ToField<ValidatorSet>;
  readonly storageFund: ToField<StorageFund>;
  readonly parameters: ToField<SystemParameters>;
  readonly referenceGasPrice: ToField<"u64">;
  readonly validatorReportRecords: ToField<
    VecMap<"address", VecSet<"address">>
  >;
  readonly stakeSubsidy: ToField<StakeSubsidy>;
  readonly safeMode: ToField<"bool">;
  readonly safeModeStorageRewards: ToField<Balance<ToPhantom<SUI>>>;
  readonly safeModeComputationRewards: ToField<Balance<ToPhantom<SUI>>>;
  readonly safeModeStorageRebates: ToField<"u64">;
  readonly safeModeNonRefundableStorageFee: ToField<"u64">;
  readonly epochStartTimestampMs: ToField<"u64">;
  readonly extraFields: ToField<Bag>;

  private constructor(typeArgs: [], fields: SuiSystemStateInnerFields) {
    this.$fullTypeName = composeSuiType(
      SuiSystemStateInner.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::sui_system_state_inner::SuiSystemStateInner`;
    this.$typeArgs = typeArgs;

    this.epoch = fields.epoch;
    this.protocolVersion = fields.protocolVersion;
    this.systemStateVersion = fields.systemStateVersion;
    this.validators = fields.validators;
    this.storageFund = fields.storageFund;
    this.parameters = fields.parameters;
    this.referenceGasPrice = fields.referenceGasPrice;
    this.validatorReportRecords = fields.validatorReportRecords;
    this.stakeSubsidy = fields.stakeSubsidy;
    this.safeMode = fields.safeMode;
    this.safeModeStorageRewards = fields.safeModeStorageRewards;
    this.safeModeComputationRewards = fields.safeModeComputationRewards;
    this.safeModeStorageRebates = fields.safeModeStorageRebates;
    this.safeModeNonRefundableStorageFee =
      fields.safeModeNonRefundableStorageFee;
    this.epochStartTimestampMs = fields.epochStartTimestampMs;
    this.extraFields = fields.extraFields;
  }

  static reified(): SuiSystemStateInnerReified {
    return {
      typeName: SuiSystemStateInner.$typeName,
      fullTypeName: composeSuiType(
        SuiSystemStateInner.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::sui_system_state_inner::SuiSystemStateInner`,
      typeArgs: [] as [],
      isPhantom: SuiSystemStateInner.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        SuiSystemStateInner.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SuiSystemStateInner.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SuiSystemStateInner.fromBcs(data),
      bcs: SuiSystemStateInner.bcs,
      fromJSONField: (field: any) => SuiSystemStateInner.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        SuiSystemStateInner.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SuiSystemStateInner.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SuiSystemStateInner.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SuiSystemStateInner.fetch(client, id),
      new: (fields: SuiSystemStateInnerFields) => {
        return new SuiSystemStateInner([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SuiSystemStateInner.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SuiSystemStateInner>> {
    return phantom(SuiSystemStateInner.reified());
  }
  static get p() {
    return SuiSystemStateInner.phantom();
  }

  static get bcs() {
    return bcs.struct("SuiSystemStateInner", {
      epoch: bcs.u64(),
      protocol_version: bcs.u64(),
      system_state_version: bcs.u64(),
      validators: ValidatorSet.bcs,
      storage_fund: StorageFund.bcs,
      parameters: SystemParameters.bcs,
      reference_gas_price: bcs.u64(),
      validator_report_records: VecMap.bcs(
        bcs
          .bytes(32)
          .transform({
            input: (val: string) => fromHEX(val),
            output: (val: Uint8Array) => toHEX(val),
          }),
        VecSet.bcs(
          bcs
            .bytes(32)
            .transform({
              input: (val: string) => fromHEX(val),
              output: (val: Uint8Array) => toHEX(val),
            }),
        ),
      ),
      stake_subsidy: StakeSubsidy.bcs,
      safe_mode: bcs.bool(),
      safe_mode_storage_rewards: Balance.bcs,
      safe_mode_computation_rewards: Balance.bcs,
      safe_mode_storage_rebates: bcs.u64(),
      safe_mode_non_refundable_storage_fee: bcs.u64(),
      epoch_start_timestamp_ms: bcs.u64(),
      extra_fields: Bag.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): SuiSystemStateInner {
    return SuiSystemStateInner.reified().new({
      epoch: decodeFromFields("u64", fields.epoch),
      protocolVersion: decodeFromFields("u64", fields.protocol_version),
      systemStateVersion: decodeFromFields("u64", fields.system_state_version),
      validators: decodeFromFields(ValidatorSet.reified(), fields.validators),
      storageFund: decodeFromFields(StorageFund.reified(), fields.storage_fund),
      parameters: decodeFromFields(
        SystemParameters.reified(),
        fields.parameters,
      ),
      referenceGasPrice: decodeFromFields("u64", fields.reference_gas_price),
      validatorReportRecords: decodeFromFields(
        VecMap.reified("address", VecSet.reified("address")),
        fields.validator_report_records,
      ),
      stakeSubsidy: decodeFromFields(
        StakeSubsidy.reified(),
        fields.stake_subsidy,
      ),
      safeMode: decodeFromFields("bool", fields.safe_mode),
      safeModeStorageRewards: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.safe_mode_storage_rewards,
      ),
      safeModeComputationRewards: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.safe_mode_computation_rewards,
      ),
      safeModeStorageRebates: decodeFromFields(
        "u64",
        fields.safe_mode_storage_rebates,
      ),
      safeModeNonRefundableStorageFee: decodeFromFields(
        "u64",
        fields.safe_mode_non_refundable_storage_fee,
      ),
      epochStartTimestampMs: decodeFromFields(
        "u64",
        fields.epoch_start_timestamp_ms,
      ),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SuiSystemStateInner {
    if (!isSuiSystemStateInner(item.type)) {
      throw new Error("not a SuiSystemStateInner type");
    }

    return SuiSystemStateInner.reified().new({
      epoch: decodeFromFieldsWithTypes("u64", item.fields.epoch),
      protocolVersion: decodeFromFieldsWithTypes(
        "u64",
        item.fields.protocol_version,
      ),
      systemStateVersion: decodeFromFieldsWithTypes(
        "u64",
        item.fields.system_state_version,
      ),
      validators: decodeFromFieldsWithTypes(
        ValidatorSet.reified(),
        item.fields.validators,
      ),
      storageFund: decodeFromFieldsWithTypes(
        StorageFund.reified(),
        item.fields.storage_fund,
      ),
      parameters: decodeFromFieldsWithTypes(
        SystemParameters.reified(),
        item.fields.parameters,
      ),
      referenceGasPrice: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reference_gas_price,
      ),
      validatorReportRecords: decodeFromFieldsWithTypes(
        VecMap.reified("address", VecSet.reified("address")),
        item.fields.validator_report_records,
      ),
      stakeSubsidy: decodeFromFieldsWithTypes(
        StakeSubsidy.reified(),
        item.fields.stake_subsidy,
      ),
      safeMode: decodeFromFieldsWithTypes("bool", item.fields.safe_mode),
      safeModeStorageRewards: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.safe_mode_storage_rewards,
      ),
      safeModeComputationRewards: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.safe_mode_computation_rewards,
      ),
      safeModeStorageRebates: decodeFromFieldsWithTypes(
        "u64",
        item.fields.safe_mode_storage_rebates,
      ),
      safeModeNonRefundableStorageFee: decodeFromFieldsWithTypes(
        "u64",
        item.fields.safe_mode_non_refundable_storage_fee,
      ),
      epochStartTimestampMs: decodeFromFieldsWithTypes(
        "u64",
        item.fields.epoch_start_timestamp_ms,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs(data: Uint8Array): SuiSystemStateInner {
    return SuiSystemStateInner.fromFields(SuiSystemStateInner.bcs.parse(data));
  }

  toJSONField() {
    return {
      epoch: this.epoch.toString(),
      protocolVersion: this.protocolVersion.toString(),
      systemStateVersion: this.systemStateVersion.toString(),
      validators: this.validators.toJSONField(),
      storageFund: this.storageFund.toJSONField(),
      parameters: this.parameters.toJSONField(),
      referenceGasPrice: this.referenceGasPrice.toString(),
      validatorReportRecords: this.validatorReportRecords.toJSONField(),
      stakeSubsidy: this.stakeSubsidy.toJSONField(),
      safeMode: this.safeMode,
      safeModeStorageRewards: this.safeModeStorageRewards.toJSONField(),
      safeModeComputationRewards: this.safeModeComputationRewards.toJSONField(),
      safeModeStorageRebates: this.safeModeStorageRebates.toString(),
      safeModeNonRefundableStorageFee:
        this.safeModeNonRefundableStorageFee.toString(),
      epochStartTimestampMs: this.epochStartTimestampMs.toString(),
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

  static fromJSONField(field: any): SuiSystemStateInner {
    return SuiSystemStateInner.reified().new({
      epoch: decodeFromJSONField("u64", field.epoch),
      protocolVersion: decodeFromJSONField("u64", field.protocolVersion),
      systemStateVersion: decodeFromJSONField("u64", field.systemStateVersion),
      validators: decodeFromJSONField(ValidatorSet.reified(), field.validators),
      storageFund: decodeFromJSONField(
        StorageFund.reified(),
        field.storageFund,
      ),
      parameters: decodeFromJSONField(
        SystemParameters.reified(),
        field.parameters,
      ),
      referenceGasPrice: decodeFromJSONField("u64", field.referenceGasPrice),
      validatorReportRecords: decodeFromJSONField(
        VecMap.reified("address", VecSet.reified("address")),
        field.validatorReportRecords,
      ),
      stakeSubsidy: decodeFromJSONField(
        StakeSubsidy.reified(),
        field.stakeSubsidy,
      ),
      safeMode: decodeFromJSONField("bool", field.safeMode),
      safeModeStorageRewards: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.safeModeStorageRewards,
      ),
      safeModeComputationRewards: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.safeModeComputationRewards,
      ),
      safeModeStorageRebates: decodeFromJSONField(
        "u64",
        field.safeModeStorageRebates,
      ),
      safeModeNonRefundableStorageFee: decodeFromJSONField(
        "u64",
        field.safeModeNonRefundableStorageFee,
      ),
      epochStartTimestampMs: decodeFromJSONField(
        "u64",
        field.epochStartTimestampMs,
      ),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON(json: Record<string, any>): SuiSystemStateInner {
    if (json.$typeName !== SuiSystemStateInner.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SuiSystemStateInner.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SuiSystemStateInner {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSuiSystemStateInner(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SuiSystemStateInner object`,
      );
    }
    return SuiSystemStateInner.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SuiSystemStateInner {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isSuiSystemStateInner(data.bcs.type)
      ) {
        throw new Error(`object at is not a SuiSystemStateInner object`);
      }

      return SuiSystemStateInner.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SuiSystemStateInner.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<SuiSystemStateInner> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SuiSystemStateInner object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSuiSystemStateInner(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a SuiSystemStateInner object`);
    }

    return SuiSystemStateInner.fromSuiObjectData(res.data);
  }
}

/* ============================== SuiSystemStateInnerV2 =============================== */

export function isSuiSystemStateInnerV2(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::sui_system_state_inner::SuiSystemStateInnerV2`;
}

export interface SuiSystemStateInnerV2Fields {
  epoch: ToField<"u64">;
  protocolVersion: ToField<"u64">;
  systemStateVersion: ToField<"u64">;
  validators: ToField<ValidatorSet>;
  storageFund: ToField<StorageFund>;
  parameters: ToField<SystemParametersV2>;
  referenceGasPrice: ToField<"u64">;
  validatorReportRecords: ToField<VecMap<"address", VecSet<"address">>>;
  stakeSubsidy: ToField<StakeSubsidy>;
  safeMode: ToField<"bool">;
  safeModeStorageRewards: ToField<Balance<ToPhantom<SUI>>>;
  safeModeComputationRewards: ToField<Balance<ToPhantom<SUI>>>;
  safeModeStorageRebates: ToField<"u64">;
  safeModeNonRefundableStorageFee: ToField<"u64">;
  epochStartTimestampMs: ToField<"u64">;
  extraFields: ToField<Bag>;
}

export type SuiSystemStateInnerV2Reified = Reified<
  SuiSystemStateInnerV2,
  SuiSystemStateInnerV2Fields
>;

export class SuiSystemStateInnerV2 implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::sui_system_state_inner::SuiSystemStateInnerV2`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SuiSystemStateInnerV2.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::sui_system_state_inner::SuiSystemStateInnerV2`;
  readonly $typeArgs: [];
  readonly $isPhantom = SuiSystemStateInnerV2.$isPhantom;

  readonly epoch: ToField<"u64">;
  readonly protocolVersion: ToField<"u64">;
  readonly systemStateVersion: ToField<"u64">;
  readonly validators: ToField<ValidatorSet>;
  readonly storageFund: ToField<StorageFund>;
  readonly parameters: ToField<SystemParametersV2>;
  readonly referenceGasPrice: ToField<"u64">;
  readonly validatorReportRecords: ToField<
    VecMap<"address", VecSet<"address">>
  >;
  readonly stakeSubsidy: ToField<StakeSubsidy>;
  readonly safeMode: ToField<"bool">;
  readonly safeModeStorageRewards: ToField<Balance<ToPhantom<SUI>>>;
  readonly safeModeComputationRewards: ToField<Balance<ToPhantom<SUI>>>;
  readonly safeModeStorageRebates: ToField<"u64">;
  readonly safeModeNonRefundableStorageFee: ToField<"u64">;
  readonly epochStartTimestampMs: ToField<"u64">;
  readonly extraFields: ToField<Bag>;

  private constructor(typeArgs: [], fields: SuiSystemStateInnerV2Fields) {
    this.$fullTypeName = composeSuiType(
      SuiSystemStateInnerV2.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::sui_system_state_inner::SuiSystemStateInnerV2`;
    this.$typeArgs = typeArgs;

    this.epoch = fields.epoch;
    this.protocolVersion = fields.protocolVersion;
    this.systemStateVersion = fields.systemStateVersion;
    this.validators = fields.validators;
    this.storageFund = fields.storageFund;
    this.parameters = fields.parameters;
    this.referenceGasPrice = fields.referenceGasPrice;
    this.validatorReportRecords = fields.validatorReportRecords;
    this.stakeSubsidy = fields.stakeSubsidy;
    this.safeMode = fields.safeMode;
    this.safeModeStorageRewards = fields.safeModeStorageRewards;
    this.safeModeComputationRewards = fields.safeModeComputationRewards;
    this.safeModeStorageRebates = fields.safeModeStorageRebates;
    this.safeModeNonRefundableStorageFee =
      fields.safeModeNonRefundableStorageFee;
    this.epochStartTimestampMs = fields.epochStartTimestampMs;
    this.extraFields = fields.extraFields;
  }

  static reified(): SuiSystemStateInnerV2Reified {
    return {
      typeName: SuiSystemStateInnerV2.$typeName,
      fullTypeName: composeSuiType(
        SuiSystemStateInnerV2.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::sui_system_state_inner::SuiSystemStateInnerV2`,
      typeArgs: [] as [],
      isPhantom: SuiSystemStateInnerV2.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        SuiSystemStateInnerV2.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SuiSystemStateInnerV2.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SuiSystemStateInnerV2.fromBcs(data),
      bcs: SuiSystemStateInnerV2.bcs,
      fromJSONField: (field: any) => SuiSystemStateInnerV2.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        SuiSystemStateInnerV2.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SuiSystemStateInnerV2.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SuiSystemStateInnerV2.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SuiSystemStateInnerV2.fetch(client, id),
      new: (fields: SuiSystemStateInnerV2Fields) => {
        return new SuiSystemStateInnerV2([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SuiSystemStateInnerV2.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SuiSystemStateInnerV2>> {
    return phantom(SuiSystemStateInnerV2.reified());
  }
  static get p() {
    return SuiSystemStateInnerV2.phantom();
  }

  static get bcs() {
    return bcs.struct("SuiSystemStateInnerV2", {
      epoch: bcs.u64(),
      protocol_version: bcs.u64(),
      system_state_version: bcs.u64(),
      validators: ValidatorSet.bcs,
      storage_fund: StorageFund.bcs,
      parameters: SystemParametersV2.bcs,
      reference_gas_price: bcs.u64(),
      validator_report_records: VecMap.bcs(
        bcs
          .bytes(32)
          .transform({
            input: (val: string) => fromHEX(val),
            output: (val: Uint8Array) => toHEX(val),
          }),
        VecSet.bcs(
          bcs
            .bytes(32)
            .transform({
              input: (val: string) => fromHEX(val),
              output: (val: Uint8Array) => toHEX(val),
            }),
        ),
      ),
      stake_subsidy: StakeSubsidy.bcs,
      safe_mode: bcs.bool(),
      safe_mode_storage_rewards: Balance.bcs,
      safe_mode_computation_rewards: Balance.bcs,
      safe_mode_storage_rebates: bcs.u64(),
      safe_mode_non_refundable_storage_fee: bcs.u64(),
      epoch_start_timestamp_ms: bcs.u64(),
      extra_fields: Bag.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): SuiSystemStateInnerV2 {
    return SuiSystemStateInnerV2.reified().new({
      epoch: decodeFromFields("u64", fields.epoch),
      protocolVersion: decodeFromFields("u64", fields.protocol_version),
      systemStateVersion: decodeFromFields("u64", fields.system_state_version),
      validators: decodeFromFields(ValidatorSet.reified(), fields.validators),
      storageFund: decodeFromFields(StorageFund.reified(), fields.storage_fund),
      parameters: decodeFromFields(
        SystemParametersV2.reified(),
        fields.parameters,
      ),
      referenceGasPrice: decodeFromFields("u64", fields.reference_gas_price),
      validatorReportRecords: decodeFromFields(
        VecMap.reified("address", VecSet.reified("address")),
        fields.validator_report_records,
      ),
      stakeSubsidy: decodeFromFields(
        StakeSubsidy.reified(),
        fields.stake_subsidy,
      ),
      safeMode: decodeFromFields("bool", fields.safe_mode),
      safeModeStorageRewards: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.safe_mode_storage_rewards,
      ),
      safeModeComputationRewards: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.safe_mode_computation_rewards,
      ),
      safeModeStorageRebates: decodeFromFields(
        "u64",
        fields.safe_mode_storage_rebates,
      ),
      safeModeNonRefundableStorageFee: decodeFromFields(
        "u64",
        fields.safe_mode_non_refundable_storage_fee,
      ),
      epochStartTimestampMs: decodeFromFields(
        "u64",
        fields.epoch_start_timestamp_ms,
      ),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SuiSystemStateInnerV2 {
    if (!isSuiSystemStateInnerV2(item.type)) {
      throw new Error("not a SuiSystemStateInnerV2 type");
    }

    return SuiSystemStateInnerV2.reified().new({
      epoch: decodeFromFieldsWithTypes("u64", item.fields.epoch),
      protocolVersion: decodeFromFieldsWithTypes(
        "u64",
        item.fields.protocol_version,
      ),
      systemStateVersion: decodeFromFieldsWithTypes(
        "u64",
        item.fields.system_state_version,
      ),
      validators: decodeFromFieldsWithTypes(
        ValidatorSet.reified(),
        item.fields.validators,
      ),
      storageFund: decodeFromFieldsWithTypes(
        StorageFund.reified(),
        item.fields.storage_fund,
      ),
      parameters: decodeFromFieldsWithTypes(
        SystemParametersV2.reified(),
        item.fields.parameters,
      ),
      referenceGasPrice: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reference_gas_price,
      ),
      validatorReportRecords: decodeFromFieldsWithTypes(
        VecMap.reified("address", VecSet.reified("address")),
        item.fields.validator_report_records,
      ),
      stakeSubsidy: decodeFromFieldsWithTypes(
        StakeSubsidy.reified(),
        item.fields.stake_subsidy,
      ),
      safeMode: decodeFromFieldsWithTypes("bool", item.fields.safe_mode),
      safeModeStorageRewards: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.safe_mode_storage_rewards,
      ),
      safeModeComputationRewards: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.safe_mode_computation_rewards,
      ),
      safeModeStorageRebates: decodeFromFieldsWithTypes(
        "u64",
        item.fields.safe_mode_storage_rebates,
      ),
      safeModeNonRefundableStorageFee: decodeFromFieldsWithTypes(
        "u64",
        item.fields.safe_mode_non_refundable_storage_fee,
      ),
      epochStartTimestampMs: decodeFromFieldsWithTypes(
        "u64",
        item.fields.epoch_start_timestamp_ms,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs(data: Uint8Array): SuiSystemStateInnerV2 {
    return SuiSystemStateInnerV2.fromFields(
      SuiSystemStateInnerV2.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      epoch: this.epoch.toString(),
      protocolVersion: this.protocolVersion.toString(),
      systemStateVersion: this.systemStateVersion.toString(),
      validators: this.validators.toJSONField(),
      storageFund: this.storageFund.toJSONField(),
      parameters: this.parameters.toJSONField(),
      referenceGasPrice: this.referenceGasPrice.toString(),
      validatorReportRecords: this.validatorReportRecords.toJSONField(),
      stakeSubsidy: this.stakeSubsidy.toJSONField(),
      safeMode: this.safeMode,
      safeModeStorageRewards: this.safeModeStorageRewards.toJSONField(),
      safeModeComputationRewards: this.safeModeComputationRewards.toJSONField(),
      safeModeStorageRebates: this.safeModeStorageRebates.toString(),
      safeModeNonRefundableStorageFee:
        this.safeModeNonRefundableStorageFee.toString(),
      epochStartTimestampMs: this.epochStartTimestampMs.toString(),
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

  static fromJSONField(field: any): SuiSystemStateInnerV2 {
    return SuiSystemStateInnerV2.reified().new({
      epoch: decodeFromJSONField("u64", field.epoch),
      protocolVersion: decodeFromJSONField("u64", field.protocolVersion),
      systemStateVersion: decodeFromJSONField("u64", field.systemStateVersion),
      validators: decodeFromJSONField(ValidatorSet.reified(), field.validators),
      storageFund: decodeFromJSONField(
        StorageFund.reified(),
        field.storageFund,
      ),
      parameters: decodeFromJSONField(
        SystemParametersV2.reified(),
        field.parameters,
      ),
      referenceGasPrice: decodeFromJSONField("u64", field.referenceGasPrice),
      validatorReportRecords: decodeFromJSONField(
        VecMap.reified("address", VecSet.reified("address")),
        field.validatorReportRecords,
      ),
      stakeSubsidy: decodeFromJSONField(
        StakeSubsidy.reified(),
        field.stakeSubsidy,
      ),
      safeMode: decodeFromJSONField("bool", field.safeMode),
      safeModeStorageRewards: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.safeModeStorageRewards,
      ),
      safeModeComputationRewards: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.safeModeComputationRewards,
      ),
      safeModeStorageRebates: decodeFromJSONField(
        "u64",
        field.safeModeStorageRebates,
      ),
      safeModeNonRefundableStorageFee: decodeFromJSONField(
        "u64",
        field.safeModeNonRefundableStorageFee,
      ),
      epochStartTimestampMs: decodeFromJSONField(
        "u64",
        field.epochStartTimestampMs,
      ),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON(json: Record<string, any>): SuiSystemStateInnerV2 {
    if (json.$typeName !== SuiSystemStateInnerV2.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SuiSystemStateInnerV2.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SuiSystemStateInnerV2 {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSuiSystemStateInnerV2(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SuiSystemStateInnerV2 object`,
      );
    }
    return SuiSystemStateInnerV2.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SuiSystemStateInnerV2 {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isSuiSystemStateInnerV2(data.bcs.type)
      ) {
        throw new Error(`object at is not a SuiSystemStateInnerV2 object`);
      }

      return SuiSystemStateInnerV2.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SuiSystemStateInnerV2.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<SuiSystemStateInnerV2> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SuiSystemStateInnerV2 object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSuiSystemStateInnerV2(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a SuiSystemStateInnerV2 object`,
      );
    }

    return SuiSystemStateInnerV2.fromSuiObjectData(res.data);
  }
}

/* ============================== SystemEpochInfoEvent =============================== */

export function isSystemEpochInfoEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::sui_system_state_inner::SystemEpochInfoEvent`;
}

export interface SystemEpochInfoEventFields {
  epoch: ToField<"u64">;
  protocolVersion: ToField<"u64">;
  referenceGasPrice: ToField<"u64">;
  totalStake: ToField<"u64">;
  storageFundReinvestment: ToField<"u64">;
  storageCharge: ToField<"u64">;
  storageRebate: ToField<"u64">;
  storageFundBalance: ToField<"u64">;
  stakeSubsidyAmount: ToField<"u64">;
  totalGasFees: ToField<"u64">;
  totalStakeRewardsDistributed: ToField<"u64">;
  leftoverStorageFundInflow: ToField<"u64">;
}

export type SystemEpochInfoEventReified = Reified<
  SystemEpochInfoEvent,
  SystemEpochInfoEventFields
>;

export class SystemEpochInfoEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::sui_system_state_inner::SystemEpochInfoEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SystemEpochInfoEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::sui_system_state_inner::SystemEpochInfoEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = SystemEpochInfoEvent.$isPhantom;

  readonly epoch: ToField<"u64">;
  readonly protocolVersion: ToField<"u64">;
  readonly referenceGasPrice: ToField<"u64">;
  readonly totalStake: ToField<"u64">;
  readonly storageFundReinvestment: ToField<"u64">;
  readonly storageCharge: ToField<"u64">;
  readonly storageRebate: ToField<"u64">;
  readonly storageFundBalance: ToField<"u64">;
  readonly stakeSubsidyAmount: ToField<"u64">;
  readonly totalGasFees: ToField<"u64">;
  readonly totalStakeRewardsDistributed: ToField<"u64">;
  readonly leftoverStorageFundInflow: ToField<"u64">;

  private constructor(typeArgs: [], fields: SystemEpochInfoEventFields) {
    this.$fullTypeName = composeSuiType(
      SystemEpochInfoEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::sui_system_state_inner::SystemEpochInfoEvent`;
    this.$typeArgs = typeArgs;

    this.epoch = fields.epoch;
    this.protocolVersion = fields.protocolVersion;
    this.referenceGasPrice = fields.referenceGasPrice;
    this.totalStake = fields.totalStake;
    this.storageFundReinvestment = fields.storageFundReinvestment;
    this.storageCharge = fields.storageCharge;
    this.storageRebate = fields.storageRebate;
    this.storageFundBalance = fields.storageFundBalance;
    this.stakeSubsidyAmount = fields.stakeSubsidyAmount;
    this.totalGasFees = fields.totalGasFees;
    this.totalStakeRewardsDistributed = fields.totalStakeRewardsDistributed;
    this.leftoverStorageFundInflow = fields.leftoverStorageFundInflow;
  }

  static reified(): SystemEpochInfoEventReified {
    return {
      typeName: SystemEpochInfoEvent.$typeName,
      fullTypeName: composeSuiType(
        SystemEpochInfoEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::sui_system_state_inner::SystemEpochInfoEvent`,
      typeArgs: [] as [],
      isPhantom: SystemEpochInfoEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        SystemEpochInfoEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SystemEpochInfoEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SystemEpochInfoEvent.fromBcs(data),
      bcs: SystemEpochInfoEvent.bcs,
      fromJSONField: (field: any) => SystemEpochInfoEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        SystemEpochInfoEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SystemEpochInfoEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SystemEpochInfoEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SystemEpochInfoEvent.fetch(client, id),
      new: (fields: SystemEpochInfoEventFields) => {
        return new SystemEpochInfoEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SystemEpochInfoEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SystemEpochInfoEvent>> {
    return phantom(SystemEpochInfoEvent.reified());
  }
  static get p() {
    return SystemEpochInfoEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("SystemEpochInfoEvent", {
      epoch: bcs.u64(),
      protocol_version: bcs.u64(),
      reference_gas_price: bcs.u64(),
      total_stake: bcs.u64(),
      storage_fund_reinvestment: bcs.u64(),
      storage_charge: bcs.u64(),
      storage_rebate: bcs.u64(),
      storage_fund_balance: bcs.u64(),
      stake_subsidy_amount: bcs.u64(),
      total_gas_fees: bcs.u64(),
      total_stake_rewards_distributed: bcs.u64(),
      leftover_storage_fund_inflow: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): SystemEpochInfoEvent {
    return SystemEpochInfoEvent.reified().new({
      epoch: decodeFromFields("u64", fields.epoch),
      protocolVersion: decodeFromFields("u64", fields.protocol_version),
      referenceGasPrice: decodeFromFields("u64", fields.reference_gas_price),
      totalStake: decodeFromFields("u64", fields.total_stake),
      storageFundReinvestment: decodeFromFields(
        "u64",
        fields.storage_fund_reinvestment,
      ),
      storageCharge: decodeFromFields("u64", fields.storage_charge),
      storageRebate: decodeFromFields("u64", fields.storage_rebate),
      storageFundBalance: decodeFromFields("u64", fields.storage_fund_balance),
      stakeSubsidyAmount: decodeFromFields("u64", fields.stake_subsidy_amount),
      totalGasFees: decodeFromFields("u64", fields.total_gas_fees),
      totalStakeRewardsDistributed: decodeFromFields(
        "u64",
        fields.total_stake_rewards_distributed,
      ),
      leftoverStorageFundInflow: decodeFromFields(
        "u64",
        fields.leftover_storage_fund_inflow,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SystemEpochInfoEvent {
    if (!isSystemEpochInfoEvent(item.type)) {
      throw new Error("not a SystemEpochInfoEvent type");
    }

    return SystemEpochInfoEvent.reified().new({
      epoch: decodeFromFieldsWithTypes("u64", item.fields.epoch),
      protocolVersion: decodeFromFieldsWithTypes(
        "u64",
        item.fields.protocol_version,
      ),
      referenceGasPrice: decodeFromFieldsWithTypes(
        "u64",
        item.fields.reference_gas_price,
      ),
      totalStake: decodeFromFieldsWithTypes("u64", item.fields.total_stake),
      storageFundReinvestment: decodeFromFieldsWithTypes(
        "u64",
        item.fields.storage_fund_reinvestment,
      ),
      storageCharge: decodeFromFieldsWithTypes(
        "u64",
        item.fields.storage_charge,
      ),
      storageRebate: decodeFromFieldsWithTypes(
        "u64",
        item.fields.storage_rebate,
      ),
      storageFundBalance: decodeFromFieldsWithTypes(
        "u64",
        item.fields.storage_fund_balance,
      ),
      stakeSubsidyAmount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.stake_subsidy_amount,
      ),
      totalGasFees: decodeFromFieldsWithTypes(
        "u64",
        item.fields.total_gas_fees,
      ),
      totalStakeRewardsDistributed: decodeFromFieldsWithTypes(
        "u64",
        item.fields.total_stake_rewards_distributed,
      ),
      leftoverStorageFundInflow: decodeFromFieldsWithTypes(
        "u64",
        item.fields.leftover_storage_fund_inflow,
      ),
    });
  }

  static fromBcs(data: Uint8Array): SystemEpochInfoEvent {
    return SystemEpochInfoEvent.fromFields(
      SystemEpochInfoEvent.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      epoch: this.epoch.toString(),
      protocolVersion: this.protocolVersion.toString(),
      referenceGasPrice: this.referenceGasPrice.toString(),
      totalStake: this.totalStake.toString(),
      storageFundReinvestment: this.storageFundReinvestment.toString(),
      storageCharge: this.storageCharge.toString(),
      storageRebate: this.storageRebate.toString(),
      storageFundBalance: this.storageFundBalance.toString(),
      stakeSubsidyAmount: this.stakeSubsidyAmount.toString(),
      totalGasFees: this.totalGasFees.toString(),
      totalStakeRewardsDistributed:
        this.totalStakeRewardsDistributed.toString(),
      leftoverStorageFundInflow: this.leftoverStorageFundInflow.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): SystemEpochInfoEvent {
    return SystemEpochInfoEvent.reified().new({
      epoch: decodeFromJSONField("u64", field.epoch),
      protocolVersion: decodeFromJSONField("u64", field.protocolVersion),
      referenceGasPrice: decodeFromJSONField("u64", field.referenceGasPrice),
      totalStake: decodeFromJSONField("u64", field.totalStake),
      storageFundReinvestment: decodeFromJSONField(
        "u64",
        field.storageFundReinvestment,
      ),
      storageCharge: decodeFromJSONField("u64", field.storageCharge),
      storageRebate: decodeFromJSONField("u64", field.storageRebate),
      storageFundBalance: decodeFromJSONField("u64", field.storageFundBalance),
      stakeSubsidyAmount: decodeFromJSONField("u64", field.stakeSubsidyAmount),
      totalGasFees: decodeFromJSONField("u64", field.totalGasFees),
      totalStakeRewardsDistributed: decodeFromJSONField(
        "u64",
        field.totalStakeRewardsDistributed,
      ),
      leftoverStorageFundInflow: decodeFromJSONField(
        "u64",
        field.leftoverStorageFundInflow,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): SystemEpochInfoEvent {
    if (json.$typeName !== SystemEpochInfoEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SystemEpochInfoEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SystemEpochInfoEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSystemEpochInfoEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SystemEpochInfoEvent object`,
      );
    }
    return SystemEpochInfoEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SystemEpochInfoEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isSystemEpochInfoEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a SystemEpochInfoEvent object`);
      }

      return SystemEpochInfoEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SystemEpochInfoEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<SystemEpochInfoEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SystemEpochInfoEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSystemEpochInfoEvent(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a SystemEpochInfoEvent object`,
      );
    }

    return SystemEpochInfoEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== SystemParameters =============================== */

export function isSystemParameters(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::sui_system_state_inner::SystemParameters`;
}

export interface SystemParametersFields {
  epochDurationMs: ToField<"u64">;
  stakeSubsidyStartEpoch: ToField<"u64">;
  maxValidatorCount: ToField<"u64">;
  minValidatorJoiningStake: ToField<"u64">;
  validatorLowStakeThreshold: ToField<"u64">;
  validatorVeryLowStakeThreshold: ToField<"u64">;
  validatorLowStakeGracePeriod: ToField<"u64">;
  extraFields: ToField<Bag>;
}

export type SystemParametersReified = Reified<
  SystemParameters,
  SystemParametersFields
>;

export class SystemParameters implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::sui_system_state_inner::SystemParameters`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SystemParameters.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::sui_system_state_inner::SystemParameters`;
  readonly $typeArgs: [];
  readonly $isPhantom = SystemParameters.$isPhantom;

  readonly epochDurationMs: ToField<"u64">;
  readonly stakeSubsidyStartEpoch: ToField<"u64">;
  readonly maxValidatorCount: ToField<"u64">;
  readonly minValidatorJoiningStake: ToField<"u64">;
  readonly validatorLowStakeThreshold: ToField<"u64">;
  readonly validatorVeryLowStakeThreshold: ToField<"u64">;
  readonly validatorLowStakeGracePeriod: ToField<"u64">;
  readonly extraFields: ToField<Bag>;

  private constructor(typeArgs: [], fields: SystemParametersFields) {
    this.$fullTypeName = composeSuiType(
      SystemParameters.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::sui_system_state_inner::SystemParameters`;
    this.$typeArgs = typeArgs;

    this.epochDurationMs = fields.epochDurationMs;
    this.stakeSubsidyStartEpoch = fields.stakeSubsidyStartEpoch;
    this.maxValidatorCount = fields.maxValidatorCount;
    this.minValidatorJoiningStake = fields.minValidatorJoiningStake;
    this.validatorLowStakeThreshold = fields.validatorLowStakeThreshold;
    this.validatorVeryLowStakeThreshold = fields.validatorVeryLowStakeThreshold;
    this.validatorLowStakeGracePeriod = fields.validatorLowStakeGracePeriod;
    this.extraFields = fields.extraFields;
  }

  static reified(): SystemParametersReified {
    return {
      typeName: SystemParameters.$typeName,
      fullTypeName: composeSuiType(
        SystemParameters.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::sui_system_state_inner::SystemParameters`,
      typeArgs: [] as [],
      isPhantom: SystemParameters.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        SystemParameters.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SystemParameters.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SystemParameters.fromBcs(data),
      bcs: SystemParameters.bcs,
      fromJSONField: (field: any) => SystemParameters.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => SystemParameters.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SystemParameters.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SystemParameters.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SystemParameters.fetch(client, id),
      new: (fields: SystemParametersFields) => {
        return new SystemParameters([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SystemParameters.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SystemParameters>> {
    return phantom(SystemParameters.reified());
  }
  static get p() {
    return SystemParameters.phantom();
  }

  static get bcs() {
    return bcs.struct("SystemParameters", {
      epoch_duration_ms: bcs.u64(),
      stake_subsidy_start_epoch: bcs.u64(),
      max_validator_count: bcs.u64(),
      min_validator_joining_stake: bcs.u64(),
      validator_low_stake_threshold: bcs.u64(),
      validator_very_low_stake_threshold: bcs.u64(),
      validator_low_stake_grace_period: bcs.u64(),
      extra_fields: Bag.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): SystemParameters {
    return SystemParameters.reified().new({
      epochDurationMs: decodeFromFields("u64", fields.epoch_duration_ms),
      stakeSubsidyStartEpoch: decodeFromFields(
        "u64",
        fields.stake_subsidy_start_epoch,
      ),
      maxValidatorCount: decodeFromFields("u64", fields.max_validator_count),
      minValidatorJoiningStake: decodeFromFields(
        "u64",
        fields.min_validator_joining_stake,
      ),
      validatorLowStakeThreshold: decodeFromFields(
        "u64",
        fields.validator_low_stake_threshold,
      ),
      validatorVeryLowStakeThreshold: decodeFromFields(
        "u64",
        fields.validator_very_low_stake_threshold,
      ),
      validatorLowStakeGracePeriod: decodeFromFields(
        "u64",
        fields.validator_low_stake_grace_period,
      ),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SystemParameters {
    if (!isSystemParameters(item.type)) {
      throw new Error("not a SystemParameters type");
    }

    return SystemParameters.reified().new({
      epochDurationMs: decodeFromFieldsWithTypes(
        "u64",
        item.fields.epoch_duration_ms,
      ),
      stakeSubsidyStartEpoch: decodeFromFieldsWithTypes(
        "u64",
        item.fields.stake_subsidy_start_epoch,
      ),
      maxValidatorCount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.max_validator_count,
      ),
      minValidatorJoiningStake: decodeFromFieldsWithTypes(
        "u64",
        item.fields.min_validator_joining_stake,
      ),
      validatorLowStakeThreshold: decodeFromFieldsWithTypes(
        "u64",
        item.fields.validator_low_stake_threshold,
      ),
      validatorVeryLowStakeThreshold: decodeFromFieldsWithTypes(
        "u64",
        item.fields.validator_very_low_stake_threshold,
      ),
      validatorLowStakeGracePeriod: decodeFromFieldsWithTypes(
        "u64",
        item.fields.validator_low_stake_grace_period,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs(data: Uint8Array): SystemParameters {
    return SystemParameters.fromFields(SystemParameters.bcs.parse(data));
  }

  toJSONField() {
    return {
      epochDurationMs: this.epochDurationMs.toString(),
      stakeSubsidyStartEpoch: this.stakeSubsidyStartEpoch.toString(),
      maxValidatorCount: this.maxValidatorCount.toString(),
      minValidatorJoiningStake: this.minValidatorJoiningStake.toString(),
      validatorLowStakeThreshold: this.validatorLowStakeThreshold.toString(),
      validatorVeryLowStakeThreshold:
        this.validatorVeryLowStakeThreshold.toString(),
      validatorLowStakeGracePeriod:
        this.validatorLowStakeGracePeriod.toString(),
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

  static fromJSONField(field: any): SystemParameters {
    return SystemParameters.reified().new({
      epochDurationMs: decodeFromJSONField("u64", field.epochDurationMs),
      stakeSubsidyStartEpoch: decodeFromJSONField(
        "u64",
        field.stakeSubsidyStartEpoch,
      ),
      maxValidatorCount: decodeFromJSONField("u64", field.maxValidatorCount),
      minValidatorJoiningStake: decodeFromJSONField(
        "u64",
        field.minValidatorJoiningStake,
      ),
      validatorLowStakeThreshold: decodeFromJSONField(
        "u64",
        field.validatorLowStakeThreshold,
      ),
      validatorVeryLowStakeThreshold: decodeFromJSONField(
        "u64",
        field.validatorVeryLowStakeThreshold,
      ),
      validatorLowStakeGracePeriod: decodeFromJSONField(
        "u64",
        field.validatorLowStakeGracePeriod,
      ),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON(json: Record<string, any>): SystemParameters {
    if (json.$typeName !== SystemParameters.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SystemParameters.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SystemParameters {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSystemParameters(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SystemParameters object`,
      );
    }
    return SystemParameters.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SystemParameters {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isSystemParameters(data.bcs.type)
      ) {
        throw new Error(`object at is not a SystemParameters object`);
      }

      return SystemParameters.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SystemParameters.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<SystemParameters> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SystemParameters object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSystemParameters(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a SystemParameters object`);
    }

    return SystemParameters.fromSuiObjectData(res.data);
  }
}

/* ============================== SystemParametersV2 =============================== */

export function isSystemParametersV2(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::sui_system_state_inner::SystemParametersV2`;
}

export interface SystemParametersV2Fields {
  epochDurationMs: ToField<"u64">;
  stakeSubsidyStartEpoch: ToField<"u64">;
  minValidatorCount: ToField<"u64">;
  maxValidatorCount: ToField<"u64">;
  minValidatorJoiningStake: ToField<"u64">;
  validatorLowStakeThreshold: ToField<"u64">;
  validatorVeryLowStakeThreshold: ToField<"u64">;
  validatorLowStakeGracePeriod: ToField<"u64">;
  extraFields: ToField<Bag>;
}

export type SystemParametersV2Reified = Reified<
  SystemParametersV2,
  SystemParametersV2Fields
>;

export class SystemParametersV2 implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::sui_system_state_inner::SystemParametersV2`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SystemParametersV2.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::sui_system_state_inner::SystemParametersV2`;
  readonly $typeArgs: [];
  readonly $isPhantom = SystemParametersV2.$isPhantom;

  readonly epochDurationMs: ToField<"u64">;
  readonly stakeSubsidyStartEpoch: ToField<"u64">;
  readonly minValidatorCount: ToField<"u64">;
  readonly maxValidatorCount: ToField<"u64">;
  readonly minValidatorJoiningStake: ToField<"u64">;
  readonly validatorLowStakeThreshold: ToField<"u64">;
  readonly validatorVeryLowStakeThreshold: ToField<"u64">;
  readonly validatorLowStakeGracePeriod: ToField<"u64">;
  readonly extraFields: ToField<Bag>;

  private constructor(typeArgs: [], fields: SystemParametersV2Fields) {
    this.$fullTypeName = composeSuiType(
      SystemParametersV2.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::sui_system_state_inner::SystemParametersV2`;
    this.$typeArgs = typeArgs;

    this.epochDurationMs = fields.epochDurationMs;
    this.stakeSubsidyStartEpoch = fields.stakeSubsidyStartEpoch;
    this.minValidatorCount = fields.minValidatorCount;
    this.maxValidatorCount = fields.maxValidatorCount;
    this.minValidatorJoiningStake = fields.minValidatorJoiningStake;
    this.validatorLowStakeThreshold = fields.validatorLowStakeThreshold;
    this.validatorVeryLowStakeThreshold = fields.validatorVeryLowStakeThreshold;
    this.validatorLowStakeGracePeriod = fields.validatorLowStakeGracePeriod;
    this.extraFields = fields.extraFields;
  }

  static reified(): SystemParametersV2Reified {
    return {
      typeName: SystemParametersV2.$typeName,
      fullTypeName: composeSuiType(
        SystemParametersV2.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::sui_system_state_inner::SystemParametersV2`,
      typeArgs: [] as [],
      isPhantom: SystemParametersV2.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        SystemParametersV2.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SystemParametersV2.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SystemParametersV2.fromBcs(data),
      bcs: SystemParametersV2.bcs,
      fromJSONField: (field: any) => SystemParametersV2.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        SystemParametersV2.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SystemParametersV2.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SystemParametersV2.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SystemParametersV2.fetch(client, id),
      new: (fields: SystemParametersV2Fields) => {
        return new SystemParametersV2([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SystemParametersV2.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SystemParametersV2>> {
    return phantom(SystemParametersV2.reified());
  }
  static get p() {
    return SystemParametersV2.phantom();
  }

  static get bcs() {
    return bcs.struct("SystemParametersV2", {
      epoch_duration_ms: bcs.u64(),
      stake_subsidy_start_epoch: bcs.u64(),
      min_validator_count: bcs.u64(),
      max_validator_count: bcs.u64(),
      min_validator_joining_stake: bcs.u64(),
      validator_low_stake_threshold: bcs.u64(),
      validator_very_low_stake_threshold: bcs.u64(),
      validator_low_stake_grace_period: bcs.u64(),
      extra_fields: Bag.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): SystemParametersV2 {
    return SystemParametersV2.reified().new({
      epochDurationMs: decodeFromFields("u64", fields.epoch_duration_ms),
      stakeSubsidyStartEpoch: decodeFromFields(
        "u64",
        fields.stake_subsidy_start_epoch,
      ),
      minValidatorCount: decodeFromFields("u64", fields.min_validator_count),
      maxValidatorCount: decodeFromFields("u64", fields.max_validator_count),
      minValidatorJoiningStake: decodeFromFields(
        "u64",
        fields.min_validator_joining_stake,
      ),
      validatorLowStakeThreshold: decodeFromFields(
        "u64",
        fields.validator_low_stake_threshold,
      ),
      validatorVeryLowStakeThreshold: decodeFromFields(
        "u64",
        fields.validator_very_low_stake_threshold,
      ),
      validatorLowStakeGracePeriod: decodeFromFields(
        "u64",
        fields.validator_low_stake_grace_period,
      ),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SystemParametersV2 {
    if (!isSystemParametersV2(item.type)) {
      throw new Error("not a SystemParametersV2 type");
    }

    return SystemParametersV2.reified().new({
      epochDurationMs: decodeFromFieldsWithTypes(
        "u64",
        item.fields.epoch_duration_ms,
      ),
      stakeSubsidyStartEpoch: decodeFromFieldsWithTypes(
        "u64",
        item.fields.stake_subsidy_start_epoch,
      ),
      minValidatorCount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.min_validator_count,
      ),
      maxValidatorCount: decodeFromFieldsWithTypes(
        "u64",
        item.fields.max_validator_count,
      ),
      minValidatorJoiningStake: decodeFromFieldsWithTypes(
        "u64",
        item.fields.min_validator_joining_stake,
      ),
      validatorLowStakeThreshold: decodeFromFieldsWithTypes(
        "u64",
        item.fields.validator_low_stake_threshold,
      ),
      validatorVeryLowStakeThreshold: decodeFromFieldsWithTypes(
        "u64",
        item.fields.validator_very_low_stake_threshold,
      ),
      validatorLowStakeGracePeriod: decodeFromFieldsWithTypes(
        "u64",
        item.fields.validator_low_stake_grace_period,
      ),
      extraFields: decodeFromFieldsWithTypes(
        Bag.reified(),
        item.fields.extra_fields,
      ),
    });
  }

  static fromBcs(data: Uint8Array): SystemParametersV2 {
    return SystemParametersV2.fromFields(SystemParametersV2.bcs.parse(data));
  }

  toJSONField() {
    return {
      epochDurationMs: this.epochDurationMs.toString(),
      stakeSubsidyStartEpoch: this.stakeSubsidyStartEpoch.toString(),
      minValidatorCount: this.minValidatorCount.toString(),
      maxValidatorCount: this.maxValidatorCount.toString(),
      minValidatorJoiningStake: this.minValidatorJoiningStake.toString(),
      validatorLowStakeThreshold: this.validatorLowStakeThreshold.toString(),
      validatorVeryLowStakeThreshold:
        this.validatorVeryLowStakeThreshold.toString(),
      validatorLowStakeGracePeriod:
        this.validatorLowStakeGracePeriod.toString(),
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

  static fromJSONField(field: any): SystemParametersV2 {
    return SystemParametersV2.reified().new({
      epochDurationMs: decodeFromJSONField("u64", field.epochDurationMs),
      stakeSubsidyStartEpoch: decodeFromJSONField(
        "u64",
        field.stakeSubsidyStartEpoch,
      ),
      minValidatorCount: decodeFromJSONField("u64", field.minValidatorCount),
      maxValidatorCount: decodeFromJSONField("u64", field.maxValidatorCount),
      minValidatorJoiningStake: decodeFromJSONField(
        "u64",
        field.minValidatorJoiningStake,
      ),
      validatorLowStakeThreshold: decodeFromJSONField(
        "u64",
        field.validatorLowStakeThreshold,
      ),
      validatorVeryLowStakeThreshold: decodeFromJSONField(
        "u64",
        field.validatorVeryLowStakeThreshold,
      ),
      validatorLowStakeGracePeriod: decodeFromJSONField(
        "u64",
        field.validatorLowStakeGracePeriod,
      ),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON(json: Record<string, any>): SystemParametersV2 {
    if (json.$typeName !== SystemParametersV2.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SystemParametersV2.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SystemParametersV2 {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSystemParametersV2(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SystemParametersV2 object`,
      );
    }
    return SystemParametersV2.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SystemParametersV2 {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isSystemParametersV2(data.bcs.type)
      ) {
        throw new Error(`object at is not a SystemParametersV2 object`);
      }

      return SystemParametersV2.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SystemParametersV2.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<SystemParametersV2> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SystemParametersV2 object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSystemParametersV2(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a SystemParametersV2 object`);
    }

    return SystemParametersV2.fromSuiObjectData(res.data);
  }
}
