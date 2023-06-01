const table = require("table");
const scheduleStore = require("../scheduleStore");
const nameLookups = require("../nameLookups");
const validation = require("../validation");
const UserError = require("../UserError");

module.exports.init = function (messageHandler, config) {
    const Command = {};

    Command.example = "schedule [{week}] [{team}]";
    Command.help = "Show the schedule for the given week and team.";
    Command.matchString = "schedule";

    Command.handle = async function (sessionData, msg) {
        const messageContent = msg.content.trim();

        let weekNumber = null;
        let team = null;
        if (messageContent.length > 9) {
            // const pieces = messageContent.substring(9).trim().toLowerCase().split(/ +/);
            let [str1, ...str2] = messageContent.substring(9).trim().toLowerCase().split(/ +/);
            str2 = str2.join(" ");

            if (str2.length > 0 && validation.isInt(str1)) {
                weekNumber = str1;
                team = str2;
            } else {
                if (validation.isInt(str1)) {
                    weekNumber = str1;
                } else {
                    team = messageContent.substring(9).trim().toLowerCase();
                }
            }
        }

        if (weekNumber == null) {
            // current week...
            weekNumber = scheduleStore.currentWeek();
        }

        // console.log('weekNumber',weekNumber)
        // console.log('team',team)

        const schedule = filterByTeam(scheduleStore.getScheduleByWeek(weekNumber), team);
        if (schedule == null || schedule.length == 0) {
            throw new UserError("I could not find any appropriate schedule.");
        }

        // console.log('schedule', JSON.stringify(schedule,null,2))

        const maxDivisionStrLen = "Division".length;

        let isFirstChunk = true;
        for (let scheduleChunk of chunk(schedule)) {
            const tableText = table.table(scheduleWeekAsTableData(scheduleChunk, maxDivisionStrLen));
            // console.log("tableText\n"+tableText)
            let header = "";
            if (isFirstChunk) {
                header = `WEEK ${weekNumber}\n\n`;
            }
            await messageHandler.sendMessageToUser(sessionData, "```" + `${header}${tableText}` + "```");
            isFirstChunk = false;
        }
    };

    function scheduleWeekAsTableData(schedule, divisionSize) {
        // data = [
        //   ["A", "B", "C"],
        //   ["D", "E", "F"],
        //   ["G", "H", "I"],
        // ];

        let data = [["Date (ET)", "Division", "Game IDs", "Home Team", "Away Team"]];
        if (schedule != null) {
            for (let scheduleRow of schedule) {
                const homeTeam = nameLookups.teamNameById(scheduleRow.homeTeamId);
                const awayTeam = nameLookups.teamNameById(scheduleRow.awayTeamId);
                const divisionName = nameLookups.divisionNameByTeamId(scheduleRow.homeTeamId);

                data.push([
                    scheduleRow.date == null ? "" : scheduleRow.date,
                    divisionName == null ? "" : divisionName.padEnd(divisionSize),
                    scheduleRow.gameId == null ? "" : buildGameIDs(scheduleRow.gameId),
                    homeTeam == null ? "" : homeTeam.padEnd(13),
                    awayTeam == null ? "" : awayTeam.padEnd(13),
                ]);
            }
        }

        return data;
    }

    function buildGameIDs(startingGameId) {
        const id = parseInt(startingGameId);
        return `${id}-${id + 2}`;
        // return `${id},${id + 1},${id + 2}`;
    }

    function filterByDivision(schedule, division) {
        // don't process an empty schedule
        if (schedule == null) {
            return schedule;
        }
        // an empty division filter returns the entire schedule
        if (division == null) {
            return schedule;
        }

        let filteredDivisionRows = [];
        for (let scheduleRow of schedule) {
            if (scheduleRow.division.toLowerCase() == division) {
                filteredDivisionRows.push(scheduleRow);
            }
        }

        return filteredDivisionRows;
    }

    function filterByTeam(schedule, team) {
        // don't process an empty schedule
        if (schedule == null) {
            return schedule;
        }
        // an empty team filter returns the entire schedule
        if (team == null) {
            return schedule;
        }

        let filteredScheduleRows = [];
        for (let scheduleRow of schedule) {
            const homeTeam = nameLookups.teamNameById(scheduleRow.homeTeamId);
            const awayTeam = nameLookups.teamNameById(scheduleRow.awayTeamId);

            if (homeTeam.toLowerCase() == team || awayTeam.toLowerCase() == team) {
                filteredScheduleRows.push(scheduleRow);
            }
        }

        return filteredScheduleRows;
    }

    function maxPropertyLength(arr, prop) {
        let len = 0;
        for (let r of arr) {
            if (r[prop] != null) {
                const l = r[prop].length;
                if (l > len) {
                    len = l;
                }
            }
        }
        return len;
    }

    function chunkSize(arr) {
        const aLength = arr.length;
        const MAX_PER_CHUNK = 11;
        const numberOfChunks = Math.ceil(aLength / MAX_PER_CHUNK);
        return Math.ceil(aLength / numberOfChunks);
    }

    function chunk(arr) {
        const len = chunkSize(arr);

        let chunks = [],
            i = 0,
            n = arr.length;

        while (i < n) {
            chunks.push(arr.slice(i, (i += len)));
        }

        return chunks;
    }

    return Command;
};
