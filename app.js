const Discord = require('discord.js');
require('dotenv').config();
const figlet = require('figlet');

const bot = require('./lib/bot')
const logger = require('./lib/logger')
const nameMatcher = require('./lib/nameMatcher')
const spreadsheetHandler = require('./lib/spreadsheetHandler')


const client = new Discord.Client();
client.login(process.env.BOT_TOKEN)
client.on('ready', async () => {
    logger.debug('Discord bot is ready');

    // load the names
    await nameMatcher.refreshNamesList()

    // load the settings
    const settings = await spreadsheetHandler.loadSettings()

    // ready
    console.log(figlet.textSync('OF Stats Bot Ready!'))

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

    bot.run(client, config)
});






// const jokes = [
//   'I went to a street where the houses were numbered 8k, 16k, 32k, 64k, 128k, 256k and 512k. It was a trip down Memory Lane.',
//   '“Debugging” is like being the detective in a crime drama where you are also the murderer.',
//   'The best thing about a Boolean is that even if you are wrong, you are only off by a bit.',
//   'A programmer puts two glasses on his bedside table before going to sleep. A full one, in case he gets thirsty, and an empty one, in case he doesn’t.',
//   'If you listen to a UNIX shell, can you hear the C?',
//   'Why do Java programmers have to wear glasses? Because they don’t C#.',
//   'What sits on your shoulder and says “Pieces of 7! Pieces of 7!”? A Parroty Error.',
//   'When Apple employees die, does their life HTML5 in front of their eyes?',
//   'Without requirements or design, programming is the art of adding bugs to an empty text file.',
//   'Before software can be reusable it first has to be usable.',
//   'The best method for accelerating a computer is the one that boosts it by 9.8 m/s2.',
//   'I think Microsoft named .Net so it wouldn’t show up in a Unix directory listing.',
//   'There are two ways to write error-free programs; only the third one works.',
// ];
// msg.channel.send('jokes[Math.floor(Math.random() * jokes.length)]');

// client.on('message', (msg) => {
//     if (msg.content.substring(0, 5) === '/stat') {
//         const line = msg.content.substring(5).trim()

//         const pieces = line.split(/[,]+/);

//         const trimmedPieces = []
//         for (let piece of pieces) {
//             trimmedPieces.push(piece.trim())
//         }
//         const [game,player,score,goals,assists,saves,shots] = trimmedPieces

//         try {
//             validate(game, 'player', 'game')
//             validate(player, 'player', 'player')
//             validate(score, 'bigNumber', 'score')
//             validate(goals, 'smallNumber', 'goals')
//             validate(assists, 'smallNumber', 'assists')
//             validate(saves, 'smallNumber', 'saves')
//             validate(shots, 'smallNumber', 'shots')

//             const textMsg = `
// I registered the following stat:
// game: ${game}
// player: ${player}
// score: ${score}
// goals: ${goals}
// assists: ${assists}
// saves: ${saves}
// shots: ${shots}
// `

//             console.log(textMsg)
//             msg.channel.send(textMsg)
//         } catch (error) {
//             msg.channel.send('✘ There was a problem with the stat you entered: '+error.message)
//             throw error
//         }
//         // console.log('player:',player)
//         // console.log('score:',score)

//     }
// });

// function validate(value, type, desc) {
//     if (value == null || value.length == 0) {
//         throw new Error('You did not enter a value for '+desc+'')

//     }
//     if (type == 'player') {

//     }

//     if (type == 'bigNumber' || type == 'smallNumber') {
//         if (!isInt(value)) {
//             throw new Error('The value you entered for '+desc+' was not a big number')
//         }

//         const intVal = parseInt(value)
//         if (intVal < 0) {
//             throw new Error('The value you entered for '+desc+' was less than zero')
//         }
//     }

//     if (type == 'bigNumber') {
//         const intVal = parseInt(value)
//         if (intVal > 9999) {
//             throw new Error('The value you entered for '+desc+' was way too big')
//         }
//     }

//     if (type == 'smallNumber') {
//         const intVal = parseInt(value)
//         if (intVal > 99) {
//             throw new Error('The value you entered for '+desc+' was way too big')
//         }
//     }


// }


// function isInt(value) {
//   return !isNaN(value) && 
//          parseInt(Number(value)) == value && 
//          !isNaN(parseInt(value, 10));
// }
