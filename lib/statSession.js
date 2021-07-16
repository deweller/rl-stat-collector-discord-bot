const StatSession = {}
const datastore = require('./datastore')
const logger = require('./logger')
const UserError = require('./UserError')
const spreadsheetHandler = require('./spreadsheetHandler')
const table = require('table');
const Discord = require('discord.js');
const nameMatcher = require('./nameMatcher')

const REACT_EMOJI = "💾"

StatSession.init = function(client, config) {
    let statSession = {}
    let collectorsByMessageId = {}

    // handle a restart
    attachCollectorsToExistingReactions()

    statSession.start = async function(msg) {
        let sessionData = await initStatSessionByMsg(msg)

        // console.log('sessionData:',JSON.stringify(sessionData,null,2))
        await sendMessageToUser(sessionData, ":robot: Hi there!  I'm ready to record your game.  Start by sending me a screenshot right here.  Type `help` for some help on the process.")

        updateLastAction(sessionData)
    }

    statSession.handleDirectMessage = async function(msg) {
        let sessionData = await initStatSessionByMsg(msg)

        try {
            // check for an attachement
            let handled = false
            if (!handled && msg.attachments && msg.attachments.size > 0) {
                await processScreenshot(sessionData, msg)
                handled = true
            }

            const lcMessage = msg.content.trim().toLowerCase()

            if (!handled && (lcMessage.substring(0, 5) === 'game ')) {
                await processGame(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage.substring(0, 5) === 'stat ')) {
                await processStat(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'review')) {
                await processReview(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'submit')) {
                await processSubmit(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'restart')) {
                await processRestart(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'help')) {
                await processHelp(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'commands')) {
                await processCommandsHelp(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'reloadnames')) {
                await processReloadNames(sessionData, msg)
                handled = true
            }

            if (!handled && (lcMessage === 'reloadsettings')) {
                await processReloadSettings(sessionData, msg)
                handled = true
            }

            if (!handled) {
                await sendMessageToUser(sessionData, ":robot: I didn't understand that.  I'm kind of a bot.  Please try again or type `help` for a list of what I do understand.")

            }

        } catch (e) {
            if (e instanceof UserError) {
                logger.debug('UserError: '+JSON.stringify(e,null,2))
                await sendMessageToUser(sessionData, ":warning: " + e.message)
            } else {
                logger.error(e.message)
                await sendMessageToUser(sessionData, ":warning: I encounted an error.  That's all I know.")
            }
        }

        // await sendMessageToUser(sessionData, "I heard you.")

        // logger.debug('handleDirectMessage msg:'+"\n"+JSON.stringify(msg,null,2))
    }

    // ------------------------------------------------------------------------

    async function processScreenshot(sessionData, msg) {
        if (msg.attachments.size > 1) {
            throw new UserError("I can only process one game at a time.  Please try again with only one attachement.")
        }

        const attachment = msg.attachments.first()

        await datastore.updateSession(sessionData.id, {
            screenshotUrl: attachment.url,
            readyToSend: false
        })

        await cancelMessageReaction(sessionData)

        await sendMessageToUser(sessionData, ":frame_photo: Nice. I received your screenshot. Please tell me the game number next. Type `help` for, well, some help.")
    }


    async function processGame(sessionData, msg) {
        const gameNumber = msg.content.substring(5).trim()

        validate(gameNumber, 'game', 'game')

        const gameNumberInt = parseInt(gameNumber)
        if (gameNumberInt < parseInt(config.settings.minimumGameNumber)) {
            throw new UserError("This game number was too small.  Please find the game number for your match and try again.")
        }
        if (gameNumberInt > parseInt(config.settings.maximumGameNumber)) {
            throw new UserError("This game number was too large.  Please find the game number for your match and try again.")
        }

        let switchingGame = false
        if (sessionData.gameNumber != null && sessionData.gameNumber != gameNumber) {
            switchingGame = true
        }

        await datastore.updateSession(sessionData.id, {
            gameNumber: gameNumber,
            readyToSend: false
        })

        await cancelMessageReaction(sessionData)

        if (switchingGame) {
            await sendMessageToUser(sessionData, `:video_game: Ok. We're working on game ${gameNumber} now. Note that I can only work on one game at a time.`)
        } else {
            await sendMessageToUser(sessionData, `:video_game: Ok. We're working on game ${gameNumber}. Please tell me the stats next. Type \`help\` for help.`)
        }
    }

    async function processStat(sessionData, msg) {
        const line = msg.content.substring(5).trim()
        let receivedNote = 'I received this stat.'

        const pieces = line.split(/[,]+/);

        const trimmedPieces = []
        for (let piece of pieces) {
            trimmedPieces.push(piece.trim())
        }
        const [player,score,goals,assists,saves,shots] = trimmedPieces

        let matchedPlayer
        try {
            validate(player, 'player', 'player')
            validate(score, 'bigNumber', 'score')
            validate(goals, 'smallNumber', 'goals')
            validate(assists, 'smallNumber', 'assists')
            validate(saves, 'smallNumber', 'saves')
            validate(shots, 'smallNumber', 'shots')

            // check player name
            matchedPlayer = matchPlayer(player)
            // console.log('matchedPlayer', JSON.stringify(matchedPlayer,null,2))
            if (matchedPlayer == null) {
                throw new UserError("I couldn't find that player in the list of players. If you are sure this player name is correct, enter the stat again and add a `*` to the beginning of the player name.")
            }
            if (matchedPlayer != player) {
                receivedNote = `I used \`${matchedPlayer}\` as the player name for this stat.`
                // await sendMessageToUser(sessionData, `:notepad_spiral: I'm using \`${matchedPlayer}\` as the player name for this stat.`)
            }
        } catch (e) {
            if (e instanceof UserError) {
                throw new UserError("I did not fully understand this stat line. "+e.message)
            } else {
                throw e
            }
        }

        const newEntry = {
            player: matchedPlayer,
            score,
            goals,
            assists,
            saves,
            shots,
        }


        let stats = sessionData.stats || []

        let wasReplaced = false
        let replacedNote = ''
        let insertIndex = stats.length
        let newStatsLength = 0
        for (let [idx, stat] of stats.entries()) {
            if (stat.player === matchedPlayer) {
                insertIndex = idx
                replacedNote = `\n:warning: Since I already found a stat line for this player, I **replaced that stat line** instead of adding a new one.\n`
                wasReplaced = true
            }
            ++newStatsLength
        }

        if (!wasReplaced) {
            ++newStatsLength
        }

        // validate stats length before submitting
        const maxStatLen = statLinesPerGame()
        if (newStatsLength > maxStatLen) {
            throw new UserError(`I can only accept ${maxStatLen} stat lines for this game.  To start a new game, please \`submit\` the previous game first.`)
        }

        // don't update status until ready to commit
        stats[insertIndex] = newEntry
        await datastore.updateSession(sessionData.id, {
            stats: stats,
            readyToSend: false
        })

        await cancelMessageReaction(sessionData)

        // const tableText = '```' + table.table(statsAsTableData(stats)) + '```'
        // const gameNumber = sessionData.gameNumber || '[unknown]'
        // await sendMessageToUser(sessionData, `:computer: I received this stat.  Here are the stats I have so far for game ${gameNumber}:\n${tableText}`)

        let nextNote = `Type \`review\` to see all the stats you've entered so far.`
        if (stats.length >= statLinesPerGame()) {
            nextNote = `Type \`submit\` to review these stats and submit your game.`
        }

        await sendMessageToUser(sessionData, `:computer: ${receivedNote} ${replacedNote}${nextNote}`)
    }

    async function processReview(sessionData, msg) {
        await sendMessageToUser(sessionData, `Here is what I have collected so far:`)
        await sendGameSummary(sessionData)
    }

    function validateReview(sessionData) {
        let isValid = true
        let errors = []

        if (sessionData.screenshotUrl == null) {
            errors.push('Please upload a screenshot for this game before submitting it.')
            isValid = false
        }
        if (sessionData.gameNumber == null) {
            errors.push('I need to know the game number before I can submit this game.')
            isValid = false
        }
        if (sessionData.stats == null || sessionData.stats.length == 0) {
            errors.push('I need to know the stats for this game.')
            isValid = false
        }
        if (sessionData.stats != null && sessionData.stats.length < 4) {
            errors.push('There are not enough stats entered for this game.')
            isValid = false
        }
        if (sessionData.stats != null && sessionData.stats.length > statLinesPerGame()) {
            errors.push('It looks you entered too many stats for this game.')
            isValid = false
        }

        return [isValid, errors]
    }

    async function sendGameSummary(sessionData) {
        // if (sessionData.stats == null) {
        //     await sendMessageToUser(sessionData, 'I don\'t have anything collected from you so far.  Type `help` for some help on the process.')
        //     return
        // }

        const gameNumber = sessionData.gameNumber || '[unknown]'
        const tableText = table.table(statsAsTableData(sessionData.stats))
        const screenshotUrl = sessionData.screenshotUrl || '[No Screenshot]'

        await sendMessageToUser(sessionData, `Screenshot\n${screenshotUrl}`)
        await sendMessageToUser(sessionData, '```' + `GAME ${gameNumber}\n\n${tableText}` + '```')

        // return '```' + `GAME ${gameNumber}\n\n${tableText}` + '```' + `\nScreenshot\n${screenshotUrl}`
    }

    async function processSubmit(sessionData, msg) {
        await cancelMessageReaction(sessionData)

        // throw new UserError(`Please enter \`review\` first to review the data that I've collected.`)
        let [isValid, errors] = validateReview(sessionData)

        await sendMessageToUser(sessionData, `Here is the game data I've collected from you:`)
        await sendGameSummary(sessionData)

        if (!isValid) {
            await sendMessageToUser(sessionData, ":warning: I can't send these stats because of the following errors:\n"+(errors.join("\n")))
            return
        }

        const message = await sendMessageToUser(sessionData, `:clock1: I'm ready to submit this game. React to the floppy disk below to submit the stats.`)

        // react
        await message.react(REACT_EMOJI)

        sessionData = await datastore.updateSession(sessionData.id, {
            readyToSend: true,
            submitDiscordMsgId: message.id,
        })

        await launchSubmitReactor(sessionData, message)
        return


    }

    async function processRestart(sessionData, msg) {
        await resetSession(sessionData)

        await sendMessageToUser(sessionData, `:computer: Pressing Control-Alt-Delete.  Ok.  I erased what I've collected so far for this game.`)
    }

    async function resetSession(sessionData) {
        await datastore.updateSession(sessionData.id, {
            screenshotUrl: null,
            gameNumber: null,
            stats: [],
            readyToSend: false,
            submitDiscordMsgId: null, 
        })

        await cancelMessageReaction(sessionData)
    }

    async function processHelp(sessionData, msg) {
        const helpText = `To record a game, do these four steps:

**Step 1: Upload a screenshot**
Just upload the screenshot in this chat.

**Step 2: Tell me the game number**
To tell me you are entering game number 101, send this:
\`game 101\`

**Step 3: Tell me stat lines**
To enter a stat for PartyTurtle with 483 points, 1 goal, 2 assists, 1 save and 4 shots, enter this:
\`stat PartyTurtle,483,1,2,1,4\`

Please enter all the stats from the winning team first.

**Step 4: Submit the game entry**
Review the data you've entered and submit it to the spreadsheet with this command:
\`submit\`


To see all the commands I respond to, type \`commands\`.
`
        await sendMessageToUser(sessionData, ":book: "+helpText)
    }

    async function processCommandsHelp(sessionData, msg) {
        const helpText = `Here are the commands I can respond to:

\`game {game number}\` 
Send a game number to upload.

\`stat {player,score,goals,assists,saves,shots}\` 
Send a stat line for the game.  You can replace a stat line by entering the a new stat with the same player name again.

\`restart\` 
Forget this game and start fresh.

\`review\` 
Review the game data entered so far.

\`submit\`
Review and send the game data to the spreadsheet.

\`help\`
Show help on how to record a game.

\`commands\`
Show this list of commands.

`
        await sendMessageToUser(sessionData, ":book: "+helpText)
    }

    async function processReloadNames(sessionData, msg) {
        await sendMessageToUser(sessionData, ":robot: Reloading names")
        await nameMatcher.refreshNamesList()
        await sendMessageToUser(sessionData, ":robot: Names reloaded")
    }

    async function processReloadSettings(sessionData, msg) {
        await sendMessageToUser(sessionData, ":robot: Reloading settings")
        const settings = await spreadsheetHandler.loadSettings()
        config.settings = settings
        await sendMessageToUser(sessionData, ":robot: Settings reloaded \n```"+(JSON.stringify(settings,null,2))+"```")
    }


    function statsAsTableData(stats) {
        // data = [
        //   ["A", "B", "C"],
        //   ["D", "E", "F"],
        //   ["G", "H", "I"],
        // ];

        let data = [
            ['Player','Score','Goals','Assists','Saves','Shots',]
        ]
        if (stats != null) {
            for (let stat of stats) {
                data.push([stat.player,stat.score,stat.goals,stat.assists,stat.saves,stat.shots,])
            }
        }

        return data
    }


    // ------------------------------------------------------------------------
    
    async function cancelMessageReaction(sessionData) {
        const messageId = sessionData.submitDiscordMsgId
        if (messageId) {
            const collector = collectorsByMessageId[messageId] || null
            if (collector) {
                collector.stop()
            }
            delete collectorsByMessageId[messageId]
        }
    }

    async function launchSubmitReactor(sessionData, message) {
        const filter = (reaction, user) => {
            return reaction.emoji.name === REACT_EMOJI && user.id !== message.author.id;
        };

        const collector = message.createReactionCollector(filter, { dispose: true });
        collectorsByMessageId[message.id] = collector

        // collect
        collector.on('collect', async (reaction, user) => {
            // logger.debug(`Collected ${reaction.emoji.name} from ${user.tag}: ${user.id}`);
            await cancelMessageReaction(sessionData)

            await collectReaction(sessionData.id, user)

            await datastore.updateSession(sessionData.id, {
                readyToSend: false,
                submitDiscordMsgId: null,
            })
        });
    }

    async function collectReaction(sessionId, user) {
        const sessionData = await datastore.getSession(sessionId)
        if (!sessionData) {
            return
        }

        await sendMessageToUser(sessionData, `:clock2: Okay - here we go.  This takes a few seconds.`)

        // add to the spreadsheet
        const submittedBy = user.tag
        // logger.debug('submittedBy '+submittedBy)
        await spreadsheetHandler.addSessionDataToSpreadsheet(sessionData, submittedBy)


        // post the details to the main channel
        // let message = await config.mainChannel.send();
        const gameNumber = sessionData.gameNumber || '[unknown]'
        const tableText = table.table(statsAsTableData(sessionData.stats))
        const embed = new Discord.MessageEmbed()
            .setTitle(`Game ${gameNumber}`)
            // .setAuthor(submittedBy)
            // .setDescription(`Submitted by @${submittedBy}\n`+'```'+`${tableText}`+'```')
            .setImage(sessionData.screenshotUrl)

        await config.mainChannel.send({
            embed: embed,
            content: `<@${user.id}> submitted game ${gameNumber}\n`+'```'+`${tableText}`+'```',
        })

        // clear the session
        await resetSession(sessionData)

        await sendMessageToUser(sessionData, `:rocket: I submitted this game. gg.`)
    }


    async function attachCollectorsToExistingReactions() {
        const allSessions = await datastore.getAllSessions()

        // attach to existing reaction messages
        for (let sessionData of allSessions) {
            if (sessionData.submitDiscordMsgId != null) {
                // just tell the user that I've rebooted and they may need to react again
                await sendMessageToUser(sessionData, `:alarm_clock: Hey. I just rebooted and I can't react to that message any longer. To submit this game, please enter \`submit\` again. If you want to start over, enter \`restart\`.`)
            }
        }
    }

    // ------------------------------------------------------------------------
    
    async function updateLastAction(sessionData) {
        await datastore.updateSession(sessionData.id)
    }

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


    async function sendMessageToUser(sessionData, messageContent) {
        const user = await client.users.fetch(sessionData.userId)
        // console.log('user: ',JSON.stringify(user,null,2))

        try {
            let message = await user.send(messageContent)
            return message
        } catch (e) {
            logger.error('Failed to DM: ' + e + "\n" + e.stack)
            let message = await config.mainChannel.send(`Hey <@${user.id}>. I couldn't send you a DM. Open your DMs and try again! :upside_down:`);
            message.delete({timeout: 30000})
        }

    }


    function validate(value, type, desc) {
        if (value == null || value.length == 0) {
            throw new UserError('I couldn\'t find a value for '+desc+'.')

        }
        if (type == 'game') {
            if (!isInt(value) || value.length < 1 || value.length > 5) {
                throw new UserError('The value you provided for '+desc+' does not look a game number.')
            }
        }
        if (type == 'player') {
            if (isInt(value) && value.length < 5) {
                throw new UserError('The value you provided for '+desc+' looks like a number rather than a name.')
            }
        }

        if (type == 'bigNumber' || type == 'smallNumber') {
            if (!isInt(value)) {
                throw new UserError('The value you provided for '+desc+' was not a number.')
            }

            const intVal = parseInt(value)
            if (intVal < 0) {
                throw new UserError('The value you provided for '+desc+' was less than zero.  Hmmm...')
            }
        }

        if (type == 'bigNumber') {
            const intVal = parseInt(value)
            if (intVal > 9999) {
                throw new UserError('The value you provided for '+desc+' was way too big.')
            }
        }

        if (type == 'smallNumber') {
            const intVal = parseInt(value)
            if (intVal > 99) {
                throw new UserError('The value you entered for '+desc+' was way too big.')
            }
        }


    }

    function matchPlayer(playerIn) {
        let playerOut

        if (playerIn.substring(0, 1) == '*') {
            return playerIn.substring(1)
        }

        playerOut = nameMatcher.exactMatch(playerIn)
        if (playerOut !== null) {
            return playerOut
        }

        // try best match
        return nameMatcher.bestMatch(playerIn)
    }


    function isInt(value) {
      return !isNaN(value) && 
             parseInt(Number(value)) == value && 
             !isNaN(parseInt(value, 10));
    }

    function statLinesPerGame() {
        let playersPerTeam = 3
        if (config.settings.playersPerTeam != null) {
            playersPerTeam = parseInt(config.settings.playersPerTeam)
        }

        return playersPerTeam * 2
    }


    return statSession
}


module.exports = StatSession
