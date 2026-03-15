// Sistema de cache para reduzir chamadas à API
const cache = new Map()

export const cacheService = {
    set: (key, value, ttl = 5 * 60 * 1000) => {
        cache.set(key, {
            value,
            expiry: Date.now() + ttl
        })
    },

    get: (key) => {
        const item = cache.get(key)
        if (!item) return null
        
        if (Date.now() > item.expiry) {
            cache.delete(key)
            return null
        }

        return item.value
    },

    clear: () => cache.clear(),
    
    remove: (key) => cache.delete(key)
}

// Decorator para cache de funções
export function withCache(fn, ttl) {
    return async (...args) => {
        const key = `${fn.name}-${JSON.stringify(args)}`
        const cached = cacheService.get(key)
        
        if (cached) return cached

        const result = await fn(...args)
        cacheService.set(key, result, ttl)
        return result
    }
}
