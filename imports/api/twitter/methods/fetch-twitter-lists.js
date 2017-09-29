import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import Joi from 'joi-browser'
import { TwitterLists, ScreenNameSchema } from '../collections'
import * as TwitterApi from '../client'

export const fetchTwitterLists = new ValidatedMethod({
  name: 'fetchTwitterLists',

  // don't use the clients return value
  applyOptions: {
    returnStubValue: false
  },

  validate (data) {
    Joi.assert(data, Joi.object().keys({
      screenName: ScreenNameSchema.required(),
      cursor: Joi.string()
    }).required())
  },

  run ({screenName, cursor = '-1'}) {
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
      res = TwitterApi.get('lists/ownerships', {screen_name: screenName, count: 20, cursor})
    } catch (err) {
      throw new Meteor.Error('twitter/fetchTwitterLists/apiError', 'Error from twitter', err.error)
    }

    if (!res || !res.data || !res.data.lists) {
      throw new Meteor.Error('twitter/fetchTwitterLists/noData', 'No data on response')
    }

    res.data.lists.forEach((list) => {
      TwitterLists.update({
        id_str: list.id_str
      }, {
        _createdAt: new Date(),
        ...list
      }, {
        upsert: true
      })
    })

    if (res.data.next_cursor_str !== '0') {
      fetchTwitterLists.call({screenName, cursor: res.data.next_cursor_str})
    }
  }
})
