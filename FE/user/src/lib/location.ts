import { Capacitor } from "@capacitor/core"
import { Geolocation } from "@capacitor/geolocation"

export type UserGeoLocation = {
  latitude: number
  longitude: number
  isIpFallback: boolean
}

export async function getUserLocation(): Promise<UserGeoLocation> {
  // 0. Nếu chạy trên App Native Android, ưu tiên gọi thẳng cảm biến GPS phần cứng qua Capacitor
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      let perm = await Geolocation.checkPermissions()
      if (perm.location !== "granted") {
        perm = await Geolocation.requestPermissions()
      }
      if (perm.location === "granted") {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        })
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          isIpFallback: false,
        }
      }
    } catch (err) {
      console.warn("Capacitor native GPS lookup error, falling back:", err)
    }
  }
  const fallbackIp = async (): Promise<UserGeoLocation> => {
    try {
      const res = await fetch("https://ipwho.is/")
      if (res.ok) {
        const data = await res.json()
        if (data && data.success && data.latitude && data.longitude) {
          return {
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            isIpFallback: true,
          }
        }
      }
    } catch {
      // try secondary IP service
    }

    try {
      const res2 = await fetch("https://get.geojs.io/v1/ip/geo.json")
      if (res2.ok) {
        const data2 = await res2.json()
        if (data2 && data2.latitude && data2.longitude) {
          return {
            latitude: parseFloat(data2.latitude),
            longitude: parseFloat(data2.longitude),
            isIpFallback: true,
          }
        }
      }
    } catch {
      // try default HCM center
    }

    return {
      latitude: 10.7769,
      longitude: 106.7009,
      isIpFallback: true,
    }
  }

  const isSecure =
    typeof window !== "undefined" &&
    (window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")

  if (!isSecure || typeof navigator === "undefined" || !navigator.geolocation) {
    return fallbackIp()
  }

  return new Promise<UserGeoLocation>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          isIpFallback: false,
        })
      },
      async (err) => {
        console.warn("GPS lookup denied or unavailable, switching to IP Geolocation:", err)
        const ipLoc = await fallbackIp()
        resolve(ipLoc)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}
