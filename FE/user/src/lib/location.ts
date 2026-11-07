export type UserGeoLocation = {
  latitude: number;
  longitude: number;
  isIpFallback: boolean;
};

export async function getUserLocation(): Promise<UserGeoLocation> {
  const fallbackIp = async (): Promise<UserGeoLocation> => {
    try {
      const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            isIpFallback: true,
          };
        }
      }
    } catch {
      // try secondary IP service
    }

    try {
      const res2 = await fetch("https://ipwho.is/", {
        signal: AbortSignal.timeout(3000),
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.success && data2.latitude && data2.longitude) {
          return {
            latitude: Number(data2.latitude),
            longitude: Number(data2.longitude),
            isIpFallback: true,
          };
        }
      }
    } catch {
      // fallback to default HCMC center
    }

    return {
      latitude: 10.7769,
      longitude: 106.7009,
      isIpFallback: true,
    };
  };

  const isSecure =
    typeof window !== "undefined" &&
    (window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!isSecure || typeof navigator === "undefined" || !navigator.geolocation) {
    return fallbackIp();
  }

  // Nếu người dùng đã chặn quyền vị trí trong trình duyệt thì chuyển thẳng sang fallback
  try {
    if (navigator.permissions?.query) {
      const permStatus = await navigator.permissions.query({ name: "geolocation" });
      if (permStatus.state === "denied") {
        return fallbackIp();
      }
    }
  } catch {
    // ignore permissions API error
  }

  const requestBrowserPosition = (
    highAccuracy: boolean,
    timeoutMs: number,
  ): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Geolocation timeout"));
      }, timeoutMs + 1500);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(pos);
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        },
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 0 },
      );
    });

  // Bước 1: Thử lấy tọa độ độ chính xác cao (GPS / Wi-Fi triangulation)
  try {
    const pos = await requestBrowserPosition(true, 7000);
    const isCoarseIp = (pos.coords.accuracy ?? 0) > 3000;
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      isIpFallback: isCoarseIp,
    };
  } catch (err: any) {
    // Nếu người dùng bấm Block (PERMISSION_DENIED = 1), không gọi lại lần 2
    if (err && err.code === 1) {
      return fallbackIp();
    }
  }

  // Bước 2: Trên máy tính bàn / laptop không có chip GPS, thử lại với enableHighAccuracy: false (Wi-Fi/Network Location)
  try {
    const pos = await requestBrowserPosition(false, 5000);
    const isCoarseIp = (pos.coords.accuracy ?? 0) > 3000;
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      isIpFallback: isCoarseIp,
    };
  } catch (err) {
    console.warn("GPS lookup denied or unavailable, switching to IP Geolocation:", err);
    return fallbackIp();
  }
}
