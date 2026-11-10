import { parse } from "@babel/parser";

type Node = Record<string, unknown> & { type: string };
type Scope = Map<string, string | null>;
export type TranslationReference = {
  key: string;
  kind: "literal" | "template" | "raw";
};

function node(value: unknown): Node | undefined {
  return value && typeof value === "object" && "type" in value && typeof value.type === "string"
    ? (value as Node)
    : undefined;
}

function identifier(value: unknown) {
  const item = node(value);
  return item?.type === "Identifier" && typeof item.name === "string" ? item.name : undefined;
}

function literal(value: unknown) {
  const item = node(value);
  return item?.type === "StringLiteral" && typeof item.value === "string" ? item.value : undefined;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tracks translator bindings and their lexical scopes, not arbitrary quoted text.
 * Callers supply real app sources only; tests and migration mappings aren't usage.
 * Runtime-built service/status keys are covered separately by registry parity tests.
 */
export function translationReferences(source: string): TranslationReference[] {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const factories = new Set<string>();
  for (const statement of ast.program.body) {
    if (
      statement.type !== "ImportDeclaration" ||
      !["next-intl", "next-intl/server"].includes(statement.source.value)
    )
      continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier") continue;
      const imported =
        specifier.imported.type === "Identifier"
          ? specifier.imported.name
          : specifier.imported.value;
      if (["getTranslations", "useTranslations"].includes(imported))
        factories.add(specifier.local.name);
    }
  }

  function namespace(value: unknown): string | undefined {
    let expression = node(value);
    if (expression?.type === "AwaitExpression") expression = node(expression.argument);
    if (
      expression?.type !== "CallExpression" ||
      !factories.has(identifier(expression.callee) ?? "")
    )
      return undefined;
    const argument = (expression.arguments as unknown[])[0];
    if (argument === undefined) return "";
    const text = literal(argument);
    if (text !== undefined) return text;
    const object = node(argument);
    if (object?.type !== "ObjectExpression") return undefined;
    for (const property of object.properties as unknown[]) {
      const entry = node(property);
      if (entry && (identifier(entry.key) ?? literal(entry.key)) === "namespace")
        return literal(entry.value);
    }
    return "";
  }

  const references: TranslationReference[] = [];
  function shadow(value: unknown, scope: Scope) {
    const item = node(value);
    if (!item) return;
    if (item.type === "Identifier") scope.set(item.name as string, null);
    else if (item.type === "AssignmentPattern") shadow(item.left, scope);
    else if (item.type === "RestElement") shadow(item.argument, scope);
    else if (item.type === "ArrayPattern")
      for (const element of item.elements as unknown[]) shadow(element, scope);
    else if (item.type === "ObjectPattern")
      for (const property of item.properties as unknown[]) {
        const entry = node(property);
        if (entry) shadow(entry.value ?? entry.argument, scope);
      }
  }

  function visit(value: unknown, inherited: Scope) {
    if (Array.isArray(value)) {
      for (const item of value) visit(item, inherited);
      return;
    }
    const item = node(value);
    if (!item) return;
    const isFunction = [
      "FunctionDeclaration",
      "FunctionExpression",
      "ArrowFunctionExpression",
      "ObjectMethod",
      "ClassMethod",
    ].includes(item.type);
    const scope =
      isFunction || ["Program", "BlockStatement", "CatchClause"].includes(item.type)
        ? new Map(inherited)
        : inherited;
    if (isFunction) for (const parameter of item.params as unknown[]) shadow(parameter, scope);
    if (item.type === "CatchClause") shadow(item.param, scope);

    if (item.type === "VariableDeclarator") {
      shadow(item.id, scope);
      const name = identifier(item.id);
      const ns = namespace(item.init);
      if (name && ns !== undefined) scope.set(name, ns);
      const pattern = node(item.id);
      let init = node(item.init);
      if (init?.type === "AwaitExpression") init = node(init.argument);
      const callee = node(init?.callee);
      if (
        pattern?.type === "ArrayPattern" &&
        init?.type === "CallExpression" &&
        callee?.type === "MemberExpression" &&
        identifier(callee.object) === "Promise" &&
        identifier(callee.property) === "all"
      ) {
        const argument = node((init.arguments as unknown[])[0]);
        if (argument?.type === "ArrayExpression") {
          (pattern.elements as unknown[]).forEach((element, index) => {
            const binding = identifier(element);
            const bindingNamespace = namespace((argument.elements as unknown[])[index]);
            if (binding && bindingNamespace !== undefined) scope.set(binding, bindingNamespace);
          });
        }
      }
    }

    if (item.type === "CallExpression") {
      const callee = node(item.callee);
      const method = callee?.type === "MemberExpression" ? identifier(callee.property) : undefined;
      const name =
        identifier(callee) ??
        (callee?.type === "MemberExpression" &&
        ["raw", "rich", "markup", "has"].includes(method ?? "")
          ? identifier(callee.object)
          : undefined);
      const ns = name ? scope.get(name) : undefined;
      if (typeof ns === "string") {
        const argument = (item.arguments as unknown[])[0];
        const prefix = ns ? `${ns}.` : "";
        const text = literal(argument);
        if (text !== undefined)
          references.push({ key: prefix + text, kind: method === "raw" ? "raw" : "literal" });
        else {
          const template = node(argument);
          if (template?.type === "TemplateLiteral") {
            const parts = (template.quasis as unknown[]).map((part) => {
              const quasi = node(part);
              const contents = quasi?.value as { cooked?: string; raw: string };
              return contents.cooked ?? contents.raw;
            });
            references.push(
              parts.length === 1
                ? { key: prefix + parts[0], kind: "literal" }
                : {
                    key: `^${escapeRegExp(prefix)}${parts.map(escapeRegExp).join("[^.]+")}$`,
                    kind: "template",
                  },
            );
          }
        }
      }
    }
    for (const [key, child] of Object.entries(item)) {
      if (!["loc", "start", "end", "comments", "tokens"].includes(key)) visit(child, scope);
    }
  }
  visit(ast.program, new Map());
  return references;
}

export function auditTranslationReferences(source: string, keys: ReadonlySet<string>) {
  const used = new Set<string>();
  const missing: string[] = [];
  for (const reference of translationReferences(source)) {
    const matches =
      reference.kind === "template"
        ? [...keys].filter((key) => new RegExp(reference.key).test(key))
        : reference.kind === "raw"
          ? [...keys].filter((key) => key === reference.key || key.startsWith(`${reference.key}.`))
          : keys.has(reference.key)
            ? [reference.key]
            : [];
    if (!matches.length) missing.push(reference.key);
    for (const key of matches) used.add(key);
  }
  return { used, missing };
}
