import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as LibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { GOOGLE_MAP_TILE_URLS, type GoogleMapLayerType } from "@/lib/googleMaps";
import { getUserLocation } from "@/lib/location";
import Icon from "@/components/ui/Icon";
import type { CommunityReport } from "@/types";

interface CommunityMapProps {
  reports: CommunityReport[];
  selectedReportId: string | null;
  onSelectReport: (report: CommunityReport | null) => void;
  onNavigateToAvoid?: (report: CommunityReport) => void;
}

export default function CommunityMap({
  reports,
  selectedReportId,
  onSelectReport,
  onNavigateToAvoid,
}: CommunityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, maplibregl.Popup>>(new Map());
  const [mapLayer, setMapLayer] = useState<GoogleMapLayerType>("google-streets");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const layerMenuRef = useRef<HTMLDivElement>(null);

  // Close layer menu on outside click
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (layerMenuRef.current && !layerMenuRef.current.contains(ev.target as Node)) {
        setShowLayerMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    maplibregl.setWorkerUrl(maplibreWorkerUrl);

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [106.698, 10.775],
      zoom: 12.5,
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
            attribution: "© Google Maps Traffic",
          },
          esri: {
            type: "raster",
            tiles: GOOGLE_MAP_TILE_URLS.esri,
            tileSize: 256,
            attribution: "© Esri · OSM",
          },
        },
        layers: [
          {
            id: "base-layer",
            type: "raster",
            source: "google-streets",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update base map raster layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    try {
      if (map.getLayer("base-layer")) {
        map.removeLayer("base-layer");
      }
      map.addLayer(
        {
          id: "base-layer",
          type: "raster",
          source: mapLayer,
          minzoom: 0,
          maxzoom: 22,
        },
        map.getLayersOrder()[0],
      );
    } catch {
      // ignore style race
    }
  }, [mapLayer]);

  // Update Markers for Community Reports
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    popupsRef.current.clear();

    const validReports = reports.filter(
      (r) => r.status !== "rejected" && Number.isFinite(r.lng) && Number.isFinite(r.lat),
    );

    for (const report of validReports) {
      const lng = report.lng!;
      const lat = report.lat!;
      const isSelected = report.id === selectedReportId;

      const markerEl = document.createElement("div");
      markerEl.className = `community-flood-marker severity-${report.severity} ${
        isSelected ? "is-selected" : ""
      }`;

      const iconSvg =
        report.reportType === "drain"
          ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.5 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z"/></svg>`
          : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16.5a4 4 0 1 1 .6-7.95A5.5 5.5 0 0 1 18 10.5a3 3 0 0 1-1 5.82"/><path d="m8 19-1 2M13 18l-1 3M18 19l-1 2"/></svg>`;

      markerEl.innerHTML = `
        <span class="community-marker-pulse"></span>
        <span class="community-marker-body">
          <span class="community-marker-icon">${iconSvg}</span>
          <span class="community-marker-depth">${report.reportType === "drain" ? "Cống" : "Ngập"}</span>
        </span>
        <span class="community-marker-tail"></span>
      `;

      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectReport(report);
      });

      // Interactive popup
      const popupEl = document.createElement("div");
      popupEl.className = "community-map-popup";
      popupEl.innerHTML = `
        <div class="community-popup-header">
          <span class="community-popup-badge ${report.severity}">
            ${report.severity === "critical" ? "Ngập sâu" : report.severity === "high" ? "Ngập vừa" : "Ngập nhẹ"}
          </span>
          <span class="community-popup-time">${report.minutesAgo} phút trước</span>
        </div>
        <h4 class="community-popup-title">${report.location}</h4>
        <div class="community-popup-district">${report.district}</div>

        ${
          report.photoUrl
            ? `<div class="community-popup-photo"><img src="${report.photoUrl}" alt="Hiện trường" loading="lazy" /></div>`
            : ""
        }

        <div class="community-popup-stats">
          <div class="stat-box">
            <span class="stat-lbl">Loại sự cố</span>
            <strong class="stat-val ${report.severity}">${report.reportType === "drain" ? "Cống tắc" : "Đường ngập"}</strong>
          </div>
          <div class="stat-box">
            <span class="stat-lbl">Trạng thái</span>
            <strong class="stat-val">${report.status === "verified" ? "Đã xác minh" : "Chờ duyệt"}</strong>
          </div>
        </div>

        ${
          report.aiSummary
            ? `<div class="community-popup-ai">
                <span class="ai-badge">✨ AI Gemini</span>
                <p>${report.aiSummary}</p>
              </div>`
            : ""
        }
      `;

      const popup = new maplibregl.Popup({
        offset: 20,
        closeButton: true,
        closeOnClick: false,
        className: "saigondrain-community-popup",
      }).setDOMContent(popupEl);

      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.set(report.id, marker);
      popupsRef.current.set(report.id, popup);
    }
  }, [reports, selectedReportId]);

  // When selectedReportId changes, focus and open popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedReportId) return;

    const report = reports.find((r) => r.id === selectedReportId);
    if (!report || !Number.isFinite(report.lng) || !Number.isFinite(report.lat)) return;

    map.flyTo({
      center: [report.lng!, report.lat!],
      zoom: 14.8,
      duration: 800,
      essential: true,
    });

    const marker = markersRef.current.get(selectedReportId);
    const popup = popupsRef.current.get(selectedReportId);
    if (marker && popup) {
      if (!popup.isOpen()) {
        marker.togglePopup();
      }
    }
  }, [selectedReportId, reports]);

  const [isLocating, setIsLocating] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.flyTo({
      center: [106.698, 10.775],
      zoom: 12.5,
      bearing: 0,
      pitch: 0,
      duration: 600,
    });
  };

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      const { latitude, longitude, isIpFallback } = await getUserLocation();
      const map = mapRef.current;
      if (map) {
        if (!userMarkerRef.current) {
          const el = document.createElement("div");
          el.className = "community-user-gps-marker";
          el.innerHTML = `
            <span class="user-gps-pulse"></span>
            <span class="user-gps-dot"></span>
          `;
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        } else {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        }

        map.flyTo({
          center: [longitude, latitude],
          zoom: 15.2,
          duration: 900,
          essential: true,
        });

        setGpsToast(
          isIpFallback
            ? "Đã xác định vị trí mạng của bạn"
            : "Đã định vị thành công vị trí GPS của bạn",
        );
        setTimeout(() => setGpsToast(null), 3500);
      }
    } catch {
      handleRecenter();
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="community-map-wrapper">
      <div ref={containerRef} className="community-map-canvas" />

      {gpsToast && (
        <div className="community-map-toast">
          <Icon name="check" size={15} />
          <span>{gpsToast}</span>
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="community-map-controls">
        <div className="map-control-group">
          <button
            type="button"
            className="community-ctrl-btn"
            onClick={handleZoomIn}
            title="Phóng to"
          >
            <Icon name="plus" size={18} />
          </button>
          <button
            type="button"
            className="community-ctrl-btn"
            onClick={handleZoomOut}
            title="Thu nhỏ"
          >
            <span style={{ fontSize: "18px", fontWeight: "bold", lineHeight: 1 }}>−</span>
          </button>
          <button
            type="button"
            className={`community-ctrl-btn ${isLocating ? "is-locating" : ""}`}
            onClick={handleGetLocation}
            title="Định vị vị trí hiện tại của bạn"
          >
            <Icon name="location" size={17} />
          </button>
          <button
            type="button"
            className="community-ctrl-btn"
            onClick={handleRecenter}
            title="Về toàn cảnh TP.HCM"
          >
            <Icon name="location" size={17} />
          </button>
        </div>

        {/* Basemap Switcher */}
        <div className="layer-picker-relative" ref={layerMenuRef}>
          <button
            type="button"
            className={`community-ctrl-btn ${showLayerMenu ? "is-active" : ""}`}
            onClick={() => setShowLayerMenu((prev) => !prev)}
            title="Đổi lớp bản đồ"
          >
            <Icon name="layers" size={17} />
          </button>

          {showLayerMenu && (
            <div className="community-layer-popover">
              <span className="layer-popover-title">Lớp bản đồ</span>
              <button
                type="button"
                className={`layer-option-btn ${mapLayer === "google-streets" ? "is-selected" : ""}`}
                onClick={() => {
                  setMapLayer("google-streets");
                  setShowLayerMenu(false);
                }}
              >
                🗺️ Google Đường phố
              </button>
              <button
                type="button"
                className={`layer-option-btn ${mapLayer === "google-satellite" ? "is-selected" : ""}`}
                onClick={() => {
                  setMapLayer("google-satellite");
                  setShowLayerMenu(false);
                }}
              >
                🛰️ Vệ tinh chi tiết
              </button>
              <button
                type="button"
                className={`layer-option-btn ${mapLayer === "google-traffic" ? "is-selected" : ""}`}
                onClick={() => {
                  setMapLayer("google-traffic");
                  setShowLayerMenu(false);
                }}
              >
                🚦 Giao thông trực tiếp
              </button>
              <button
                type="button"
                className={`layer-option-btn ${mapLayer === "esri" ? "is-selected" : ""}`}
                onClick={() => {
                  setMapLayer("esri");
                  setShowLayerMenu(false);
                }}
              >
                🌍 Bản đồ chuẩn OSM
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Info Pill at top */}
      <div className="community-map-live-pill">
        <span className="live-dot-pulse"></span>
        <span>
          Bản đồ sự cố cộng đồng · {reports.filter((r) => r.status !== "rejected").length} điểm đang
          mở
        </span>
      </div>
    </div>
  );
}
