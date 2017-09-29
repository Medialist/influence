import { Meteor } from 'meteor/meteor'
import { TwitterUsers, TwitterLists } from './collections.js'

Meteor.publish('twitterUsers', function ({name, limit = 20}) {
  return TwitterUsers.find({
    $or: [{
      screen_name: {
        $regex: `^${name}`,
        $options: 'i'
      }
    }, {
      name: {
        $regex: `^${name}`,
        $options: 'i'
      }
    }]
  }, {
    sort: {name: 1},
    limit
  })
})

Meteor.publish('twitterLists', function ({twitterUserId}) {
  return TwitterLists.find({
    'user.id_str': twitterUserId
  })
})
