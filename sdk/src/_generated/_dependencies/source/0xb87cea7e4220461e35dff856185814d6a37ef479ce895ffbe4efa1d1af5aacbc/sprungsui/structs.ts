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

/* ============================== SPRUNGSUI =============================== */

export function isSPRUNGSUI(type: string): boolean {
  type = compressSuiType(type);
  return type === `${PKG_V1}::sprungsui::SPRUNGSUI`;
}

export interface SPRUNGSUIFields {
  dummyField: ToField<"bool">;
}

export type SPRUNGSUIReified = Reified<SPRUNGSUI, SPRUNGSUIFields>;

export class SPRUNGSUI implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::sprungsui::SPRUNGSUI`;
  static readonly $numTypeParams = 0;
  static readonly $isPhantom = [] as const;

  readonly $typeName = SPRUNGSUI.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::sprungsui::SPRUNGSUI`;
  readonly $typeArgs: [];
  readonly $isPhantom = SPRUNGSUI.$isPhantom;

  readonly dummyField: ToField<"bool">;

  private constructor(typeArgs: [], fields: SPRUNGSUIFields) {
    this.$fullTypeName = composeSuiType(
      SPRUNGSUI.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::sprungsui::SPRUNGSUI`;
    this.$typeArgs = typeArgs;

    this.dummyField = fields.dummyField;
  }

  static reified(): SPRUNGSUIReified {
    return {
      typeName: SPRUNGSUI.$typeName,
      fullTypeName: composeSuiType(
        SPRUNGSUI.$typeName,
        ...[],
      ) as `${typeof PKG_V1}::sprungsui::SPRUNGSUI`,
      typeArgs: [] as [],
      isPhantom: SPRUNGSUI.$isPhantom,
      reifiedTypeArgs: [],
      fromFields: (fields: Record<string, any>) => SPRUNGSUI.fromFields(fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        SPRUNGSUI.fromFieldsWithTypes(item),
      fromBcs: (data: Uint8Array) => SPRUNGSUI.fromBcs(data),
      bcs: SPRUNGSUI.bcs,
      fromJSONField: (field: any) => SPRUNGSUI.fromJSONField(field),
      fromJSON: (json: Record<string, any>) => SPRUNGSUI.fromJSON(json),
      fromSuiParsedData: (content: SuiParsedData) =>
        SPRUNGSUI.fromSuiParsedData(content),
      fromSuiObjectData: (content: SuiObjectData) =>
        SPRUNGSUI.fromSuiObjectData(content),
      fetch: async (client: SuiClient, id: string) =>
        SPRUNGSUI.fetch(client, id),
      new: (fields: SPRUNGSUIFields) => {
        return new SPRUNGSUI([], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return SPRUNGSUI.reified();
  }

  static phantom(): PhantomReified<ToTypeStr<SPRUNGSUI>> {
    return phantom(SPRUNGSUI.reified());
  }
  static get p() {
    return SPRUNGSUI.phantom();
  }

  static get bcs() {
    return bcs.struct("SPRUNGSUI", {
      dummy_field: bcs.bool(),
    });
  }

  static fromFields(fields: Record<string, any>): SPRUNGSUI {
    return SPRUNGSUI.reified().new({
      dummyField: decodeFromFields("bool", fields.dummy_field),
    });
  }

  static fromFieldsWithTypes(item: FieldsWithTypes): SPRUNGSUI {
    if (!isSPRUNGSUI(item.type)) {
      throw new Error("not a SPRUNGSUI type");
    }

    return SPRUNGSUI.reified().new({
      dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field),
    });
  }

  static fromBcs(data: Uint8Array): SPRUNGSUI {
    return SPRUNGSUI.fromFields(SPRUNGSUI.bcs.parse(data));
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

  static fromJSONField(field: any): SPRUNGSUI {
    return SPRUNGSUI.reified().new({
      dummyField: decodeFromJSONField("bool", field.dummyField),
    });
  }

  static fromJSON(json: Record<string, any>): SPRUNGSUI {
    if (json.$typeName !== SPRUNGSUI.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }

    return SPRUNGSUI.fromJSONField(json);
  }

  static fromSuiParsedData(content: SuiParsedData): SPRUNGSUI {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isSPRUNGSUI(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a SPRUNGSUI object`,
      );
    }
    return SPRUNGSUI.fromFieldsWithTypes(content);
  }

  static fromSuiObjectData(data: SuiObjectData): SPRUNGSUI {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isSPRUNGSUI(data.bcs.type)) {
        throw new Error(`object at is not a SPRUNGSUI object`);
      }

      return SPRUNGSUI.fromBcs(fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return SPRUNGSUI.fromSuiParsedData(data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch(client: SuiClient, id: string): Promise<SPRUNGSUI> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching SPRUNGSUI object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isSPRUNGSUI(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a SPRUNGSUI object`);
    }

    return SPRUNGSUI.fromSuiObjectData(res.data);
  }
}
