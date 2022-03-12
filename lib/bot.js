const bot = {}

const StatSession = require('./statSession')
const logger = require('./logger')

bot.run = async function(client, config) {
    const statSession = StatSession.init(client, config)

    client.on('message', (msg) => {
        // ignore messages from self and other bots
        if (msg.author.bot) {
            return
        }

        // logger.debug('msg.channel.type: '+JSON.stringify(msg.channel.type,null,2))
        if (msg.channel.type == 'dm') {
            // send all DMs to statSession
            statSession.handleDirectMessage(msg)
        } else {
            // not a dm
            if (msg.content.substring(0, 6) === '/score') {
                statSession.start(msg)
            }
        }
    })
}

module.exports = bot
