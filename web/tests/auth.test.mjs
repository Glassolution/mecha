import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const fonte = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { destinoSeguro } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("login preserva o caminho, a consulta e o fragmento de destinos internos", () => {
  for (const caminho of ["/inicio", "/inicio?continuar=1", "/garimpo/123?fonte=tiktok", "/salvos/123#videos", "/auth/nova-senha"]) {
    assert.equal(destinoSeguro(caminho), caminho);
  }
});

test("login rejeita destinos externos, barras invertidas e ciclos na entrada", () => {
  for (const caminho of [null, "", "https://outro.site", "//outro.site", "/\\outro.site", "/\n/outro.site", "javascript:alert(1)", "/entrar", "/entrar?proximo=/entrar", "/auth/confirmar?code=falso"]) {
    assert.equal(destinoSeguro(caminho), "/inicio", String(caminho));
  }
});

// Para testar o proxy real com o servidor ligado: AUTH_TEST_URL=http://localhost:3000 node --test tests/auth.test.mjs
const base = process.env.AUTH_TEST_URL;
test("páginas internas redirecionam visitantes e preservam o destino", { skip: !base }, async () => {
  for (const caminho of ["/", "/inicio", "/inicio?continuar=1", "/admin", "/pesquisa", "/ideias", "/garimpo/123", "/garimpo/123.png", "/salvos", "/estudio", "/config", "/boas-vindas", "/auth/nova-senha", "/auth/previa-cartoes-temp"]) {
    const resposta = await fetch(new URL(caminho, base), { redirect: "manual" });
    assert.equal(resposta.status, 307, caminho);
    const destino = new URL(resposta.headers.get("location"), base);
    assert.equal(destino.pathname, "/entrar", caminho);
    assert.equal(destino.searchParams.get("proximo"), caminho === "/" ? null : caminho);
  }
});

test("API bloqueia visitantes, inclusive dados compartilhados e capas", { skip: !base }, async () => {
  for (const caminho of ["/api/eu", "/api/videos", "/api/publico/resumo", "/api/publico/em-alta", "/api/capas/teste.jpg"]) {
    const resposta = await fetch(new URL(caminho, base), { redirect: "manual" });
    assert.equal(resposta.status, 401, caminho);
    assert.match(resposta.headers.get("cache-control"), /no-store/);
    assert.equal((await resposta.json()).mensagem, "Entre para continuar.");
  }
});

test("login e marca continuam acessíveis e links inválidos voltam à entrada", { skip: !base }, async () => {
  for (const caminho of ["/entrar", "/marca/bru.png"]) {
    assert.equal((await fetch(new URL(caminho, base))).status, 200, caminho);
  }
  const resposta = await fetch(new URL("/auth/confirmar", base), { redirect: "manual" });
  assert.equal(resposta.status, 307);
  assert.equal(new URL(resposta.headers.get("location"), base).pathname, "/entrar");
});
