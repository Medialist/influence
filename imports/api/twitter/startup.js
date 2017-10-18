import { Meteor } from 'meteor/meteor'
import { processUserLookupQueue } from './routes/user-lookup'

Meteor.startup(_ => {
  // 900 per 15 mins is max so could go as low as (15*60*1000)ms / 900 = 1000ms
  Meteor.setInterval(processUserLookupQueue, 2000)
})
