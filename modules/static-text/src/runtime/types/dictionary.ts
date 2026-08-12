/** A tree whose leaves are user-facing text messages. */
export interface TextDictionary {
  readonly [key: string]: string | TextDictionary;
}

type TextKeyPart<Dictionary> = Extract<keyof Dictionary, string>;

/** Produces every valid dotted path that resolves to a text leaf. */
export type TextKey<Dictionary> = {
  [Key in TextKeyPart<Dictionary>]: Dictionary[Key] extends string
    ? Key
    : Dictionary[Key] extends TextDictionary
      ? `${Key}.${TextKey<Dictionary[Key]>}`
      : never;
}[TextKeyPart<Dictionary>];

type TextValue<Dictionary, Key extends string> = Key extends `${infer Head}.${infer Tail}`
  ? Head extends keyof Dictionary
    ? TextValue<Dictionary[Head], Tail>
    : never
  : Key extends keyof Dictionary
    ? Dictionary[Key]
    : never;

type PlaceholderName<Value extends string> =
  Value extends `${infer _Prefix}{${infer Name}}${infer Rest}`
    ? Name | PlaceholderName<Rest>
    : never;

type TextParameters<Value extends string> = {
  [Name in PlaceholderName<Value>]: string | number;
};

type TextArgumentsForKey<Dictionary, Key extends TextKey<Dictionary>> =
  TextValue<Dictionary, Key> extends infer Value extends string
    ? [PlaceholderName<Value>] extends [never]
      ? [key: Key]
      : [key: Key, parameters: TextParameters<Value>]
    : never;

/** A Vue-I18n-compatible translator constrained to a project's text dictionary. */
export type TextTranslator<Dictionary extends TextDictionary> = <Key extends TextKey<Dictionary>>(
  ...arguments_: TextArgumentsForKey<Dictionary, Key>
) => string;
