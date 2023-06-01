
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

    // ------------------------------------------------------------------------
    
    return Command
}
