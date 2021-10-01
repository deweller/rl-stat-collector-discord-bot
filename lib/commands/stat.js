
const Game = require('../classes/game')
const Team = require('../classes/team')
const Player = require('../classes/player')
const UserError = require('../UserError')
const validation = require('../validation')
const datastore = require('../datastore')
const nameMatcher = require('../nameMatcher')
const gameResolver = require('../gameResolver')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'stat {player,score,goals,assists,saves,shots}'
    Command.help = 'Send a stat line for the game.  You can replace a stat line by entering a new stat with the same player name again.'
    Command.matchString = 'stat '

    Command.handle = async function(sessionData, msg) {
        if (validation.isReplaySession(sessionData)) {
            throw new UserError('This command is only used for screenshot-based stats.')
        }

        if (sessionData.sessionType == null) {
            throw new UserError('Please upload a screenshot before entering stats.')
        }

        const line = msg.content.substring(5).trim()
        let receivedNote = 'I received this stat.'
        let replacedNote = ''
        let nextNote = ''

        const game = Game.fromJson(sessionData.game)
        if (game.number == null) {
            throw new UserError('I need to know the game number before adding stats.')
        }

        const pieces = line.split(/[,]+/);

        const trimmedPieces = []
        for (let piece of pieces) {
            trimmedPieces.push(piece.trim())
        }
        const [gamertag,score,goals,assists,saves,shots] = trimmedPieces

        let matchedGamertag = null 
        try {
            validation.validate(gamertag, 'player', 'player')
            validation.validate(score, 'bigNumber', 'score')
            validation.validate(goals, 'smallNumber', 'goals')
            validation.validate(assists, 'smallNumber', 'assists')
            validation.validate(saves, 'smallNumber', 'saves')
            validation.validate(shots, 'smallNumber', 'shots')

            // lookup player by gamertag
            let matchedPlayerResults = nameMatcher.bestGamertagMatchesByGameId([gamertag], game.number)
            // console.log('matchedPlayerResults for ['+gamertag+'], '+game.number+'', JSON.stringify(matchedPlayerResults,null,2))
            let matchedPlayer = matchedPlayerResults[0].player

            // console.log('matchedPlayer', JSON.stringify(matchedPlayer,null,2))
            if (matchedPlayer == null) {
                receivedNote = `:question: I couldn't find \`${gamertag}\` in the list of players for this game. Match that player manually with the \`player\` command or mark that player as a substitute with the \`sub\` command.`
            }
            if (matchedPlayer != null && matchedPlayer.gamertag != gamertag) {
                receivedNote = `I used \`${matchedPlayer.gamertag}\` as the player for this stat.`
            }

        } catch (e) {
            if (e instanceof UserError) {
                throw new UserError("I did not fully understand this stat line. "+e.message)
            } else {
                throw e
            }
        }

        const newPlayer = new Player(matchedGamertag === null ? gamertag : matchedGamertag, null, goals, score, assists, saves, shots)
        // console.log('newPlayer',JSON.stringify(newPlayer,null,2))

        let wasReplaced = false
        const players = game.getAllPlayers()
        for (let player of players) {
            if (!wasReplaced && player.gamertag == newPlayer.gamertag) {
                replacedNote = `\n:warning: Since I already found a stat line for this player, I **replaced that stat line** instead of adding a new one.\n`
                wasReplaced = true
                player.gamertag = newPlayer.gamertag
                player.goals = newPlayer.goals
                player.score = newPlayer.score
                player.assists = newPlayer.assists
                player.saves = newPlayer.saves
                player.shots = newPlayer.shots
            }
        }

        if (!wasReplaced) {
            game.addPlayer(newPlayer, config.settings.playersPerTeam)
        }


        // check number of stats
        if (game.getAllPlayers().length > config.settings.playersPerGame) {
            const maxStatLen = config.settings.playersPerGame
            throw new UserError(`I can only accept ${maxStatLen} stat lines for this game.  To start a new game, please \`submit\` the previous game first.`)
        }

        await messageHandler.cancelMessageReaction(sessionData)

        // match the players entered so far without showing any errors
        await gameResolver.resolveGame(game)

        // tally goals
        game.updateTeamGoals()

        // update the winning team and mvp if we have enough stats
        if (game.getAllPlayers().length >= config.settings.playersPerGame) {
            // set the winning team
            game.updateWinningTeamAndMVP()
        }

        // save game
        await datastore.updateSession(sessionData.id, {
            game: game,
            readyToSubmit: false
        })

        nextNote = `Type \`review\` to see all the stats you've entered so far.`
        if (game.getAllPlayers().length >= config.settings.playersPerGame) {
            nextNote = `Type \`submit\` to review these stats and submit your game.`
        }

        await messageHandler.sendMessageToUser(sessionData, `:computer: ${receivedNote} ${replacedNote}${nextNote}`)
    }


    return Command
}
