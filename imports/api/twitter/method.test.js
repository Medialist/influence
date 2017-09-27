/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import testUser from './user.test.json'
import { TwitterUsers } from './collections'

let findTwitterUser = null

describe('findTwitterUser', function () {
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
    findTwitterUser = require('./methods').findTwitterUser
  })

  // disabled until we have auth...
  it.skip('should require the user to be logged in', function () {
    assert.throws(() => findTwitterUser.run.call({}, {}), /You must be logged in/)
  })

  it('should request a user from twitter api', function () {
    const apiMock = nock('https://api.twitter.com')
      .get('/1.1/users/lookup.json')
      .query(true)
      .reply(200, testUser)

    const testScreenName = 'Olly_Gilbert'

    const res = findTwitterUser._execute({
      userId: 'fred',
      unblock () {}
    }, {
      screenName: testScreenName
    })

    assert.ok(apiMock.isDone())
    assert.equal(res.screen_name, testScreenName)
    assert.deepEqual(
      omit(res, ['_id', '_createdAt', '_statusCode']),
      testUser[0],
      'Person retured from method should match the canned response'
    )

    const stored = TwitterUsers.findOne({screen_name: testScreenName})

    assert.deepEqual(res, stored, 'Person in db should match person retured from method')
  })

  it('should handle errors from twitter api', function () {
    const apiMock = nock('https://api.twitter.com')
      .get('/1.1/users/lookup.json')
      .query(true)
      .reply(404, {
        errors: [{
          code: 17,
          message: 'No user matches for specified terms.'
        }]
      })

    const testScreenName = 'nosuchuserzzz'
    const res = findTwitterUser._execute({
      userId: 'fred',
      unblock () {}
    }, {
      screenName: testScreenName
    })

    assert.ok(apiMock.isDone())
    assert.equal(res._statusCode, 404)

    const stored = TwitterUsers.findOne({screen_name: testScreenName})

    assert.deepEqual(res, stored, 'Person in db should match person retured from method')
  })
})
