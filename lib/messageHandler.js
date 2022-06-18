const Discord = require('discord.js');

const datastore = require('./datastore')
const spreadsheetHandler = require('./spreadsheetHandler')
const gameStatusStore = require('./gameStatusStore')
const logger = require('./logger')
const gameSummary = require('./gameSummary')
const Game = require('./classes/game')

class MessageHandler {
    client = null
    config = null

    REACT_EMOJI = "💾"

    collectorsByMessageId = {}

    constructor(client, config) {
        this.client = client
        this.config = config
    }

    async sendMessageToUser(sessionData, messageContent) {
        const user = await this.client.users.fetch(sessionData.userId)
        // console.log('user: ',JSON.stringify(user,null,2))

        try {
            let message = await user.send(messageContent)
            return message
        } catch (e) {
            logger.error('Failed to DM: ' + e + "\n" + e.stack)
            let message = await this.config.mainChannel.send(`Hey <@${user.id}>. I couldn't send you a DM. Open your DMs and try again! :upside_down:`);
            message.delete({timeout: 30000})
        }

    }


    async cancelMessageReaction(sessionData) {
        const messageId = sessionData.submitDiscordMsgId
        if (messageId) {
            const collector = this.collectorsByMessageId[messageId] || null
            if (collector) {
                collector.stop()
            }
            delete this.collectorsByMessageId[messageId]
        }
    }

    async launchSubmitReactor(sessionData, message) {
        const filter = (reaction, user) => {
            return reaction.emoji.name === this.REACT_EMOJI && user.id !== message.author.id;
        };

        const collector = message.createReactionCollector(filter, { dispose: true });
        this.collectorsByMessageId[message.id] = collector

        // collect
        collector.on('collect', async (reaction, user) => {
            // logger.debug(`Collected ${reaction.emoji.name} from ${user.tag}: ${user.id}`);
            await this.cancelMessageReaction(sessionData)

            await this.collectReaction(sessionData.id, user)

            await datastore.updateSession(sessionData.id, {
                readyToSubmit: false,
                submitDiscordMsgId: null,
            })
        });
    }

    async collectReaction(sessionId, user) {
        const sessionData = await datastore.getSession(sessionId)
        if (!sessionData) {
            return
        }

        await this.sendMessageToUser(sessionData, `:clock2: Okay - here we go.  This takes a few seconds.`)

        // add to the spreadsheet
        const submittedBy = user.tag
        await spreadsheetHandler.addSessionDataToSpreadsheet(sessionData, submittedBy)

        // post the details to the main channel
        const game = Game.fromJson(sessionData.game)
        const gameNumber = game.number || '[unknown]'

        // update the game status
        gameStatusStore.setGameIsSubmitted(gameNumber);

        await this.sendMessageToUser(sessionData, `:rocket: I submitted this game. gg.`)

        let sessionType = sessionData.sessionType
        let screenshotUrl = null
        if (sessionType == 'screenshot') {
            screenshotUrl = sessionData.screenshotUrl || '[No Screenshot]'
        }
        let replayUuid = sessionData.replayUuid

        // clear the session
        await datastore.resetSession(sessionData)

        const tableText = gameSummary.buildCompactGameSummaryTableText(game)

        const summaryContent = `<@${user.id}> submitted game ${gameNumber}\n`+'```'+`${tableText}`+'```'
        let embed
        if (sessionType == 'screenshot') {
            // screenshot
            embed = new Discord.MessageEmbed()
                .setTitle(`Game ${gameNumber}`)
                .setImage(screenshotUrl)

        } else {
            // replay
            embed = new Discord.MessageEmbed()
                .setTitle(`Game ${gameNumber} Replay`)
                .setURL(`https://ballchasing.com/replay/${replayUuid}`)
        }

        await config.mainChannel.send({
            embed: embed,
            content: summaryContent,
        })

    }


    async attachCollectorsToExistingReactions() {
        const allSessions = await datastore.getAllSessions()

        // attach to existing reaction messages
        for (let sessionData of allSessions) {
            if (sessionData.submitDiscordMsgId != null) {
                // just tell the user that I've rebooted and they may need to react again
                await this.sendMessageToUser(sessionData, `:alarm_clock: Hey. I just rebooted and I can't react to that message any longer. To submit this game, please enter \`submit\` again. If you want to start over, enter \`restart\`.`)
            }
        }
    }

}

module.exports = MessageHandler
