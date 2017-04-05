'use strict';

const Botkit = require('botkit');
const CronJob = require('cron').CronJob;
const moment = require('moment-timezone');
const request = require('request');
const randomInt = require('random-int');

const TOKEN = process.env.token;
const CHANNEL_ID = process.env.channel;
const RANDOM = process.env.random;

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
        
        const hoursNow = moment().tz('Asia/Tokyo').format('HH');
        const hours = RANDOM ? ('0' + randomInt(24)).slice(-2) : hoursNow;
        const minutes = !RANDOM || hours == '24' ? '00' : ('0' + randomInt(59)).slice(-2);
        
        getBijinData(hoursNow, minutes).then(data => {
            let text = hoursNow + '時になりました。\n';
            if(RANDOM){
                text += data.imageUrls[randomInt(data.imageUrls.length - 1)] + '\n';
            }else{
                text += 'http://www.bijint.com/assets/pict/jp/pc/' + hoursNow + '' + minutes +'.jpg' + '\n';
            }
            
            text += "名前:" + data.name + "\n" +
                "誕生日:" + data.birthday + "\n" +
                "出身:" + data.home + "\n" +
                "職業:" + data.occupation + "\n" +
                "身長:" + data.height;
            
            messageObj.text =  text;
            
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
                
                bijinData.imageUrls = [];
                if(body.result.model_images){
                    body.result.model_images.forEach(val =>{
                        bijinData.imageUrls.push(val.image_path);
                    });
                }
                bijinData.name = body.result.profile_info[0].note;
                bijinData.birthday = body.result.profile_info[1].note;
                bijinData.home = body.result.profile_info[2].note;
                bijinData.occupation = body.result.profile_info[3].note;
                bijinData.height = body.result.profile_info[5] ? body.result.profile_info[5].note : '不明';
                
                resolve(bijinData);
            } else {
                reject(err);
            }
        });
    });
}
