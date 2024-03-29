
const spreadsheetHandler = require('../spreadsheetHandler')
const nameMatcher = require('../nameMatcher')
const scheduleStore = require('../scheduleStore')
const gameStatusStore = require('../gameStatusStore')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.matchString = 'reload'

    Command.handle = async function(sessionData, msg) {
        await messageHandler.sendMessageToUser(sessionData, ":robot: Reloading settings")
        const settings = await spreadsheetHandler.loadSettings()
        config.settings = settings
        await messageHandler.sendMessageToUser(sessionData, ":robot: Settings reloaded:\n```"+(JSON.stringify(settings,null,2))+"```")

        await messageHandler.sendMessageToUser(sessionData, ":robot: Reloading teams, schedule and game statuses")
        const spreadsheetData = await spreadsheetHandler.loadSpreadsheetData()
        await nameMatcher.refreshPlayersAndTeamsList(spreadsheetData)
        scheduleStore.refreshScheduleByWeek(spreadsheetData.scheduleByWeek)
        gameStatusStore.refreshGameStatus(spreadsheetData.gameSubmissionStatus)
        await messageHandler.sendMessageToUser(sessionData, ":robot: Teams, schedule and game statuses reloaded")
    }

    return Command
}

