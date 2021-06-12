
let allowedNamesList = []
let caseInsensitiveNamesList = []

const spreadsheetHandler = require('./spreadsheetHandler')
// const {distance, closest} = require('fastest-levenshtein')
const Fuse = require('fuse.js')

let fuseInstance

exports.exactMatch = function(name) {
    for (let allowedName of allowedNamesList) {
        if (name === allowedName) {
            return allowedName
        }
    }

    return null
}

exports.caseInsensitiveMatch = function(name) {
    const lcName = name.toLowerCase()
    for (let allowedName of caseInsensitiveNamesList) {
        if (lcName === allowedName) {
            return allowedName
        }
    }

    return null
}

exports.bestMatch = function(name) {
    return exports.search(name)[0]
}

const AUTO_THRESHOLD = 0.01
const BAD_THRESHOLD = 0.5
exports.search = function(name) {
    const results = fuseInstance.search(name, {
        limit: 5,
    })

    let matchedNames = []
    for (let result of results) {
        if (result.score > BAD_THRESHOLD) {
            break
        }

        matchedNames.push(result.item)

        if (result.score <= AUTO_THRESHOLD) {
            break
        }

    }
    return matchedNames
}

exports.refreshNamesList = async function() {
    allowedNamesList = await spreadsheetHandler.loadPlayersList()
    // console.log('allowedNamesList', JSON.stringify(allowedNamesList,null,2))

    fuseInstance = new Fuse(allowedNamesList, {
        includeScore: true
    })

}

