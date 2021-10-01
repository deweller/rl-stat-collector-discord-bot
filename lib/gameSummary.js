const table = require('table');

// must be at least 12
const ABBR_LENGTH = 14

exports.buildCompactGameSummaryTableText = function(game) {
    return exports.buildGameSummaryTableText(game, true)
}

exports.buildGameSummaryTableText = function(game, compact = false) {
    // format teams
    let teamHeaderByColor = {}
    let playerLines = []
    let number = 1
    let maxTeamHeaderLength = 0
    let teams = game.getTeamsInWinningOrder()
    if (teams.length == 0) {
        return ''
    }

    for (let team of teams) {
        playerLines.push({
            gamertag: `♠♠T${team.color}♠♠`,
            number: null,
            mvp: false,
        })
        for (let player of team.players) {
            playerLines.push({number: number, ...player})
            ++number
        }

        const goalsNoun = team.goals == 1 ? 'GOAL ' : 'GOALS'
        const teamNameText = (team.name == null ? 'Unknown Team' : team.name)
        const teamLeagueNameText = (team.leagueName == null ? 'Unmatched Team' : team.leagueName)
        const header = `[${team.goals} ${goalsNoun}] ${team.name} (${teamLeagueNameText})`
        // const header = `[${team.goals} ${goalsNoun}] ${team.leagueName}`
        teamHeaderByColor[team.color] = header
        maxTeamHeaderLength = Math.max(maxTeamHeaderLength, header.length)
    }

    // console.log('playerLines',JSON.stringify(playerLines,null,2))
    let tableText = table.table(statsAsTableData(playerLines, compact))
    // console.log('tableText:'+"\n"+tableText)

    // calculate table width
    const lineLength = tableText.split("\n")[0].length
    const emptySpacerLength = lineLength - 2
    const emptySpacer = ' '.repeat(emptySpacerLength)

    // adjust team headers to center
    for (const teamColor of ["blue","orange"]) {
        let indentWidth = Math.floor((emptySpacerLength - maxTeamHeaderLength) / 2)
        teamHeaderByColor[teamColor] = ' '.repeat(indentWidth) + teamHeaderByColor[teamColor]

    }


    // fix the table 
    for (const teamColor of ["blue","orange"]) {
        let regex
        if (compact) {
            regex = new RegExp(`(╟.*╢)\n║ ♠♠T${teamColor}♠♠(.*)║\n(╟.*╢)`)
        } else {
            regex = new RegExp(`(╟.*╢)\n║   │ ♠♠T${teamColor}♠♠(.*)║\n(╟.*╢)`)
        }

        let nameSpacerLength = emptySpacerLength - teamHeaderByColor[teamColor].length - 1
        let nameSpacer = ' '.repeat(nameSpacerLength)

        // caclulate pre and post team lines
        let matchResults = tableText.match(regex)
        if (matchResults) {
            let preTeamLine = (matchResults[1]).replace(/┼/g, '┴')
            let postTeamLine = (matchResults[1]).replace(/┼/g, '┬')

            tableText = tableText.replace(regex, preTeamLine+"\n"+"║"+emptySpacer+"║\n" + '║ '+teamHeaderByColor[teamColor] + nameSpacer + '║'+"\n"+postTeamLine)
        }
    }


    return tableText
}

function statsAsTableData(playerLines, compact) {
    // data = [
    //   ["A", "B", "C"],
    //   ["D", "E", "F"],
    //   ["G", "H", "I"],
    // ];

    let data

    if (compact) {
        data = [
            ['Gamertag','Discord Name','Sub','Score','Goal','Asst','Save','Shot']
        ]
    } else {
        data = [
            ['#','Gamertag','Discord Name','Sub','Score','Goal','Asst','Save','Shot']
        ]
    }

    if (playerLines != null) {
        for (let playerLine of playerLines) {
            const mvp = playerLine.mvp == null ? false : (playerLine.mvp ? true : false)

            let newLine = [
                playerLine.number == null ? '' : playerLine.number,
                playerLine.gamertag == null ? '' : (abbreviate(playerLine.gamertag, (mvp ? ABBR_LENGTH - 2 : null)) + (mvp ? ' *' : '')),
                playerLine.discordName == null ? '' : abbreviate(playerLine.discordName),
                playerLine.sub == null ? '' : (playerLine.sub ? 'Yes' : 'No'),
                playerLine.score == null ? '' : playerLine.score,
                playerLine.goals == null ? '' : playerLine.goals,
                playerLine.assists == null ? '' : playerLine.assists,
                playerLine.saves == null ? '' : playerLine.saves,
                playerLine.shots == null ? '' : playerLine.shots,
            ]

            if (compact) {
                newLine = newLine.slice(1)
            }

            data.push(newLine)
        }
    }

    return data
}


function abbreviate(rawName, length = null) {
    if (length === null) {
        length = ABBR_LENGTH
    }

    if (rawName.length >= length + 1) {
        return rawName.substring(0, length - 1) + '…'
    }

    return rawName
}
