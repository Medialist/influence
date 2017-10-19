import { Meteor } from 'meteor/meteor'
import Twitter from 'twitter'

const twitterApi = new Twitter({
  consumer_key: Meteor.settings.twitter.consumer_key,
  consumer_secret: Meteor.settings.twitter.consumer_secret,
  access_token_key: Meteor.settings.twitter.access_token_key,
  access_token_secret: Meteor.settings.twitter.access_token_secret
})

// We'd like to use the promise api of `twitter.get` here, but it doesn't
// provide the response, and we'd like to see the rate-limit headers.
export const get = Meteor.wrapAsync(function (url, opts, cb) {
  twitterApi.get(url, opts, function (error, data, response) {
    const err = error ? {error, data, response} : null
    cb(err, {data, response})
  })
})

export const post = Meteor.wrapAsync(function (url, opts, cb) {
  twitterApi.post(url, opts, function (error, data, response) {
    const err = error ? {error, data, response} : null
    cb(err, {data, response})
  })
})
