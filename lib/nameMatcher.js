
let allPlayerDiscordNames = []
let allPlayerGamertags = []
let gamertagsByTeam = {}
let discordNamesByTeam = {}
let allTeamNames = []
let allTeamsByGameId = {}

let playerByGamertagMap = {}
let playerByDiscordNameMap = {}

const UserError = require('./UserError')

const Fuse = require('fuse.js')

let allDiscordNamesFuse
let allGamertagsFuse
let allTeamNamesFuse

// exports.exactMatch = function(name) {
//     for (let allowedName of allPlayerDiscordNames) {
//         if (name === allowedName) {
//             return allowedName
//         }
//     }

//     return null
// }

const AUTO_MATCH_THRESHOLD = 0.01
const BAD_THRESHOLD = 0.5 // below this is ignored
// exports.bestMatchByDiscordName = function(name) {
//     const matchedPlayers = search(name, allDiscordNamesFuse, playerByDiscordNameMap)
//     if (matchedPlayers.length > 0) {
//         return matchedPlayers[0]
//     }
//     return null
// }

// exports.bestMatchByGamertag = function(name) {
//     const matchedPlayers = search(name, allGamertagsFuse, playerByGamertagMap)
//     if (matchedPlayers.length > 0) {
//         return matchedPlayers[0]
//     }
//     return null
// }

exports.bestGamertagMatchesByGameId = function(gamertagsToFind, gameId) {
    return bestMatchesByGameId(gamertagsToFind, gameId, gamertagsByTeam, playerByGamertagMap)
}

exports.bestDiscordNameMatchesByGameId = function(namesToFind, gameId) {
    return bestMatchesByGameId(namesToFind, gameId, discordNamesByTeam, playerByDiscordNameMap)
}

function bestMatchesByGameId(namesToFind, gameId, searchNamesByTeam, playersMap) {
    let teamNames = allTeamsByGameId[gameId]
    if (teamNames == null) {
        throw new UserError("Unable to find any teams for this game number")
    }

    let possibleNames = []
    for (let teamName of teamNames) {
        for (let name of searchNamesByTeam[teamName]) {
            possibleNames.push(name)
        }
    }
    // console.log('possibleNames',JSON.stringify(possibleNames,null,2))

    let fuse = new Fuse(possibleNames, {
        includeScore: true
    })


    let matchedPlayerResults = []
    for (let nameToFind of namesToFind) {
        // console.log('calling search on nameToFind='+JSON.stringify(nameToFind,null,2))
        // console.log('calling search on nameToFind='+JSON.stringify(nameToFind,null,2)+' playersMap: '+JSON.stringify(playersMap,null,2))
        let searchResults = search(nameToFind, fuse, playersMap)

        let matchedPlayer = null
        if (searchResults.length > 0) {
            matchedPlayer = searchResults[0]
        }

        matchedPlayerResults.push({
            match: nameToFind,
            player: matchedPlayer
        })
    }

    // console.log('matchedPlayerResults',JSON.stringify(matchedPlayerResults,null,2))
    // [
    //   {
    //     "match": "Voltairr",
    //     "player": {
    //       "discordName": "Voltairr",
    //       "gamertag": "Voltairr",
    //       "team": "Team NYOP",
    //       "role": "Captain"
    //     }
    //   }
    // ]

    return matchedPlayerResults
}

function search(name, fuse, playerByNameMap) {
    if (name == null) {
        return []
    }

    let matchedPlayers = []

    const results = fuse.search(name, {
        limit: 5,
    })

    for (let result of results) {
        // a low result.score is good

        if (result.score > BAD_THRESHOLD) {
            // this result is too bad to consider
            break
        }

        matchedPlayers.push(playerByNameMap[result.item])

        // we found a high probability match
        if (result.score <= AUTO_MATCH_THRESHOLD) {
            break
        }

    }
    return matchedPlayers
}

exports.refreshPlayersAndTeamsList = function(allPlayersData, allTeamNamesList, allTeamsByGameIdMap) {
    let allPlayers = allPlayersData
    allTeamNames = allTeamNamesList
    allTeamsByGameId = allTeamsByGameIdMap

    gamertagsByTeam = {}
    discordNamesByTeam = {}
    allPlayerDiscordNames = []
    allPlayerGamertags = []
    for (let player of allPlayers) {
        allPlayerDiscordNames.push(player.discordName)
        allPlayerGamertags.push(player.gamertag)

        if (gamertagsByTeam[player.team] == null) {
            gamertagsByTeam[player.team] = []
        }
        gamertagsByTeam[player.team].push(player.gamertag)

        if (discordNamesByTeam[player.team] == null) {
            discordNamesByTeam[player.team] = []
        }
        discordNamesByTeam[player.team].push(player.discordName)

        playerByGamertagMap[player.gamertag] = player
        playerByDiscordNameMap[player.discordName] = player
    }

    // console.log('gamertagsByTeam:',JSON.stringify(gamertagsByTeam,null,2))
    // console.log('allPlayerDiscordNames:',JSON.stringify(allPlayerDiscordNames,null,2))
    // console.log('allTeamNames:',JSON.stringify(allTeamNames,null,2))
    // console.log('allTeamsByGameId', JSON.stringify(allTeamsByGameId,null,2))

    allDiscordNamesFuse = new Fuse(allPlayerDiscordNames, {
        includeScore: true
    })
    allGamertagsFuse = new Fuse(allPlayerGamertags, {
        includeScore: true
    })
    allTeamNamesFuse = new Fuse(allTeamNames, {
        includeScore: true
    })

}

