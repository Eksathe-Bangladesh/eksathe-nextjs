import { expect, test } from "bun:test";

import { auditTranslationReferences } from "./source-audit";

const keys = new Set([
  "auth.signIn",
  "common.actions.view",
  "metadata.home.title",
  "home.policy.items.0",
]);

test("tracks namespace bindings, aliases, and lexical shadowing", () => {
  const source = `
    import {useTranslations as useT} from 'next-intl';
    const t = useT('auth');
    t('signIn');
    function other() { const t = useT(); t('common.actions.view'); }
    function unrelated(t: (s: string) => string) { t('not.a.translation'); }
    t('missing');
    const unrelatedText = 'auth.unused';
  `;
  const result = auditTranslationReferences(source, keys);
  expect([...result.used].sort()).toEqual(["auth.signIn", "common.actions.view"]);
  expect(result.missing).toEqual(["auth.missing"]);
});

test("resolves Promise.all bindings, template patterns, and raw parent keys", () => {
  const source = `
    import {getTranslations} from 'next-intl/server';
    const [metadata, home] = await Promise.all([
      getTranslations('metadata'), getTranslations({namespace: 'home'})
    ]);
    metadata(\`\${page}.title\`);
    home.raw('policy.items');
  `;
  const result = auditTranslationReferences(source, keys);
  expect([...result.used].sort()).toEqual(["home.policy.items.0", "metadata.home.title"]);
  expect(result.missing).toEqual([]);
});

test("reports broken templates and does not count arbitrary literals as usage", () => {
  const result = auditTranslationReferences(
    `
    import {useTranslations} from 'next-intl';
    const t = useTranslations();
    const mapping = {'old.key': 'common.actions.view'};
    t(\`missing.\${name}.label\`);
  `,
    keys,
  );
  expect([...result.used]).toEqual([]);
  expect(result.missing).toHaveLength(1);
});
