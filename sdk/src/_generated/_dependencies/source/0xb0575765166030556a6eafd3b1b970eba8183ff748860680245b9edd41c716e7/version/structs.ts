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
import { PKG_V1 } from "../index";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== Version =============================== */

export function isVersion(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::version::Version`;
}

export interface VersionFields {
  pos0: ToField<"u16">;
}

export type VersionReified = Reified<Version, VersionFields>;

export class Version implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::version::Version`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = Version.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::version::Version`;
  readonly $typeArgs: [];
  readonly $isPhantom = Version.$isPhantom;

  readonly pos0: ToField<"u16">;

  private constructor(typeArgs: [], fields: VersionFields) {
    this.$fullTypeName = composeSuiType(
      Version.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::version::Version`;
    this.$typeArgs = typeArgs;

    this.pos0 = fields.pos0;
  }

  static reified(): VersionReified {
    return {
      typeName: Version.$typeName,
      fullTypeName: composeSuiType(
        Version.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::version::Version`,
      typeArgs: [] as [],
      isPhantom: Version.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => Version.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Version.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => Version.fromBcs(data),
      bcs: Version.bcs,
      fromJSONField: (field: any) => Version.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => Version.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Version.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Version.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) => Version.fetch(client, id),
      new: (fields: VersionFields) => {
        return new Version([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Version.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<Version>> {
    return phantom(Version.reified());
  }
  static get p() {
    return Version.phantom();
  }

  static get bcs() {
    return bcs.struct("Version", {
      pos0: bcs.u16(),
    });
  }

  static fromFields(fields: Record<string, any>): Version {
    return Version.reified().new({
      pos0: decodeFromFields("u16", fields.pos0),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): Version {
    if (!isVersion(item.type)) {
      throw new Error("not a Version type");
    }

    return Version.reified().new({
      pos0: decodeFromFieldsWithTypes("u16", item.fields.pos0),
    });
  }

  static fromBcs(data: Uint8Array): Version {
    return Version.fromFields(Version.bcs.parse(data));
  }

  toJSONField() {
    return {
      pos0: this.pos0,
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField(field: any): Version {
    return Version.reified().new({
      pos0: decodeFromJSONField("u16", field.pos0),
    });
  }

  static fromJSON(json: Record<string, any>): Version {
    if (json.$typeName !== Version.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return Version.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): Version {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isVersion(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Version object`,
      );
    }
    return Version.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): Version {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isVersion(data.bcs.type)) {
        throw new Error(`object at is not a Version object`);
      }

      return Version.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Version.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<Version> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Version object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isVersion(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Version object`);
    }

    return Version.fromSuiObjectData(res.data);
  }
}
