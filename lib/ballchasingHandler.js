const BallchasingHandler = {}
const logger = require('./logger')
const ballchasingApi = require('./ballchasingApi')
const Team = require('./classes/team')
const Game = require('./classes/game')
const Player = require('./classes/player')
const fs = require("fs")
const tmp = require('tmp-promise');
const axios = require('axios').default;

const PENDING_SLEEP_WAIT_MS = 5000 // 5 seconds
const MAX_WAIT_TIMEOUT = 300000 // 5 minutes

BallchasingHandler.parseReplayByUuidIntoGame = async function(uuid) {
    let replayData
    let waitCount = 0
    const maxWaitCount = MAX_WAIT_TIMEOUT / PENDING_SLEEP_WAIT_MS
    while (++waitCount <= maxWaitCount) {
        const apiResponse = await ballchasingApi.loadParsedBallchasingReplayByUuid(uuid)
        // console.log('apiResponse:',JSON.stringify(apiResponse,null,2))
        if (apiResponse.success) {
            // check for status
            replayData = apiResponse.data
            // console.log('replayData.status:',JSON.stringify(replayData.status,null,2))
            if (replayData.status == 'pending') {
                // sleep
                // console.log('waiting '+PENDING_SLEEP_WAIT_MS+'ms for replay '+replayData.id)
                await sleep(PENDING_SLEEP_WAIT_MS)
                continue
            }

            if (replayData.status == 'failed') {
                throw new Error("Ballchasing.com failed to parse this replay.")
            }

            return parseRawReplayDataIntoGame(replayData)
        }
        
        // console.log('apiResponse.code: '+JSON.stringify(apiResponse.code,null,2))
        if (apiResponse.code == 404) {
            throw new Error("I could not find a replay with this ID.")
        }

        throw new Error(apiResponse.errorMessage)
    }

    throw new Error("Ballchasing.com took too long to parse this replay.")

}

BallchasingHandler.uploadReplayReplayFile = async function(url, messageHandler) {
    // download the replay file URL locally
    const response = await axios.get(url, {
          responseType: 'stream'
    });

    // temp file...
    let tmpobj = tmp.fileSync({postfix: '.replay'})
    const tmpFilepath = tmpobj.name

    // console.log('downloading to ',JSON.stringify(tmpFilepath,null,2))
    // response.data.pipe(fs.createWriteStream(tmpFilepath))
    await readableToWritestream(response.data, fs.createWriteStream(tmpFilepath))
    // console.log('download finished to ',JSON.stringify(tmpFilepath,null,2))

    let uuid = null
    const apiResponse = await ballchasingApi.uploadReplayFile(tmpFilepath)
    // console.log('apiResponse',JSON.stringify(apiResponse,null,2))
    if (apiResponse.success == true) {
        uuid = apiResponse.data.id
    } else if (apiResponse.success == false && apiResponse.code == '409' && apiResponse.data != null) {
        uuid = apiResponse.data.id
    } else {
        throw new Error(apiResponse.errorMessage)
    }

    // console.log('new replay uuid is ',JSON.stringify(uuid,null,2))
    return uuid    
}

async function readableToWritestream(readable, writeStream) {
    return new Promise((resolve, reject) => {
        readable.on('data', function (chunk) {
            writeStream.write(chunk)
        })
        readable.on('end', function () {
            resolve()
        })
        readable.on('error', function (err) {
            reject(err)
        })
    })
}

// ------------------------------------------------------------------------

function parseRawReplayDataIntoGame(replayData) {
    // let parsedReplayData = {
    //     teams: [],
    //     players: [],
    // }

    let game = new Game()

    // let teamsByColor = {}
    for (const teamColor of ["blue","orange"]) {
        let teamData = replayData[teamColor]

        let teamName = teamData.name
        if (teamName == null) {
            teamName = (teamColor == 'blue') ? 'Blue' : 'Orange'
        }

        let team = new Team(teamColor, teamName)
        // let team = {
        //     color: teamColor,
        //     name: teamData.name,
        //     goals: 0,
        //     winner: false,
        //     players: [],
        // }
        let players = []
        let teamGoals = 0

        for (let playerData of teamData.players) {
            let coreStatsData = playerData.stats.core

            let discordName = null
            team.addPlayer(new Player(playerData.name, discordName, coreStatsData.goals, coreStatsData.score, coreStatsData.assists, coreStatsData.saves, coreStatsData.shots, coreStatsData.mvp))

            teamGoals = teamGoals + coreStatsData.goals
        }

        team.goals = teamGoals

        game.setTeam(team)
    }

    // organize by winning team first
    // console.log('game.teams', JSON.stringify(game.teams,null,2))
    if (game.teams.blue.goals > game.teams.orange.goals) {
        game.teams.blue.winner = true
        game.teams = [game.teams.blue, game.teams.orange]
    } else {
        game.teams.orange.winner = true
        game.teams = [game.teams.orange, game.teams.blue]
    }

    return game
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


module.exports = BallchasingHandler
