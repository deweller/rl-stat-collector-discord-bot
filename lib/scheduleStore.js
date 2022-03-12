
const UserError = require('./UserError')
const { parse } = require('date-fns')
const startOfDay = require('date-fns/startOfDay')
const subDate = require('date-fns/sub')
const compareAsc = require('date-fns/compareAsc')

const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz')

    const TZ = 'America/New_York'

let scheduleByWeek = {}

exports.refreshScheduleByWeek = function(newScheduleByWeek) {
    scheduleByWeek = newScheduleByWeek
}

exports.getScheduleByWeek = function(week) {
    if (scheduleByWeek[week] == null) {
        return []
    }

    return scheduleByWeek[week]   
}

exports.currentWeek = function(now = null) {
    if (now === null) {
        now = new Date()
    }

    // set to zero if all games are played on the same day
    // set to 2 if games are played on Friday and Sunday
    const BUFFER_DAYS = 2

    const weekKeys = Object.keys(scheduleByWeek)
    const reversedWeeks = weekKeys.slice().reverse()
    for (let week of reversedWeeks) {
        if (now > exports.getStartDateByWeek(week, 6 - BUFFER_DAYS)) {
            return week
        }
    }

    return weekKeys[0]
}

exports.getStartDateByWeek = function(week, daysBefore = 6) {
    const schedule = exports.getScheduleByWeek(week)
    if (schedule == null) {
        return null
    }
    const row = schedule[0]

    const serverTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dateObj = zonedTimeToUtc(parse(row.date, 'E MMM d h:mm a', new Date()), serverTz)

    const startDate = subDate(startOfDay(dateObj), {days: daysBefore})
    return startDate
}


function formatDate(d) {
    return format(d, 'MMM d h:mm a', { timeZone: TZ })
}
