import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import Joi from 'joi-browser'

export const TwitterUsers = new Mongo.Collection('twitter_users')

export const TwitterLists = new Mongo.Collection('twitter_lists')

export const TwitterApiQueue = new Mongo.Collection('twitter_api_queue')

if (Meteor.isServer) {
  TwitterUsers._ensureIndex({ name: 1, screen_name: 1, id_str: 1, _normalisedScreenName: 1 })

  TwitterLists._ensureIndex({ 'user.screen_name': 1, id_str: 1 })
}

export const ScreenNameSchema = Joi.string().regex(/^[a-zA-Z0-9_]{1,20}$/, {name: 'Twitter screen name'})

// Twitter swaps out links for t.co versions. This swaps them back.
export const replaceEntities = (doc) => {
  const res = {...doc}
  if (!doc.entities) return res
  Object.keys(doc.entities).forEach(key => {
    res[key] = replaceUrlEntities(doc[key], doc.entities[key].urls)
  })
  return res
}

export const replaceUrlEntities = (str, arr) => {
  return arr.reduce((res, urlObj) => res.replace(urlObj.url, urlObj.expanded_url), str)
}

export const toSocial = (rawDoc) => {
  if (!rawDoc) return null
  const doc = replaceEntities(rawDoc)
  return {
    label: 'Twitter',
    value: doc.screen_name,
    twitterId: doc.id_str,
    name: doc.name,
    profile_image_url_https: doc.profile_image_url_https,
    location: doc.location,
    description: doc.description,
    url: doc.url
  }
}

