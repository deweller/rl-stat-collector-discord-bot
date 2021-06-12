const handler = {}
const logger = require('./logger')
const { format } = require('date-fns')
const { utcToZonedTime } = require('date-fns-tz')

const { GoogleSpreadsheet } = require('google-spreadsheet')

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_DOC_ID)

handler.addSessionDataToSpreadsheet = async function(sessionData, submittedBy) {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_SHEET_TITLE]

    let rowsToSubmit = []
    for (let stat of sessionData.stats) {
        let submissionDataRow = {
            submittedOn: currentDateTimeString(),
            submittedBy: submittedBy,
            gameNumber: sessionData.gameNumber,
            player: stat.player,
            score: stat.score,
            goals: stat.goals,
            assists: stat.assists,
            saves: stat.saves,
            shots: stat.shots,
            screenshotUrl: sessionData.screenshotUrl,
        }

        rowsToSubmit.push(submissionDataRow)
    }

    // console.log('rowsToSubmit', JSON.stringify(rowsToSubmit,null,2))

    await sheet.addRows(rowsToSubmit)
}

handler.loadPlayersList = async function() {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[process.env.SPREADSHEET_PLAYERS_SHEET]

    let players = []
    const rows = await sheet.getRows({limit: 500});
    for (let row of rows) {
        let player = row.Player
        if (player != null) {
            player = player.trim()
            if (player.length > 0) {
                players.push(row.Player)
            }
        }
    }

    return players
}


function currentDateTimeString() {
    const zonedDate = utcToZonedTime(new Date(), process.env.DATE_TIMEZONE)
    return format(zonedDate, "MM-dd-yyyy HH:mm:ss")
}

module.exports = handler
