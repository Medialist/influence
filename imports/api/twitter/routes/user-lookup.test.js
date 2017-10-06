/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import { TwitterUsers } from '../collections'

import testUsers from './user.test.json'

describe.only('handleSocialsLookup', function () {
  let handleSocialsLookup = null

  beforeEach(function () {
    resetDatabase()

    nock.disableNetConnect()

    Meteor.settings = {
      twitter: {
        'consumer_key': 'foo',
        'consumer_secret': 'bar',
        'access_token_key': 'baz',
        'access_token_secret': 'xor'
      }
    }

    // Meteor settings need to be set first.
    handleSocialsLookup = require('./user-lookup').handleSocialsLookup
  })

  it('should post to the callback url with cached results', function () {
    const callbackUrl = 'https://test.medialist.io/foo/bar'
    const socials = [{
      label: 'Twitter',
      value: 'GUARDIAN'
    }]

    const testTiwtterUser = testUsers[0]

    TwitterUsers.insert({
      _status: 200,
      _createdAt: new Date(),
      _normalisedScreenName: 'guardian',
      ...testTiwtterUser
    })

    const apiMock = nock('https://test.medialist.io')
      .post('/foo/bar', {
        socials: [{
          label: 'Twitter',
          value: 'guardian',
          twitterId: '87818409',
          name: 'The Guardian',
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/877153924637175809/deHwf3Qu_normal.jpg',
          location: 'London',
          description: 'The need for independent journalism has never been greater. Become a Guardian supporter: http://gu.com/supporter/twitter',
          url: 'https://www.theguardian.com'
        }]
      })
      .reply(200)

    handleSocialsLookup(socials, callbackUrl)

    assert.ok(apiMock.isDone())
  })
})
