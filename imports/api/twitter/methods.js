import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import Joi from 'joi-browser'
import { TwitterUsers } from './collections'
import Twitter from 'twitter'

const twitterApi = new Twitter({
  consumer_key: Meteor.settings.twitter.consumer_key,
  consumer_secret: Meteor.settings.twitter.consumer_secret,
  access_token_key: Meteor.settings.twitter.access_token_key,
  access_token_secret: Meteor.settings.twitter.access_token_secret
})

// We'd like to use the promise api of `twitter.get` here, but it doesn't
// provide the response, and we'd like to see the rate-limit headers.
const twitterGet = Meteor.wrapAsync(function (url, opts, cb) {
  twitterApi.get(url, opts, function (error, data, response) {
    const err = error ? {error, data, response} : null
    cb(err, {data, response})
  })
})

export const findTwitterUser = new ValidatedMethod({
  name: 'findTwitterUser',

  // don't use the clients return value
  applyOptions: {
    returnStubValue: false
  },

  validate (data) {
    Joi.assert(data, Joi.object().keys({
      screenName: Joi.string().required()
    }).required())
  },

  run ({screenName}) {
    // if (!this.userId) {
    //   throw new Meteor.Error('fullcontact/findPerson/notLoggedIn', 'You must be logged in')
    // }

    if (this.isSimulation) {
      return
    }

    const existing = TwitterUsers.findOne({screen_name: screenName})
    if (existing) {
      return existing
    }

    this.unblock()

    let res = null

    try {
      // 'users/lookup' lookup always returns an array.
      res = twitterGet('users/lookup', {screen_name: screenName})
    } catch (err) {
      if (err.response && err.response.statusCode) {
        const _id = TwitterUsers.insert({
          screen_name: screenName,
          _createdAt: new Date(),
          _statusCode: err.response.statusCode
        })
        return TwitterUsers.findOne({_id})
      } else {
        throw new Meteor.Error('twitter/findTwitterUser/lookupError', 'Error from twitter', err.error)
      }
    }

    if (res.data && res.data.length) {
      const _id = TwitterUsers.insert({
        _createdAt: new Date(),
        _statusCode: 200,
        ...res.data[0]
      })
      return TwitterUsers.findOne({_id})
    } else {
      throw new Meteor.Error('twitter/findTwitterUser/noData', 'No data on response')
    }
  }
})
