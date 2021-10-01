const low = require('lowdb')
const lodashId = require('lodash-id')
const FileSync = require('lowdb/adapters/FileSync')

const logger = require('./logger')

// ------------------------------------------------------------------------
// init db

const adapter = new FileSync('data/db.json')
const db = low(adapter)
db._.mixin(lodashId)

db.defaults({
    sessions: [],
}).write()


// ------------------------------------------------------------------------
// sessions

const OLD_SESSION_TTL_MS = 8640000 // 1 day
const OLD_SESSION_EXPIRE_INTERVAL_MS = 300000 // 5 minutes

// const OLD_SESSION_TTL_MS = 30000 // 30 seconds
// const OLD_SESSION_EXPIRE_INTERVAL_MS = 10000 // 10 seconds

const sessionsCollection = db
    .defaults({
        sessions: [],
    })
    .get('sessions')

exports.addSession = async function (id, sessionData) {
    const insertVars = {
        id: id,
        ts: Date.now(),
        ...sessionData
    }

    return await sessionsCollection
          .insert(insertVars)
          .write()
}

exports.updateSession = async function (id, sessionData) {
    return await sessionsCollection
      .updateById(id, {ts: Date.now(), ...sessionData})
      .write()
}

exports.getSession = async function (id) {
    return await sessionsCollection
        .getById(id)
        .value()
}

exports.resetSession = async function(sessionData) {
    await exports.updateSession(sessionData.id, {
        sessionType: null,
        game: null,
        screenshotUrl: null,
        replayUrl: null,
        replayUuid: null,
        stats: [],
        readyToSubmit: false,
        submitDiscordMsgId: null, 
    })

    return
}

exports.expireOldSessions = async function() {
    // logger.debug('expireOldSessions')
    const oldTimestamp = Date.now() - OLD_SESSION_TTL_MS
    const allSessions = await sessionsCollection
        .removeWhere(r => r.ts == null || r.ts <= oldTimestamp)
        .write()
}

setInterval(exports.expireOldSessions, OLD_SESSION_EXPIRE_INTERVAL_MS);

exports.getAllSessions = async function (id) {
    return await sessionsCollection
        .value()
}
