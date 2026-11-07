-- =========================================================================
-- SaigonDrain AI — PostgreSQL Database Initialization Script
-- Hệ thống giám sát, cảnh báo ngập lụt và định tuyến an toàn TP.HCM
-- =========================================================================

-- 1. Tạo Database (nếu chưa có)
-- CREATE DATABASE saigondrain;
-- \c saigondrain;

-- Bật extension UUID (nếu cần sinh tự động UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 2. BẢNG DỮ LIỆU THỜI TIẾT (weather_snapshots)
-- Lưu trữ lịch sử thời tiết & lượng mưa thu thập thực tế từ Open-Meteo API
-- =========================================================================
DROP TABLE IF EXISTS weather_snapshots CASCADE;
CREATE TABLE weather_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL DEFAULT 'Open-Meteo',
    "locationName" VARCHAR(255) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    lat DOUBLE PRECISION NOT NULL DEFAULT 10.7769,
    lng DOUBLE PRECISION NOT NULL DEFAULT 106.7009,
    "elevationM" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "temperatureC" DOUBLE PRECISION NOT NULL DEFAULT 28.0,
    "humidityPercent" INTEGER NOT NULL DEFAULT 80,
    "windSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "currentRainMm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "weatherCondition" VARCHAR(100) NOT NULL DEFAULT 'Trời nhiều mây',
    "floodRiskLevel" VARCHAR(50) NOT NULL DEFAULT 'Thấp',
    "hourlyForecast" TEXT NOT NULL DEFAULT '[]',
    "fetchedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weather_fetched_at ON weather_snapshots ("fetchedAt" DESC);

-- =========================================================================
-- 3. BẢNG NGƯỜI DÙNG & CỘNG TÁC VIÊN (community_users)
-- =========================================================================
DROP TABLE IF EXISTS community_users CASCADE;
CREATE TABLE community_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    initials VARCHAR(10) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    "joinedAt" VARCHAR(50) NOT NULL,
    "lastActive" VARCHAR(50) NOT NULL,
    reports INTEGER NOT NULL DEFAULT 0,
    "verifiedReports" INTEGER NOT NULL DEFAULT 0,
    "rejectedReports" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    "identityVerified" BOOLEAN NOT NULL DEFAULT true,
    warnings INTEGER NOT NULL DEFAULT 0,
    "passwordHash" VARCHAR(255),
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 4. BẢNG PHẢN ÁNH NGẬP TỪ NGƯỜI DÂN (flood_reports)
-- =========================================================================
DROP TABLE IF EXISTS flood_reports CASCADE;
CREATE TABLE flood_reports (
    id VARCHAR(50) PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    "reportedAt" VARCHAR(50) NOT NULL,
    "minutesAgo" INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    "reportType" VARCHAR(50) NOT NULL DEFAULT 'flood',
    "reportedDepth" INTEGER NOT NULL DEFAULT 0,
    "aiDepth" INTEGER NOT NULL DEFAULT 0,
    "aiConfidence" INTEGER NOT NULL DEFAULT 85,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    "rejectReason" VARCHAR(255),
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    coordinates VARCHAR(100) NOT NULL,
    "historyCount" INTEGER NOT NULL DEFAULT 0,
    visual VARCHAR(50) NOT NULL DEFAULT 'citizen',
    "photoUrl" TEXT,
    "reporterId" VARCHAR(50) REFERENCES community_users(id) ON DELETE SET NULL,
    "aiSummary" TEXT,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_status ON flood_reports (status);
CREATE INDEX idx_reports_created ON flood_reports ("createdAt" DESC);

-- =========================================================================
-- 5. BẢNG ĐIỂM NGẬP TRÊN BẢN ĐỒ (map_points)
-- =========================================================================
DROP TABLE IF EXISTS map_points CASCADE;
CREATE TABLE map_points (
    id VARCHAR(50) PRIMARY KEY,
    x DOUBLE PRECISION NOT NULL DEFAULT 0,
    y DOUBLE PRECISION NOT NULL DEFAULT 0,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    type VARCHAR(50) NOT NULL DEFAULT 'flood',
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',
    label VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    "historyCount" INTEGER NOT NULL DEFAULT 1,
    "linkedReportId" VARCHAR(50),
    rainfall DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_map_points_coords ON map_points (lat, lng);

-- =========================================================================
-- 6. BẢNG CẢNH BÁO ĐÔ THỊ (area_alerts)
-- =========================================================================
DROP TABLE IF EXISTS area_alerts CASCADE;
CREATE TABLE area_alerts (
    id VARCHAR(50) PRIMARY KEY,
    area VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'warning',
    "hazardType" VARCHAR(50) NOT NULL DEFAULT 'rain',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    "startedAt" VARCHAR(50) NOT NULL,
    "expiresAt" VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    channels TEXT NOT NULL DEFAULT '["app"]',
    "createdBy" VARCHAR(255) NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 7. BẢNG DỰ BÁO THEO MỐC THỜI GIAN (forecast_slots)
-- =========================================================================
DROP TABLE IF EXISTS forecast_slots CASCADE;
CREATE TABLE forecast_slots (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    rain VARCHAR(50) NOT NULL,
    risk VARCHAR(50) NOT NULL,
    zone INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rainMm" DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- =========================================================================
-- 8. BẢNG TÙY CHỌN LỘ TRÌNH (route_options)
-- =========================================================================
DROP TABLE IF EXISTS route_options CASCADE;
CREATE TABLE route_options (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    time VARCHAR(50) NOT NULL,
    distance VARCHAR(50) NOT NULL,
    badge VARCHAR(50) NOT NULL,
    detail TEXT NOT NULL,
    waypoints TEXT NOT NULL DEFAULT '[]',
    "navigationSteps" TEXT NOT NULL DEFAULT '[]'
);

-- =========================================================================
-- 9. BẢNG XU HƯỚNG THEO CHU KỲ (trend_series)
-- =========================================================================
DROP TABLE IF EXISTS trend_series CASCADE;
CREATE TABLE trend_series (
    "rangeKey" VARCHAR(50) PRIMARY KEY,
    labels TEXT NOT NULL,
    reports TEXT NOT NULL,
    rain TEXT NOT NULL,
    insight TEXT NOT NULL
);

-- Hoàn tất khởi tạo cấu trúc bảng PostgreSQL
