import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import Joi from 'joi-browser'
import { TwitterUsers } from '../collections'
import * as TwitterApi from '../client'

export const fetchTwitterUsers = new ValidatedMethod({
  name: 'fetchTwitterUsers',

  // don't use the clients return value
  applyOptions: {
    returnStubValue: false
  },

  validate (data) {
    Joi.assert(data, Joi.object().keys({
      screenNames: Joi.array().items(Joi.string().required())
    }).required())
  },

  run ({screenName}) {
    // if (!this.userId) {
    //   throw new Meteor.Error('fullcontact/findPerson/notLoggedIn', 'You must be logged in')
    // }

    if (this.isSimulation) {
      return
    }

    this.unblock()

    let res = null

    try {
      // 'users/lookup' lookup always returns an array.
      res = TwitterApi.get('users/lookup', {screen_name: screenName})
    } catch (err) {
      if (err.response && err.response.statusCode) {
        const _id = TwitterUsers.insert({
          screen_name: screenName,
          _createdAt: new Date(),
          _statusCode: err.response.statusCode
        })
        return TwitterUsers.findOne({_id})
      } else {
        throw new Meteor.Error('twitter/fetchTwitterUsers/lookupError', 'Error from twitter', err.error)
      }
    }

    if (!res || !res.data) {
      throw new Meteor.Error('twitter/fetchTwitterUsers/noData', 'No data on response')
    }

    res.data.forEach((user) => {
      TwitterUsers.update({
        id_str: user.id_str
      }, {
        _createdAt: new Date(),
        _statusCode: 200,
        ...user
      }, {
        upsert: true
      })
    })
  }
})
