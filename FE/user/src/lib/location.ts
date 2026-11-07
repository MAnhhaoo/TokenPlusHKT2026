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

  return new Promise<UserGeoLocation>((resolve) => {
    let resolved = false;

    // Timeout an toàn 4.5 giây: nếu GPS phần cứng quá lâu, tự động chuyển IP geolocation
    const safetyTimer = window.setTimeout(async () => {
      if (!resolved) {
        resolved = true;
        const ipLoc = await fallbackIp();
        resolve(ipLoc);
      }
    }, 4500);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!resolved) {
          resolved = true;
          window.clearTimeout(safetyTimer);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            isIpFallback: false,
          });
        }
      },
      (err) => {
        if (resolved) return;
        // Nếu người dùng bấm Chặn (code === 1), chuyển thẳng sang fallback
        if (err && err.code === 1) {
          resolved = true;
          window.clearTimeout(safetyTimer);
          void fallbackIp().then(resolve);
          return;
        }

        // Thử lại ngay với độ chính xác tiêu chuẩn (tương thích cao trên PC/Laptop Windows)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!resolved) {
              resolved = true;
              window.clearTimeout(safetyTimer);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                isIpFallback: false,
              });
            }
          },
          async () => {
            if (!resolved) {
              resolved = true;
              window.clearTimeout(safetyTimer);
              const ipLoc = await fallbackIp();
              resolve(ipLoc);
            }
          },
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 120000 },
        );
      },
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 },
    );
  });
}
