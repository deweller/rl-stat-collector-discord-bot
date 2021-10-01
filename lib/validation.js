const UserError = require('./UserError')

const validation = {}

validation.isInt = function(value) {
    return !isNaN(value) && 
        parseInt(Number(value)) == value && 
        !isNaN(parseInt(value, 10));
}

validation.isReplaySession = function(sessionData) {
    if (sessionData.sessionType == 'replay') {
        return true
    }
    return false
}


//

validation.validatePlayerNumber = function(playerNumber, config) {
    if (playerNumber == null || playerNumber.length == 0) {
        throw new UserError('I didn\'t understand that player number for this game. Try something like \`player 1,FredFlinstone\`.')
    }

    if (!validation.isInt(playerNumber)) {
        throw new UserError('The value you provided for game does not look a valid player number.')
    }

    const playerNumberInt = parseInt(playerNumber)
    const maxPlayerNumber = config.playersPerTeam * 2

    if (playerNumberInt < 1) {
        throw new UserError(`This player number was too small.  Please choose a player number between 1 and ${maxPlayerNumber} and try again.`)
    }
    if (playerNumberInt > maxPlayerNumber) {
        throw new UserError(`This player number was too large.  Please choose a player number between 1 and ${maxPlayerNumber} and try again.`)
    }

    return playerNumberInt
}


validation.validate = function(value, type, desc) {
    if (value == null || value.length == 0) {
        throw new UserError('I couldn\'t find a value for '+desc+'.')

    }
    if (type == 'game') {
        if (!validation.isInt(value) || value.length < 1 || value.length > 5) {
            throw new UserError('The value you provided for '+desc+' does not look a game number.')
        }
    }
    if (type == 'player') {
        if (validation.isInt(value) && value.length < 5) {
            throw new UserError('The value you provided for '+desc+' looks like a number rather than a name.')
        }
    }

    if (type == 'bigNumber' || type == 'smallNumber') {
        if (!validation.isInt(value)) {
            throw new UserError('The value you provided for '+desc+' was not a number.')
        }

        const intVal = parseInt(value)
        if (intVal < 0) {
            throw new UserError('The value you provided for '+desc+' was less than zero.  Hmmm...')
        }
    }

    if (type == 'bigNumber') {
        const intVal = parseInt(value)
        if (intVal > 9999) {
            throw new UserError('The value you provided for '+desc+' was way too big.')
        }
    }

    if (type == 'smallNumber') {
        const intVal = parseInt(value)
        if (intVal > 99) {
            throw new UserError('The value you entered for '+desc+' was too big.')
        }
    }
}

module.exports = validation
