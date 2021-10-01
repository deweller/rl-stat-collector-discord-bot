
class CommandFormatError extends Error {

    commandName = null

    constructor(commandName, message) {
        super(message)

        this.commandName = commandName
        this.name = "CommandFormatError"
    }

}

module.exports = CommandFormatError;
