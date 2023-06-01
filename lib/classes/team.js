class Team {
    color = null
    name = null
    leagueName = null
    teamId = null

    goals = 0
    winner = false

    players = []

    constructor(color, name, leagueName = null, teamId = null) {
        this.color = color
        this.name = name
        this.leagueName = leagueName
        this.teamId = teamId
    }

    addPlayer(player) {
        this.players.push(player)
    }

}

module.exports = Team
