
const Game = require('../classes/game')
const UserError = require('../UserError')
const validation = require('../validation')
const datastore = require('../datastore')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'restart'
    Command.help = 'Forget this game and start over.'
    Command.matchString = 'restart'

    Command.handle = async function(sessionData, msg) {
        await datastore.resetSession(sessionData)

        await messageHandler.cancelMessageReaction(sessionData)

        await messageHandler.sendMessageToUser(sessionData, `:computer: Pressing Control-Alt-Delete.  Ok.  I erased what I've collected so far for this game.`)
    }

    return Command
}
