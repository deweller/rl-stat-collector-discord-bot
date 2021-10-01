class Team {
    color = null
    name = null
    leagueName = null

    goals = 0
    winner = false

    players = []

    constructor(color, name, leagueName = null) {
        this.color = color
        this.name = name
        this.leagueName = leagueName
    }

    addPlayer(player) {
        this.players.push(player)
    }

}

module.exports = Team
