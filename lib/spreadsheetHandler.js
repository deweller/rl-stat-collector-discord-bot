const logger = require("./logger");
const Game = require("./classes/game");
const { format } = require("date-fns");
const { utcToZonedTime } = require("date-fns-tz");
const gameStatusStore = require("./gameStatusStore");

const { GoogleSpreadsheet } = require("google-spreadsheet");

const handler = {};

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_DOC_ID);

const MAX_ORGS = 64;
const MAX_TEAMS = 128;
const MAX_PLAYERS = 500;
const MAX_SCHEDULE_ROWS = 1000;
const MAX_GAME_SUBMISSIONS = 2000;


handler.loadSpreadsheetData = async function () {
    console.log("initializing spreadsheet");
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();

    console.log("loading organizations");
    let orgsById = {};
    const orgsSheet = doc.sheetsByTitle[process.env.SPREADSHEET_ORGANIZATIONS_SHEET];
    const orgRows = await orgsSheet.getRows({ limit: MAX_ORGS });
    for (let row of orgRows) {
        let orgId = row["Org ID"];
        if (orgId == null) {
            continue;
        }
        orgsById[orgId] = {
            id: orgId,
            name: row["Organization Name"],
            conferenceId: row["Conference ID"],
            conference: row["Conference Name"],
        };
    }

    // Team ID    Organization ID    Division ID  Division Name Conference ID    Conference
    console.log("loading teams");
    let teamsById = {};
    const teamsSheet = doc.sheetsByTitle[process.env.SPREADSHEET_TEAMS_SHEET];
    const teamRows = await teamsSheet.getRows({ limit: MAX_TEAMS });
    for (let row of teamRows) {
        let teamId = row["Team ID"];
        let orgId = row["Organization ID"];
        let orgName = row["Organization Name"];
        let divisionId = row["Division ID"];
        let divisionName = row["Division Name"];
        let conferenceId = row["Conference ID"];

        if (teamId == null || orgId == null) {
            continue;
        }

        teamsById[teamId] = {
            id: teamId,
            orgId,
            orgName,
            divisionId,
            divisionName,
            conferenceId,
        };
    }

    console.log("loading players");
    // GID    Player Discord Name    Player Gamertag    Value
    let allPlayersById = {};
    const allPlayersSheet = doc.sheetsByTitle[process.env.SPREADSHEET_PLAYERS_SHEET];
    const allPlayerRows = await allPlayersSheet.getRows({ limit: MAX_PLAYERS });
    for (let row of allPlayerRows) {
        let playerGid = row["GID"];
        let playerDiscordName = row["Player Discord Name"];
        let playerGamertag = row["Player Gamertag"];
        let value = row["Value"];

        if (playerGid == null || playerDiscordName == null) {
            continue;
        }
        allPlayersById[playerGid] = {
            gid: playerGid.trim(),
            discordName: playerDiscordName.trim(),
            gamertag: playerGamertag.trim(),
            value,
        };
    }
    console.log("loading player assignments");
    const playerAssignmentsSheet = doc.sheetsByTitle[process.env.SPREADSHEET_PLAYERS_ASSIGNMENT_SHEET];

    // Player GID    Org ID    Role    Player Discord Name    Organization
    let players = [];
    let OrgIDsMap = {};
    const rows = await playerAssignmentsSheet.getRows({ limit: MAX_PLAYERS });
    for (let row of rows) {
        let playerGid = row["Player GID"];
        let orgId = row["Org ID"];
        let role = row["Role"];

        if (playerGid == null || orgId == null) {
            continue;
        }
        if (allPlayersById[playerGid] == null) {
            console.error("Invalid player GID: " + playerGid);
            process.exit(1);
        }

        orgId = orgId.trim();
        role = role.trim();

        players.push({
            ...allPlayersById[playerGid],
            orgId,
            role,
        });

        // save team map
        OrgIDsMap[orgId] = true;
    }

    // build teams array
    let orgIDs = Object.keys(OrgIDsMap);
    orgIDs.sort(function (a, b) {
        var nameA = a.toUpperCase(); // ignore upper and lowercase
        var nameB = b.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;
    });

    // load schedule
    console.log("loading game schedule");
    let allGameIDs = [];
    let teamIdsByGameId = {};
    let scheduleByWeek = {};
    const scheduleSheet = doc.sheetsByTitle[process.env.SPREADSHEET_SCHEDULE_SHEET];

    // Match ID    Week    Date (EST/EDT)    Starting Game ID    Home Team ID    Away Team ID    Home Organization    Home Division    Away Organization    Away Division
    const scheduleRows = await scheduleSheet.getRows({ limit: MAX_SCHEDULE_ROWS });
    for (let scheduleRow of scheduleRows) {
        const week = scheduleRow["Week"];
        const date = scheduleRow["Date (EST/EDT)"];
        const gameId = scheduleRow["Starting Game ID"];
        const homeTeamId = scheduleRow["Home Team ID"];
        const awayTeamId = scheduleRow["Away Team ID"];
        if (gameId != null && gameId.length > 0) {
            if (scheduleByWeek[week] == null) {
                scheduleByWeek[week] = [];
            }
            scheduleByWeek[week].push({
                gameId,
                date,
                week,
                homeTeamId,
                awayTeamId,
            });

            // process.env.GAMES_PER_MATCH
            for (let gameOffset = 0; gameOffset < process.env.GAMES_PER_MATCH; gameOffset++) {
                const gameIdWithOffset = String(parseInt(gameId) + gameOffset);
                allGameIDs.push(gameIdWithOffset);
                teamIdsByGameId[gameIdWithOffset] = [homeTeamId, awayTeamId]
            }
        } else {
            break;
        }
    }

    // load submitted games
    console.log("loading game submission status");
    const gameSubmissionStatus = {};
    for (let gameId of allGameIDs) {
        gameSubmissionStatus[gameId] = false;
    }
    const submittedGamesSheet = doc.sheetsByTitle[process.env.SPREADSHEET_SHEET_TITLE];
    const submittedGameRows = await submittedGamesSheet.getRows({ limit: MAX_GAME_SUBMISSIONS });
    for (let gameRow of submittedGameRows) {
        const gameId = gameRow["gameId"];
        if (gameSubmissionStatus[gameId] === true) {
            continue;
        }

        const approved = gameRow["approved"] == "Yes";
        // console.log(`gameId ${gameId}: ${gameRow['approved']} (${JSON.stringify(approved)})`)

        if (gameId != null && gameId.length > 0) {
            gameSubmissionStatus[gameId] = approved;
        } else {
            break;
        }
    }

    // console.log("scheduleByWeek", JSON.stringify(scheduleByWeek, null, 2));
    // console.log("orgsById: "+JSON.stringify(orgsById,null,2))
    // console.log("teamsById: "+JSON.stringify(teamsById,null,2))
    // console.log("OrgIDsMap: "+JSON.stringify(OrgIDsMap,null,2))
    // console.log("players: "+JSON.stringify(players,null,2))
    // console.log("orgIDs: "+JSON.stringify(orgIDs,null,2))
    // console.log('gameSubmissionStatus', JSON.stringify(gameSubmissionStatus,null,2))

    const spreadsheetData = {
        orgsById,
        players,
        orgIDs,
        teamsById,
        teamIdsByGameId,
        scheduleByWeek,
        gameSubmissionStatus,
    };

    return spreadsheetData;
    // console.log('spreadsheetData', JSON.stringify(spreadsheetData,null,2))
    // process.exit(0);
};

