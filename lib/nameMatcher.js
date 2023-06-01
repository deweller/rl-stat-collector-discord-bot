let allPlayerDiscordNames = [];
let allPlayerGamertags = [];
let gamertagsByOrgId = {};
let discordNamesByOrgId = {};
let allOrgNames = [];
let allTeamsByGameId = {};

let playerByGamertagMap = {};
let playerByDiscordNameMap = {};

const UserError = require("./UserError");

const Fuse = require("fuse.js");

let allDiscordNamesFuse;
let allGamertagsFuse;
let allOrgNamesFuse;

const AUTO_MATCH_THRESHOLD = 0.01;
const BAD_THRESHOLD = 0.5; // below this is ignored

exports.bestGamertagMatchesByGameId = function (gamertagsToFind, gameId) {
    return bestMatchesByGameId(gamertagsToFind, gameId, gamertagsByOrgId, playerByGamertagMap);
};

exports.bestDiscordNameMatchesByGameId = function (namesToFind, gameId) {
    return bestMatchesByGameId(namesToFind, gameId, discordNamesByOrgId, playerByDiscordNameMap);
};

function bestMatchesByGameId(namesToFind, gameId, searchNamesByOrgId, playersMap) {
    let teams = allTeamsByGameId[gameId];
    if (teams == null) {
        console.log('gameId: ',JSON.stringify(gameId,null,2))
        throw new UserError("Unable to find any teams for this game number");
    }

    // console.log('bestMatchesByGameId teams:',JSON.stringify(teams,null,2))
    // console.log('bestMatchesByGameId searchNamesByOrgId:',JSON.stringify(searchNamesByOrgId,null,2))
    let possibleNames = [];
    for (let team of teams) {
        for (let name of searchNamesByOrgId[team.orgId]) {
            possibleNames.push(name);
        }
    }
    // console.log('possibleNames',JSON.stringify(possibleNames,null,2))

    let fuse = new Fuse(possibleNames, {
        includeScore: true,
    });

    let matchedPlayerResults = [];
    for (let nameToFind of namesToFind) {
        // console.log('calling search on nameToFind='+JSON.stringify(nameToFind,null,2))
        // console.log('calling search on nameToFind='+JSON.stringify(nameToFind,null,2)+' playersMap: '+JSON.stringify(playersMap,null,2))
        let searchResults = search(nameToFind, fuse, playersMap);

        let matchedPlayer = null;
        if (searchResults.length > 0) {
            matchedPlayer = searchResults[0];
        }

        matchedPlayerResults.push({
            match: nameToFind,
            player: matchedPlayer,
        });
    }

    // console.log('namesToFind', JSON.stringify(namesToFind,null,2))
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

    return matchedPlayerResults;
}

function search(name, fuse, playerByNameMap) {
    if (name == null) {
        return [];
    }

    let matchedPlayers = [];

    const results = fuse.search(name, {
        limit: 5,
    });
    // console.log('search results for '+name, results)

    for (let result of results) {
        // a low result.score is good

        if (result.score > BAD_THRESHOLD) {
            // this result is too bad to consider
            break;
        }

        matchedPlayers.push(playerByNameMap[result.item]);

        // we found a high probability match
        if (result.score <= AUTO_MATCH_THRESHOLD) {
            break;
        }
    }
    return matchedPlayers;
}

exports.refreshPlayersAndTeamsList = function (spreadsheetData) {
    let allPlayers = spreadsheetData.players;

    // map teams by game ID
    allTeamsByGameId = {}
    for (let gameId of Object.keys(spreadsheetData.teamIdsByGameId)) {
        allTeamsByGameId[gameId] = []
        const teamIds = spreadsheetData.teamIdsByGameId[gameId]
        for (let teamId of teamIds) {
            allTeamsByGameId[gameId].push(spreadsheetData.teamsById[teamId])
        }
    }
    // console.log('allTeamsByGameId', allTeamsByGameId)

    let allOrgNamesMap = {};
    for (let teamId of Object.keys(spreadsheetData.teamsById)) {
        const orgName = spreadsheetData.teamsById[teamId].orgName;
        allOrgNamesMap[orgName] = true;
    }
    let allOrgNames = Object.keys(allOrgNamesMap);

    gamertagsByOrgId = {};
    discordNamesByOrgId = {};
    allPlayerDiscordNames = [];
    allPlayerGamertags = [];
    for (let player of allPlayers) {
        allPlayerDiscordNames.push(player.discordName);
        allPlayerGamertags.push(player.gamertag);

        if (gamertagsByOrgId[player.orgId] == null) {
            gamertagsByOrgId[player.orgId] = [];
        }
        gamertagsByOrgId[player.orgId].push(player.gamertag);

        if (discordNamesByOrgId[player.orgId] == null) {
            discordNamesByOrgId[player.orgId] = [];
        }
        discordNamesByOrgId[player.orgId].push(player.discordName);

        playerByGamertagMap[player.gamertag] = player;
        playerByDiscordNameMap[player.discordName] = player;
    }

    // console.log('gamertagsByOrgId:',JSON.stringify(gamertagsByOrgId,null,2))
    // console.log('allPlayerDiscordNames:',JSON.stringify(allPlayerDiscordNames,null,2))
    // console.log('allOrgNames:',JSON.stringify(allOrgNames,null,2))

    allDiscordNamesFuse = new Fuse(allPlayerDiscordNames, {
        includeScore: true,
    });
    allGamertagsFuse = new Fuse(allPlayerGamertags, {
        includeScore: true,
    });
    allOrgNamesFuse = new Fuse(allOrgNames, {
        includeScore: true,
    });
};
