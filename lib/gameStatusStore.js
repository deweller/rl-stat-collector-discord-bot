let gameStatus = {};

exports.refreshGameStatus = function (newGameStatus) {
    gameStatus = newGameStatus;
};

exports.getGameIsSubmitted = function (gameId) {
    const gameIdString = String(gameId)
    if (gameStatus[gameIdString] == null) {
        return null;
    }

    return gameStatus[gameIdString];
};

exports.setGameIsSubmitted = function (gameId) {
    const gameIdString = String(gameId)
    gameStatus[gameIdString] = true;
};
