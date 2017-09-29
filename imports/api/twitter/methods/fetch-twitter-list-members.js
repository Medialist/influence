import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import Joi from 'joi-browser'
import { TwitterUsers } from '../collections'
import * as TwitterApi from '../client'

export const fetchTwitterListMembers = new ValidatedMethod({
  name: 'fetchTwitterListMembers',

  // don't use the clients return value
  applyOptions: {
    returnStubValue: false
  },

  validate (data) {
    Joi.assert(data, Joi.object().keys({
      listId: Joi.string().required(),
      cursor: Joi.string()
    }).required())
  },

  run ({listId, cursor = '-1'}) {
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
      res = TwitterApi.get('lists/members', {list_id: listId, count: 20, cursor})
    } catch (err) {
      throw new Meteor.Error('twitter/fetchTwitterListMembers/apiError', 'Error from twitter', err.error)
    }

    if (!res || !res.data || !res.data.users) {
      throw new Meteor.Error('twitter/fetchTwitterListMembers/noData', 'No data on response')
    }

    res.data.users.forEach((user) => {
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

    if (res.data.next_cursor_str !== '0') {
      fetchTwitterListMembers.call({listId, cursor: res.data.next_cursor_str})
    }
  }
})
