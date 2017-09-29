/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import { TwitterLists } from '../collections'
import testLists1 from './list-ownerships.1.test.json'
import testLists2 from './list-ownerships.2.test.json'

describe('fetchTwitterLists', function () {
  let fetchTwitterLists = null

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
    fetchTwitterLists = require('./fetch-twitter-lists').fetchTwitterLists
  })

  it('should fetch all the lists a twitter user created', function () {
    const testScreenName = 'guardian'

    const apiMock = nock('https://api.twitter.com')
      .get('/1.1/lists/ownerships.json')
      .query(q => {
        return (
          q.screen_name === testScreenName &&
          q.cursor === '-1'
        )
      })
      .reply(200, testLists1)
      // 2nd page
      .get('/1.1/lists/ownerships.json')
      .query(q => {
        return (
          q.screen_name === testScreenName &&
          q.cursor !== '-1'
        )
      })
      .reply(200, testLists2)

    fetchTwitterLists._execute({
      userId: 'fred',
      unblock () {}
    }, {
      screenName: testScreenName
    })

    assert.ok(apiMock.isDone())

    const stored = TwitterLists.find({'user.screen_name': testScreenName}, {sort: {_createdAt: 1}}).fetch()
    const expected = testLists1.lists.concat(testLists2.lists)

    assert.equal(stored.length, expected.length, 'Gotta catch em all')
    stored.forEach((list, i) => {
      assert.deepEqual(omit(list, ['_id', '_createdAt']), expected[i])
    })
  })
})
