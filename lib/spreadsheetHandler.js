const logger = require('./logger')
const Game = require('./classes/game')
const { format } = require('date-fns')
const { utcToZonedTime } = require('date-fns-tz')

const { GoogleSpreadsheet } = require('google-spreadsheet')

const handler = {}

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_DOC_ID)

handler.addSessionDataToSpreadsheet = async function(sessionData, submittedBy) {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_SHEET_TITLE]


    const submittedOn = currentDateTimeString()
    let replayUrl = ''
    let screenshotUrl = ''
    if (sessionData.sessionType == 'screenshot') {
        screenshotUrl = sessionData.screenshotUrl
    } else if (sessionData.sessionType == 'replay') {
        replayUrl = `https://ballchasing.com/replay/${sessionData.replayUuid}`
    }

    let rowsToSubmit = []
    const game = Game.fromJson(sessionData.game)
    const teams = game.getTeamsInWinningOrder()
    for (let team of teams) {
        for (let player of team.players) {
            let submissionDataRow = {
                approved: 'No',
                game: game.number,
                team: team.leagueName,
                discordName: player.sub ? player.gamertag + ' (Sub)' : player.discordName,
                substitute: player.sub ? 'Yes' : 'No',
                gamertag: player.gamertag,
                score: player.score,
                goals: player.goals,
                assists: player.assists,
                saves: player.saves,
                shots: player.shots,
                mvp: player.mvp ? 'Yes' : 'No',
                submittedOn: submittedOn,
                submittedBy: submittedBy,
                replayUrl: replayUrl,
                screenshotUrl: screenshotUrl,
            }
            rowsToSubmit.push(submissionDataRow)
        }
    }

    // console.log('rowsToSubmit', JSON.stringify(rowsToSubmit,null,2))
    await sheet.addRows(rowsToSubmit)
}

handler.loadPlayersTeamsAndSchedule = async function() {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_PLAYERS_SHEET]

    // Player  Team    Role
    let players = []
    let teamsMap = {}
    const rows = await sheet.getRows({limit: 500});
    for (let row of rows) {
        let playerDiscordName = row['Player Discord Name']
        let playerGamertag = row['Player Gamertag']
        let team = row.Team
        let role = row.Role

        if (playerDiscordName == null || team == null || role == null) {
            continue;
        }

        playerDiscordName = playerDiscordName.trim()
        team = team.trim()
        role = role.trim()

        if (playerDiscordName.length > 0) {
            players.push({
                discordName: playerDiscordName,
                gamertag: playerGamertag,
                team,
                role,
            })
        }

        if (team.length > 0) {
            teamsMap[team] = true
        }
    }

    // build teams array
    let teams = Object.keys(teamsMap)
    teams.sort(function(a, b) {
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
    let teamsByGameId = {}
    let scheduleByWeek = {}
    const scheduleSheet = doc.sheetsByTitle[process.env.SPREADSHEET_SCHEDULE_SHEET]
    const scheduleRows = await scheduleSheet.getRows({limit: 2000});
    for (let scheduleRow of scheduleRows) {
        const gameId = scheduleRow['Starting Game ID']
        const homeTeam = scheduleRow['Home Team']
        const awayTeam = scheduleRow['Away Team']
        const week = scheduleRow['Week']
        const date = scheduleRow['Date (EST/EDT)']
        const division = scheduleRow['Division']
        const divisionId = scheduleRow['Div ID']
        if (gameId != null && gameId.length > 0) {
            if (scheduleByWeek[week] == null) {
                scheduleByWeek[week] = []
            }
            scheduleByWeek[week].push({
                week,
                date,
                divisionId,
                division,
                gameId,
                homeTeam,
                awayTeam,
            })

            // process.env.GAMES_PER_MATCH
            const GAMES_PER_MATCH = parseInt(process.env.GAMES_PER_MATCH)
            for (let gameOffset = 0; gameOffset < process.env.GAMES_PER_MATCH; gameOffset++) {
                const gameIdWithOffset = String(parseInt(gameId) + gameOffset)
                teamsByGameId[gameIdWithOffset] = [homeTeam, awayTeam]
            }

        } else {
            break
        }
    }

    return [players, teams, teamsByGameId, scheduleByWeek]
}

handler.loadSettings = async function() {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_SETTINGS_SHEET]

    let settings = {}
    const rows = await sheet.getRows({limit: 100});
    for (let row of rows) {
        let key = row.Setting
        let value = row.Value
        if (key != null) {
            key = key.trim()
            value = value.trim()
            if (key.length > 0) {
                settings[key] = value
            }
        }
    }

    // manipulate the settings a bit
    const intValueNames = ['playersPerTeam', 'minimumGameNumber', 'numberOfTeams', 'scheduledGames', 'maximumGameNumber', 'playersPerGame']
    for (const intValueName of intValueNames) {
        if (settings[intValueName] == null) {
            settings[intValueName] = 0
        } else {
            settings[intValueName] = parseInt(settings[intValueName])
        }
    }

    return settings
}


function currentDateTimeString() {
    const zonedDate = utcToZonedTime(new Date(), process.env.DATE_TIMEZONE)
    return format(zonedDate, "MM-dd-yyyy HH:mm:ss")
}

module.exports = handler
