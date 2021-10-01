const Game = require('../classes/game')
const UserError = require('../UserError')
const validation = require('../validation')
const datastore = require('../datastore')
const review = require('./review')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'submit'
    Command.help = 'Review and send the game data to the spreadsheet.'
    Command.matchString = 'submit'


    Command.handle = async function(sessionData, msg) {
        await messageHandler.cancelMessageReaction(sessionData)

        let game = Game.fromJson(sessionData.game)
        let [isValid, errors] = validateReview(game, sessionData)

        await messageHandler.sendMessageToUser(sessionData, `Here is the game data I've collected from you:`)
        // const tableText = await config.commandHandlers.review.buildGameSummaryTableText(game)
        // await messageHandler.sendMessageToUser(sessionData, '```' + `GAME ${game.number}\n\n${tableText}` + '```')
        await config.commandHandlers.review.sendGameSummaryWithScreenshot(sessionData, msg)

        if (!isValid) {
            await messageHandler.sendMessageToUser(sessionData, ":warning: I can't send these stats because of the following errors:\n"+(errors.join("\n")))
            return
        }

        const message = await messageHandler.sendMessageToUser(sessionData, `:clock1: I'm ready to submit this game. React to the floppy disk below to submit the stats.`)

        // react
        await message.react(messageHandler.REACT_EMOJI)

        sessionData = await datastore.updateSession(sessionData.id, {
            readyToSubmit: true,
            submitDiscordMsgId: message.id,
        })

        await messageHandler.launchSubmitReactor(sessionData, message)
    }

    function validateReview(game, sessionData) {
        let isValid = true
        let errors = []

        // if (sessionData.screenshotUrl == null) {
        //     errors.push('Please upload a screenshot for this game before submitting it.')
        //     isValid = false
        // }
        if (game.number == null) {
            errors.push('I need to know the game number before I can submit this game.')
            isValid = false
        }

        if (game.teams.blue == null || game.teams.orange == null) {
            errors.push('This game looks incomplete.')
            isValid = false
        }

        // check to see that both teams were matched
        if (isValid && game.teams.blue != null && game.teams.orange != null) {
            let teams = game.getTeamsInWinningOrder()
            for (let [idx, team] of teams.entries()) {
                if (team.leagueName == null) {
                    const number = idx + 1
                    errors.push(`Team ${number} did not match for this game.`)
                    isValid = false
                }
            }
        }

        const players = game.getAllPlayers()
        if (players.length < config.settings.playersPerTeam * 2) {
            errors.push('There are not enough player stats for this game.')
            isValid = false
        }
        if (players.length > config.settings.playersPerTeam * 2) {
            errors.push('There were too many player stats in this game.')
            isValid = false
        }

        // make sure all players are either marked as a sub, or have a discord name assigned
        for (let player of players) {
            if (player.discordName == null || player.discordName.length == 0) {
                if (player.sub == false) {
                    errors.push(`\`${player.gamertag}\` was not matched to a player in the league or marked as a sub. Match players manually with the \`player\` command or mark substitutes with the \`sub\` command.`)
                    isValid = false
                }
            }
        }

        // console.log('sessionData.sessionType',JSON.stringify(sessionData.sessionType,null,2))
        if (sessionData.sessionType != 'replay') {
            // console.log('sessionData.screenshotUrl',JSON.stringify(sessionData.screenshotUrl,null,2))
            if (sessionData.screenshotUrl == null || sessionData.screenshotUrl.length == 0) {
                errors.push('Please include a screenshot for this game.')
                isValid = false
            }
        }

        return [isValid, errors]
    }


    return Command
}
