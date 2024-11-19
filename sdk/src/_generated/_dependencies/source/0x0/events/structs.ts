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
import { PKG_V1 } from "../index";
import { BcsType, bcs } from "@mysten/sui/bcs";
import { SuiClient, SuiObjectData, SuiParsedData } from "@mysten/sui/client";
import { fromB64 } from "@mysten/sui/utils";

/* ============================== Event =============================== */

export function isEvent(type: string): boolean {
  type = compressSuiType(type);
  return type.startsWith(`${PKG_V1}::events::Event` + "<");
}

export interface EventFields<T extends TypeArgument> {
  event: ToField<T>;
}

export type EventReified<T extends TypeArgument> = Reified<
  Event<T>,
  EventFields<T>
>;

export class Event<T extends TypeArgument> implements StructClass {
  __StructClass = true as const;

  static readonly $typeName = `${PKG_V1}::events::Event`;
  static readonly $numTypeParams = 1;
  static readonly $isPhantom = [false] as const;

  readonly $typeName = Event.$typeName;
  readonly $fullTypeName: `${typeof PKG_V1}::events::Event<${ToTypeStr<T>}>`;
  readonly $typeArgs: [ToTypeStr<T>];
  readonly $isPhantom = Event.$isPhantom;

  readonly event: ToField<T>;

  private constructor(typeArgs: [ToTypeStr<T>], fields: EventFields<T>) {
    this.$fullTypeName = composeSuiType(
      Event.$typeName,
      ...typeArgs,
    ) as `${typeof PKG_V1}::events::Event<${ToTypeStr<T>}>`;
    this.$typeArgs = typeArgs;

    this.event = fields.event;
  }

  static reified<T extends Reified<TypeArgument, any>>(
    T: T,
  ): EventReified<ToTypeArgument<T>> {
    return {
      typeName: Event.$typeName,
      fullTypeName: composeSuiType(
        Event.$typeName,
        ...[extractType(T)],
      ) as `${typeof PKG_V1}::events::Event<${ToTypeStr<ToTypeArgument<T>>}>`,
      typeArgs: [extractType(T)] as [ToTypeStr<ToTypeArgument<T>>],
      isPhantom: Event.$isPhantom,
      reifiedTypeArgs: [T],
      fromFields: (fields: Record<string, any>) => Event.fromFields(T, fields),
      fromFieldsWithTypes: (item: FieldsWithTypes) =>
        Event.fromFieldsWithTypes(T, item),
      fromBcs: (data: Uint8Array) => Event.fromBcs(T, data),
      bcs: Event.bcs(toBcs(T)),
      fromJSONField: (field: any) => Event.fromJSONField(T, field),
      fromJSON: (json: Record<string, any>) => Event.fromJSON(T, json),
      fromSuiParsedData: (content: SuiParsedData) =>
        Event.fromSuiParsedData(T, content),
      fromSuiObjectData: (content: SuiObjectData) =>
        Event.fromSuiObjectData(T, content),
      fetch: async (client: SuiClient, id: string) =>
        Event.fetch(client, T, id),
      new: (fields: EventFields<ToTypeArgument<T>>) => {
        return new Event([extractType(T)], fields);
      },
      kind: "StructClassReified",
    };
  }

  static get r() {
    return Event.reified;
  }

  static phantom<T extends Reified<TypeArgument, any>>(
    T: T,
  ): PhantomReified<ToTypeStr<Event<ToTypeArgument<T>>>> {
    return phantom(Event.reified(T));
  }
  static get p() {
    return Event.phantom;
  }

  static get bcs() {
    return <T extends BcsType<any>>(T: T) =>
      bcs.struct(`Event<${T.name}>`, {
        event: T,
      });
  }

  static fromFields<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    fields: Record<string, any>,
  ): Event<ToTypeArgument<T>> {
    return Event.reified(typeArg).new({
      event: decodeFromFields(typeArg, fields.event),
    });
  }

  static fromFieldsWithTypes<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    item: FieldsWithTypes,
  ): Event<ToTypeArgument<T>> {
    if (!isEvent(item.type)) {
      throw new Error("not a Event type");
    }
    assertFieldsWithTypesArgsMatch(item, [typeArg]);

    return Event.reified(typeArg).new({
      event: decodeFromFieldsWithTypes(typeArg, item.fields.event),
    });
  }

  static fromBcs<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    data: Uint8Array,
  ): Event<ToTypeArgument<T>> {
    const typeArgs = [typeArg];

    return Event.fromFields(typeArg, Event.bcs(toBcs(typeArgs[0])).parse(data));
  }

  toJSONField() {
    return {
      event: fieldToJSON<T>(this.$typeArgs[0], this.event),
    };
  }

  toJSON() {
    return {
      $typeName: this.$typeName,
      $typeArgs: this.$typeArgs,
      ...this.toJSONField(),
    };
  }

  static fromJSONField<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    field: any,
  ): Event<ToTypeArgument<T>> {
    return Event.reified(typeArg).new({
      event: decodeFromJSONField(typeArg, field.event),
    });
  }

  static fromJSON<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    json: Record<string, any>,
  ): Event<ToTypeArgument<T>> {
    if (json.$typeName !== Event.$typeName) {
      throw new Error("not a WithTwoGenerics json object");
    }
    assertReifiedTypeArgsMatch(
      composeSuiType(Event.$typeName, extractType(typeArg)),
      json.$typeArgs,
      [typeArg],
    );

    return Event.fromJSONField(typeArg, json);
  }

  static fromSuiParsedData<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    content: SuiParsedData,
  ): Event<ToTypeArgument<T>> {
    if (content.dataType !== "moveObject") {
      throw new Error("not an object");
    }
    if (!isEvent(content.type)) {
      throw new Error(
        `object at ${(content.fields as any).id} is not a Event object`,
      );
    }
    return Event.fromFieldsWithTypes(typeArg, content);
  }

  static fromSuiObjectData<T extends Reified<TypeArgument, any>>(
    typeArg: T,
    data: SuiObjectData,
  ): Event<ToTypeArgument<T>> {
    if (data.bcs) {
      if (data.bcs.dataType !== "moveObject" || !isEvent(data.bcs.type)) {
        throw new Error(`object at is not a Event object`);
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

      return Event.fromBcs(typeArg, fromB64(data.bcs.bcsBytes));
    }
    if (data.content) {
      return Event.fromSuiParsedData(typeArg, data.content);
    }
    throw new Error(
      "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request.",
    );
  }

  static async fetch<T extends Reified<TypeArgument, any>>(
    client: SuiClient,
    typeArg: T,
    id: string,
  ): Promise<Event<ToTypeArgument<T>>> {
    const res = await client.getObject({ id, options: { showBcs: true } });
    if (res.error) {
      throw new Error(
        `error fetching Event object at id ${id}: ${res.error.code}`,
      );
    }
    if (
      res.data?.bcs?.dataType !== "moveObject" ||
      !isEvent(res.data.bcs.type)
    ) {
      throw new Error(`object at id ${id} is not a Event object`);
    }

    return Event.fromSuiObjectData(typeArg, res.data);
  }
}
