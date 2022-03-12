const Discord = require('discord.js');
require('dotenv').config();
const figlet = require('figlet');

const bot = require('./lib/bot')
const cache = require('./lib/cache')
const logger = require('./lib/logger')
const nameMatcher = require('./lib/nameMatcher')
const scheduleStore = require('./lib/scheduleStore')
const spreadsheetHandler = require('./lib/spreadsheetHandler')

const client = new Discord.Client({retryLimit: Infinity});
client.login(process.env.BOT_TOKEN)
client.on('ready', async () => {
    // load the player names
    const [allPlayersData, allTeamNamesList, allTeamsByGameIdMap, scheduleByWeek] = await cache.resolveCache(process.env.CACHE_PLAYERS, 'players', async function() {
        return await spreadsheetHandler.loadPlayersTeamsAndSchedule()
    })
    nameMatcher.refreshPlayersAndTeamsList(allPlayersData, allTeamNamesList, allTeamsByGameIdMap)
    scheduleStore.refreshScheduleByWeek(scheduleByWeek)

    // load the settings
    const settings = await cache.resolveCache(process.env.CACHE_SETTINGS, 'settings', async function() {
        return await spreadsheetHandler.loadSettings()
    })

    config = {
        mainGuild: null,
        mainChannel: null,
        settings: settings,
    }
    // get the guild
    config.guild = await client.guilds.fetch(process.env.DISCORD_SERVER_ID);
    if (config.guild == null) {
        throw new Error("Could not find guild")
    }

    // get the main stats channel
    config.mainChannel = await config.guild.channels.cache.find(channel => channel.name === process.env.DISCORD_STATS_MAIN_CHANNEL);
    if (config.mainChannel == null) {
        throw new Error("Could not find channel")
    }

    // ready
    console.log(figlet.textSync('OF Stats Bot 2.0'))
    console.log('is connected and ready.')

    bot.run(client, config)
});


