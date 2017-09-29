/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import { TwitterUsers } from '../collections'
import testMembers from './list-members.test.json'

describe('fetchTwitterListMembers', function () {
  let fetchTwitterListMembers = null

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
    fetchTwitterListMembers = require('./fetch-twitter-list-members').fetchTwitterListMembers
  })

  it('should fetch all the lists a twitter user created', function () {
    const testListId = '5946315'

    const apiMock = nock('https://api.twitter.com')
      .get('/1.1/lists/members.json')
      .query(q => {
        return (
          q.list_id === testListId &&
          q.cursor === '-1'
        )
      })
      .reply(200, testMembers)

    fetchTwitterListMembers._execute({
      userId: 'fred',
      unblock () {}
    }, {
      listId: testListId
    })

    assert.ok(apiMock.isDone())

    const stored = TwitterUsers.find({}, {sort: {_createdAt: 1}}).fetch()
    const expected = testMembers.users

    assert.equal(stored.length, expected.length, 'Gotta catch em all')
    stored.forEach((list, i) => {
      assert.deepEqual(omit(list, ['_id', '_createdAt', '_statusCode']), expected[i])
    })
  })
})
