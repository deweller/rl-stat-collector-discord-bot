const ballchasingApi = {}
const logger = require('./logger')

const axios = require('axios').default;
const FormData = require('form-data');
const fs = require("fs")

ballchasingApi.loadParsedBallchasingReplayByUuid = async function(uuid) {
    const apiResponse = await callBallchasingApi('GET', `https://ballchasing.com/api/replays/${uuid}`)
    return apiResponse
}

ballchasingApi.uploadReplayFile = async function(filepath) {
    let form = new FormData();
    // console.log('filepath:',JSON.stringify(filepath,null,2))

    // const filestats = fs.statSync(filepath)
    // console.log('filestats:',JSON.stringify(filestats,null,2))
    // const filesizeInBytes = filestats.size
    // if (filesizeInBytes <= 0) {
    //     throw new Error("Filesize was blank")
    // }

    form.append('file', fs.createReadStream(filepath), 'my-upload.replay');

    // headers
    let headers = form.getHeaders()
    headers.Authorization = process.env.BALLCHASING_API_TOKEN
    // console.log('upload headers:',JSON.stringify(headers,null,2))

    let requestConfig = {
        method: 'POST',
        data: form,
        url: 'https://ballchasing.com/api/v2/upload?visibility=unlisted',
        headers: headers,
        // proxy: {
        //   protocol: 'http',
        //   host: '127.0.0.1',
        //   port: 8888,
        // },
    }

    const apiResponse = await callBallchasingApiWithRequestConfig(requestConfig)
    return apiResponse
}

// ------------------------------------------------------------------------

async function loadParsedBallchasingReplayByUuid(uuid) {
    const apiResponse = await callBallchasingApi('GET', `https://ballchasing.com/api/replays/${uuid}`)
    return apiResponse
}

async function callBallchasingApi(method, url) {
    let requestConfig = {
        method: method,
        url: url,
        headers: {'Authorization': process.env.BALLCHASING_API_TOKEN}
    }

    let apiResponse = await callBallchasingApiWithRequestConfig(requestConfig)
    return apiResponse
}

async function callBallchasingApiWithRequestConfig(requestConfig) {
    try {
        const response = await axios(requestConfig)
        return {
            success: true,
            data: response.data,
            code: response.status,
            errorMessage: null
        }
    } catch (error) {
        if (error.response) {
            if (error.response.status != '409') {
                console.log(`${error.response.status} Error: `, JSON.stringify(error.response.data,null,2));
            }
            // console.log(error.request)

            return {
                success: false,
                data: error.response.data,
                code: error.response.status,
                errorMessage: `A ${error.response.status} error occurred`
            }
        } else if (error.request) {
            return {
                success: false,
                data: null,
                code: null,
                errorMessage: "A client-side error occurred"
            }
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);

            return {
                success: false,
                data: null,
                code: null,
                errorMessage: `An unknown error occurred: ${error.message}`
            }

        }
    }
}


module.exports = ballchasingApi
