import {Meteor} from 'meteor/meteor'
import validateSettings from './validate-settings'
import { JsonRoutes, RestMiddleware } from 'meteor/simple:json-routes'
import '/imports/api/fullcontact/methods'
import '/imports/api/twitter/methods'
import '/imports/api/twitter/publications'
import '/imports/api/twitter/routes'

// Map Joi errors to Meteor errors for restful routes.
JsonRoutes.ErrorMiddleware.use(function (err, request, response, next) {
  if (!err.isJoi) return next(err)

  const error = new Meteor.Error(400, err.name, err.details.map(d => d.message))
  error.statusCode = 400
  next(error)
})

JsonRoutes.ErrorMiddleware.use(RestMiddleware.handleErrorAsJson)

Meteor.startup(function () {
  validateSettings(Meteor.settings)
})
