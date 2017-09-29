import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import Joi from 'joi-browser'

export const TwitterUsers = new Mongo.Collection('twitter_users')

export const TwitterLists = new Mongo.Collection('twitter_lists')

if (Meteor.isServer) {
  TwitterUsers._ensureIndex({ name: 1, screen_name: 1, id_str: 1 })

  TwitterLists._ensureIndex({ 'user.screen_name': 1, id_str: 1 })
}

export const ScreenNameSchema = Joi.string().regex(/^[a-zA-Z0-9_]{1,15}$/, {name: 'Twitter screen name'})
