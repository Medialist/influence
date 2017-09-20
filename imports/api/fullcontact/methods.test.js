/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import testPerson from './person.test.json'
import { findPerson } from './methods'
import Person from './person'

describe('findPerson', function () {
  beforeEach(function () {
    resetDatabase()
    Meteor.settings = { fullcontact: { apiKey: 'foobar' } }
  })

  it('should require the user to be logged in', function () {
    assert.throws(() => findPerson.run.call({}, {}), /You must be logged in/)
  })

  it('should request a user from fullcontact', function () {
    const apiMock = nock('api.fullcontact.com')
      .get('/v2/person.json')
      .query(true)
      .reply(200, testPerson)

    const email = 'olly@medialist.io'
    const person = findPerson.run.call({
      userId: 'fred',
      unblock () {}
    }, {email})

    assert.ok(apiMock.done())
    assert.equal(person._email, email)
    assert.equal(
      omit(person, ['_id', '_email', '_createdAt']),
      testPerson,
      'Person retured from method should match the canned response'
    )

    const storedPerson = Person.findOne({_email: email})

    assert.equal(person, storedPerson, 'Person in db should match person retured from method')
  })
})
