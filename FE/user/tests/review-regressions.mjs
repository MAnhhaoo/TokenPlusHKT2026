import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness(file, mocks = {}, globals = {}) {
  const slots = [],
    effects = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef(value) {
      const i = cursor++;
      return (slots[i] ??= { current: value });
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const previous = slots[i];
      if (!previous || deps.some((d, j) => !Object.is(d, previous.deps[j]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const code = ts.transpileModule(readFileSync(resolve(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    console,
    setTimeout,
    clearTimeout,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name in mocks) return mocks[name];
      return { default: name.split("/").at(-1) };
    },
    ...globals,
  });
  return {
    render(props) {
      cursor = 0;
      return exports.default(props);
    },
    effects() {
      while (effects.length) effects.shift()();
    },
    unmount() {
      slots.forEach((s) => s?.cleanup?.());
    },
    exports,
  };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
}
const component = (tree, name) => find(tree, (n) => n.type === name)?.props;

// Exercise App's single request owner across endpoint, flood, and navigation changes.
let points = [],
  realtime,
  pending;
const calls = [];
const rainfallInputs = [];
const empty = { safe: { coordinates: [] }, balanced: { coordinates: [] } };
const api = {
  EMPTY_ROUTES: empty,
  getSavedAuthUser: () => null,
  getSavedRoutes: () => [],
  fetchCurrentWeather: async () => null,
  fetchForecastSlots: async () => ({ slots: [{ id: "now", rain: "4.8 mm" }], live: true }),
  fetchMapPointsApi: async (rain) => {
    rainfallInputs.push(rain);
    return points;
  },
  fetchActiveAlertsApi: async () => [],
  subscribeUserRealtime: (callbacks) => {
    realtime = callbacks;
    return () => {};
  },
  fetchJourneyRoutes: (...args) => {
    calls.push(args);
    return new Promise((resolve, reject) => {
      pending = { resolve, reject };
    });
  },
};
const app = harness("src/App.tsx", { "@/lib/api": api });
let tree = app.render();
app.effects();
await tick();
tree = app.render();
app.effects();
assert.ok(rainfallInputs.includes(4.8), "fractional forecast rain reaches map API");
const origin = { label: "A", coords: [106.7, 10.7] },
  destination = { label: "B", coords: [106.8, 10.8] };
component(tree, "RouteSearch").onSelectOrigin(origin);
component(tree, "RouteSearch").onSelectDestination(destination);
tree = app.render();
app.effects();
assert.equal(calls.length, 1);
const routes = {
  safe: { coordinates: [origin.coords, destination.coords] },
  balanced: { coordinates: [] },
};
const steps = [{ instruction: "Continue", distance: "20 m" }];
pending.resolve({ routes, navigationSteps: steps });
await tick();
tree = app.render();
app.effects();
assert.equal(component(tree, "MapCanvas").routesData, routes);
points = [{ id: "flood", depth: 25 }];
await realtime.onRouteRecomputeNeeded();
tree = app.render();
app.effects();
assert.equal(calls.length, 2);
assert.equal(component(tree, "MapCanvas").routesData, routes, "flood refresh retains route");
pending.reject(new Error("synthetic failure"));
await tick();
tree = app.render();
app.effects();
assert.equal(component(tree, "MapCanvas").routesData, routes);
component(tree, "JourneyPanel").onStart();
tree = app.render();
app.effects();
component(tree, "MapCanvas").onReroute([106.71, 10.71]);
tree = app.render();
app.effects();
assert.equal(calls.length, 3, "auto reroute makes one request");
assert.equal(component(tree, "MapCanvas").routesData, routes);
assert.equal(component(tree, "MapCanvas").navigationSteps, steps);
pending.reject(new Error("synthetic reroute failure"));
await tick();
tree = app.render();
app.effects();
assert.equal(component(tree, "MapCanvas").routesData, routes, "failed reroute retains map and HUD");
app.unmount();

// A failed citizen report stays editable, announces an error, and can be retried.
let created = null,
  notified = 0;
const report = harness("src/components/report/ReportModal.tsx", {
  "@/hooks/useDialogFocus": { useDialogFocus: () => ({ current: null }) },
  "@/lib/api": { createCitizenReport: async () => created },
});
const props = {
  open: true,
  onClose() {},
  onReportCreated() {
    notified++;
  },
};
tree = report.render(props);
report.effects();
const submit = () =>
  find(tree, (n) => n.type === "button" && n.props.onClick?.name === "handleSubmit");
await submit().props.onClick();
tree = report.render(props);
report.effects();
assert.ok(find(tree, (n) => n.props?.role === "alert"));
assert.equal(submit().props.disabled, false);
assert.equal(notified, 0);
created = { id: "synthetic-report" };
await submit().props.onClick();
tree = report.render(props);
report.effects();
assert.ok(find(tree, (n) => n.props?.role === "status"));
assert.equal(notified, 1);

// Focus entry, wrapping, Escape and restoration, using a minimal DOM adapter.
let listener;
const prior = {
  focus() {
    document.activeElement = prior;
  },
};
const document = { activeElement: prior };
const window = {
  addEventListener(_, fn) {
    listener = fn;
  },
  removeEventListener() {
    listener = null;
  },
};
const focus = harness("src/hooks/useDialogFocus.ts", {}, { document, window });
let closed = 0;
const ref = focus.exports.useDialogFocus(true, () => closed++);
const first = {
  focus() {
    document.activeElement = first;
  },
  hasAttribute: () => false,
  getClientRects: () => [1],
};
const last = {
  ...first,
  focus() {
    document.activeElement = last;
  },
};
ref.current = {
  querySelectorAll: () => [first, last],
  contains: (el) => el === first || el === last,
};
focus.effects();
assert.equal(document.activeElement, first);
document.activeElement = last;
listener({ key: "Tab", preventDefault() {} });
assert.equal(document.activeElement, first);
listener({ key: "Tab", shiftKey: true, preventDefault() {} });
assert.equal(document.activeElement, last);
listener({ key: "Escape", preventDefault() {} });
assert.equal(closed, 1);
focus.unmount();
assert.equal(document.activeElement, prior);
console.log(
  "Review regressions passed: route ownership, refresh/failure retention, report retry, dialog focus",
);

// Route search debounces autocomplete, cancels it, and distinguishes IP from GPS.
let timerId = 0,
  selectedOrigin;
const timers = new Map(),
  searches = [];
const search = harness(
  "src/components/journey/RouteSearch.tsx",
  {
    "@/lib/api": {
      matchDynamicPlacePool: () => [],
      reverseGeocodeApi: async () => ({ location: "Synthetic street", district: "Test district" }),
      searchPlacesApi: async (...args) => {
        searches.push(args);
        return [];
      },
    },
    "@/lib/location": {
      getUserLocation: async () => ({ latitude: 10.7, longitude: 106.7, isIpFallback: true }),
    },
  },
  {
    AbortController,
    document: { addEventListener() {}, removeEventListener() {} },
    window: {
      setTimeout(fn, delay) {
        timers.set(++timerId, { fn, delay });
        return timerId;
      },
      clearTimeout(id) {
        timers.delete(id);
      },
    },
  },
);
const searchProps = {
  origin: null,
  destination: null,
  onSelectOrigin(p) {
    selectedOrigin = p;
  },
  onSelectDestination() {},
  onSwap() {},
};
tree = search.render(searchProps);
search.effects();
let input = find(tree, (n) => n.type === "input");
input.props.onFocus();
input.props.onChange({ target: { value: "synthetic query" } });
tree = search.render(searchProps);
search.effects();
const timer = [...timers.values()].at(-1);
assert.ok(timer.delay >= 300);
await timer.fn();
assert.equal(searches[0][2].allowNominatim, false);
input = find(tree, (n) => n.type === "input");
input.props.onChange({ target: { value: "new query" } });
tree = search.render(searchProps);
search.effects();
assert.equal(searches[0][1].aborted, true);
input = find(tree, (n) => n.type === "input");
input.props.onChange({ target: { value: "" } });
tree = search.render(searchProps);
search.effects();
await find(
  tree,
  (n) => n.type === "button" && n.props.onClick?.name === "handleGetOriginGps",
).props.onClick();
assert.equal(selectedOrigin.isCurrentLocation, false);
assert.ok(selectedOrigin.label.startsWith("Vị trí gần đúng"));
search.unmount();

// Run the web geolocation watch registration/cleanup blocks.
const mapSource = readFileSync(resolve(root, "src/components/map/MapCanvas.tsx"), "utf8");
const registration = mapSource.slice(
  mapSource.lastIndexOf("    if (isUsingRealGps) {"),
  mapSource.indexOf("    // Hiển thị vị trí ban đầu"),
);
const cleanupStart = mapSource.indexOf("    return () => {\n      watchActive = false;");
const cleanup = mapSource.slice(cleanupStart, mapSource.indexOf("\n  }, [", cleanupStart));
{
  let callback;
  const cleared = [],
    watchIdRef = { current: null };
  const geolocation = {
    watchPosition(cb) {
      callback = cb;
      return 42;
    },
    clearWatch(id) {
      cleared.push(id);
    },
  };
  const exports = {};
  vm.runInNewContext(
    `exports.start = () => { let watchActive = true; const isUsingRealGps = true; ${registration} ${cleanup} };`,
    {
      exports,
      window: {},
      navigator: { geolocation },
      console,
      watchIdRef,
      handleRawGpsUpdate() {},
    },
  );
  const dispose = exports.start();
  assert.equal(watchIdRef.current, 42);
  dispose();
  assert.deepEqual(cleared, [42]);
  assert.equal(watchIdRef.current, null);
  assert.ok(callback);
}
// The callback processor itself must reject obsolete updates before touching navigation state.
assert.match(mapSource, /\) => \{\s*if \(!watchActive\) return;\s*userRealGpsRef/);

// Failure results are explicit and successful responses are marked live.
let weatherFails = true;
const weather = harness(
  "src/lib/weatherApi.ts",
  {},
  {
    fetch: async () => {
      if (weatherFails) throw new Error("synthetic offline");
      return { ok: true, json: async () => ({ current: { rain: 4.8 }, hourly: {}, daily: {} }) };
    },
  },
);
assert.equal((await weather.exports.fetchFullRealWeather()).live, false);
weatherFails = false;
assert.equal((await weather.exports.fetchFullRealWeather()).live, true);
console.log(
  "Review regressions passed: autocomplete cancellation, approximate location, native watch cleanup, weather availability",
);
