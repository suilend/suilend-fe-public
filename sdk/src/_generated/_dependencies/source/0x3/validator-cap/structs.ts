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
} from "../../../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
} from "../../../../_framework/util";
import { UID } from "../../0x2/object/structs";
import { PKG_V17 } from "../index";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64, fromHEX, toHEX } from "@mysten/sui/utils";

/* ============================== UnverifiedValidatorOperationCap =============================== */

export function isUnverifiedValidatorOperationCap(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::validator_cap::UnverifiedValidatorOperationCap`;
}

export interface UnverifiedValidatorOperationCapFields {
  id: ToField<UID>;
  authorizerValidatorAddress: ToField<"address">;
}

export type UnverifiedValidatorOperationCapReified = Reified<
  UnverifiedValidatorOperationCap,
  UnverifiedValidatorOperationCapFields
>;

export class UnverifiedValidatorOperationCap implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::validator_cap::UnverifiedValidatorOperationCap`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = UnverifiedValidatorOperationCap.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::validator_cap::UnverifiedValidatorOperationCap`;
  readonly $typeArgs: [];
  readonly $isPhantom = UnverifiedValidatorOperationCap.$isPhantom;

  readonly id: ToField<UID>;
  readonly authorizerValidatorAddress: ToField<"address">;

  private constructor(
    typeArgs: [],
    fields: UnverifiedValidatorOperationCapFields,
  ) {
    this.$fullTypeName = composeSuiType(
      UnverifiedValidatorOperationCap.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::validator_cap::UnverifiedValidatorOperationCap`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.authorizerValidatorAddress = fields.authorizerValidatorAddress;
  }

  static reified(): UnverifiedValidatorOperationCapReified {
    return {
      typeName: UnverifiedValidatorOperationCap.$typeName,
      fullTypeName: composeSuiType(
        UnverifiedValidatorOperationCap.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::validator_cap::UnverifiedValidatorOperationCap`,
      typeArgs: [] as [],
      isPhantom: UnverifiedValidatorOperationCap.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        UnverifiedValidatorOperationCap.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        UnverifiedValidatorOperationCap.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) =>
        UnverifiedValidatorOperationCap.fromBcs(data),
      bcs: UnverifiedValidatorOperationCap.bcs,
      fromJSONField: (field: any) =>
        UnverifiedValidatorOperationCap.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        UnverifiedValidatorOperationCap.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        UnverifiedValidatorOperationCap.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        UnverifiedValidatorOperationCap.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        UnverifiedValidatorOperationCap.fetch(client, id),
      new: (fields: UnverifiedValidatorOperationCapFields) => {
        return new UnverifiedValidatorOperationCap([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return UnverifiedValidatorOperationCap.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<UnverifiedValidatorOperationCap>> {
    return phantom(UnverifiedValidatorOperationCap.reified());
  }
  static get p() {
    return UnverifiedValidatorOperationCap.phantom();
  }

  static get bcs() {
    return bcs.struct("UnverifiedValidatorOperationCap", {
      id: UID.bcs,
      authorizer_validator_address: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
    });
  }

  static fromFields(
    fields: Record<string, any>,
  ): UnverifiedValidatorOperationCap {
    return UnverifiedValidatorOperationCap.reified().new({
      id: decodeFromFields(UID.reified(), fields.id),
      authorizerValidatorAddress: decodeFromFields(
        "address",
        fields.authorizer_validator_address,
      ),
    });
  }

  static fromFieldsWithTypes(
    item: FieldsWithTypes,
  ): UnverifiedValidatorOperationCap {
    if (!isUnverifiedValidatorOperationCap(item.type)) {
      throw new Error("not a UnverifiedValidatorOperationCap type");
    }

    return UnverifiedValidatorOperationCap.reified().new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      authorizerValidatorAddress: decodeFromFieldsWithTypes(
        "address",
        item.fields.authorizer_validator_address,
      ),
    });
  }

  static fromBcs(data: Uint8Array): UnverifiedValidatorOperationCap {
    return UnverifiedValidatorOperationCap.fromFields(
      UnverifiedValidatorOperationCap.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      id: this.id,
      authorizerValidatorAddress: this.authorizerValidatorAddress,
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): UnverifiedValidatorOperationCap {
    return UnverifiedValidatorOperationCap.reified().new({
      id: decodeFromJSONField(UID.reified(), field.id),
      authorizerValidatorAddress: decodeFromJSONField(
        "address",
        field.authorizerValidatorAddress,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): UnverifiedValidatorOperationCap {
    if (json.$typeName !== UnverifiedValidatorOperationCap.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return UnverifiedValidatorOperationCap.fromJSONField(json);
  }

  static fromSuiParsedData(
    content: SuiParsedData,
  ): UnverifiedValidatorOperationCap {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isUnverifiedValidatorOperationCap(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a UnverifiedValidatorOperationCap object`,
      );
    }
    return UnverifiedValidatorOperationCap.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(
    data: SuiObjectData,
  ): UnverifiedValidatorOperationCap {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isUnverifiedValidatorOperationCap(data.bcs.type)
      ) {
        throw new Error(
          `object at is not a UnverifiedValidatorOperationCap object`,
        );
      }

      return UnverifiedValidatorOperationCap.fromBcs(
        fromB64(data.bcs.bcsBytes),
      );
    }
    if (data.content) {
      return UnverifiedValidatorOperationCap.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<UnverifiedValidatorOperationCap> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching UnverifiedValidatorOperationCap object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isUnverifiedValidatorOperationCap(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a UnverifiedValidatorOperationCap object`,
      );
    }

    return UnverifiedValidatorOperationCap.fromSuiObjectData(res.data);
  }
}

/* ============================== ValidatorOperationCap =============================== */

export function isValidatorOperationCap(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V17}::validator_cap::ValidatorOperationCap`;
}

export interface ValidatorOperationCapFields {
  authorizerValidatorAddress: ToField<"address">;
}

export type ValidatorOperationCapReified = Reified<
  ValidatorOperationCap,
  ValidatorOperationCapFields
>;

export class ValidatorOperationCap implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V17}::validator_cap::ValidatorOperationCap`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = ValidatorOperationCap.$typeName;
  readonly $fullTypeName: `${typeof PKG_V17}::validator_cap::ValidatorOperationCap`;
  readonly $typeArgs: [];
  readonly $isPhantom = ValidatorOperationCap.$isPhantom;

  readonly authorizerValidatorAddress: ToField<"address">;

  private constructor(typeArgs: [], fields: ValidatorOperationCapFields) {
    this.$fullTypeName = composeSuiType(
      ValidatorOperationCap.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V17}::validator_cap::ValidatorOperationCap`;
    this.$typeArgs = typeArgs;

    this.authorizerValidatorAddress = fields.authorizerValidatorAddress;
  }

  static reified(): ValidatorOperationCapReified {
    return {
      typeName: ValidatorOperationCap.$typeName,
      fullTypeName: composeSuiType(
        ValidatorOperationCap.$typeName,
        ...[],
      ) as `${typeof PKG_V17}::validator_cap::ValidatorOperationCap`,
      typeArgs: [] as [],
      isPhantom: ValidatorOperationCap.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        ValidatorOperationCap.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        ValidatorOperationCap.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => ValidatorOperationCap.fromBcs(data),
      bcs: ValidatorOperationCap.bcs,
      fromJSONField: (field: any) => ValidatorOperationCap.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        ValidatorOperationCap.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        ValidatorOperationCap.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        ValidatorOperationCap.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        ValidatorOperationCap.fetch(client, id),
      new: (fields: ValidatorOperationCapFields) => {
        return new ValidatorOperationCap([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return ValidatorOperationCap.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<ValidatorOperationCap>> {
    return phantom(ValidatorOperationCap.reified());
  }
  static get p() {
    return ValidatorOperationCap.phantom();
  }

  static get bcs() {
    return bcs.struct("ValidatorOperationCap", {
      authorizer_validator_address: bcs
        .bytes(32)
        .transform({
          input: (val: string) => fromHEX(val),
          output: (val: Uint8Array) => toHEX(val),
        }),
    });
  }

  static fromFields(fields: Record<string, any>): ValidatorOperationCap {
    return ValidatorOperationCap.reified().new({
      authorizerValidatorAddress: decodeFromFields(
        "address",
        fields.authorizer_validator_address,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): ValidatorOperationCap {
    if (!isValidatorOperationCap(item.type)) {
      throw new Error("not a ValidatorOperationCap type");
    }

    return ValidatorOperationCap.reified().new({
      authorizerValidatorAddress: decodeFromFieldsWithTypes(
        "address",
        item.fields.authorizer_validator_address,
      ),
    });
  }

  static fromBcs(data: Uint8Array): ValidatorOperationCap {
    return ValidatorOperationCap.fromFields(
      ValidatorOperationCap.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      authorizerValidatorAddress: this.authorizerValidatorAddress,
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): ValidatorOperationCap {
    return ValidatorOperationCap.reified().new({
      authorizerValidatorAddress: decodeFromJSONField(
        "address",
        field.authorizerValidatorAddress,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): ValidatorOperationCap {
    if (json.$typeName !== ValidatorOperationCap.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return ValidatorOperationCap.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): ValidatorOperationCap {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isValidatorOperationCap(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a ValidatorOperationCap object`,
      );
    }
    return ValidatorOperationCap.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): ValidatorOperationCap {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isValidatorOperationCap(data.bcs.type)
      ) {
        throw new Error(`object at is not a ValidatorOperationCap object`);
      }

      return ValidatorOperationCap.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return ValidatorOperationCap.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<ValidatorOperationCap> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching ValidatorOperationCap object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isValidatorOperationCap(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a ValidatorOperationCap object`,
      );
    }

    return ValidatorOperationCap.fromSuiObjectData(res.data);
  }
}
