
const UserError = require('../UserError')
const ballchasingHandler = require('../ballchasingHandler')
const datastore = require('../datastore')
const Game = require('../classes/game')
const nameMatcher = require('../nameMatcher')
const gameResolver = require('../gameResolver')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'replay {replay URL}'
    Command.help = 'Specify a replay URL from ballchasing.com like `replay https://ballchasing.com/replay/b819f049-f06b-4c30-aec2-30e26c143a27`'
    Command.matchString = 'replay '

    Command.handle = async function(sessionData, msg) {
        // load replay
        await loadReplayFromMessage(sessionData, msg)

        // match names and teams
        const game = await gameResolver.resolveGameFromSessionData(sessionData, messageHandler)
        await datastore.updateSession(sessionData.id, {
            game: game,
        })

        // show the review
        await config.commandHandlers.review.handle(sessionData, msg)

    }

    async function loadReplayFromMessage(sessionData, msg) {
        const replayUrl = msg.content.substring(7).trim()

        // find and validate the uuid
        const pieces = replayUrl.split('/')
        let uuid = pieces[pieces.length - 1]

        let isValidUuid = false
        if (uuid != null) {
            // is it a valid uuid?
            uuid = uuid.toLowerCase()
            if (uuid.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)) {
                isValidUuid = true
            }
        }

        if (!isValidUuid) {
            throw new UserError("That didn't look like a replay to me. Valid replays look like `https://ballchasing.com/replay/b819f049-f06b-4c30-aec2-30e26c143a27` to me.")
        }

        // process the replay
        await messageHandler.sendMessageToUser(sessionData, `:clock1: Please wait while I load this replay from ballchasing.com.`)
        await Command.processReplayFromUuid(uuid, sessionData)
        await messageHandler.sendMessageToUser(sessionData, `:movie_camera: I received your replay.`)

    }


    Command.processReplayFromUuid = async function(uuid, sessionData) {
        // find the game number
        let gameNumber = getExistingGameNumber(sessionData)

        try {
            const game = await ballchasingHandler.parseReplayByUuidIntoGame(uuid)
            // console.log('parseReplayByUuidIntoGame '+uuid, JSON.stringify(game,null,2))

            // keep the game number
            if (gameNumber != null) {
                game.number = gameNumber
            }

            sessionData = await datastore.updateSession(sessionData.id, {
                sessionType: 'replay',
                replayUuid: uuid,
                game: game,
            })

        } catch (error) {
            console.log('error', error)
            throw new UserError(`I ran into a problem loading that replay. ${error.message}`)
        }
    }

    function getExistingGameNumber(sessionData) {
        let gameNumber = null
        if (sessionData.game != null) {
            const oldGame = Game.fromJson(sessionData.game)
            if (oldGame.number) {
                gameNumber = oldGame.number
            }
        }

        return gameNumber
    }

    function ensureGameNumber(sessionData) {
        const gameNumber = getExistingGameNumber(sessionData)
        if (gameNumber == null) {
            throw new UserError("I need to know the game number of this game so I can match the players. Type `help` for some help on the process.")
        }
        return gameNumber
    }

    // Command.matchNames = async function(sessionData, msg, withErrors = true) {
    //     // match player names to get discord names

    //     // parse the existing game
    //     // console.log('matchNames sessionData.game is ',sessionData.game)
    //     const game = Game.fromJson(sessionData.game)
    //     if (!game.number) {
    //         return
    //     }

    //     let gamertags = []
    //     let teams = game.getTeamsInWinningOrder()
    //     if (teams.length == 0) {
    //         return []
    //     }
    //     for (let team of teams) {
    //         for (let player of team.players) {
    //             gamertags.push(player.gamertag)
    //         }
    //     }

    //     // console.log('gamertags',JSON.stringify(gamertags,null,2))
    //     let matchedPlayerResults = nameMatcher.bestGamertagMatchesByGameId(gamertags, game.number)
    //     // console.log('matchedPlayerResults',JSON.stringify(matchedPlayerResults,null,2))

    //     let unmatchedGamertags = []
    //     for (let matchedPlayerResult of matchedPlayerResults) {
    //         if (matchedPlayerResult != null) {
    //             if (matchedPlayerResult.player) {
    //                 // set the discord name
    //                 game.setPlayerDiscordNameByGamertag(matchedPlayerResult.player.discordName, matchedPlayerResult.match)
    //                 // console.log('[replay] setting team to '+matchedPlayerResult.player.team+' for gamertag '+matchedPlayerResult.match)
    //                 game.setTeamLeagueNameByGamertag(matchedPlayerResult.player.team, matchedPlayerResult.match)
    //                 // console.log('[replay] after setting, teams: ',JSON.stringify({orange: game.teams.orange.leagueName, blue: game.teams.blue.leagueName},null,2))

    //             } else {
    //                 // discord not found
    //                 unmatchedGamertags.push(matchedPlayerResult.match)
    //             }
    //         }
    //     }

    //     // send a note for unmatched players
    //     if (withErrors && unmatchedGamertags.length > 0) {
    //         let gamertagNoun = unmatchedGamertags.length == 1 ? 'this gamertag' : 'these gamertags'
    //         let gamertagsList = unmatchedGamertags.join(', ')
    //         await messageHandler.sendMessageToUser(sessionData, `:question: I couldn't match ${gamertagNoun}: **${gamertagsList}**. Match players manually with the \`player\` command or mark substitutes with the \`sub\` command.`)
    //     }

    //     // check to see both teams were matched
    //     {
    //         let teams = game.getTeamsInWinningOrder()
    //         // console.log('teams',JSON.stringify(teams,null,2))
    //         let unmatchedTeamsCount = 0
    //         let unmatchedTeamName
    //         for (let team of teams) {
    //             if (team.leagueName == null) {
    //                 ++unmatchedTeamsCount
    //                 unmatchedTeamName = team.name
    //             }
    //         }
    //         let errorMessage = null
    //         if (unmatchedTeamsCount == 1) {
    //             errorMessage = `I couldn't match team ${unmatchedTeamName} using those players.`
    //         } else if (unmatchedTeamsCount == 2) {
    //             errorMessage = "I couldn't match either team using those players."
    //         }

    //         if (withErrors && errorMessage) {
    //             await messageHandler.sendMessageToUser(sessionData, `:question: ${errorMessage}`)
    //         }
    //     }

    //     // save the game data
    //     sessionData = await datastore.updateSession(sessionData.id, {
    //         game: game,
    //     })

    // }
    

    // ------------------------------------------------------------------------
    
    return Command
}
