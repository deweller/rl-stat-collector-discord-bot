const Game = require('../classes/game')
const gameSummary = require('../gameSummary');
const gameStatusStore = require('../gameStatusStore')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'review'
    Command.help = 'Review the game data entered so far.'
    Command.matchString = 'review'

    Command.handle = async function(sessionData, msg) {
        if (sessionData.game == null && sessionData.sessionType == null) {
            await messageHandler.sendMessageToUser(sessionData, `I have not collected any game information. Type \`help\` for some help on the process.`)
            return
        }

        await messageHandler.sendMessageToUser(sessionData, `Here is what I have collected so far:`)
        await Command.sendGameSummaryWithScreenshot(sessionData, msg)
    }


    Command.sendGameSummaryWithScreenshot = async function(sessionData, msg) {
        // console.log('sessionData.game',JSON.stringify(sessionData.game,null,2))
        const game = Game.fromJson(sessionData.game)
        // console.log('game',JSON.stringify(game,null,2))

        if (sessionData.sessionType == 'screenshot') {
            const screenshotUrl = sessionData.screenshotUrl || '[No Screenshot]'
            await messageHandler.sendMessageToUser(sessionData, `${screenshotUrl}`)
        }

        const tableText = gameSummary.buildGameSummaryTableText(game)

        const gameNumber = game.number || '[unknown]'

        const approved = !gameStatusStore.getGameIsSubmitted(game.number)
        const duplicateMessage = approved ? '' : "\n:warning: This game was already submitted.  You may submit it again, but the first submission will be used unless changed by the League Committee."

        await messageHandler.sendMessageToUser(sessionData, '```' + `GAME ${gameNumber}\n\n${tableText}` + '```' + duplicateMessage)
    }



    return Command
}
