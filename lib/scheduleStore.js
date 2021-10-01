
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
    const weekKeys = Object.keys(scheduleByWeek)
    const reversedWeeks = weekKeys.slice().reverse()
    for (let week of reversedWeeks) {
        if (now > exports.getStartDateByWeek(week)) {
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
    const dateObj = zonedTimeToUtc(parse(row.date, 'MMM d h:mm a', new Date()), serverTz)

    // const formattedDate = format(dateObj, 'MMM d h:mm a', { timeZone: TZ })

    const startDate = subDate(startOfDay(dateObj), {days: daysBefore})
    // const formattedDate = format(dateObj, 'MMM d h:mm a', { timeZone: TZ })
    return startDate
}


function formatDate(d) {
    console.log('d',d)
    return format(d, 'MMM d h:mm a', { timeZone: TZ })
}
