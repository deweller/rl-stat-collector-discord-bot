
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

    // set to 0 if played weekly, set to 1 if bi-weekly
    const BUFFER_WEEKS = 1

    const weekKeys = Object.keys(scheduleByWeek)
    const reversedWeeks = weekKeys.slice().reverse()
    for (let week of reversedWeeks) {
        // console.log(`now: ${now} week: ${week} startDate: ${exports.getStartDateByWeek(week, 6 - BUFFER_DAYS)}`)
        if (now > exports.getStartDateByWeek(week, BUFFER_WEEKS * 7 + 6 - BUFFER_DAYS)) {
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
    // Fri Jul 21 9:00 PM
    const PARSE_FORMAT = 'EEE MMM d h:mm a'
    // console.log(`row.date: ${row.date} parsed: ${parse(row.date, PARSE_FORMAT, new Date())}`)
    const dateObj = zonedTimeToUtc(parse(row.date, PARSE_FORMAT, new Date()), serverTz)

    const startDate = subDate(startOfDay(dateObj), {days: daysBefore})
    return startDate
}


function formatDate(d) {
    return format(d, 'MMM d h:mm a', { timeZone: TZ })
}
