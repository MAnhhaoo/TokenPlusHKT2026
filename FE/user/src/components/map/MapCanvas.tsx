import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import { Capacitor } from "@capacitor/core"
import { Geolocation } from "@capacitor/geolocation"
import type { GeoJSONSource, Map as LibreMap } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import { computeRouteWithGoogle, GOOGLE_MAP_TILE_URLS, type GoogleMapLayerType } from "@/lib/googleMaps"
import type {
  MapFloodPoint,
  RouteEndpoint,
  RouteId,
  RouteItem,
} from "@/types"

function MapCanvas({
  route,
  routesData,
  origin,
  destination,
  floodPoints = [],
  isNavigating = false,
  navStepIndex = 0,
  navigationSteps = [],
  recenterTrigger = 0,
  stepForwardTrigger = 0,
  mapMode = "realtime",
  onToggleMapMode,
  onStepChange,
  onProgressUpdate,
  onReroute,
}: {
  route: RouteId
  routesData: Record<RouteId, RouteItem>
  origin: RouteEndpoint | null
  destination: RouteEndpoint | null
  floodPoints?: MapFloodPoint[]
  isNavigating?: boolean
  navStepIndex?: number
  navigationSteps?: any[]
  recenterTrigger?: number
  stepForwardTrigger?: number
  mapMode?: "realtime" | "history"
  onToggleMapMode?: () => void
  onStepChange?: (stepIndex: number) => void
  onProgressUpdate?: (info: {
    distanceToTurnM: number
    remainingKmM: number
    remainingMinutes: number
    speedKmh: number
  }) => void
  onReroute?: (userLocation: [number, number]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LibreMap | null>(null)
  const startMarkerRef = useRef<maplibregl.Marker | null>(null)
  const destMarkerRef = useRef<maplibregl.Marker | null>(null)
  const etaRef = useRef<HTMLDivElement | null>(null)
  const etaMarkerRef = useRef<maplibregl.Marker | null>(null)
  const floodMarkersRef = useRef<maplibregl.Marker[]>([])
  const activeRouteCoordsRef = useRef<number[][]>([])
  const puckMarkerRef = useRef<maplibregl.Marker | null>(null)
  const isNavigatingRef = useRef(isNavigating)
  isNavigatingRef.current = isNavigating
  const progressDistanceRef = useRef<number>(0)
  const trackingTickerRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const capWatchIdRef = useRef<string | null>(null)
  const userRealGpsRef = useRef<[number, number] | null>(null)
  const navStepIndexRef = useRef<number>(navStepIndex)
  navStepIndexRef.current = navStepIndex
  const onStepChangeRef = useRef(onStepChange)
  onStepChangeRef.current = onStepChange
  const onProgressUpdateRef = useRef(onProgressUpdate)
  onProgressUpdateRef.current = onProgressUpdate
  const onRerouteRef = useRef(onReroute)
  onRerouteRef.current = onReroute
  const offRouteCounterRef = useRef<number>(0)
  const lastRerouteTimeRef = useRef<number>(0)
  const [routeStatus, setRouteStatus] = useState<
    "idle" | "loading" | "live" | "fallback"
  >("idle")
  const [ready, setReady] = useState(false)
  const [routeVersion, setRouteVersion] = useState(0)
  const [mapLayer, setMapLayer] = useState<GoogleMapLayerType>("google-streets")
  const [showLayerMenu, setShowLayerMenu] = useState(false)
  const layerMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (layerMenuRef.current && !layerMenuRef.current.contains(ev.target as Node)) {
        setShowLayerMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Khi bat dau / ket thuc dan duong, tu dong resize de MapLibre phu kin 100% man hinh
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.resize()
    const t1 = setTimeout(() => map.resize(), 50)
    const t2 = setTimeout(() => map.resize(), 200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isNavigating])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    maplibregl.setWorkerUrl(maplibreWorkerUrl)

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [106.698, 10.775],
      zoom: 12.8,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          "google-streets": {
            type: "raster",
            tiles: GOOGLE_MAP_TILE_URLS["google-streets"],
            tileSize: 256,
            attribution: "© Google Maps",
          },
          "google-satellite": {
            type: "raster",
            tiles: GOOGLE_MAP_TILE_URLS["google-satellite"],
            tileSize: 256,
            attribution: "© Google Maps Satellite",
          },
          "google-traffic": {
            type: "raster",
            tiles: GOOGLE_MAP_TILE_URLS["google-traffic"],
            tileSize: 256,
            attribution: "© Google Maps Live Traffic",
          },
          esri: {
            type: "raster",
            tiles: GOOGLE_MAP_TILE_URLS.esri,
            tileSize: 256,
            attribution: "© Esri · OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "layer-google-streets",
            type: "raster",
            source: "google-streets",
            layout: { visibility: "visible" },
          },
          {
            id: "layer-google-satellite",
            type: "raster",
            source: "google-satellite",
            layout: { visibility: "none" },
          },
          {
            id: "layer-google-traffic",
            type: "raster",
            source: "google-traffic",
            layout: { visibility: "none" },
          },
          {
            id: "layer-esri",
            type: "raster",
            source: "esri",
            layout: { visibility: "none" },
          },
        ],
      },
    })

    mapRef.current = map
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right",
    )
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    )

    map.on("load", () => {
      const addRoute = (
        id: string,
        routeCoordinates: number[][],
        color: string,
        width: number,
        outlineWidth: number,
        dashed = false,
      ) => {
        map.addSource(id, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: routeCoordinates },
          },
        })
        const dash = dashed ? [1.4, 2.2] : undefined
        map.addLayer({
          id: `${id}-outline`,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": outlineWidth,
            "line-opacity": 0.92,
            ...(dash ? { "line-dasharray": dash } : {}),
          },
        })
        map.addLayer({
          id: `${id}-line`,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": width,
            ...(dash ? { "line-dasharray": dash } : {}),
          },
        })
      }

      addRoute("east-route", [], "#8FB7AE", 4, 6, true)
      addRoute("sgu-route", [], "#0B4F4A", 7, 11)

      // Nét đứt chấm tròn mô phỏng người dùng bước từ trong nhà ra cửa hẻm (giống Google Maps)
      map.addSource("alley-connector", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      })
      map.addLayer({
        id: "alley-connector-dots",
        type: "line",
        source: "alley-connector",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 6,
          "line-dasharray": [0.2, 1.8],
          "line-opacity": 0.95,
        },
      })

      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Xoa hoan toan tuyen du phong khi dang dan duong
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (isNavigating) {
      const eastSrc = map.getSource("east-route") as GeoJSONSource | undefined
      eastSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      })
    }
  }, [isNavigating, ready])

  // Cập nhật marker và tuyến đường mỗi khi người dùng nhập Điểm đi / Điểm đến
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    const createCampusMarker = (
      kind: "start" | "destination",
      title: string,
    ) => {
      const marker = document.createElement("div")
      marker.className = `libre-campus-marker ${kind}`
      marker.title = title
      marker.setAttribute("aria-label", title)
      const core = document.createElement("span")
      marker.appendChild(core)
      return marker
    }

    // Cập nhật marker Điểm đi
    startMarkerRef.current?.remove()
    startMarkerRef.current = null
    if (origin) {
      startMarkerRef.current = new maplibregl.Marker({
        element: createCampusMarker("start", origin.label),
        anchor: "center",
      })
        .setLngLat(origin.coords)
        .addTo(map)
    }

    // Cập nhật marker Điểm đến
    destMarkerRef.current?.remove()
    destMarkerRef.current = null
    if (destination) {
      destMarkerRef.current = new maplibregl.Marker({
        element: createCampusMarker("destination", destination.label),
        anchor: "bottom",
      })
        .setLngLat(destination.coords)
        .addTo(map)
    }

    // Nếu chưa đủ cả Điểm đi và Điểm đến thì xóa đường vẽ cũ
    if (!origin || !destination) {
      setRouteStatus("idle")
      etaMarkerRef.current?.remove()
      etaMarkerRef.current = null
      etaRef.current = null

      const sguSrc = map.getSource("sgu-route") as GeoJSONSource | undefined
      sguSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      })
      const eastSrc = map.getSource("east-route") as GeoJSONSource | undefined
      eastSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      })

      if (origin) {
        map.flyTo({ center: origin.coords, zoom: 14.2, duration: 700 })
      } else if (destination) {
        map.flyTo({ center: destination.coords, zoom: 14.2, duration: 700 })
      }
      return
    }

    let active = true
    setRouteStatus("loading")
    const origCoords = origin.coords
    const destCoords = destination.coords

    async function loadRouteGeometry() {
      const isMatchingCurrentEndpoints = (coords: number[][]) => {
        if (!Array.isArray(coords) || coords.length < 2) return false
        const first = coords[0]
        const last = coords[coords.length - 1]
        const dStart = Math.hypot(first[0] - origCoords[0], first[1] - origCoords[1])
        const dEnd = Math.hypot(last[0] - destCoords[0], last[1] - destCoords[1])
        return dStart < 0.005 && dEnd < 0.005
      }

      // Chỉ sử dụng routesData nếu tọa độ thực sự khớp với Điểm đi & Điểm đến hiện tại
      if (
        routesData?.safe?.coordinates &&
        Array.isArray(routesData.safe.coordinates) &&
        routesData.safe.coordinates.length > 2 &&
        isMatchingCurrentEndpoints(routesData.safe.coordinates)
      ) {
        let safeCoords = routesData.safe.coordinates;
        let altCoords = (!isNavigating && routesData.balanced?.coordinates && Array.isArray(routesData.balanced.coordinates) && routesData.balanced.coordinates.length > 2)
          ? routesData.balanced.coordinates
          : [];

        const currentMap = mapRef.current;
        if (active && currentMap) {
          activeRouteCoordsRef.current = safeCoords;
          setRouteVersion((v) => v + 1);

          const sguSrc = currentMap.getSource("sgu-route") as GeoJSONSource | undefined;
          sguSrc?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: safeCoords } });

          const eastSrc = currentMap.getSource("east-route") as GeoJSONSource | undefined;
          eastSrc?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: altCoords } });

          // Nối chấm tròn từ vị trí trong nhà ra cửa hẻm
          const alleySrc = currentMap.getSource("alley-connector") as GeoJSONSource | undefined;
          const dx = origCoords[0] - safeCoords[0][0];
          const dy = origCoords[1] - safeCoords[0][1];
          if (dx * dx + dy * dy > 0.00000004 && dx * dx + dy * dy < 0.00002) {
            alleySrc?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [origCoords, safeCoords[0]] } });
          } else {
            alleySrc?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
          }

          setRouteStatus("live");
          return;
        }
      }

      let safeCoords: number[][] = [origCoords, destCoords]
      let altCoords: number[][] = []

      let hasGoogleRoute = false
      try {
        const googleRes = await computeRouteWithGoogle(origCoords, destCoords)
        if (googleRes && Array.isArray(googleRes.safeRoute?.coordinates) && googleRes.safeRoute.coordinates.length > 1) {
          safeCoords = googleRes.safeRoute.coordinates
          altCoords = (!isNavigating && Array.isArray(googleRes.balancedRoute?.coordinates) && googleRes.balancedRoute.coordinates.length > 2)
            ? googleRes.balancedRoute.coordinates
            : []
          if (active) setRouteStatus("live")
          hasGoogleRoute = true
        }
      } catch (err) {
        console.warn("Google Maps geometry fallback:", err)
      }

      if (!hasGoogleRoute) {
        try {
        const backendRes = await fetch(
          `/api/journey/compute-route?fromLat=${origCoords[1]}&fromLng=${origCoords[0]}&toLat=${destCoords[1]}&toLng=${destCoords[0]}`,
        )
        if (backendRes.ok) {
          const backendData = await backendRes.json()
          const safeC =
            backendData?.safeRoute?.coordinates ??
            backendData?.safeRoute?.waypoints
          const altC =
            backendData?.balancedRoute?.coordinates ??
            backendData?.balancedRoute?.waypoints
          if (
            backendData?.provider !== "database-fallback" &&
            Array.isArray(safeC) &&
            safeC.length > 2
          ) {
            safeCoords = safeC
            if (Array.isArray(altC) && altC.length > 2) {
              altCoords = altC
            }
            if (active) setRouteStatus("live")
          } else {
            throw new Error("Need live road route")
          }
        } else {
          throw new Error("Backend route unavailable")
        }
      } catch {
        try {
          const primaryResponse = await fetch(
            `https://router.project-osrm.org/route/v1/bike/${origCoords.join(",")};${destCoords.join(",")}?steps=true&geometries=geojson&overview=full`,
          )
          if (primaryResponse.ok) {
            const primaryData = await primaryResponse.json()
            if (primaryData.routes?.[0]?.geometry?.coordinates?.length > 1) {
              safeCoords = primaryData.routes[0].geometry.coordinates
            }
          }
          altCoords = []
          if (active) setRouteStatus("live")
        } catch {
          if (active) setRouteStatus("fallback")
        }
      }
    }

            const currentMap = mapRef.current
      if (!active || !currentMap) return

      // Cập nhật đường nối chấm tròn (walking trail) từ trong nhà ra mép hẻm (giống Google Maps)
      const alleySrc = currentMap.getSource("alley-connector") as GeoJSONSource | undefined;
      if (origCoords && safeCoords.length > 0) {
        const dx = origCoords[0] - safeCoords[0][0];
        const dy = origCoords[1] - safeCoords[0][1];
        const dSq = dx * dx + dy * dy;
        if (dSq > 0.00000004 && dSq < 0.00002) {
          alleySrc?.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [origCoords, safeCoords[0]] },
          });
        } else {
          alleySrc?.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          });
        }
      } else {
        alleySrc?.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }

      activeRouteCoordsRef.current = safeCoords
      setRouteVersion((v) => v + 1)

      const sguSrc = currentMap.getSource("sgu-route") as GeoJSONSource | undefined
      sguSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: safeCoords },
      })

      const eastSrc = currentMap.getSource("east-route") as GeoJSONSource | undefined
      eastSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: isNavigating ? [] : altCoords },
      })

      const midSafe =
        safeCoords[Math.floor(safeCoords.length / 2)] ?? origCoords

      if (!etaMarkerRef.current) {
        const etaElement = document.createElement("div")
        etaElement.className = "map-route-eta is-primary"
        const etaTime = document.createElement("strong")
        etaTime.textContent = routesData[route].time
        const etaDistance = document.createElement("span")
        etaDistance.textContent = routesData[route].distance
        etaElement.append(etaTime, etaDistance)
        etaRef.current = etaElement
        etaMarkerRef.current = new maplibregl.Marker({
          element: etaElement,
          anchor: "center",
        })
          .setLngLat(midSafe as [number, number])
          .addTo(currentMap)
      } else {
        etaMarkerRef.current.setLngLat(midSafe as [number, number])
      }

      const allCoords = [...safeCoords, ...altCoords]
      const bounds = allCoords.reduce(
        (result, coordinate) => result.extend(coordinate as [number, number]),
        new maplibregl.LngLatBounds(
          allCoords[0] as [number, number],
          allCoords[0] as [number, number],
        ),
      )
      if (!isNavigatingRef.current) {
        currentMap.fitBounds(bounds, {
          padding:
            window.innerWidth < 760
              ? { top: 190, right: 40, bottom: 300, left: 40 }
              : { top: 90, right: 80, bottom: 110, left: 80 },
          duration: 850,
          maxZoom: 15.4,
        })
      }
    }

    loadRouteGeometry()

    return () => {
      active = false
    }
  }, [ready, origin?.coords?.[0], origin?.coords?.[1], destination?.coords?.[0], destination?.coords?.[1], routesData, isNavigating])

  // =========================================================================
  // PURE LIVE GPS TRACKING ENGINE (Theo dõi GPS người dùng thật theo thời gian thực)
  // Không tự động di chuyển - Người dùng đi tới đâu sẽ tracking tới đó chuẩn Google Maps
  // =========================================================================
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    let coords = activeRouteCoordsRef.current
    if (origin && destination) {
      const isStale = !coords || coords.length === 0 || Math.hypot(coords[0][0] - origin.coords[0], coords[0][1] - origin.coords[1]) > 0.005
      if (isStale) {
        const fresh = routesData?.safe?.coordinates
        if (Array.isArray(fresh) && fresh.length > 1 && Math.hypot(fresh[0][0] - origin.coords[0], fresh[0][1] - origin.coords[1]) < 0.005) {
          coords = fresh
          activeRouteCoordsRef.current = fresh
        } else {
          coords = [origin.coords, destination.coords]
          activeRouteCoordsRef.current = coords
        }
      }
    }
    if (!coords || coords.length === 0) return

    function getDistanceMeters(p1: [number, number], p2: [number, number]): number {
      const R = 6371000
      const dLat = ((p2[1] - p1[1]) * Math.PI) / 180
      const dLng = ((p2[0] - p1[0]) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((p1[1] * Math.PI) / 180) *
          Math.cos((p2[1] * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    function getBearing(start: [number, number], end: [number, number]): number {
      const y = Math.sin(((end[0] - start[0]) * Math.PI) / 180) * Math.cos((end[1] * Math.PI) / 180)
      const x =
        Math.cos((start[1] * Math.PI) / 180) * Math.sin((end[1] * Math.PI) / 180) -
        Math.sin((start[1] * Math.PI) / 180) *
          Math.cos((end[1] * Math.PI) / 180) *
          Math.cos(((end[0] - start[0]) * Math.PI) / 180)
      return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
    }

    // Chiếu tọa độ người dùng P lên đoạn thẳng AB trên tuyến đường (Map Matching)
    function projectPointToSegment(p: [number, number], a: [number, number], b: [number, number]) {
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const lenSq = dx * dx + dy * dy
      if (lenSq === 0) return { point: a, t: 0 }
      let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq
      t = Math.max(0, Math.min(1, t))
      return {
        point: [a[0] + t * dx, a[1] + t * dy] as [number, number],
        t,
      }
    }

    if (!isNavigating) {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      progressDistanceRef.current = 0

      puckMarkerRef.current?.remove()
      puckMarkerRef.current = null

      map.flyTo({
        pitch: 0,
        bearing: 0,
        duration: 900,
      })

      if (coords.length > 1) {
        const bounds = coords.reduce(
          (result, coordinate) => result.extend(coordinate as [number, number]),
          new maplibregl.LngLatBounds(
            coords[0] as [number, number],
            coords[0] as [number, number],
          ),
        )
        map.fitBounds(bounds, {
          padding:
            window.innerWidth < 760
              ? { top: 190, right: 40, bottom: 300, left: 40 }
              : { top: 90, right: 80, bottom: 110, left: 80 },
          duration: 900,
          maxZoom: 15.4,
        })
      }
      return
    }

    // TÍNH TOÁN ĐỘ DÀI VÀ MỐC RẼ TUYẾN ĐƯỜNG
    const segmentDistances: number[] = []
    let totalRouteMeters = 0
    for (let i = 0; i < coords.length - 1; i++) {
      const d = getDistanceMeters(coords[i] as [number, number], coords[i + 1] as [number, number])
      segmentDistances.push(d)
      totalRouteMeters += d
    }

    function getPointAtDistance(targetDist: number): [number, number] {
      if (targetDist <= 0) return coords[0] as [number, number]
      if (targetDist >= totalRouteMeters) return coords[coords.length - 1] as [number, number]
      let accumulated = 0
      for (let i = 0; i < segmentDistances.length; i++) {
        const segDist = segmentDistances[i]
        if (accumulated + segDist >= targetDist) {
          const ratio = segDist > 0 ? (targetDist - accumulated) / segDist : 0
          const p1 = coords[i]
          const p2 = coords[i + 1]
          return [
            p1[0] + (p2[0] - p1[0]) * ratio,
            p1[1] + (p2[1] - p1[1]) * ratio,
          ]
        }
        accumulated += segDist
      }
      return coords[coords.length - 1] as [number, number]
    }

    const stepCount = Math.max(1, navigationSteps.length)
    const stepMilestones: number[] = []
    let stepDistAccum = 0
    for (let s = 0; s < navigationSteps.length; s++) {
      const step = navigationSteps[s]
      let meters = 0
      if (typeof step.distanceMeters === "number" && step.distanceMeters > 0) {
        meters = step.distanceMeters
      } else if (typeof step.distance === "string") {
        const cleaned = step.distance.replace(",", ".")
        const match = cleaned.match(/([\d.]+)/)
        if (match) {
          const val = parseFloat(match[1])
          meters = cleaned.includes("km") ? val * 1000 : val
        }
      }
      if (meters <= 10) {
        meters = totalRouteMeters / stepCount
      }
      stepDistAccum += meters
      stepMilestones.push(Math.min(totalRouteMeters, stepDistAccum))
    }

    // Khởi tạo Navigation Puck nếu chưa có
    if (!puckMarkerRef.current) {
      const puckEl = document.createElement("div")
      puckEl.className = "google-nav-puck"
      puckEl.innerHTML = `
        <div class="puck-radar-wave"></div>
        <div class="puck-arrow-body">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#FFFFFF">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      `
      puckMarkerRef.current = new maplibregl.Marker({
        element: puckEl,
        anchor: "center",
      })
        .setLngLat(coords[0] as [number, number])
        .addTo(map)
    }

    // Hàm cập nhật camera, mũi tên và khoảng cách khi vị trí người dùng thay đổi
    const updatePositionOnRoute = (
      userPoint: [number, number],
      distAlongRoute: number,
      deviceHeading?: number | null,
      deviceSpeed?: number | null,
    ) => {
      progressDistanceRef.current = distAlongRoute
      const lookPoint = getPointAtDistance(distAlongRoute + 16)
      const roadBearing = typeof deviceHeading === "number" && !isNaN(deviceHeading) && deviceHeading > 0
        ? deviceHeading
        : getBearing(userPoint, lookPoint)

      if (puckMarkerRef.current) {
        puckMarkerRef.current.setLngLat(userPoint)
        const arrowBody = puckMarkerRef.current.getElement().querySelector(".puck-arrow-body") as HTMLElement | null
        if (arrowBody) {
          arrowBody.style.transform = `rotate(${roadBearing}deg)`
        }
      }

      // Camera 3D bám sát theo vị trí người dùng
      map.easeTo({
        center: userPoint,
        zoom: 17.8,
        pitch: 62,
        bearing: roadBearing,
        duration: 650,
        essential: true,
      })

      // Khoảng cách tới ngã rẽ tiếp theo
      const curStepIdx = navStepIndexRef.current
      const targetTurnDist = stepMilestones[curStepIdx] ?? totalRouteMeters
      const distToTurnM = Math.max(0, Math.round(targetTurnDist - distAlongRoute))

      // Nếu người dùng đã đi tới ngã rẽ (<= 25m): tự động chuyển sang bước rẽ kế tiếp!
      if (distToTurnM <= 25 && curStepIdx < navigationSteps.length - 1) {
        const nextStepIdx = curStepIdx + 1
        navStepIndexRef.current = nextStepIdx
        onStepChangeRef.current?.(nextStepIdx)
      }

      const remainingKmM = Math.max(0, Math.round(totalRouteMeters - distAlongRoute))
      const remainingMin = Math.max(1, Math.round(remainingKmM / ((25 * 1000) / 60)))
      const speedKmh = deviceSpeed ? Math.round(deviceSpeed * 3.6) : 0

      onProgressUpdateRef.current?.({
        distanceToTurnM: distToTurnM,
        remainingKmM,
        remainingMinutes: remainingMin,
        speedKmh,
      })
    }

    // Xử lý khi có tọa độ GPS thật gửi về từ cảm biến thiết bị của người dùng
    const handleRawGpsUpdate = (rawLng: number, rawLat: number, heading?: number | null, speed?: number | null) => {
      userRealGpsRef.current = [rawLng, rawLat]

      // Tìm điểm chiếu gần nhất trên tuyến đường (Map Matching)
      let minDistanceToRoad = Infinity
      let bestSnappedPoint = coords[0] as [number, number]
      let bestDistAlongRoute = 0
      let runningSum = 0

      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i] as [number, number]
        const b = coords[i + 1] as [number, number]
        const segDist = segmentDistances[i]
        const proj = projectPointToSegment([rawLng, rawLat], a, b)
        const d = getDistanceMeters([rawLng, rawLat], proj.point)
        if (d < minDistanceToRoad) {
          minDistanceToRoad = d
          bestSnappedPoint = proj.point
          bestDistAlongRoute = runningSum + segDist * proj.t
        }
        runningSum += segDist
      }

      // Phát hiện người dùng rẽ sang hướng khác (Lệch lộ trình > 38m)
      if (minDistanceToRoad > 38) {
        offRouteCounterRef.current += 1
        // Kích hoạt tính toán lại đường đi (Auto-Rerouting) khi chệch lộ trình liên tiếp 2 nhịp GPS
        if (offRouteCounterRef.current >= 2) {
          const now = Date.now()
          if (now - lastRerouteTimeRef.current > 4000) {
            lastRerouteTimeRef.current = now
            offRouteCounterRef.current = 0
            if (isUsingRealGps) {
              console.log(`[Auto-Reroute] Người dùng đã rẽ sang đường khác (cách lộ trình cũ ${Math.round(minDistanceToRoad)}m). Đang tính lại tuyến né ngập từ [${rawLng}, ${rawLat}]...`)
              onRerouteRef.current?.([rawLng, rawLat])
            }
          }
        }
      } else {
        offRouteCounterRef.current = 0
      }

      // Nếu đang đi trên trục đường (<= 38m): snap vào đường. Nếu đã rẽ sang đường khác: dùng vị trí thật trên đường mới
      const finalPoint: [number, number] = minDistanceToRoad <= 38 ? bestSnappedPoint : [rawLng, rawLat]
      updatePositionOnRoute(finalPoint, bestDistAlongRoute, heading, speed)
    }

    // Chỉ kích hoạt theo dõi cảm biến GPS phần cứng khi người dùng CHỦ ĐỘNG chọn "Vị trí của bạn"
    // Nếu người dùng chọn một địa điểm bất kỳ khác (để xem thử / mô phỏng lộ trình), giữ nguyên 100% điểm đó
    const isUsingRealGps = Boolean(origin?.isCurrentLocation)

    if (isUsingRealGps) {
      if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
        if (capWatchIdRef.current === null) {
          Geolocation.watchPosition(
            { enableHighAccuracy: true },
            (pos) => {
              if (pos && pos.coords) {
                handleRawGpsUpdate(
                  pos.coords.longitude,
                  pos.coords.latitude,
                  pos.coords.heading,
                  pos.coords.speed,
                )
              }
            }
          ).then((id) => {
            capWatchIdRef.current = id
          }).catch((err) => {
            console.warn("Capacitor watchPosition error:", err)
          })
        }
      } else if (watchIdRef.current === null && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              handleRawGpsUpdate(
                pos.coords.longitude,
                pos.coords.latitude,
                pos.coords.heading,
                pos.coords.speed,
              )
            },
            (err) => {
              console.warn("Live GPS watchPosition warning:", err)
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
          )
        } catch (err) {
          console.warn("Could not start watchPosition:", err)
        }
      }
    }
    // Hiển thị vị trí ban đầu hoặc bước đi thử nghiệm
    if (stepForwardTrigger > 0) {
      const nextDist = Math.min(totalRouteMeters, progressDistanceRef.current + 50)
      const nextPoint = getPointAtDistance(nextDist)
      updatePositionOnRoute(nextPoint, nextDist, null, 6.9)
    } else {
      const initialDist = progressDistanceRef.current
      const initialPoint = getPointAtDistance(initialDist)
      updatePositionOnRoute(initialPoint, initialDist, null, 0)
    }

    return () => {
      if (capWatchIdRef.current !== null) {
        Geolocation.clearWatch({ id: capWatchIdRef.current })
        capWatchIdRef.current = null
      }
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isNavigating, ready, routeVersion, recenterTrigger, stepForwardTrigger, navigationSteps.length])

  // Hiển thị các điểm ngập thực tế từ PostgreSQL lên bản đồ
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    for (const m of floodMarkersRef.current) {
      m.remove()
    }
    floodMarkersRef.current = []

    for (const pt of floodPoints) {
      if (pt.type !== "flood" && pt.type !== "pending" && pt.type !== "risk")
        continue
      // Không vẽ các điểm khô ráo depth <= 0
      if ((pt.depth || 0) <= 0) continue

      const el = document.createElement("div")
      el.className = `libre-flood-marker ${pt.severity} severity-${pt.severity}`
      el.title = `${pt.label} (${pt.district}) · Mực nước ngập: ${pt.depth} cm · Mưa: ${pt.rainfall} mm`
      el.innerHTML = `<span class="libre-flood-pulse"></span><span class="flood-label">${pt.label}${pt.depth ? ` · ${pt.depth}cm` : ""}</span>`

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map)

      floodMarkersRef.current.push(marker)
    }
  }, [ready, floodPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    const safe = route === "safe"

    const paint = (
      layerId: string,
      property: "line-color" | "line-width" | "line-dasharray",
      value: string | number | number[] | undefined,
    ) => {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value)
    }

    paint("sgu-route-line", "line-color", safe ? "#0B4F4A" : "#A9BFB8")
    paint("sgu-route-line", "line-width", safe ? 7 : 4)
    paint("east-route-line", "line-color", safe ? "#8FB7AE" : "#C97A2B")
    paint("east-route-line", "line-width", safe ? 4 : 7)
    paint("east-route-outline", "line-width", safe ? 6 : 11)
    paint("east-route-line", "line-dasharray", safe ? [1.4, 2.2] : undefined)

    const eta = etaRef.current
    if (eta) {
      const time = eta.querySelector("strong")
      const distance = eta.querySelector("span")
      if (time) time.textContent = routesData[route].time
      if (distance) distance.textContent = routesData[route].distance
    }
  }, [route, ready, routesData])

  // Chuyển đổi lớp nền bản đồ mượt mà (Google Maps / Vệ tinh / Giao thông / Esri)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const allLayers: GoogleMapLayerType[] = [
      "google-streets",
      "google-satellite",
      "google-traffic",
      "esri",
    ]
    for (const l of allLayers) {
      const id = `layer-${l}`
      if (map.getLayer(id)) {
        map.setLayoutProperty(
          id,
          "visibility",
          l === mapLayer ? "visible" : "none",
        )
      }
    }
  }, [mapLayer, ready])

  const statusText =
    routeStatus === "idle"
      ? mapMode === "history"
        ? "📚 Đang hiển thị 250 điểm đen ngập lụt lịch sử TP.HCM (IRD 2002–2026)"
        : floodPoints.length === 0
          ? "☀️ TP.HCM khô ráo (0 mm mưa) · Các tuyến đường thông thoáng không ngập"
          : `🌧️ Chẩn đoán ${floodPoints.length} tuyến đường có nguy cơ ngập theo thời tiết thực`
      : routeStatus === "live"
        ? `Tuyến thực tế · ${routesData[route].distance} · ${routesData[route].time}`
        : routeStatus === "fallback"
          ? "Tuyến dự phòng ngoại tuyến"
          : "Đang tính toán lộ trình…"

  return (
    <div className="libre-map-shell">
      <div
        aria-label="Bản đồ giám sát ngập và dẫn đường TP.HCM"
        className={`libre-map layer-${mapLayer}`}
        ref={containerRef}
      />

      {/* Nhóm điều khiển bản đồ: Kiểu Google Maps & Chế độ Realtime / 250 Điểm IRD */}
      <div className="map-controls-group">
        <button
          type="button"
          className={`map-mode-toggle-btn ${mapMode === "history" ? "is-history" : "is-realtime"}`}
          onClick={onToggleMapMode}
          title={
            mapMode === "realtime"
              ? "Đang ở chế độ: Chẩn đoán Real-time theo thời tiết thực (Bấm để xem 250 điểm lịch sử)"
              : "Đang xem: 250 Điểm đen ngập lụt IRD 2002-2026 (Bấm để về Real-time)"
          }
          aria-label="Chuyển chế độ xem bản đồ ngập"
        >
          {mapMode === "history" ? (
            <>
              <span className="mode-badge-icon">📚</span>
              <span>250 Điểm IRD</span>
            </>
          ) : (
            <>
              <span className="mode-live-dot" />
              <span>Realtime AI</span>
            </>
          )}
        </button>

        <div className="map-layer-control-wrap" ref={layerMenuRef}>
        <button
          type="button"
          className={`map-layer-btn ${showLayerMenu ? "active" : ""}`}
          onClick={() => setShowLayerMenu((prev) => !prev)}
          title="Chọn kiểu bản đồ Google Maps"
          aria-label="Chọn kiểu bản đồ Google Maps"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span className="map-layer-current-text">
            {mapLayer === "google-streets"
              ? "Google"
              : mapLayer === "google-satellite"
                ? "Vệ tinh"
                : mapLayer === "google-traffic"
                  ? "Giao thông"
                  : "Esri"}
          </span>
        </button>

        {showLayerMenu && (
          <div className="map-layer-popup" role="menu">
            <div className="map-layer-popup-title">Lớp nền bản đồ</div>
            <div className="map-layer-options">
              <button
                type="button"
                className={`map-layer-card ${mapLayer === "google-streets" ? "selected" : ""}`}
                onClick={() => {
                  setMapLayer("google-streets")
                  setShowLayerMenu(false)
                }}
              >
                <div className="map-layer-card-icon">🗺️</div>
                <div className="map-layer-card-body">
                  <strong>Google Đường phố</strong>
                  <p>Hẻm nhỏ, số nhà, ngõ ngách chi tiết TP.HCM</p>
                </div>
                {mapLayer === "google-streets" && <span className="map-layer-check">✓</span>}
              </button>

              <button
                type="button"
                className={`map-layer-card ${mapLayer === "google-satellite" ? "selected" : ""}`}
                onClick={() => {
                  setMapLayer("google-satellite")
                  setShowLayerMenu(false)
                }}
              >
                <div className="map-layer-card-icon">🛰️</div>
                <div className="map-layer-card-body">
                  <strong>Google Vệ tinh</strong>
                  <p>Ảnh chụp không gian thực tế + Tên đường</p>
                </div>
                {mapLayer === "google-satellite" && <span className="map-layer-check">✓</span>}
              </button>

              <button
                type="button"
                className={`map-layer-card ${mapLayer === "google-traffic" ? "selected" : ""}`}
                onClick={() => {
                  setMapLayer("google-traffic")
                  setShowLayerMenu(false)
                }}
              >
                <div className="map-layer-card-icon">🚦</div>
                <div className="map-layer-card-body">
                  <strong>Google Giao thông Live</strong>
                  <p>Mật độ kẹt xe & tốc độ lưu thông trực tiếp</p>
                </div>
                {mapLayer === "google-traffic" && <span className="map-layer-check">✓</span>}
              </button>

              <button
                type="button"
                className={`map-layer-card ${mapLayer === "esri" ? "selected" : ""}`}
                onClick={() => {
                  setMapLayer("esri")
                  setShowLayerMenu(false)
                }}
              >
                <div className="map-layer-card-icon">🌐</div>
                <div className="map-layer-card-body">
                  <strong>Esri Thế giới</strong>
                  <p>Bản đồ tiêu chuẩn quốc tế OSM</p>
                </div>
                {mapLayer === "esri" && <span className="map-layer-check">✓</span>}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="libre-route-status">
        <span />
        {statusText}
      </div>
    </div>
  )
}

export default MapCanvas
