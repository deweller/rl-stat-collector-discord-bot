const UserError = require('./UserError')
const Game = require('./classes/game')
const nameMatcher = require('./nameMatcher')
const nameLookups = require('./nameLookups')
const datastore = require('./datastore')

exports.hasUnresovledNames = async function(sessionData) {
    const game = Game.fromJson(sessionData.game)
    if (!game.number) {
        return true
    }

    let teams = game.getTeamsInWinningOrder()
    if (teams.length == 0) {
        return true
    }
    for (let team of teams) {
        if (team.leagueName == null) {
            return true
        }
        for (let player of team.players) {
            if (player.discordName == null && player.sub == false) {
                return true
            }
        }
    }

    return false
}

exports.resolveGameFromSessionData = async function(sessionData, messageHandler = null) {
    return await exports.resolveGame(Game.fromJson(sessionData.game), messageHandler, sessionData)
}

exports.resolveGame = async function(game, messageHandler = null, sessionData = null) {
    try {
        if (!game.number) {
            return game
        }

        let teams = game.getTeamsInWinningOrder()
        if (teams.length == 0) {
            return game
        }

        // match player names to get discord names
        let gamertags = []
        for (let team of teams) {
            for (let player of team.players) {
                gamertags.push(player.gamertag)
            }
        }

        // console.log('gamertags',JSON.stringify(gamertags,null,2))
        let matchedPlayerResults = nameMatcher.bestGamertagMatchesByGameId(gamertags, game.number)
        // console.log('matchedPlayerResults',JSON.stringify(matchedPlayerResults,null,2))

        const orgIdsUsedMap = {}
        let unmatchedGamertags = []
        for (let matchedPlayerResult of matchedPlayerResults) {
            if (matchedPlayerResult != null) {
                if (matchedPlayerResult.player) {
                    // console.log('matchedPlayerResult', matchedPlayerResult)

                    // set the discord name if needed
                    const gamertag = matchedPlayerResult.match
                    const player = game.getPlayerByGamertag(gamertag)
                    if (player.discordName == null) {
                        game.setPlayerDiscordNameByGamertag(matchedPlayerResult.player.discordName, gamertag)
                    }

                    if (player.gid == null) {
                        // console.log('matchedPlayerResult.player.gid:', matchedPlayerResult.player.gid)
                        game.setPlayerGidByGamertag(matchedPlayerResult.player.gid, gamertag)
                    }

                    // update team league name
                    const team = game.getTeamByPlayerGamertag(gamertag)
                    if (team.leagueName == null) {
                        const orgId = matchedPlayerResult.player.orgId
                        if (orgIdsUsedMap[orgId] == null) {
                            const organization = nameLookups.orgById(orgId)
                            const teamId = nameLookups.teamIdByGameIdAndOrgId(game.number, orgId)
                            game.setTeamLeagueNameAndTeamIdByGamertag(organization.name, teamId, gamertag)
                            orgIdsUsedMap[orgId] = true
                        }
                    }

                } else {
                    // discord not found
                    unmatchedGamertags.push(matchedPlayerResult.match)
                }
            }
        }

        // send a note for unmatched players
        if (messageHandler != null && unmatchedGamertags.length > 0) {
            let gamertagNoun = unmatchedGamertags.length == 1 ? 'this gamertag' : 'these gamertags'
            let gamertagsList = unmatchedGamertags.join(', ')
            await messageHandler.sendMessageToUser(sessionData, `:question: I couldn't match ${gamertagNoun}: **${gamertagsList}**. Match players manually with the \`player\` command or mark substitutes with the \`sub\` command.`)
        }

        // check to see both teams were matched
        {
            let teams = game.getTeamsInWinningOrder()
            // console.log('game.getTeamsInWinningOrder: ',JSON.stringify(teams,null,2))
            let unmatchedTeamsCount = 0
            let unmatchedTeamName
            for (let team of teams) {
                if (team.leagueName == null) {
                    ++unmatchedTeamsCount
                    unmatchedTeamName = team.name
                }
            }
            let errorMessage = null
            if (unmatchedTeamsCount == 1) {
                errorMessage = `I couldn't match team ${unmatchedTeamName} using those players.`
            } else if (unmatchedTeamsCount == 2) {
                errorMessage = "I couldn't match either team using those players."
            }

            if (messageHandler != null && errorMessage) {
                await messageHandler.sendMessageToUser(sessionData, `:question: ${errorMessage}`)
            }
        }

        return game
    } catch (e) {
        if (e instanceof UserError) {
            throw e
        } else {
            console.log(e)
            throw new UserError("I ran into an error matching this game.")
        }
    }

}