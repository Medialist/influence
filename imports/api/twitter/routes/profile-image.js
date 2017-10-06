import { JsonRoutes } from 'meteor/simple:json-routes'
import { TwitterUsers, ScreenNameSchema } from './collections'
import Joi from 'joi-browser'

// normal = 48x48px, bigger = 73x73px
const querySchema = Joi.object().keys({
  size: Joi.string().valid(['normal', 'bigger', '200x200', '400x400']).default('normal')
})

JsonRoutes.add('get', '/twitter/:screenName/profile_image', function (req, res, next) {
  let code = 404
  let headers = {}

  const {screenName} = req.params
  Joi.validate(screenName, ScreenNameSchema)

  const query = Joi.attempt(req.query, querySchema)

  // No need to regexEscape. Joi should ensure it's a valid twitter screenName
  const doc = TwitterUsers.findOne({
    screen_name: {
      $regex: `^${screenName}$`,
      $options: 'i'
    }
  })

  if (doc && doc.profile_image_url_https) {
    const imageUrl = doc.profile_image_url_https
    const biggerUrl = imageUrl.replace('normal', query.size)
    code = 302
    headers.Location = biggerUrl
  }

  JsonRoutes.sendResult(res, {code, headers})
})
