type CamelCase<Value extends string> = Value extends `${infer Head}_${infer Tail}`
  ? `${Lowercase<Head>}${Capitalize<CamelCase<Tail>>}`
  : Lowercase<Value>;

export function verificationMessageKey<Value extends string>(value: Value): CamelCase<Value> {
  return value
    .toLowerCase()
    .replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()) as CamelCase<Value>;
}
