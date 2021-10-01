

class Player {
    discordName = null
    gamertag = null
    goals = 0
    score = 0
    assists = 0
    saves = 0
    shots = 0
    mvp = false
    sub = false

    constructor(gamertag, discordName, goals, score, assists, saves, shots, mvp = false, sub = false) {
        this.discordName = discordName
        this.gamertag = gamertag

        this.goals = goals
        this.score = score
        this.assists = assists
        this.saves = saves
        this.shots = shots
        this.mvp = !!mvp
        this.sub = !!sub
    }


}

module.exports = Player
