
const UserError = require('../UserError')
const datastore = require('../datastore')
const ballchasingHandler = require('../ballchasingHandler')
const gameResolver = require('../gameResolver')
const path = require('path')
const Game = require('../classes/game')


module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.handle = async function(sessionData, msg) {
        if (msg.attachments.size > 1) {
            throw new UserError("I can only process one upload at a time.  Please try again with only one attachment.")
        }

        const attachment = msg.attachments.first()
        const contentType = attachment.contentType
        const extension = path.extname(attachment.url).toLowerCase()

        let isImage = false
        let isReplay = false
        // console.log('extension=',JSON.stringify(extension,null,2),JSON.stringify(['.png','.jpg','.jpeg','.gif'].includes(extension),null,2))
        if (['.png','.jpg','.jpeg','.gif'].includes(extension)) {
            isImage = true
        } else if (extension == '.replay') {
            isReplay = true
        }

        if (isImage) {
            return await handleImage(sessionData, msg, attachment)
        } else if (isReplay) {
            return await handleReplay(sessionData, msg, attachment)
        } else {
            throw new UserError("I didn't recognize the type of file you uploaded.  Please make sure replay files end in `.replay` and image files end in `.jpg`, `.gif`, or `.jpg`.")
        }
    }

    const handleImage = async function(sessionData, msg, attachment) {
        await datastore.updateSession(sessionData.id, {
            sessionType: 'screenshot',
            screenshotUrl: attachment.url,
            readyToSubmit: false
        })

        await messageHandler.cancelMessageReaction(sessionData)

        // find the game number
        let gameNumber = null
        if (sessionData.game != null) {
            const oldGame = Game.fromJson(sessionData.game)
            if (oldGame.number) {
                gameNumber = oldGame.number
            }
        }

        if (gameNumber == null) {
            await messageHandler.sendMessageToUser(sessionData, ":frame_photo: Nice. I received your screenshot. Now please tell me the game number. Type `help screenshot` for some help with this.")

        } else {
            await messageHandler.sendMessageToUser(sessionData, `:frame_photo: Nice. I received your screenshot for game ${gameNumber}. Now please tell me the stats. Type \`help screenshot\` for some help with this.`)
        }
    }

    const handleReplay = async function(sessionData, msg, attachment) {
        // find the game number
        let gameNumber = null
        if (sessionData.game != null) {
            const oldGame = Game.fromJson(sessionData.game)
            if (oldGame.number) {
                gameNumber = oldGame.number
            }
        }
        await messageHandler.sendMessageToUser(sessionData, ":clock1: I received this replay.  I'm processing it now.  Ballchasing can take up to 5 minutes and sometimes even longer to process a replay if it has not been uploaded yet.")

        // upload to ballchasing.com
        try {
            let uuid = await ballchasingHandler.uploadReplayReplayFile(attachment.url, messageHandler)
            // console.log('uuid:',JSON.stringify(uuid,null,2))

            // save the uuid
            await datastore.updateSession(sessionData.id, {
                replayUuid: uuid,
            })

            await config.commandHandlers.replay.processReplayFromUuid(uuid, sessionData)

            // make sure we are still working on this session
            sessionData = await datastore.getSession(sessionData.id)
            if (sessionData.replayUuid != uuid) {
                // the session changed - just stop
                return
            }

            await messageHandler.sendMessageToUser(sessionData, `:movie_camera: I received your replay successfully.`)

            if (gameNumber) {
                // match names and teams
                const game = await gameResolver.resolveGameFromSessionData(sessionData, messageHandler)
                await datastore.updateSession(sessionData.id, {
                    game: game,
                })

                // show the review
                await config.commandHandlers.review.handle(sessionData, msg)
            } else {
                await messageHandler.sendMessageToUser(sessionData, `Please tell me the game number so I can match names for this game.`)
            }

        } catch (error) {
            console.log('error', error)
            throw new UserError(`I ran into a problem uploading that replay to ballchasing.com. ${error.message}`)
        }

    }

    return Command
}
