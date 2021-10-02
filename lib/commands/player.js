
const Game = require('../classes/game')
const UserError = require('../UserError')
const CommandFormatError = require('../CommandFormatError')
const validation = require('../validation')
const datastore = require('../datastore')
const nameMatcher = require('../nameMatcher')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'player {number,discord name}'
    Command.help = 'Match a player\'s gamertag with their Discord username.'
    Command.matchString = 'player '

    Command.handle = async function(sessionData, msg) {
        // if (!validation.isReplaySession(sessionData)) {
        //     throw new UserError('This command is only used for replay files.')
        // }

        const line = msg.content.substring(7).trim()
        const pieces = line.split(/[,]+/, 2);

        const trimmedPieces = []
        for (let piece of pieces) {
            trimmedPieces.push(piece.trim())
        }
        const [playerNumber,discordName] = trimmedPieces
        if (playerNumber == null || discordName == null) {
            throw new CommandFormatError('player')
        }

        const playerNumberInt = validation.validatePlayerNumber(playerNumber, config)


        // parse the existing game
        let game = Game.fromJson(sessionData.game)

        // update the player
        let player = game.getPlayerByNumber(playerNumberInt)
        if (player != null) {
            const oldDiscordName = player.discordName

            if (discordName.substring(0,1) == '*') {
                // force match
                player.discordName = discordName.substring(1)
                await messageHandler.sendMessageToUser(sessionData, `I set the Discord name for \`${player.gamertag}\` to \`${player.discordName}\`.`)
            } else {
                // match by discord name
                let matchedPlayerResults = nameMatcher.bestDiscordNameMatchesByGameId([discordName], game.number)
                const matchedPlayerResult = matchedPlayerResults[0]
                if (matchedPlayerResult != null && matchedPlayerResult.player != null) {
                    if (matchedPlayerResult.player.discordName == player.discordName) {
                        await messageHandler.sendMessageToUser(sessionData, `I did not change the Discord name for \`${player.gamertag}\` to \`${player.discordName}\` because it was already set.`)
                    } else {
                        player.discordName = matchedPlayerResult.player.discordName

                        if (!oldDiscordName) {
                            await messageHandler.sendMessageToUser(sessionData, `I set the Discord name for \`${player.gamertag}\` to \`${player.discordName}\`.`)
                        } else {
                            await messageHandler.sendMessageToUser(sessionData, `I changed the Discord name for \`${player.gamertag}\` from \`${oldDiscordName}\` to \`${player.discordName}\`.`)
                        }
                    }

                } else {
                    // no match
                    await messageHandler.sendMessageToUser(sessionData, `I could not find a matching Discord name for this game.  If this is a sub, use the \`sub\` command.  If you are sure of the name, enter the Discord name starting with a \`*\`.`)
                }
            }

        }

        // check to see if this matches an unmatched team
        await matchUnmatchedTeams(game)

        await datastore.updateSession(sessionData.id, {
            game: game,
            readyToSubmit: false
        })
        await messageHandler.cancelMessageReaction(sessionData)
    }


    async function matchUnmatchedTeams(game) {
        let teams = game.getTeamsInWinningOrder()
        if (teams.length == 0) {
            return
        }

        for (let team of teams) {
            if (team.leagueName == null) {
                // try to match by discordName
                let discordNames = []
                for (let player of team.players) {
                    discordNames.push(player.discordName)
                }

                let matchedPlayerResults = nameMatcher.bestDiscordNameMatchesByGameId(discordNames, game.number)
                for (let matchedPlayerResult of matchedPlayerResults) {
                    if (matchedPlayerResult.player) {
                        game.setTeamLeagueNameByDiscordName(matchedPlayerResult.player.team, matchedPlayerResult.match)
                    }
                }
            }
        }
    }

    return Command
}
