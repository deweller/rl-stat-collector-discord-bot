const Team = require('./team')
const Player = require('./player')

class Game {
    number = null

    teams = {
        blue: null,
        orange: null
    }

    // restore the game object from saved data
    static fromJson(jsonData) {
        let game = new Game()

        if (jsonData == null) {
            jsonData = {}
        }

        if (jsonData.number != null) {
            game.number = jsonData.number    
        }

        if (jsonData.teams != null) {
            for (let teamColor in jsonData.teams) {
                let teamData = jsonData.teams[teamColor]

                if (teamData == null) {
                    continue
                }

                let team = new Team(teamData.color, teamData.name, teamData.leagueName)

                // add players
                if (teamData.players != null) {
                    for (let playerData of teamData.players) {
                        let player = new Player(playerData.gamertag, playerData.discordName, playerData.goals, playerData.score, playerData.assists, playerData.saves, playerData.shots, playerData.mvp, playerData.sub)
                        team.addPlayer(player)
                    }
                }

                // goals and winner flag
                if (teamData.goals != null) {
                    team.goals = teamData.goals
                }
                if (teamData.winner != null) {
                    team.winner = teamData.winner
                }

                game.setTeam(team)
            }
        }

        return game
    }

    constructor(number = null) {
        this.number = number
    }

    // ------------------------------------------------------------------------
    
    setTeam(team) {
        this.teams[team.color] = team
    }

    setPlayerDiscordNameByGamertag(discordName, gamertag) {
        this.callbackTeamAndPlayerByGamertag(gamertag, (u) => {
            u.player.discordName = discordName
            return u
        })
    }

    setTeamLeagueNameByGamertag(leagueName, gamertag) {
        const matched = this.callbackTeamAndPlayerByGamertag(gamertag, (u) => {
            // console.log('setting u.team.leagueName to ',JSON.stringify(leagueName,null,2))
            u.team.leagueName = leagueName
            return u
        })
    }

    setTeamLeagueNameByDiscordName(leagueName, discordName) {
        const matched = this.callbackTeamAndPlayerByDiscordName(discordName, (u) => {
            u.team.leagueName = leagueName
            return u
        })
    }

    addPlayer(newPlayer, playersPerTeam) {
        for (const teamColor of ["blue","orange"]) {
            if (this.teams[teamColor] == null) {
                // add a new team
                this.teams[teamColor] = new Team(teamColor, teamColor == 'blue' ? 'Team 1' : 'Team 2')
            }

            if (this.teams[teamColor].players.length < playersPerTeam) {
                this.teams[teamColor].addPlayer(newPlayer)
                break
            }
        }
    }


    getPlayerByGamertag(gamertag) {
        let foundPlayer = null
        this.callbackTeamAndPlayerByGamertag(gamertag, (result) => {
            foundPlayer = result.player
        })
        return foundPlayer
    }

    getTeamByPlayerGamertag(gamertag) {
        let foundTeam = null
        this.callbackTeamAndPlayerByGamertag(gamertag, (result) => {
            foundTeam = result.team
        })
        return foundTeam
    }

    getPlayerByNumber(number) {
        let count = 0
        const teamsInOrder = this.getTeamsInWinningOrder()
        for (let orderedTeam of teamsInOrder) {
            const teamColor = orderedTeam.color
            let team = this.teams[teamColor]
            if (team == null) {
                continue
            }

            for (let [index, player] of team.players.entries()) {
                ++count
                if (count == number) {
                    return this.teams[teamColor].players[index]
                }
            }
        }

        return null
    }


    getAllPlayers() {
        let players = []

        const teamsInOrder = this.getTeamsInWinningOrder()
        for (let orderedTeam of teamsInOrder) {
            const teamColor = orderedTeam.color
            let team = this.teams[teamColor]
            if (team == null) {
                continue
            }

            for (let [index, player] of team.players.entries()) {
                players.push(this.teams[teamColor].players[index])
            }
        }

        return players
    }


