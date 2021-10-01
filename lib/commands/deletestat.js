
const Game = require('../classes/game')
const Team = require('../classes/team')
const Player = require('../classes/player')
const UserError = require('../UserError')
const validation = require('../validation')
const datastore = require('../datastore')
const nameMatcher = require('../nameMatcher')
const gameResolver = require('../gameResolver')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'deletestat {number}'
    Command.help = 'Deletes a stat line for the game by number.'
    Command.matchString = 'deletestat '

    Command.handle = async function(sessionData, msg) {
        if (validation.isReplaySession(sessionData)) {
            throw new UserError('This command is only used for screenshot-based stats.')
        }

        const playerNumber = msg.content.substring(10).trim()
        const playerNumberToDeleteInt = validation.validatePlayerNumber(playerNumber, config)

        // parse the existing game
        let game = Game.fromJson(sessionData.game)

        // check the player exists
        const playerToDelete = game.getPlayerByNumber(playerNumberToDeleteInt)
        if (playerToDelete == null) {
            throw new UserError('I could not delete this stat line because I couldn\'t find it.')
        }


        // get all players
        const allPlayers = game.getAllPlayers()

        // rebuild the game
        game = new Game(game.number)
        let workingPlayerNumber = 1
        for (let player of allPlayers) {
            if (workingPlayerNumber != playerNumberToDeleteInt) {
                game.addPlayer(player, config.settings.playersPerTeam)
            }
            ++workingPlayerNumber
        }

        // match the players entered so far without showing any errors
        await gameResolver.resolveGame(game)

        await messageHandler.sendMessageToUser(sessionData, `I deleted player ${playerNumberToDeleteInt}.`)

        await datastore.updateSession(sessionData.id, {
            game: game,
            readyToSubmit: false
        })

        await messageHandler.cancelMessageReaction(sessionData)
    }


    return Command
}
