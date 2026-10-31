import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const fonte = await readFile(new URL("../lib/navegacaoVideo.ts", import.meta.url), "utf8");
const {outputText} = ts.transpileModule(fonte,{compilerOptions:{module:ts.ModuleKind.ESNext}});
const {origemDosVideos,retornoDosVideos,rotaAssistir,rotaAnalisar} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("assistir, analisar e voltar preservam o garimpo exato mesmo quando o vídeo está em outra busca",()=>{
  const lista = "/garimpo/busca-original";
  const player = new URL(rotaAssistir("tt:123",lista),"https://wae.local");
  const analise = new URL(rotaAnalisar("tt:123",player.searchParams.get("origem")),"https://wae.local");
  assert.equal(player.pathname,"/video/tt%3A123");
  assert.equal(analise.pathname,"/video/tt%3A123/analise");
  assert.equal(retornoDosVideos(analise.searchParams.get("origem"),"busca-mais-nova"),lista);
  // O destino está na URL, inclusive ao recarregar ou abrir em outra aba.
  assert.equal(retornoDosVideos(new URL(analise.href).searchParams.get("origem")),lista);
});

test("links sem origem usam o garimpo do vídeo e não retornam para o player",()=>{
  assert.equal(retornoDosVideos(null,"busca-recuperada"),"/garimpo/busca-recuperada");
  assert.equal(retornoDosVideos(null,null),"/pesquisa");
  assert.equal(retornoDosVideos("/video/tt%3A123","busca-recuperada"),"/garimpo/busca-recuperada");
});

test("retorno preserva listas e filtros sem repetir a entrada de uma busca nova",()=>{
  assert.equal(origemDosVideos("/garimpo/abc?nova=1&fonte=tiktok#videos"),"/garimpo/abc?fonte=tiktok#videos");
  assert.equal(origemDosVideos("/salvos/colecao"),"/salvos/colecao");
  assert.equal(origemDosVideos("/explorar"),"/explorar");
});

test("destinos externos, scripts, login e URLs de vídeo não entram no link de retorno",()=>{
  for(const invalida of ["https://outro.site", "//outro.site/garimpo/abc", "/\\outro.site/garimpo/abc", "javascript:alert(1)", "/entrar", "/video/x/analise", "/garimpo/a%2Fb", "/garimpo/abc\n", "/admin"]){
    assert.equal(origemDosVideos(invalida),null,invalida);
    assert.equal(new URL(rotaAnalisar("tt:123",invalida),"https://wae.local").searchParams.has("origem"),false);
  }
});