    getTeamsInWinningOrder() {
        let teamsInOrder = []
        if (this.teams.blue != null && this.teams.orange != null) {
            if (this.teams.orange.winner) {
                teamsInOrder = [this.teams.orange, this.teams.blue]
            } else {
                // this is the default when no winner has been determined
                teamsInOrder = [this.teams.blue, this.teams.orange]
            }
        } else if (this.teams.blue != null) {
            teamsInOrder = [this.teams.blue]
        } else if (this.teams.orange != null) {
            teamsInOrder = [this.teams.orange]
        }
        return teamsInOrder
    }

    updateTeamGoals() {
        for (const teamColor of ["blue","orange"]) {
            let teamGoals = 0
            let team = this.teams[teamColor]
            if (team != null) {
                for (let player of team.players) {
                    teamGoals += parseInt(player.goals)
                }

                team.goals = teamGoals
            }
        }
    }

    updateWinningTeamAndMVP() {
        this.teams.blue.winner = false
        this.teams.orange.winner = false
        if (this.teams.orange.goals > this.teams.blue.goals) {
            this.teams.orange.winner = true
        } else {
            this.teams.blue.winner = true
        }

        // update MVP
        const teamsInOrder = this.getTeamsInWinningOrder()
        for (let team of teamsInOrder) {
            let mvpPlayer = null
            if (team.winner) {
                let highestScore = 0
                for (let player of team.players) {
                    if (player.score > highestScore) {
                        mvpPlayer = player
                        // console.log('mvpPlayer set to ',player.gamertag,' with score '+`${player.score} > ${highestScore}`)
                        highestScore = player.score
                    }
                }
            }

            for (let player of team.players) {
                if (mvpPlayer != null && mvpPlayer.gamertag == player.gamertag) {
                    player.mvp = true
                } else {
                    player.mvp = false
                }
            }
        }

    }

    // ------------------------------------------------------------------------
    
    // modifyingFn recieves an argument with {team: team, player: player}
    //  if it returns an object with {team: team, player: player}, then those will be modified
    callbackTeamAndPlayerByGamertag(gamertag, modifyingCallbackFn) {
        for (const teamColor of ["blue","orange"]) {
            let team = this.teams[teamColor]
            if (team == null) {
                return false
            }

            for (let [index, player] of team.players.entries()) {
                if (player.gamertag == gamertag) {

                    // console.log('calling modifyingCallbackFn for team',team.color)
                    const modifiedTeamAndPlayer = modifyingCallbackFn({
                        team: team,
                        player: player,
                    })

                    if (modifiedTeamAndPlayer != null) {
                        // console.log('modifiedTeamAndPlayer.team.leagueName for team '+team.color+' is '+modifiedTeamAndPlayer.team.leagueName)
                        this.teams[teamColor] = modifiedTeamAndPlayer.team
                        this.teams[teamColor].players[index] = modifiedTeamAndPlayer.player

                        return true
                    }

                    return false
                }
            }
        }

        return false
    }

    callbackTeamAndPlayerByDiscordName(discordName, modifyingCallbackFn) {
        for (const teamColor of ["blue","orange"]) {
            let team = this.teams[teamColor]
            if (team == null) {
                return false
            }

            for (let [index, player] of team.players.entries()) {
                if (player.discordName == discordName) {

                    // console.log('calling modifyingCallbackFn for team',team.color)
                    const modifiedTeamAndPlayer = modifyingCallbackFn({
                        team: team,
                        player: player,
                    })

                    if (modifiedTeamAndPlayer != null) {
                        // console.log('modifiedTeamAndPlayer.team.leagueName for team '+team.color+' is '+modifiedTeamAndPlayer.team.leagueName)
                        this.teams[teamColor] = modifiedTeamAndPlayer.team
                        this.teams[teamColor].players[index] = modifiedTeamAndPlayer.player

                        return true
                    }

                    return false
                }
            }
        }

        return false
    }

}

module.exports = Game
