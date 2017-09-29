/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import testUser from './user.test.json'
import { TwitterUsers } from '../collections'

describe('fetchTwitterUser', function () {
  let fetchTwitterUsers = null

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
    fetchTwitterUsers = require('./fetch-twitter-users').fetchTwitterUsers
  })

  // disabled until we have auth...
  it.skip('should require the user to be logged in', function () {
    assert.throws(() => fetchTwitterUsers.run.call({}, {}), /You must be logged in/)
  })

  it('should request a user from twitter api', function () {
    const apiMock = nock('https://api.twitter.com')
      .get('/1.1/users/lookup.json')
      .query(true)
      .reply(200, testUser)

    const testScreenName = 'guardian'

    fetchTwitterUsers._execute({
      userId: 'fred',
      unblock () {}
    }, {
      screenName: testScreenName
    })

    assert.ok(apiMock.isDone())

    const stored = TwitterUsers.findOne({screen_name: testScreenName})
    assert.deepEqual(
      omit(stored, ['_id', '_createdAt']),
      {
        _statusCode: 200,
        ...testUser[0]
      },
      'Person in db should match person retured from method'
    )
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

    fetchTwitterUsers._execute({
      userId: 'fred',
      unblock () {}
    }, {
      screenName: testScreenName
    })

    assert.ok(apiMock.isDone())

    const stored = TwitterUsers.findOne({screen_name: testScreenName})

    assert.deepEqual(
      omit(stored, ['_id', '_createdAt']),
      {
        _statusCode: 404,
        screen_name: testScreenName
      },
      'Person in db should show that no user exists for that screen name'
    )
  })
})
