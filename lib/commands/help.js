
module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'help [replay or screenshot]'
    Command.help = 'Show help on how to submit a game.'
    Command.matchString = 'help'

    Command.handle = async function(sessionData, msg) {
        let helpType = 'replay'

        const messageContent = msg.content.trim()
        if (messageContent.length > 5) {
           helpType = messageContent.substring(5).trim().toLowerCase()
        }

        if (helpType == 'replay') {
            await showReplayHelp(sessionData)
        } else if (helpType == 'screenshot') {
            await showScreenshotHelp(sessionData)
        } else {
            const helpText = Command.buildHelpTextByHelpType(helpType)
            if (helpText != null) {
                await messageHandler.sendMessageToUser(sessionData, `${helpText}`)
            } else {
                await messageHandler.sendMessageToUser(sessionData, ":robot: I didn't understand that.  Try `help screenshot` or `help replay`.")
            }
        }
    }

    Command.buildHelpTextByHelpType = function(helpType) {
        for (let commandHandler of config.commandHandlersInOrder) {
            if (commandHandler.matchString != null) {
                const matchString = commandHandler.matchString.trim()
                const len = matchString.length
                if (helpType === matchString) {
                    // build the help text
                    let helpText = '`' + commandHandler.example + '`' + "\n" + commandHandler.help
                    return helpText
                }
            }
        }

        return null
    }

    async function showReplayHelp(sessionData) {

            const helpText = `To submit a game with a replay file, do these four steps:

**Step 1: Tell me the game number**
To tell me you are entering game number 101, send this:
\`game 101\`

**Step 2: Provide a replay file**
If your replay is already uploaded to Ballchasing.com, tell me the link to the replay like this:
\`replay https://ballchasing.com/replay/b819f049-f06b-4c30-aec2-30e26c143a27\`

If you have a local replay file, just drop it in this chat.

**Step 3: Submit the game entry**
Review the data you've entered and submit it to the spreadsheet with this command:
\`submit\`


If you don't have a replay file, type \`help screenshot\`.  To see all the commands I respond to, type \`commands\`.
`
            await messageHandler.sendMessageToUser(sessionData, ":book: "+helpText)
    }
    async function showScreenshotHelp(sessionData) {

        const helpText = `To submit a game with a screenshot, do these four steps:

**Step 1: Tell me the game number**
To tell me you are entering game number 101, send this:
\`game 101\`

**Step 2: Upload a screenshot**
Just upload the screenshot in this chat.

**Step 3: Tell me stat lines**
To enter a stat for PartyTurtle with 483 points, 1 goal, 2 assists, 1 save and 4 shots, enter this:
\`stat PartyTurtle,483,1,2,1,4\`

Please enter all the stats from the winning team first.

To replace a stat, enter the stat again with the same player name.  To delete a stat line, use the \`deletestat\` command.

**Step 4: Submit the game entry**
Review the data you've entered and submit it to the spreadsheet with this command:
\`submit\`

To see all the commands I respond to, type \`commands\`.
`
            await messageHandler.sendMessageToUser(sessionData, ":book: "+helpText)
    }


    return Command
}


/*
**Step 3: Tell me stat lines**
To enter a stat for PartyTurtle with 483 points, 1 goal, 2 assists, 1 save and 4 shots, enter this:
\`stat PartyTurtle,483,1,2,1,4\`

Please enter all the stats from the winning team first.
*/