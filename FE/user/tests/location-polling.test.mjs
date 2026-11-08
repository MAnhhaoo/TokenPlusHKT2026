import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(file, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(`../src/lib/${file}.ts`, import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  vm.runInNewContext(code, { exports, console, ...globals });
  return exports;
}

test("GPS waits for a fresh high-accuracy fix instead of racing IP after two seconds", async () => {
  let success, options;
  const api = load("location", {
    window: { isSecureContext: true, setTimeout, clearTimeout },
    navigator: {
      geolocation: {
        getCurrentPosition(ok, _fail, opts) {
          success = ok;
          options = opts;
        },
      },
    },
    fetch() {
      throw new Error("must not call IP service for pending GPS");
    },
  });
  const pending = api.getUserLocation({ requirePrecise: true });
  await Promise.resolve();
  assert.equal(options.enableHighAccuracy, true);
  assert.equal(options.maximumAge, 0);
  assert.ok(options.timeout >= 10000);
  success({ coords: { latitude: 10.8, longitude: 106.6, accuracy: 12 } });
  assert.equal((await pending).isIpFallback, false);
});

test("precise GPS rejects denied permission, coarse fixes and invalid coordinates without IP", async () => {
  for (const coords of [
    null,
    { latitude: 10.8, longitude: 106.6, accuracy: 5000 },
    { latitude: NaN, longitude: 106.6, accuracy: 10 },
  ]) {
    let ipCalls = 0;
    const api = load("location", {
      window: { isSecureContext: true, setTimeout, clearTimeout },
      navigator: {
        geolocation: {
          getCurrentPosition(ok, fail) {
            coords ? ok({ coords }) : fail({ code: 1 });
          },
        },
      },
      fetch() {
        ipCalls++;
        throw new Error("unexpected IP request");
      },
    });
    await assert.rejects(api.getUserLocation({ requirePrecise: true }));
    assert.equal(ipCalls, 0);
  }
});

test("polling waits for completion, retries errors and stops on cleanup", async () => {
  let callback,
    cancelled,
    finish,
    calls = 0;
  const api = load("polling", {
    window: {
      setTimeout(fn, ms) {
        assert.equal(ms, 15000);
        callback = fn;
        return 1;
      },
      clearTimeout(id) {
        cancelled = id;
      },
    },
  });
  const stop = api.startPolling(() => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(callback, undefined);
  finish();
  await new Promise((resolve) => setImmediate(resolve));
  callback();
  await Promise.resolve();
  assert.equal(calls, 2);
  stop();
  finish();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cancelled, 1);
  const stopError = api.startPolling(async () => {
    throw new Error("offline");
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof callback, "function");
  stopError();
});
