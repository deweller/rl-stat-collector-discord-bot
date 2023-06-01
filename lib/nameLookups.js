let spreadsheetData = {};

const teamIdsByOrgIdMap = {}

exports.setSpreadsheetData = function (newSpreadsheetData) {
    spreadsheetData = newSpreadsheetData;

    // build teamIdsByOrgIdMap
    for (let teamId of Object.keys(spreadsheetData.teamsById)) {
        const team = spreadsheetData.teamsById[teamId]

        if (teamIdsByOrgIdMap[team.orgId] == null) {
            teamIdsByOrgIdMap[team.orgId] = []
        }
        teamIdsByOrgIdMap[team.orgId].push(team.id)
    }
    // console.log('teamIdsByOrgIdMap', JSON.stringify(teamIdsByOrgIdMap,null,2))
};

// {
//   "gameId": "251",
//   "date": "Sun Jun 4 9:30 PM",
//   "week": "1",
//   "homeTeamId": "TS06B",
//   "awayTeamId": "TS08B"
// }

// teamById
// {
//     TF01A: {
//         id: "TF01A",
//         orgId: "ORG01",
//         orgName: "Goonies Gang",
//         divisionId: "FRIA",
//         divisionName: "Friday A",
//         conferenceId: "FRI",
//     },
// }

exports.teamNameById = function (teamId) {
    return exports.teamById(teamId).orgName;
};
exports.divisionNameByTeamId = function (teamId) {
    return exports.teamById(teamId).divisionName;
};
exports.orgNameByOrgId = function (orgId) {
    return exports.orgById(orgId).divisionName;
};
exports.teamIdByGameIdAndOrgId = function (gameId, orgId) {
    const gameIdString = String(gameId)
    const teamIdsInGame = spreadsheetData.teamIdsByGameId[gameId]
    const teamIdsInOrg = teamIdsByOrgIdMap[orgId]
    if (teamIdsInGame == null || teamIdsInOrg == null) {
        return null
    }

    // match 
    for (let teamIdInGame of teamIdsInGame) {
        for (let teamIdInOrg of teamIdsInOrg) {
            if (teamIdInGame == teamIdInOrg) {
                return teamIdInGame
            }
        }
    }
    return null;
}

exports.teamById = function (teamId) {
    const teamIdString = String(teamId);

    // console.log("spreadsheetData.teamsById[" + teamIdString + "]", spreadsheetData.teamsById[teamIdString]);
    if (spreadsheetData.teamsById[teamIdString] == null) {
        return {};
    }

    return spreadsheetData.teamsById[teamIdString];
};

exports.orgById = function (orgId) {
    const orgIdString = String(orgId);

    // console.log("spreadsheetData.orgsById[" + orgIdString + "]", spreadsheetData.orgsById[orgIdString]);
    if (spreadsheetData.orgsById[orgIdString] == null) {
        return {};
    }

    return spreadsheetData.orgsById[orgIdString];
};
