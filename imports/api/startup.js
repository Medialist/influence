import {Meteor} from 'meteor/meteor'
import validateSettings from './validate-settings'
import '/imports/api/fullcontact/methods'
import '/imports/api/twitter/methods'

Meteor.startup(function () {
  validateSettings(Meteor.settings)
})
