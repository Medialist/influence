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
    nock.disableNetConnect()
    Meteor.settings = { fullcontact: { apiKey: 'foobar' } }
  })

  // disabled until we have auth...
  it.skip('should require the user to be logged in', function () {
    assert.throws(() => findPerson.run.call({}, {}), /You must be logged in/)
  })

  it('should request a user from fullcontact', function () {
    const apiMock = nock('https://api.fullcontact.com')
      .get('/v2/person.json')
      .query(true)
      .reply(200, testPerson)

    const testEmail = 'olly@medialist.io'
    const person = findPerson._execute({
      userId: 'fred',
      unblock () {}
    }, {email: testEmail})

    assert.ok(apiMock.isDone())
    assert.equal(person._email, testEmail)
    assert.deepEqual(
      omit(person, ['_id', '_email', '_createdAt']),
      testPerson,
      'Person retured from method should match the canned response'
    )

    const storedPerson = Person.findOne({_email: testEmail})

    assert.deepEqual(person, storedPerson, 'Person in db should match person retured from method')
  })

  it('should handle errors from fullcontact', function () {
    const apiMock = nock('https://api.fullcontact.com')
      .get('/v2/person.json')
      .query(true)
      .reply(404, {status: 404, message: 'no such'})

    const testEmail = 'olly@medialist.io'
    const person = findPerson._execute({
      userId: 'fred',
      unblock () {}
    }, {email: testEmail})

    assert.ok(apiMock.isDone())
    assert.equal(person._email, testEmail)
    assert.equal(person.status, 404)

    const storedPerson = Person.findOne({_email: testEmail})
    assert.equal(person.status, storedPerson.status, 'Person in db should match person retured from method')
  })
})
