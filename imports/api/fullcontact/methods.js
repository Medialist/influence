import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import { HTTP } from 'meteor/http'
import Joi from 'joi-browser'
import Person from './person'

export const findPerson = new ValidatedMethod({
  name: 'findPerson',

  // don't use the clients return value
  applyOptions: {
    returnStubValue: false
  },

  validate (data) {
    Joi.assert(data, Joi.object().keys({
      email: Joi.string().email().required()
    }).required())
  },

  run ({email}) {
    // if (!this.userId) {
    //   throw new Meteor.Error('fullcontact/findPerson/notLoggedIn', 'You must be logged in')
    // }

    if (this.isSimulation) {
      return
    }

    const person = Person.findOne({_email: email})
    if (person) {
      return person
    }

    this.unblock()
    let res = null
    try {
      res = HTTP.call('GET', `https://api.fullcontact.com/v2/person.json?email=${email}`, {
        headers: {
          'X-FullContact-APIKey': Meteor.settings.fullcontact.apiKey
        }
      })
    } catch (err) {
      if (err.response && err.response.data) {
        const _id = Person.insert({
          _email: email,
          _createdAt: new Date(),
          ...err.response.data
        })
        return Person.findOne({_id})
      } else {
        throw new Meteor.Error('fullcontact/findPerson/fullcontactError', 'Error from fullcontact', err)
      }
    }

    if (res.data) {
      const _id = Person.insert({
        _email: email,
        _createdAt: new Date(),
        ...res.data
      })
      return Person.findOne({_id})
    } else {
      throw new Meteor.Error('fullcontact/findPerson/noData', 'No data on response', res)
    }
  }
})

