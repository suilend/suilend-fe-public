import {
  PhantomReified,
  Reified,
  StructClass,
  ToField,
  ToTypeArgument,
  ToTypeStr,
  TypeArgument,
  assertFieldsWithTypesArgsMatch,
  assertReifiedTypeArgsMatch,
  decodeFromFields,
  decodeFromFieldsWithTypes,
  decodeFromJSONField,
  extractType,
  fieldToJSON,
  phantom,
  toBcs,
} from "../../../../_framework/reified";
import {
  FieldsWithTypes,
  composeSuiType,
  compressSuiType,
  parseTypeName,
} from "../../../../_framework/util";
import { Option } from "../../0x1/option/structs";
import { PKG_V1 } from "../index";
import { BcsType, bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== Cell =============================== */

export function isCell(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::cell::Cell` + "<");
}

export interface CellFields<Element extends TypeArgument> {
  element: ToField<Option<Element>>;
}

export type CellReified<Element extends TypeArgument> = Reified<
  Cell<Element>,
  CellFields<Element>
>;

export class Cell<Element extends TypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::cell::Cell`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [false] as const;

  readonly $typeName = Cell.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::cell::Cell<${ToTypeStr<Element>}>`;
  readonly $typeArgs: [ToTypeStr<Element>];
  readonly $isPhantom = Cell.$isPhantom;

  readonly element: ToField<Option<Element>>;

  private constructor(
    typeArgs: [ToTypeStr<Element>],
    fields: CellFields<Element>,
  ) {
    this.$fullTypeName = composeSuiType(
      Cell.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::cell::Cell<${ToTypeStr<Element>}>`;
    this.$typeArgs = typeArgs;

    this.element = fields.element;
  }

  static reified<Element extends Reified<TypeArgument, any>>(
    Element: Element,
  ): CellReified<ToTypeArgument<Element>> {
    return {
      typeName: Cell.$typeName,
      fullTypeName: composeSuiType(
        Cell.$typeName,
        ...[extractType(Element)],
      ) as `${typeof PKG_V1}::cell::Cell<${ToTypeStr<ToTypeArgument<Element>>}>`,
      typeArgs: [extractType(Element)] as [ToTypeStr<ToTypeArgument<Element>>],
      isPhantom: Cell.$isPhantom,
      reifiedTypeArgs: [Element],
      fromFields: (fields: Record<string, any>) =>
        Cell.fromFields(Element, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Cell.fromFieldsWithTypes(Element, item),
      fromBcs: (data: Uint8Array) => Cell.fromBcs(Element, data),
      bcs: Cell.bcs(toBcs(Element)),
      fromJSONField: (field: any) => Cell.fromJSONField(Element, field),
      fromJSON: (json: Record<string, any>) => Cell.fromJSON(Element, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Cell.fromSuiParsedData(Element, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Cell.fromSuiObjectData(Element, content),
      fetch: async (client: SuiClient, id: string) =>
        Cell.fetch(client, Element, id),
      new: (fields: CellFields<ToTypeArgument<Element>>) => {
        return new Cell([extractType(Element)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Cell.reified;
  }

  static phantom<Element extends Reified<TypeArgument, any>>(
    Element: Element,
  ): PhantomReified<ToTypeStr<Cell<ToTypeArgument<Element>>>> {
    return phantom(Cell.reified(Element));
  }
  static get p() {
    return Cell.phantom;
  }

  static get bcs() {
    return <Element extends BcsType<any>>(Element: Element) =>
      bcs.struct(`Cell<${Element.name}>`, {
        element: Option.bcs(Element),
      });
  }

  static fromFields<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    fields: Record<string, any>,
  ): Cell<ToTypeArgument<Element>> {
    return Cell.reified(typeArg).new({
      element: decodeFromFields(Option.reified(typeArg), fields.element),
    });
  }

  static fromFieldsWithTypes<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    item: FieldsWithTypes,
  ): Cell<ToTypeArgument<Element>> {
    if (!isCell(item.type)) {
      throw new Error("not a Cell type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return Cell.reified(typeArg).new({
      element: decodeFromFieldsWithTypes(
        Option.reified(typeArg),
        item.fields.element,
      ),
    });
  }

  static fromBcs<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    data: Uint8Array,
  ): Cell<ToTypeArgument<Element>> {
    const typeArgs = [typeArg];

    return Cell.fromFields(typeArg, Cell.bcs(toBcs(typeArgs[0])).parse(data));
  }

  toJSONField() {
    return {
      element: fieldToJSON<Option<Element>>(
        `${Option.$typeName}<${this.$typeArgs[0]}>`,
        this.element,
      ),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    field: any,
  ): Cell<ToTypeArgument<Element>> {
    return Cell.reified(typeArg).new({
      element: decodeFromJSONField(Option.reified(typeArg), field.element),
    });
  }

  static fromJSON<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    json: Record<string, any>,
  ): Cell<ToTypeArgument<Element>> {
    if (json.$typeName !== Cell.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Cell.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return Cell.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    content: SuiParsedData,
  ): Cell<ToTypeArgument<Element>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isCell(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Cell object`,
      );
    }
    return Cell.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<Element extends Reified<TypeArgument, any>>(
    typeArg: Element,
    data: SuiObjectData,
  ): Cell<ToTypeArgument<Element>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isCell(data.bcs.type)) {
        throw new Error(`object at is not a Cell object`);
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

      return Cell.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Cell.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<Element extends Reified<TypeArgument, any>>(
    client: SuiClient,
    typeArg: Element,
    id: string,
  ): Promise<Cell<ToTypeArgument<Element>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Cell object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isCell(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Cell object`);
    }

    return Cell.fromSuiObjectData(typeArg, res.data);
  }
}
