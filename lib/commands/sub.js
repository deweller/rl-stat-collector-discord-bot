
const Game = require('../classes/game')
const UserError = require('../UserError')
const validation = require('../validation')
const datastore = require('../datastore')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'sub {number}'
    Command.help = 'Mark a player as a substitute.  Players are referred to by number.  Use the `review` command to see player numbers.'
    Command.matchString = 'sub '

    Command.handle = async function(sessionData, msg) {
        const playerNumber = msg.content.substring(4).trim()

        const playerNumberInt = validation.validatePlayerNumber(playerNumber, config)

        // parse the existing game
        let game = Game.fromJson(sessionData.game)

        // update the player
        let player = game.getPlayerByNumber(playerNumberInt)
        if (player != null) {
            if (!player.sub) {
                player.sub = true
                await messageHandler.sendMessageToUser(sessionData, `I marked \`${player.gamertag}\` as a substitute.`)
            } else {
                player.sub = false
                await messageHandler.sendMessageToUser(sessionData, `I marked \`${player.gamertag}\` as **not** a substitute.`)
            }
        }

        await datastore.updateSession(sessionData.id, {
            game: game,
            readyToSubmit: false
        })
        await messageHandler.cancelMessageReaction(sessionData)


    }

    return Command
}
