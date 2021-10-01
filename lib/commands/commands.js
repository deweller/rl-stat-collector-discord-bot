
module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'commands'
    Command.help = 'Show this list of commands.'
    Command.matchString = 'commands'

    Command.handle = async function(sessionData, msg) {

        let helpTextLines = []
        for (let commandHandler of config.commandHandlersInOrder) {
            if (commandHandler.example != null) {
                helpTextLines.push('`' + commandHandler.example + '`' + "\n" + commandHandler.help)
            }
        }

        const helpText = "Here are the commands I can respond to:\n\n" + helpTextLines.join("\n\n")
        await messageHandler.sendMessageToUser(sessionData, ":book: "+helpText)
    }


    return Command
}
