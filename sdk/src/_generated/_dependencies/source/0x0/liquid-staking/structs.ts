import * as reified from "../../../../_framework/reified";
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
} from "../../../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
  parseTypeName,
} from "../../../../_framework/util";
import { TypeName } from "../../0x1/type-name/structs";
import { Bag } from "../../0x2/bag/structs";
import { Balance } from "../../0x2/balance/structs";
import { TreasuryCap } from "../../0x2/coin/structs";
import { ID, UID } from "../../0x2/object/structs";
import { SUI } from "../../0x2/sui/structs";
import { Cell } from "../cell/structs";
import { FeeConfig } from "../fees/structs";
import { PKG_V1 } from "../index";
import { Storage } from "../storage/structs";
import { Version } from "../version/structs";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== AdminCap =============================== */

export function isAdminCap(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::liquid_staking::AdminCap` + "<");
}

export interface AdminCapFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
}

export type AdminCapReified<P extends PhantomTypeArgument> = Reified<
  AdminCap<P>,
  AdminCapFields<P>
>;

export class AdminCap<P extends PhantomTypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::AdminCap`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = AdminCap.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::AdminCap<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = AdminCap.$isPhantom;

  readonly id: ToField<UID>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: AdminCapFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      AdminCap.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::AdminCap<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): AdminCapReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: AdminCap.$typeName,
      fullTypeName: composeSuiType(
        AdminCap.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::liquid_staking::AdminCap<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: AdminCap.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        AdminCap.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        AdminCap.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => AdminCap.fromBcs(P, data),
      bcs: AdminCap.bcs,
      fromJSONField: (field: any) => AdminCap.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) => AdminCap.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        AdminCap.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        AdminCap.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        AdminCap.fetch(client, P, id),
      new: (fields: AdminCapFields<ToPhantomTypeArgument<P>>) => {
        return new AdminCap([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return AdminCap.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<AdminCap<ToPhantomTypeArgument<P>>>> {
    return phantom(AdminCap.reified(P));
  }
  static get p() {
    return AdminCap.phantom;
  }

  static get bcs() {
    return bcs.struct("AdminCap", {
      id: UID.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): AdminCap<ToPhantomTypeArgument<P>> {
    return AdminCap.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): AdminCap<ToPhantomTypeArgument<P>> {
    if (!isAdminCap(item.type)) {
      throw new Error("not a AdminCap type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return AdminCap.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
    });
  }

  static fromBcs<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: Uint8Array,
  ): AdminCap<ToPhantomTypeArgument<P>> {
    return AdminCap.fromFields(typeArg, AdminCap.bcs.parse(data));
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
  ): AdminCap<ToPhantomTypeArgument<P>> {
    return AdminCap.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): AdminCap<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== AdminCap.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(AdminCap.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return AdminCap.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): AdminCap<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isAdminCap(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a AdminCap object`,
      );
    }
    return AdminCap.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): AdminCap<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isAdminCap(data.bcs.type)) {
        throw new Error(`object at is not a AdminCap object`);
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

      return AdminCap.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return AdminCap.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<AdminCap<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching AdminCap object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isAdminCap(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a AdminCap object`);
    }

    return AdminCap.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== CollectFeesEvent =============================== */

export function isCollectFeesEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::CollectFeesEvent`;
}

export interface CollectFeesEventFields {
  typename: ToField<TypeName>;
  amount: ToField<"u64">;
}

export type CollectFeesEventReified = Reified<
  CollectFeesEvent,
  CollectFeesEventFields
>;

export class CollectFeesEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::CollectFeesEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = CollectFeesEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::CollectFeesEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = CollectFeesEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly amount: ToField<"u64">;

  private constructor(typeArgs: [], fields: CollectFeesEventFields) {
    this.$fullTypeName = composeSuiType(
      CollectFeesEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::CollectFeesEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.amount = fields.amount;
  }

  static reified(): CollectFeesEventReified {
    return {
      typeName: CollectFeesEvent.$typeName,
      fullTypeName: composeSuiType(
        CollectFeesEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::CollectFeesEvent`,
      typeArgs: [] as [],
      isPhantom: CollectFeesEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        CollectFeesEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        CollectFeesEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => CollectFeesEvent.fromBcs(data),
      bcs: CollectFeesEvent.bcs,
      fromJSONField: (field: any) => CollectFeesEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => CollectFeesEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        CollectFeesEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        CollectFeesEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        CollectFeesEvent.fetch(client, id),
      new: (fields: CollectFeesEventFields) => {
        return new CollectFeesEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return CollectFeesEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<CollectFeesEvent>> {
    return phantom(CollectFeesEvent.reified());
  }
  static get p() {
    return CollectFeesEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("CollectFeesEvent", {
      typename: TypeName.bcs,
      amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): CollectFeesEvent {
    return CollectFeesEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      amount: decodeFromFields("u64", fields.amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): CollectFeesEvent {
    if (!isCollectFeesEvent(item.type)) {
      throw new Error("not a CollectFeesEvent type");
    }

    return CollectFeesEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      amount: decodeFromFieldsWithTypes("u64", item.fields.amount),
    });
  }

  static fromBcs(data: Uint8Array): CollectFeesEvent {
    return CollectFeesEvent.fromFields(CollectFeesEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
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

  static fromJSONField(field: any): CollectFeesEvent {
    return CollectFeesEvent.reified().new({
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      amount: decodeFromJSONField("u64", field.amount),
    });
  }

  static fromJSON(json: Record<string, any>): CollectFeesEvent {
    if (json.$typeName !== CollectFeesEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return CollectFeesEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): CollectFeesEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isCollectFeesEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a CollectFeesEvent object`,
      );
    }
    return CollectFeesEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): CollectFeesEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isCollectFeesEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a CollectFeesEvent object`);
      }

      return CollectFeesEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return CollectFeesEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<CollectFeesEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching CollectFeesEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isCollectFeesEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a CollectFeesEvent object`);
    }

    return CollectFeesEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== CreateEvent =============================== */

export function isCreateEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::CreateEvent`;
}

export interface CreateEventFields {
  typename: ToField<TypeName>;
  liquidStakingInfoId: ToField<ID>;
}

export type CreateEventReified = Reified<CreateEvent, CreateEventFields>;

export class CreateEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::CreateEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = CreateEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::CreateEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = CreateEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly liquidStakingInfoId: ToField<ID>;

  private constructor(typeArgs: [], fields: CreateEventFields) {
    this.$fullTypeName = composeSuiType(
      CreateEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::CreateEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.liquidStakingInfoId = fields.liquidStakingInfoId;
  }

  static reified(): CreateEventReified {
    return {
      typeName: CreateEvent.$typeName,
      fullTypeName: composeSuiType(
        CreateEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::CreateEvent`,
      typeArgs: [] as [],
      isPhantom: CreateEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        CreateEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        CreateEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => CreateEvent.fromBcs(data),
      bcs: CreateEvent.bcs,
      fromJSONField: (field: any) => CreateEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => CreateEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        CreateEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        CreateEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        CreateEvent.fetch(client, id),
      new: (fields: CreateEventFields) => {
        return new CreateEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return CreateEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<CreateEvent>> {
    return phantom(CreateEvent.reified());
  }
  static get p() {
    return CreateEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("CreateEvent", {
      typename: TypeName.bcs,
      liquid_staking_info_id: ID.bcs,
    });
  }

  static fromFields(fields: Record<string, any>): CreateEvent {
    return CreateEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      liquidStakingInfoId: decodeFromFields(
        ID.reified(),
        fields.liquid_staking_info_id,
      ),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): CreateEvent {
    if (!isCreateEvent(item.type)) {
      throw new Error("not a CreateEvent type");
    }

    return CreateEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      liquidStakingInfoId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.liquid_staking_info_id,
      ),
    });
  }

  static fromBcs(data: Uint8Array): CreateEvent {
    return CreateEvent.fromFields(CreateEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
      liquidStakingInfoId: this.liquidStakingInfoId,
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): CreateEvent {
    return CreateEvent.reified().new({
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      liquidStakingInfoId: decodeFromJSONField(
        ID.reified(),
        field.liquidStakingInfoId,
      ),
    });
  }

  static fromJSON(json: Record<string, any>): CreateEvent {
    if (json.$typeName !== CreateEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return CreateEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): CreateEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isCreateEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a CreateEvent object`,
      );
    }
    return CreateEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): CreateEvent {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isCreateEvent(data.bcs.type)) {
        throw new Error(`object at is not a CreateEvent object`);
      }

      return CreateEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return CreateEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<CreateEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching CreateEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isCreateEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a CreateEvent object`);
    }

    return CreateEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== DecreaseValidatorStakeEvent =============================== */

export function isDecreaseValidatorStakeEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::DecreaseValidatorStakeEvent`;
}

export interface DecreaseValidatorStakeEventFields {
  typename: ToField<TypeName>;
  stakingPoolId: ToField<ID>;
  amount: ToField<"u64">;
}

export type DecreaseValidatorStakeEventReified = Reified<
  DecreaseValidatorStakeEvent,
  DecreaseValidatorStakeEventFields
>;

export class DecreaseValidatorStakeEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::DecreaseValidatorStakeEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = DecreaseValidatorStakeEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::DecreaseValidatorStakeEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = DecreaseValidatorStakeEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly stakingPoolId: ToField<ID>;
  readonly amount: ToField<"u64">;

  private constructor(typeArgs: [], fields: DecreaseValidatorStakeEventFields) {
    this.$fullTypeName = composeSuiType(
      DecreaseValidatorStakeEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::DecreaseValidatorStakeEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.stakingPoolId = fields.stakingPoolId;
    this.amount = fields.amount;
  }

  static reified(): DecreaseValidatorStakeEventReified {
    return {
      typeName: DecreaseValidatorStakeEvent.$typeName,
      fullTypeName: composeSuiType(
        DecreaseValidatorStakeEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::DecreaseValidatorStakeEvent`,
      typeArgs: [] as [],
      isPhantom: DecreaseValidatorStakeEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        DecreaseValidatorStakeEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        DecreaseValidatorStakeEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => DecreaseValidatorStakeEvent.fromBcs(data),
      bcs: DecreaseValidatorStakeEvent.bcs,
      fromJSONField: (field: any) =>
        DecreaseValidatorStakeEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        DecreaseValidatorStakeEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        DecreaseValidatorStakeEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        DecreaseValidatorStakeEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        DecreaseValidatorStakeEvent.fetch(client, id),
      new: (fields: DecreaseValidatorStakeEventFields) => {
        return new DecreaseValidatorStakeEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return DecreaseValidatorStakeEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<DecreaseValidatorStakeEvent>> {
    return phantom(DecreaseValidatorStakeEvent.reified());
  }
  static get p() {
    return DecreaseValidatorStakeEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("DecreaseValidatorStakeEvent", {
      typename: TypeName.bcs,
      staking_pool_id: ID.bcs,
      amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): DecreaseValidatorStakeEvent {
    return DecreaseValidatorStakeEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      stakingPoolId: decodeFromFields(ID.reified(), fields.staking_pool_id),
      amount: decodeFromFields("u64", fields.amount),
    });
  }

  static fromFieldsWithTypes(
    item: FieldsWithTypes,
  ): DecreaseValidatorStakeEvent {
    if (!isDecreaseValidatorStakeEvent(item.type)) {
      throw new Error("not a DecreaseValidatorStakeEvent type");
    }

    return DecreaseValidatorStakeEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      stakingPoolId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.staking_pool_id,
      ),
      amount: decodeFromFieldsWithTypes("u64", item.fields.amount),
    });
  }

  static fromBcs(data: Uint8Array): DecreaseValidatorStakeEvent {
    return DecreaseValidatorStakeEvent.fromFields(
      DecreaseValidatorStakeEvent.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
      stakingPoolId: this.stakingPoolId,
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

  static fromJSONField(field: any): DecreaseValidatorStakeEvent {
    return DecreaseValidatorStakeEvent.reified().new({
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      stakingPoolId: decodeFromJSONField(ID.reified(), field.stakingPoolId),
      amount: decodeFromJSONField("u64", field.amount),
    });
  }

  static fromJSON(json: Record<string, any>): DecreaseValidatorStakeEvent {
    if (json.$typeName !== DecreaseValidatorStakeEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return DecreaseValidatorStakeEvent.fromJSONField(json);
  }

  static fromSuiParsedData(
    content: SuiParsedData,
  ): DecreaseValidatorStakeEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isDecreaseValidatorStakeEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a DecreaseValidatorStakeEvent object`,
      );
    }
    return DecreaseValidatorStakeEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): DecreaseValidatorStakeEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isDecreaseValidatorStakeEvent(data.bcs.type)
      ) {
        throw new Error(
          `object at is not a DecreaseValidatorStakeEvent object`,
        );
      }

      return DecreaseValidatorStakeEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return DecreaseValidatorStakeEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<DecreaseValidatorStakeEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching DecreaseValidatorStakeEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isDecreaseValidatorStakeEvent(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a DecreaseValidatorStakeEvent object`,
      );
    }

    return DecreaseValidatorStakeEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== EpochChangedEvent =============================== */

export function isEpochChangedEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::EpochChangedEvent`;
}

export interface EpochChangedEventFields {
  typename: ToField<TypeName>;
  oldSuiSupply: ToField<"u64">;
  newSuiSupply: ToField<"u64">;
  lstSupply: ToField<"u64">;
  spreadFee: ToField<"u64">;
}

export type EpochChangedEventReified = Reified<
  EpochChangedEvent,
  EpochChangedEventFields
>;

export class EpochChangedEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::EpochChangedEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = EpochChangedEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::EpochChangedEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = EpochChangedEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly oldSuiSupply: ToField<"u64">;
  readonly newSuiSupply: ToField<"u64">;
  readonly lstSupply: ToField<"u64">;
  readonly spreadFee: ToField<"u64">;

  private constructor(typeArgs: [], fields: EpochChangedEventFields) {
    this.$fullTypeName = composeSuiType(
      EpochChangedEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::EpochChangedEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.oldSuiSupply = fields.oldSuiSupply;
    this.newSuiSupply = fields.newSuiSupply;
    this.lstSupply = fields.lstSupply;
    this.spreadFee = fields.spreadFee;
  }

  static reified(): EpochChangedEventReified {
    return {
      typeName: EpochChangedEvent.$typeName,
      fullTypeName: composeSuiType(
        EpochChangedEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::EpochChangedEvent`,
      typeArgs: [] as [],
      isPhantom: EpochChangedEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        EpochChangedEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        EpochChangedEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => EpochChangedEvent.fromBcs(data),
      bcs: EpochChangedEvent.bcs,
      fromJSONField: (field: any) => EpochChangedEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => EpochChangedEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        EpochChangedEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        EpochChangedEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        EpochChangedEvent.fetch(client, id),
      new: (fields: EpochChangedEventFields) => {
        return new EpochChangedEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return EpochChangedEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<EpochChangedEvent>> {
    return phantom(EpochChangedEvent.reified());
  }
  static get p() {
    return EpochChangedEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("EpochChangedEvent", {
      typename: TypeName.bcs,
      old_sui_supply: bcs.u64(),
      new_sui_supply: bcs.u64(),
      lst_supply: bcs.u64(),
      spread_fee: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): EpochChangedEvent {
    return EpochChangedEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      oldSuiSupply: decodeFromFields("u64", fields.old_sui_supply),
      newSuiSupply: decodeFromFields("u64", fields.new_sui_supply),
      lstSupply: decodeFromFields("u64", fields.lst_supply),
      spreadFee: decodeFromFields("u64", fields.spread_fee),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): EpochChangedEvent {
    if (!isEpochChangedEvent(item.type)) {
      throw new Error("not a EpochChangedEvent type");
    }

    return EpochChangedEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      oldSuiSupply: decodeFromFieldsWithTypes(
        "u64",
        item.fields.old_sui_supply,
      ),
      newSuiSupply: decodeFromFieldsWithTypes(
        "u64",
        item.fields.new_sui_supply,
      ),
      lstSupply: decodeFromFieldsWithTypes("u64", item.fields.lst_supply),
      spreadFee: decodeFromFieldsWithTypes("u64", item.fields.spread_fee),
    });
  }

  static fromBcs(data: Uint8Array): EpochChangedEvent {
    return EpochChangedEvent.fromFields(EpochChangedEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
      oldSuiSupply: this.oldSuiSupply.toString(),
      newSuiSupply: this.newSuiSupply.toString(),
      lstSupply: this.lstSupply.toString(),
      spreadFee: this.spreadFee.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): EpochChangedEvent {
    return EpochChangedEvent.reified().new({
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      oldSuiSupply: decodeFromJSONField("u64", field.oldSuiSupply),
      newSuiSupply: decodeFromJSONField("u64", field.newSuiSupply),
      lstSupply: decodeFromJSONField("u64", field.lstSupply),
      spreadFee: decodeFromJSONField("u64", field.spreadFee),
    });
  }

  static fromJSON(json: Record<string, any>): EpochChangedEvent {
    if (json.$typeName !== EpochChangedEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return EpochChangedEvent.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): EpochChangedEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isEpochChangedEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a EpochChangedEvent object`,
      );
    }
    return EpochChangedEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): EpochChangedEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isEpochChangedEvent(data.bcs.type)
      ) {
        throw new Error(`object at is not a EpochChangedEvent object`);
      }

      return EpochChangedEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return EpochChangedEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<EpochChangedEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching EpochChangedEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isEpochChangedEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a EpochChangedEvent object`);
    }

    return EpochChangedEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== IncreaseValidatorStakeEvent =============================== */

export function isIncreaseValidatorStakeEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::IncreaseValidatorStakeEvent`;
}

export interface IncreaseValidatorStakeEventFields {
  typename: ToField<TypeName>;
  stakingPoolId: ToField<ID>;
  amount: ToField<"u64">;
}

export type IncreaseValidatorStakeEventReified = Reified<
  IncreaseValidatorStakeEvent,
  IncreaseValidatorStakeEventFields
>;

export class IncreaseValidatorStakeEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::IncreaseValidatorStakeEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = IncreaseValidatorStakeEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::IncreaseValidatorStakeEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = IncreaseValidatorStakeEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly stakingPoolId: ToField<ID>;
  readonly amount: ToField<"u64">;

  private constructor(typeArgs: [], fields: IncreaseValidatorStakeEventFields) {
    this.$fullTypeName = composeSuiType(
      IncreaseValidatorStakeEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::IncreaseValidatorStakeEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.stakingPoolId = fields.stakingPoolId;
    this.amount = fields.amount;
  }

  static reified(): IncreaseValidatorStakeEventReified {
    return {
      typeName: IncreaseValidatorStakeEvent.$typeName,
      fullTypeName: composeSuiType(
        IncreaseValidatorStakeEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::IncreaseValidatorStakeEvent`,
      typeArgs: [] as [],
      isPhantom: IncreaseValidatorStakeEvent.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        IncreaseValidatorStakeEvent.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        IncreaseValidatorStakeEvent.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => IncreaseValidatorStakeEvent.fromBcs(data),
      bcs: IncreaseValidatorStakeEvent.bcs,
      fromJSONField: (field: any) =>
        IncreaseValidatorStakeEvent.fromJSONField(field),
      fromJSON: (json: Record<string, any>) =>
        IncreaseValidatorStakeEvent.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        IncreaseValidatorStakeEvent.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        IncreaseValidatorStakeEvent.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        IncreaseValidatorStakeEvent.fetch(client, id),
      new: (fields: IncreaseValidatorStakeEventFields) => {
        return new IncreaseValidatorStakeEvent([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return IncreaseValidatorStakeEvent.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<IncreaseValidatorStakeEvent>> {
    return phantom(IncreaseValidatorStakeEvent.reified());
  }
  static get p() {
    return IncreaseValidatorStakeEvent.phantom();
  }

  static get bcs() {
    return bcs.struct("IncreaseValidatorStakeEvent", {
      typename: TypeName.bcs,
      staking_pool_id: ID.bcs,
      amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): IncreaseValidatorStakeEvent {
    return IncreaseValidatorStakeEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      stakingPoolId: decodeFromFields(ID.reified(), fields.staking_pool_id),
      amount: decodeFromFields("u64", fields.amount),
    });
  }

  static fromFieldsWithTypes(
    item: FieldsWithTypes,
  ): IncreaseValidatorStakeEvent {
    if (!isIncreaseValidatorStakeEvent(item.type)) {
      throw new Error("not a IncreaseValidatorStakeEvent type");
    }

    return IncreaseValidatorStakeEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      stakingPoolId: decodeFromFieldsWithTypes(
        ID.reified(),
        item.fields.staking_pool_id,
      ),
      amount: decodeFromFieldsWithTypes("u64", item.fields.amount),
    });
  }

  static fromBcs(data: Uint8Array): IncreaseValidatorStakeEvent {
    return IncreaseValidatorStakeEvent.fromFields(
      IncreaseValidatorStakeEvent.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
      stakingPoolId: this.stakingPoolId,
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

  static fromJSONField(field: any): IncreaseValidatorStakeEvent {
    return IncreaseValidatorStakeEvent.reified().new({
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      stakingPoolId: decodeFromJSONField(ID.reified(), field.stakingPoolId),
      amount: decodeFromJSONField("u64", field.amount),
    });
  }

  static fromJSON(json: Record<string, any>): IncreaseValidatorStakeEvent {
    if (json.$typeName !== IncreaseValidatorStakeEvent.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return IncreaseValidatorStakeEvent.fromJSONField(json);
  }

  static fromSuiParsedData(
    content: SuiParsedData,
  ): IncreaseValidatorStakeEvent {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isIncreaseValidatorStakeEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a IncreaseValidatorStakeEvent object`,
      );
    }
    return IncreaseValidatorStakeEvent.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): IncreaseValidatorStakeEvent {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isIncreaseValidatorStakeEvent(data.bcs.type)
      ) {
        throw new Error(
          `object at is not a IncreaseValidatorStakeEvent object`,
        );
      }

      return IncreaseValidatorStakeEvent.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return IncreaseValidatorStakeEvent.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(
    client: SuiClient,
    id: string,
  ): Promise<IncreaseValidatorStakeEvent> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching IncreaseValidatorStakeEvent object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isIncreaseValidatorStakeEvent(res.data.bcs.type)
    ) {
      throw new Error(
        `object at id ${id} is not a IncreaseValidatorStakeEvent object`,
      );
    }

    return IncreaseValidatorStakeEvent.fromSuiObjectData(res.data);
  }
}

/* ============================== LIQUID_STAKING =============================== */

export function isLIQUID_STAKING(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::LIQUID_STAKING`;
}

export interface LIQUID_STAKINGFields {
  dummyField: ToField<"bool">;
}

export type LIQUID_STAKINGReified = Reified<
  LIQUID_STAKING,
  LIQUID_STAKINGFields
>;

export class LIQUID_STAKING implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::LIQUID_STAKING`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = LIQUID_STAKING.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::LIQUID_STAKING`;
  readonly $typeArgs: [];
  readonly $isPhantom = LIQUID_STAKING.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: LIQUID_STAKINGFields) {
    this.$fullTypeName = composeSuiType(
      LIQUID_STAKING.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::LIQUID_STAKING`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): LIQUID_STAKINGReified {
    return {
      typeName: LIQUID_STAKING.$typeName,
      fullTypeName: composeSuiType(
        LIQUID_STAKING.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::LIQUID_STAKING`,
      typeArgs: [] as [],
      isPhantom: LIQUID_STAKING.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        LIQUID_STAKING.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LIQUID_STAKING.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => LIQUID_STAKING.fromBcs(data),
      bcs: LIQUID_STAKING.bcs,
      fromJSONField: (field: any) => LIQUID_STAKING.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => LIQUID_STAKING.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LIQUID_STAKING.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LIQUID_STAKING.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        LIQUID_STAKING.fetch(client, id),
      new: (fields: LIQUID_STAKINGFields) => {
        return new LIQUID_STAKING([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LIQUID_STAKING.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<LIQUID_STAKING>> {
    return phantom(LIQUID_STAKING.reified());
  }
  static get p() {
    return LIQUID_STAKING.phantom();
  }

  static get bcs() {
    return bcs.struct("LIQUID_STAKING", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): LIQUID_STAKING {
    return LIQUID_STAKING.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): LIQUID_STAKING {
    if (!isLIQUID_STAKING(item.type)) {
      throw new Error("not a LIQUID_STAKING type");
    }

    return LIQUID_STAKING.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): LIQUID_STAKING {
    return LIQUID_STAKING.fromFields(LIQUID_STAKING.bcs.parse(data));
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

  static fromJSONField(field: any): LIQUID_STAKING {
    return LIQUID_STAKING.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): LIQUID_STAKING {
    if (json.$typeName !== LIQUID_STAKING.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return LIQUID_STAKING.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): LIQUID_STAKING {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLIQUID_STAKING(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LIQUID_STAKING object`,
      );
    }
    return LIQUID_STAKING.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): LIQUID_STAKING {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLIQUID_STAKING(data.bcs.type)
      ) {
        throw new Error(`object at is not a LIQUID_STAKING object`);
      }

      return LIQUID_STAKING.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LIQUID_STAKING.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<LIQUID_STAKING> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LIQUID_STAKING object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLIQUID_STAKING(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a LIQUID_STAKING object`);
    }

    return LIQUID_STAKING.fromSuiObjectData(res.data);
  }
}

/* ============================== LiquidStakingInfo =============================== */

export function isLiquidStakingInfo(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::liquid_staking::LiquidStakingInfo` + "<");
}

export interface LiquidStakingInfoFields<P extends PhantomTypeArgument> {
  id: ToField<UID>;
  lstTreasuryCap: ToField<TreasuryCap<P>>;
  feeConfig: ToField<Cell<FeeConfig>>;
  fees: ToField<Balance<ToPhantom<SUI>>>;
  accruedSpreadFees: ToField<"u64">;
  storage: ToField<Storage>;
  version: ToField<Version>;
  extraFields: ToField<Bag>;
}

export type LiquidStakingInfoReified<P extends PhantomTypeArgument> = Reified<
  LiquidStakingInfo<P>,
  LiquidStakingInfoFields<P>
>;

export class LiquidStakingInfo<P extends PhantomTypeArgument>
  implements StructClass
{
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::LiquidStakingInfo`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [true] as const;

  readonly $typeName = LiquidStakingInfo.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::LiquidStakingInfo<${PhantomToTypeStr<P>}>`;
  readonly $typeArgs: [PhantomToTypeStr<P>];
  readonly $isPhantom = LiquidStakingInfo.$isPhantom;

  readonly id: ToField<UID>;
  readonly lstTreasuryCap: ToField<TreasuryCap<P>>;
  readonly feeConfig: ToField<Cell<FeeConfig>>;
  readonly fees: ToField<Balance<ToPhantom<SUI>>>;
  readonly accruedSpreadFees: ToField<"u64">;
  readonly storage: ToField<Storage>;
  readonly version: ToField<Version>;
  readonly extraFields: ToField<Bag>;

  private constructor(
    typeArgs: [PhantomToTypeStr<P>],
    fields: LiquidStakingInfoFields<P>,
  ) {
    this.$fullTypeName = composeSuiType(
      LiquidStakingInfo.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::LiquidStakingInfo<${PhantomToTypeStr<P>}>`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.lstTreasuryCap = fields.lstTreasuryCap;
    this.feeConfig = fields.feeConfig;
    this.fees = fields.fees;
    this.accruedSpreadFees = fields.accruedSpreadFees;
    this.storage = fields.storage;
    this.version = fields.version;
    this.extraFields = fields.extraFields;
  }

  static reified<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): LiquidStakingInfoReified<ToPhantomTypeArgument<P>> {
    return {
      typeName: LiquidStakingInfo.$typeName,
      fullTypeName: composeSuiType(
        LiquidStakingInfo.$typeName,
        ...[extractType(P)],
      ) as `${typeof PKG_V1}::liquid_staking::LiquidStakingInfo<${PhantomToTypeStr<ToPhantomTypeArgument<P>>}>`,
      typeArgs: [extractType(P)] as [
        PhantomToTypeStr<ToPhantomTypeArgument<P>>,
      ],
      isPhantom: LiquidStakingInfo.$isPhantom,
      reifiedTypeArgs: [P],
      fromFields: (fields: Record<string, any>) =>
        LiquidStakingInfo.fromFields(P, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        LiquidStakingInfo.fromFieldsWithTypes(P, item),
      fromBcs: (data: Uint8Array) => LiquidStakingInfo.fromBcs(P, data),
      bcs: LiquidStakingInfo.bcs,
      fromJSONField: (field: any) => LiquidStakingInfo.fromJSONField(P, field),
      fromJSON: (json: Record<string, any>) =>
        LiquidStakingInfo.fromJSON(P, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        LiquidStakingInfo.fromSuiParsedData(P, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        LiquidStakingInfo.fromSuiObjectData(P, content),
      fetch: async (client: SuiClient, id: string) =>
        LiquidStakingInfo.fetch(client, P, id),
      new: (fields: LiquidStakingInfoFields<ToPhantomTypeArgument<P>>) => {
        return new LiquidStakingInfo([extractType(P)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return LiquidStakingInfo.reified;
  }

  static phantom<P extends PhantomReified<PhantomTypeArgument>>(
    P: P,
  ): PhantomReified<ToTypeStr<LiquidStakingInfo<ToPhantomTypeArgument<P>>>> {
    return phantom(LiquidStakingInfo.reified(P));
  }
  static get p() {
    return LiquidStakingInfo.phantom;
  }

  static get bcs() {
    return bcs.struct("LiquidStakingInfo", {
      id: UID.bcs,
      lst_treasury_cap: TreasuryCap.bcs,
      fee_config: Cell.bcs(FeeConfig.bcs),
      fees: Balance.bcs,
      accrued_spread_fees: bcs.u64(),
      storage: Storage.bcs,
      version: Version.bcs,
      extra_fields: Bag.bcs,
    });
  }

  static fromFields<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    fields: Record<string, any>,
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    return LiquidStakingInfo.reified(typeArg).new({
      id: decodeFromFields(UID.reified(), fields.id),
      lstTreasuryCap: decodeFromFields(
        TreasuryCap.reified(typeArg),
        fields.lst_treasury_cap,
      ),
      feeConfig: decodeFromFields(
        Cell.reified(FeeConfig.reified()),
        fields.fee_config,
      ),
      fees: decodeFromFields(
        Balance.reified(reified.phantom(SUI.reified())),
        fields.fees,
      ),
      accruedSpreadFees: decodeFromFields("u64", fields.accrued_spread_fees),
      storage: decodeFromFields(Storage.reified(), fields.storage),
      version: decodeFromFields(Version.reified(), fields.version),
      extraFields: decodeFromFields(Bag.reified(), fields.extra_fields),
    });
  }

  static fromFieldsWithTypes<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    item: FieldsWithTypes,
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    if (!isLiquidStakingInfo(item.type)) {
      throw new Error("not a LiquidStakingInfo type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return LiquidStakingInfo.reified(typeArg).new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      lstTreasuryCap: decodeFromFieldsWithTypes(
        TreasuryCap.reified(typeArg),
        item.fields.lst_treasury_cap,
      ),
      feeConfig: decodeFromFieldsWithTypes(
        Cell.reified(FeeConfig.reified()),
        item.fields.fee_config,
      ),
      fees: decodeFromFieldsWithTypes(
        Balance.reified(reified.phantom(SUI.reified())),
        item.fields.fees,
      ),
      accruedSpreadFees: decodeFromFieldsWithTypes(
        "u64",
        item.fields.accrued_spread_fees,
      ),
      storage: decodeFromFieldsWithTypes(
        Storage.reified(),
        item.fields.storage,
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
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    return LiquidStakingInfo.fromFields(
      typeArg,
      LiquidStakingInfo.bcs.parse(data),
    );
  }

  toJSONField() {
    return {
      id: this.id,
      lstTreasuryCap: this.lstTreasuryCap.toJSONField(),
      feeConfig: this.feeConfig.toJSONField(),
      fees: this.fees.toJSONField(),
      accruedSpreadFees: this.accruedSpreadFees.toString(),
      storage: this.storage.toJSONField(),
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
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    return LiquidStakingInfo.reified(typeArg).new({
      id: decodeFromJSONField(UID.reified(), field.id),
      lstTreasuryCap: decodeFromJSONField(
        TreasuryCap.reified(typeArg),
        field.lstTreasuryCap,
      ),
      feeConfig: decodeFromJSONField(
        Cell.reified(FeeConfig.reified()),
        field.feeConfig,
      ),
      fees: decodeFromJSONField(
        Balance.reified(reified.phantom(SUI.reified())),
        field.fees,
      ),
      accruedSpreadFees: decodeFromJSONField("u64", field.accruedSpreadFees),
      storage: decodeFromJSONField(Storage.reified(), field.storage),
      version: decodeFromJSONField(Version.reified(), field.version),
      extraFields: decodeFromJSONField(Bag.reified(), field.extraFields),
    });
  }

  static fromJSON<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    json: Record<string, any>,
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    if (json.$typeName !== LiquidStakingInfo.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(LiquidStakingInfo.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return LiquidStakingInfo.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    content: SuiParsedData,
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isLiquidStakingInfo(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a LiquidStakingInfo object`,
      );
    }
    return LiquidStakingInfo.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<P extends PhantomReified<PhantomTypeArgument>>(
    typeArg: P,
    data: SuiObjectData,
  ): LiquidStakingInfo<ToPhantomTypeArgument<P>> {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isLiquidStakingInfo(data.bcs.type)
      ) {
        throw new Error(`object at is not a LiquidStakingInfo object`);
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

      return LiquidStakingInfo.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return LiquidStakingInfo.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<P extends PhantomReified<PhantomTypeArgument>>(
    client: SuiClient,
    typeArg: P,
    id: string,
  ): Promise<LiquidStakingInfo<ToPhantomTypeArgument<P>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching LiquidStakingInfo object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isLiquidStakingInfo(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a LiquidStakingInfo object`);
    }

    return LiquidStakingInfo.fromSuiObjectData(typeArg, res.data);
  }
}

/* ============================== MintEvent =============================== */

export function isMintEvent(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::liquid_staking::MintEvent`;
}

export interface MintEventFields {
  typename: ToField<TypeName>;
  suiAmountIn: ToField<"u64">;
  lstAmountOut: ToField<"u64">;
  feeAmount: ToField<"u64">;
}

export type MintEventReified = Reified<MintEvent, MintEventFields>;

export class MintEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::MintEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = MintEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::MintEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = MintEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly suiAmountIn: ToField<"u64">;
  readonly lstAmountOut: ToField<"u64">;
  readonly feeAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: MintEventFields) {
    this.$fullTypeName = composeSuiType(
      MintEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::MintEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.suiAmountIn = fields.suiAmountIn;
    this.lstAmountOut = fields.lstAmountOut;
    this.feeAmount = fields.feeAmount;
  }

  static reified(): MintEventReified {
    return {
      typeName: MintEvent.$typeName,
      fullTypeName: composeSuiType(
        MintEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::MintEvent`,
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
      typename: TypeName.bcs,
      sui_amount_in: bcs.u64(),
      lst_amount_out: bcs.u64(),
      fee_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): MintEvent {
    return MintEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      suiAmountIn: decodeFromFields("u64", fields.sui_amount_in),
      lstAmountOut: decodeFromFields("u64", fields.lst_amount_out),
      feeAmount: decodeFromFields("u64", fields.fee_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): MintEvent {
    if (!isMintEvent(item.type)) {
      throw new Error("not a MintEvent type");
    }

    return MintEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      suiAmountIn: decodeFromFieldsWithTypes("u64", item.fields.sui_amount_in),
      lstAmountOut: decodeFromFieldsWithTypes(
        "u64",
        item.fields.lst_amount_out,
      ),
      feeAmount: decodeFromFieldsWithTypes("u64", item.fields.fee_amount),
    });
  }

  static fromBcs(data: Uint8Array): MintEvent {
    return MintEvent.fromFields(MintEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
      suiAmountIn: this.suiAmountIn.toString(),
      lstAmountOut: this.lstAmountOut.toString(),
      feeAmount: this.feeAmount.toString(),
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
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      suiAmountIn: decodeFromJSONField("u64", field.suiAmountIn),
      lstAmountOut: decodeFromJSONField("u64", field.lstAmountOut),
      feeAmount: decodeFromJSONField("u64", field.feeAmount),
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
  return type === `${PKG_V1}::liquid_staking::RedeemEvent`;
}

export interface RedeemEventFields {
  typename: ToField<TypeName>;
  lstAmountIn: ToField<"u64">;
  suiAmountOut: ToField<"u64">;
  feeAmount: ToField<"u64">;
}

export type RedeemEventReified = Reified<RedeemEvent, RedeemEventFields>;

export class RedeemEvent implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::liquid_staking::RedeemEvent`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = RedeemEvent.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::liquid_staking::RedeemEvent`;
  readonly $typeArgs: [];
  readonly $isPhantom = RedeemEvent.$isPhantom;

  readonly typename: ToField<TypeName>;
  readonly lstAmountIn: ToField<"u64">;
  readonly suiAmountOut: ToField<"u64">;
  readonly feeAmount: ToField<"u64">;

  private constructor(typeArgs: [], fields: RedeemEventFields) {
    this.$fullTypeName = composeSuiType(
      RedeemEvent.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::liquid_staking::RedeemEvent`;
    this.$typeArgs = typeArgs;

    this.typename = fields.typename;
    this.lstAmountIn = fields.lstAmountIn;
    this.suiAmountOut = fields.suiAmountOut;
    this.feeAmount = fields.feeAmount;
  }

  static reified(): RedeemEventReified {
    return {
      typeName: RedeemEvent.$typeName,
      fullTypeName: composeSuiType(
        RedeemEvent.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::liquid_staking::RedeemEvent`,
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
      typename: TypeName.bcs,
      lst_amount_in: bcs.u64(),
      sui_amount_out: bcs.u64(),
      fee_amount: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): RedeemEvent {
    return RedeemEvent.reified().new({
      typename: decodeFromFields(TypeName.reified(), fields.typename),
      lstAmountIn: decodeFromFields("u64", fields.lst_amount_in),
      suiAmountOut: decodeFromFields("u64", fields.sui_amount_out),
      feeAmount: decodeFromFields("u64", fields.fee_amount),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): RedeemEvent {
    if (!isRedeemEvent(item.type)) {
      throw new Error("not a RedeemEvent type");
    }

    return RedeemEvent.reified().new({
      typename: decodeFromFieldsWithTypes(
        TypeName.reified(),
        item.fields.typename,
      ),
      lstAmountIn: decodeFromFieldsWithTypes("u64", item.fields.lst_amount_in),
      suiAmountOut: decodeFromFieldsWithTypes(
        "u64",
        item.fields.sui_amount_out,
      ),
      feeAmount: decodeFromFieldsWithTypes("u64", item.fields.fee_amount),
    });
  }

  static fromBcs(data: Uint8Array): RedeemEvent {
    return RedeemEvent.fromFields(RedeemEvent.bcs.parse(data));
  }

  toJSONField() {
    return {
      typename: this.typename.toJSONField(),
      lstAmountIn: this.lstAmountIn.toString(),
      suiAmountOut: this.suiAmountOut.toString(),
      feeAmount: this.feeAmount.toString(),
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
      typename: decodeFromJSONField(TypeName.reified(), field.typename),
      lstAmountIn: decodeFromJSONField("u64", field.lstAmountIn),
      suiAmountOut: decodeFromJSONField("u64", field.suiAmountOut),
      feeAmount: decodeFromJSONField("u64", field.feeAmount),
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
