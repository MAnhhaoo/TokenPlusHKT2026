export type UserGeoLocation = {
  latitude: number;
  longitude: number;
  isIpFallback: boolean;
};

const validCoordinates = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180;

export async function getUserLocation({
  requirePrecise = false,
}: { requirePrecise?: boolean } = {}): Promise<UserGeoLocation> {
  const fallbackIp = async (): Promise<UserGeoLocation> => {
    if (requirePrecise) {
      throw new Error(
        "Không lấy được vị trí chính xác. Hãy bật quyền vị trí/GPS hoặc chọn vị trí thủ công.",
      );
    }
    try {
      const res = await fetch("https://get.geojs.io/v1/ip/geo.json", {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && validCoordinates(Number(data.latitude), Number(data.longitude))) {
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
        if (
          data2 &&
          data2.success &&
          validCoordinates(Number(data2.latitude), Number(data2.longitude))
        ) {
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

  return new Promise<UserGeoLocation>((resolve, reject) => {
    const fallback = () => {
      void fallbackIp().then(resolve, reject);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (
          !validCoordinates(latitude, longitude) ||
          !Number.isFinite(accuracy) ||
          accuracy > 200
        ) {
          fallback();
          return;
        }
        resolve({ latitude, longitude, isIpFallback: false });
      },
      fallback,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
