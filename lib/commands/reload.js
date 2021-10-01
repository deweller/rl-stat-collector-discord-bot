
const spreadsheetHandler = require('../spreadsheetHandler')
const nameMatcher = require('../nameMatcher')
const scheduleStore = require('../scheduleStore')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.matchString = 'reload'

    Command.handle = async function(sessionData, msg) {
        await messageHandler.sendMessageToUser(sessionData, ":robot: Reloading settings")
        const settings = await spreadsheetHandler.loadSettings()
        config.settings = settings
        await messageHandler.sendMessageToUser(sessionData, ":robot: Settings reloaded:\n```"+(JSON.stringify(settings,null,2))+"```")

        await messageHandler.sendMessageToUser(sessionData, ":robot: Reloading teams and schedule")
        const [allPlayersData, allTeamNamesList, allTeamsByGameIdMap, scheduleByWeek] = await spreadsheetHandler.loadPlayersTeamsAndSchedule()
        await nameMatcher.refreshPlayersAndTeamsList(allPlayersData, allTeamNamesList, allTeamsByGameIdMap)
        scheduleStore.refreshScheduleByWeek(scheduleByWeek)
        await messageHandler.sendMessageToUser(sessionData, ":robot: Teams and schedule reloaded")
    }

    return Command
}
