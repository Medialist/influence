import { Meteor } from 'meteor/meteor'
import { Outlets } from './collections'

Meteor.publish('outlets', function () {
  return Outlets.find({})
})
