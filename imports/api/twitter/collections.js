import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import Joi from 'joi-browser'

export const TwitterUsers = new Mongo.Collection('twitter_users')

if (Meteor.isServer) {
  TwitterUsers._ensureIndex({ screen_name: 1, id_str: 1 })
}

export const ScreenNameSchema = Joi.string().regex(/^[a-zA-Z0-9_]{1,15}$/, {name: 'Twitter screen name'})
