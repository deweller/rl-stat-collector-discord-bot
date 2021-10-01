const flatCache = require('flat-cache')
const path = require('path')

const logger = require('./logger')

const cache = flatCache.load('cache', path.resolve('data/cache'))

exports.setCache = function (id, cacheData) {
    cache.setKey(id, cacheData)
    cache.save(true)
}

exports.getCache = function (id) {
    return cache.getKey(id)
}

exports.clearCache = function() {
    cache.destroy()
}

exports.resolveCache = async function(cacheEnabled, id, cacheDataFunction) {
    let resolvedData
    if (cacheEnabled) {
        resolvedData = exports.getCache(id)
    }
    if (resolvedData == null) {
        resolvedData = await cacheDataFunction()
        exports.setCache(id, resolvedData)
    } else {
        console.log('Using cached data for '+id)
    }

    return resolvedData
}
