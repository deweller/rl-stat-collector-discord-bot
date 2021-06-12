const winston = require('winston')

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    defaultMeta: {},
    transports: [],
});

if (process.env.NODE_ENV === 'production') {
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    logger.add(new winston.transports.File({
        filename: 'error.log',
        level: 'error'
    }))
    logger.add(new winston.transports.File({
        filename: 'combined.log' 
    }))

    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple()
        ),
    }));

}

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));

    
}

module.exports = logger
