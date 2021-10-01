const commandNames = [
    'game',
    'attachment',
    'player',
    'sub',
    'stat',
    'deletestat',
    'restart',
    'review',
    'replay',
    'schedule',
    'submit',
    'help',
    'commands',
    'reload',
]

module.exports.init = function(messageHandler, config) {
    let commandHandlers = {}
    let commandHandlersInOrder = []

    for (let commandName of commandNames) {
        commandHandlers[commandName] = require(`./${commandName}`).init(messageHandler, config)

        commandHandlers[commandName].showHelp = async function() {
            const commandHandler = commandHandlers[commandName]
            const helpText ='`' + commandHandler.example + '`' + "\n" + commandHandler.help
            await messageHandler.sendMessageToUser(sessionData, `:video_game: ${helpText}`)
        }

        commandHandlersInOrder.push(commandHandlers[commandName])
    }

    config.commandHandlers = commandHandlers
    config.commandHandlersInOrder = commandHandlersInOrder

    return commandHandlers
}
