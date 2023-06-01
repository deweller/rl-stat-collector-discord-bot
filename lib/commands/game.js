
const Game = require('../classes/game')
const UserError = require('../UserError')
const validation = require('../validation')
const datastore = require('../datastore')
const gameResolver = require('../gameResolver')
const gameStatusStore = require('../gameStatusStore')

module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'game {game number}'
    Command.help = 'Specify the game number that we are submitting.'
    Command.matchString = 'game '



    Command.handle = async function(sessionData, msg) {
        let gameNumber = msg.content.substring(5).trim()

        let overrideDuplicateGame = false
        if (gameNumber.substring(0,1) == '*') {
            gameNumber = gameNumber.substring(1)
            overrideDuplicateGame = true
        }

        if (gameNumber == null || gameNumber.length == 0) {
            throw new UserError('I couldn\'t find a value for this game.')
        }

        if (!validation.isInt(gameNumber) || gameNumber.length < 1 || gameNumber.length > 5) {
            throw new UserError('The value you provided for game does not look a game number.')
        }

        const gameNumberInt = parseInt(gameNumber)
        if (gameNumberInt < parseInt(config.settings.minimumGameNumber)) {
            throw new UserError("This game number was too small.  Please find the game number for your match and try again.")
        }
        if (gameNumberInt > parseInt(config.settings.maximumGameNumber)) {
            throw new UserError("This game number was too large.  Please find the game number for your match and try again.")
        }

        // has this game been submitted?
        if (gameStatusStore.getGameIsSubmitted(gameNumber) && !overrideDuplicateGame) {
            throw new UserError("This game was already submitted.  If you are sure you want to add another submission for this game, enter the game number again starting with a \`*\`. Contact the League Committee for help.")
        }

        // parse the existing game
        let game = Game.fromJson(sessionData.game)
        // console.log('game',JSON.stringify(game,null,2))

        let switchingGame = false
        if (game.number != null && game.number != gameNumber) {
            switchingGame = true
            game = new Game()
        }
        if (game.number != null && game.number == gameNumber) {
            throw new UserError(`We're already working on game ${gameNumber}.  If you'd like to start over, enter \`restart\`.`)
        }
        game.number = gameNumber

        // match players and teams
        game = await gameResolver.resolveGame(game)

        await datastore.updateSession(sessionData.id, {
            game: game,
            readyToSubmit: false
        })

        await messageHandler.cancelMessageReaction(sessionData)

        if (switchingGame) {
            await messageHandler.sendMessageToUser(sessionData, `:video_game: Ok. We're working on a new game with number ${gameNumber} now. Note that I can only work on one game at a time.`)
        } else {
            let nextStep = ''
            if (sessionData.sessionType == 'screenshot') {
                nextStep = 'Now, please tell me the stats.'
            } else if (sessionData.sessionType == 'replay') {
                nextStep = 'Now, check to see if you are ready to `submit` this game.'
            } else {
                nextStep = 'Please provide a replay file or screenshot next.'
                // nextStep = 'Please provide a screenshot next.'
            }

            await messageHandler.sendMessageToUser(sessionData, `:video_game: Ok. We're working on game ${gameNumber}. ${nextStep} Type \`help\` for help.`)
        }

    }

    return Command
}
