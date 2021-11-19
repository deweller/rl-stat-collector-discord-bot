const table = require('table');
const scheduleStore = require('../scheduleStore')
const validation = require('../validation')
const UserError = require('../UserError')


module.exports.init = function(messageHandler, config) {
    const Command = {}

    Command.example = 'schedule [{week}] [{division}]'
    Command.help = 'Show the schedule for the given week and division.'
    Command.matchString = 'schedule'

    Command.handle = async function(sessionData, msg) {
        const messageContent = msg.content.trim()

        let weekNumber = null
        let division = null
        if (messageContent.length > 9) {
            const pieces = messageContent.substring(9).trim().toLowerCase().split(/[ ]/, 2);
            if (pieces.length == 2) {
                weekNumber = pieces[0]
                if (pieces[1] != null) {
                    division = pieces[1]
                }
            } else {
                if (validation.isInt(pieces[0])) {
                    weekNumber = pieces[0]
                } else {
                    division = pieces[0]
                }
            }
        }

        if (weekNumber == null) {
            // current week...
            weekNumber = scheduleStore.currentWeek()
        }

        const schedule = filterByDivision(scheduleStore.getScheduleByWeek(weekNumber), division)
        if (schedule == null || schedule.length == 0) {
            throw new UserError('I could not find any appropriate schedule.')
        }

        // console.log('schedule', JSON.stringify(schedule,null,2))

        const maxDivisionStrLen = maxPropertyLength(schedule, 'division')

        let isFirstChunk = true
        for (let scheduleChunk of chunk(schedule)) {
            const tableText = table.table(scheduleWeekAsTableData(scheduleChunk, maxDivisionStrLen))
            // console.log("tableText\n"+tableText)
            let header = ''
            if (isFirstChunk) {
                header = `WEEK ${weekNumber}\n\n`;
            }
            await messageHandler.sendMessageToUser(sessionData, '```' + `${header}${tableText}` + '```')
            isFirstChunk = false
        }
    }

    function scheduleWeekAsTableData(schedule, divisionSize) {
        // data = [
        //   ["A", "B", "C"],
        //   ["D", "E", "F"],
        //   ["G", "H", "I"],
        // ];

        let data = [
            ['Date (ET Zone)','Division','Game IDs','Home Team','Away Team']
        ]
        if (schedule != null) {
            for (let scheduleRow of schedule) {
                data.push([
                    scheduleRow.date == null ? '' : scheduleRow.date,
                    scheduleRow.division == null ? '' : scheduleRow.division.padEnd(divisionSize),
                    scheduleRow.gameId == null ? '' : buildGameIDs(scheduleRow.gameId),
                    scheduleRow.homeTeam == null ? '' : scheduleRow.homeTeam.padEnd(16),
                    scheduleRow.awayTeam == null ? '' : scheduleRow.awayTeam.padEnd(16),
                ])
            }
        }

        return data
    }

    function buildGameIDs(startingGameId) {
        const id = parseInt(startingGameId)
        return `${id},${id+1},${id+2}`
    }

    function filterByDivision(schedule, division) {
        // don't process an empty schedule
        if (schedule == null) {
            return schedule
        }
        // an empty division filter returns the entire schedule
        if (division == null) {
            return schedule
        }

        let filteredDivisionRows = []
        for (let scheduleRow of schedule) {
            if (scheduleRow.division.toLowerCase() == division) {
                filteredDivisionRows.push(scheduleRow)
            }
        }

        return filteredDivisionRows
    }

    function maxPropertyLength(arr, prop) {
        let len = 0
        for (let r of arr) {
            if (r[prop] != null) {
                const l = r[prop].length
                if (l > len) {
                    len = l
                }
            }
        }
        return len
    }

    function chunkSize(arr) {
        const aLength = arr.length
        const MAX_PER_CHUNK = 11
        const numberOfChunks = Math.ceil(aLength / MAX_PER_CHUNK)
        return Math.ceil(aLength / numberOfChunks)
    }

    function chunk(arr) {
        const len = chunkSize(arr)

        let chunks = [],
                i = 0,
                n = arr.length;

        while (i < n) {
            chunks.push(arr.slice(i, i += len));
        }

        return chunks;
    }

    return Command
}
