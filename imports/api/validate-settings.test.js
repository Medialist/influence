/* global describe it */

import assert from 'assert'
import settingsTpl from '/settings.tpl.json'
import validateSettings from './validate-settings'

describe('validate-settings', function () {
  it('should do nothing if settings are valid', function () {
    assert.doesNotThrow(() => validateSettings(settingsTpl))
  })

  it('should do nothing if disableSettingsValidation is true', function () {
    assert.doesNotThrow(() => validateSettings({disableSettingsValidation: true}))
  })

  it('should throw if settings are invalid', function () {
    assert.throws(() => validateSettings())
  })
})