handler.loadSettings = async function () {
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_SETTINGS_SHEET];

    let settings = {};
    const rows = await sheet.getRows({ limit: 100 });
    for (let row of rows) {
        let key = row.Setting;
        let value = row.Value;
        if (key != null) {
            key = key.trim();
            value = value.trim();
            if (key.length > 0) {
                settings[key] = value;
            }
        }
    }

    // manipulate the settings a bit
    const intValueNames = [
        "playersPerTeam",
        "minimumGameNumber",
        "numberOfTeams",
        "scheduledGames",
        "maximumGameNumber",
        "playersPerGame",
    ];
    for (const intValueName of intValueNames) {
        if (settings[intValueName] == null) {
            settings[intValueName] = 0;
        } else {
            settings[intValueName] = parseInt(settings[intValueName]);
        }
    }

    return settings;
};

handler.addSessionDataToSpreadsheet = async function (sessionData, submittedBy) {
    await doc.useServiceAccountAuth({
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_SHEET_TITLE];

    const submittedOn = currentDateTimeString();
    let replayUrl = "";
    let screenshotUrl = "";
    if (sessionData.sessionType == "screenshot") {
        screenshotUrl = sessionData.screenshotUrl;
    } else if (sessionData.sessionType == "replay") {
        replayUrl = `https://ballchasing.com/replay/${sessionData.replayUuid}`;
    }

    let rowsToSubmit = [];
    const game = Game.fromJson(sessionData.game);
    const teams = game.getTeamsInWinningOrder();
    const approved = !gameStatusStore.getGameIsSubmitted(game.number);

    for (let team of teams) {
        for (let player of team.players) {
            let submissionDataRow = {
                gameId: game.number,
                approved: approved ? "Yes" : "No",
                teamId: team.teamId,
                playerId: player.gid,
                discordName: player.sub ? player.gamertag + " (Sub)" : player.discordName,
                substitute: player.sub ? "Yes" : "No",
                gamertag: player.gamertag,
                score: player.score,
                goals: player.goals,
                assists: player.assists,
                saves: player.saves,
                shots: player.shots,
                mvp: player.mvp ? "Yes" : "No",
                submittedOn: submittedOn,
                submittedBy: submittedBy,
                replayUrl: replayUrl,
                screenshotUrl: screenshotUrl,
            };
            rowsToSubmit.push(submissionDataRow);
        }
    }

    // console.log('rowsToSubmit', JSON.stringify(rowsToSubmit,null,2))
    // await sheet.addRows(rowsToSubmit)

    // add rows in the background - don't wait
    sheet.addRows(rowsToSubmit);
};

function currentDateTimeString() {
    const zonedDate = utcToZonedTime(new Date(), process.env.DATE_TIMEZONE);
    return format(zonedDate, "MM-dd-yyyy HH:mm:ss");
}

module.exports = handler;
