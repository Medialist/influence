import Joi from 'joi-browser'

export default (settings) => {
  if (settings.disableSettingsValidation) {
    return
  }
  Joi.assert(settings, Joi.object().keys({
    public: Joi.object(),
    disableSettingsValidation: Joi.boolean(),
    fullcontact: Joi.object().keys({
      apiKey: Joi.string().required()
    }).required(),
    twitter: Joi.object().keys({
      consumer_key: Joi.string().required(),
      consumer_secret: Joi.string().required(),
      access_token_key: Joi.string().required(),
      access_token_secret: Joi.string().required()
    }).required()
  }).required())
}
