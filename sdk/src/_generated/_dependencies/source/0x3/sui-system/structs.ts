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
import { PKG_V18 } from "../index";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== SuiSystemState =============================== */

export function isSuiSystemState(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V18}::sui_system::SuiSystemState`;
}

export interface SuiSystemStateFields {
  id: ToField<UID>;
  version: ToField<"u64">;
}

export type SuiSystemStateReified = Reified<
  SuiSystemState,
  SuiSystemStateFields
>;

export class SuiSystemState implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V18}::sui_system::SuiSystemState`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SuiSystemState.$typeName;
  readonly $fullTypeName: `${typeof PKG_V18}::sui_system::SuiSystemState`;
  readonly $typeArgs: [];
  readonly $isPhantom = SuiSystemState.$isPhantom;

  readonly id: ToField<UID>;
  readonly version: ToField<"u64">;

  private constructor(typeArgs: [], fields: SuiSystemStateFields) {
    this.$fullTypeName = composeSuiType(
      SuiSystemState.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V18}::sui_system::SuiSystemState`;
    this.$typeArgs = typeArgs;

    this.id = fields.id;
    this.version = fields.version;
  }

  static reified(): SuiSystemStateReified {
    return {
      typeName: SuiSystemState.$typeName,
      fullTypeName: composeSuiType(
        SuiSystemState.$typeName,
        ...[],
      ) as `${typeof PKG_V18}::sui_system::SuiSystemState`,
      typeArgs: [] as [],
      isPhantom: SuiSystemState.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) =>
        SuiSystemState.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SuiSystemState.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SuiSystemState.fromBcs(data),
      bcs: SuiSystemState.bcs,
      fromJSONField: (field: any) => SuiSystemState.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => SuiSystemState.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SuiSystemState.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SuiSystemState.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SuiSystemState.fetch(client, id),
      new: (fields: SuiSystemStateFields) => {
        return new SuiSystemState([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SuiSystemState.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SuiSystemState>> {
    return phantom(SuiSystemState.reified());
  }
  static get p() {
    return SuiSystemState.phantom();
  }

  static get bcs() {
    return bcs.struct("SuiSystemState", {
      id: UID.bcs,
      version: bcs.u64(),
    });
  }

  static fromFields(fields: Record<string, any>): SuiSystemState {
    return SuiSystemState.reified().new({
      id: decodeFromFields(UID.reified(), fields.id),
      version: decodeFromFields("u64", fields.version),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SuiSystemState {
    if (!isSuiSystemState(item.type)) {
      throw new Error("not a SuiSystemState type");
    }

    return SuiSystemState.reified().new({
      id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id),
      version: decodeFromFieldsWithTypes("u64", item.fields.version),
    });
  }

  static fromBcs(data: Uint8Array): SuiSystemState {
    return SuiSystemState.fromFields(SuiSystemState.bcs.parse(data));
  }

  toJSONField() {
    return {
      id: this.id,
      version: this.version.toString(),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): SuiSystemState {
    return SuiSystemState.reified().new({
      id: decodeFromJSONField(UID.reified(), field.id),
      version: decodeFromJSONField("u64", field.version),
    });
  }

  static fromJSON(json: Record<string, any>): SuiSystemState {
    if (json.$typeName !== SuiSystemState.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SuiSystemState.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SuiSystemState {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSuiSystemState(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SuiSystemState object`,
      );
    }
    return SuiSystemState.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SuiSystemState {
    if (data.bcs) {
      if (
        data.bcs.dataType !== "moveObject" ||
        !isSuiSystemState(data.bcs.type)
      ) {
        throw new Error(`object at is not a SuiSystemState object`);
      }

      return SuiSystemState.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SuiSystemState.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<SuiSystemState> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SuiSystemState object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSuiSystemState(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a SuiSystemState object`);
    }

    return SuiSystemState.fromSuiObjectData(res.data);
  }
}
