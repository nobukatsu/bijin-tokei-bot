'use strict';

const Botkit = require('botkit');
const CronJob = require('cron').CronJob;
const moment = require('moment');
const request = require('request');

const TOKEN = process.env.token;
const CHANNEL_ID = process.env.channel;

if (!TOKEN || !CHANNEL_ID) {
  console.log('Error: Specify token and channle in environment');
  process.exit(1);
}

const controller = Botkit.slackbot({
    hostname: '0.0.0.0', // For heroku (https://github.com/howdyai/botkit/issues/491)
    debug: false
});

const bot = controller.spawn({
    token: process.env.token,
    retry: 10
}).startRTM(err => {
    if (err) {
        throw new Error(err);
    }
});

const job = new CronJob({
    cronTime: '00 00 10-19 * * 1-5',
    onTick: () => {
        const messageObj = getMessageObj();
        
        const hours = moment().format('HH');
        const minutes = '00';
        const url = 'http://www.bijint.com/assets/pict/jp/pc/' + hours + '' + minutes +'.jpg'
        
        getBijinData(hours, minutes).then(data => {
            messageObj.text = hours + '時になりました。\n' + url + '\n' +
                "名前:" + data.name + "\n" +
                "誕生日:" + data.birthday + "\n" +
                "出身:" + data.home + "\n" +
                "職業:" + data.occupation + "\n" +
                "身長:" + data.height;
                
            bot.api.chat.postMessage(messageObj);
        }).catch(err => {
            console.log(err);
        });
    },
    start: false,
    timeZone: 'Asia/Tokyo'
});

job.start();


function getMessageObj() {
    const messageObj = {
        token: TOKEN,
        channel: CHANNEL_ID,
        text : '',
        username : 'bot_atc_ops',
        as_user : true,
        link_names: 1
    };
    return messageObj;
}

function getBijinData(hours, minutes){
    return new Promise((resolve, reject) => {
        const url = "http://www.bijint.com/assets/profile/jp/pc/ja/" + hours + "" + minutes + ".json";
        
        const options = {
            url: url,
            json: true
        }
        
        request.get(options, (err, res, body) => {
            if (!err && res.statusCode == 200) {
                const bijinData = {};
                bijinData.imageUrls = body.result.model_images;
                bijinData.name = body.result.profile_info[0].note;
                bijinData.birthday = body.result.profile_info[1].note;
                bijinData.home = body.result.profile_info[2].note;
                bijinData.occupation = body.result.profile_info[3].note;
                bijinData.height = body.result.profile_info[5].note;
                
                resolve(bijinData);
            } else {
                reject(err);
            }
        });
    });
}
