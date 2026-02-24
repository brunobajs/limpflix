/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth radius in km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg) {
    return deg * (Math.PI / 180)
}

/**
 * Get current user position
 * @returns Promise<{latitude, longitude}>
 */
export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada'))
            return
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
        )
    })
}

/**
 * Sort providers by distance from a given location
 */
export function sortByDistance(providers, userLat, userLon) {
    if (!userLat || !userLon) return providers

    console.log(`Ordenando ${providers.length} prestadores por distância de [${userLat}, ${userLon}]`)

    return providers
        .map((p) => {
            const distance = (p.latitude && p.longitude)
                ? calculateDistance(userLat, userLon, p.latitude, p.longitude)
                : null

            // Log para debug opcional
            // console.log(`Prestador ${p.trade_name}: ${distance ? distance.toFixed(2) + 'km' : 'sem coords'}`)

            return {
                ...p,
                distance
            }
        })
        .sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
        })
}
