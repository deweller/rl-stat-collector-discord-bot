const StatSession = {}
const datastore = require('./datastore')
const logger = require('./logger')
const UserError = require('./UserError')
const CommandFormatError = require('./CommandFormatError')
const MessageHandler = require('./messageHandler')
const Commands = require('./commands/index')

StatSession.init = function(client, config) {
    let messageHandler = new MessageHandler(client, config)

    let commandHandlers = Commands.init(messageHandler, config)

    let statSession = {}
    let collectorsByMessageId = {}

    // handle a restart
    messageHandler.attachCollectorsToExistingReactions()

    statSession.start = async function(msg) {
        let sessionData = await initStatSessionByMsg(msg)

        // console.log('sessionData:',JSON.stringify(sessionData,null,2))
        await messageHandler.sendMessageToUser(sessionData, ":robot: Hi there!  I'm ready to record your game.  Start by telling me a replay or uploading a screenshot right here.  Type `help` for some help on the process.")
    }

    statSession.handleDirectMessage = async function(msg) {
        let sessionData = await initStatSessionByMsg(msg)

        try {
            // check for an attachement
            let handled = false
            if (!handled && msg.attachments && msg.attachments.size > 0) {
                await commandHandlers.attachment.handle(sessionData, msg)
                handled = true
            }

            const lcMessage = msg.content.trim().toLowerCase()

            for (let commandHandler of config.commandHandlersInOrder) {
                if (commandHandler.matchString != null) {
                    const len = commandHandler.matchString.length
                    if (!handled && (lcMessage.substring(0, len) === commandHandler.matchString)) {
                        try {
                            await commandHandler.handle(sessionData, msg)
                        } catch (e) {
                            if (e instanceof CommandFormatError) {
                                const helpText = commandHandlers.help.buildHelpTextByHelpType(e.commandName)
                                await messageHandler.sendMessageToUser(sessionData, `:robot: I didn't understand that command as entered.  Here is some more information on the **${e.commandName}** command:\n\n${helpText}`)
                            } else {
                                throw e
                            }
                        }
                        handled = true
                    }
                }
            }

            if (!handled) {
                // try help
                const helpType = lcMessage
                const helpText = commandHandlers.help.buildHelpTextByHelpType(helpType)
                if (helpText != null) {
                    await messageHandler.sendMessageToUser(sessionData, `:robot: I didn't understand that command as entered.  Here is some more information on the **${helpType}** command:\n\n${helpText}`)
                } else {
                    await messageHandler.sendMessageToUser(sessionData, ":robot: I didn't understand that.  I'm kind of a bot.  Please try again or type `commands` for a list of what I do understand.")
                }
            }

        } catch (e) {
            if (e instanceof UserError) {
                logger.debug('UserError: '+JSON.stringify(e.message,null,2))
                await messageHandler.sendMessageToUser(sessionData, ":warning: " + e.message)
            } else {
                logger.error(e.message)
                throw e
                await messageHandler.sendMessageToUser(sessionData, ":warning: I encounted an error.  That's all I know.")
            }
        }

    }

    // ------------------------------------------------------------------------

    
    async function initStatSessionByMsg(msg) {
        const sessionId = 'S-' + msg.author.id
        // logger.debug('starting stat session '+sessionId)

        let sessionData = await datastore.getSession(sessionId)
        if (!sessionData) {
            const insertVars = {
                id: sessionId,
                userId: msg.author.id,
            }
            sessionData = await datastore.addSession(sessionId, insertVars)
            logger.debug('new session started for '+sessionId)
        }

        return sessionData
    }

    return statSession
}


module.exports = StatSession
