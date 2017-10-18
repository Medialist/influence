/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import { TwitterUsers, TwitterApiQueue } from '../collections'

import testUsers from './user.test.json'

describe('handleSocialsLookup', function () {
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

  it('should push jobs to the api queue for unknown users', function () {
    const callbackUrl = 'https://test.medialist.io/foo/bar'
    const socials = [{
      label: 'Twitter',
      value: 'GUARDIAN'
    }]

    handleSocialsLookup(socials, callbackUrl)

    const jobs = TwitterApiQueue.find({}).fetch()

    assert.equal(jobs.length, 1)

    assert.deepEqual(omit(jobs[0], ['_id', 'createdAt']), {
      status: 'queued',
      endpoint: 'users/lookup',
      callbackUrl: callbackUrl,
      screenName: 'guardian'
    })
  })
})

describe.only('processUserLookupQueue', function () {
  let processUserLookupQueue = null

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
    processUserLookupQueue = require('./user-lookup').processUserLookupQueue
  })

  it('should pull up to 100 jobs from the queue, look them up on twitter and post the enriched socials to the callbackUrls', function () {
    const howManyDeployments = 10
    const howManyTwitterUsers = 150
    const maxTwitterLookups = 100

    // squirt 150 jobs into the queue
    const jobs = Array(howManyTwitterUsers).fill(0).map((_, i) => {
      const subdomain = i % howManyDeployments
      const callbackUrl = `https://test${subdomain}.medialist.io/foo/bar`
      return {
        createdAt: new Date(2017, 10, 3, 12, 0, i),
        status: 'queued',
        endpoint: 'users/lookup',
        callbackUrl: callbackUrl,
        screenName: `example${i}`
      }
    })

    jobs.map(job => ({
      _id: TwitterApiQueue.insert(job),
      ...job
    }))

    const testUser = testUsers[0]
    const twitterUsers = Array(howManyTwitterUsers).fill(0).map((_, i) => ({
      ...testUser,
      id_str: `id${i}`,
      screen_name: `example${i}`,
      name: `Example ${i}`
    }))

    // expect twitter api to be called with 100 screen_names
    const twitterApiMock = nock('https://api.twitter.com')
      .post('/1.1/users/lookup.json', {
        screen_name: Array(maxTwitterLookups).fill(0).map((_, i) => `example${i}`).join(','),
        user_id: ''
      })
      .reply(200, twitterUsers.slice(0, maxTwitterLookups))

    // expect each deploymnet to get 10 socials cos of maths. (maxtwitters / num deps)
    const expected = Array(howManyDeployments).fill(0).map((_, i) => ({
      callbackDomain: `https://test${i}.medialist.io`,
      socials: Array(10).fill(0).map((_, j) => ({
        label: 'Twitter',
        //    deployment 0 gets: 0 10 20 30
        //    deployment 1 gets: 1 11 21 31
        value: `example${i + (j * 10)}`,
        twitterId: `id${i + (j * 10)}`,
        name: `Example ${i + (j * 10)}`,
        profile_image_url_https: 'https://pbs.twimg.com/profile_images/877153924637175809/deHwf3Qu_normal.jpg',
        location: 'London',
        description: 'The need for independent journalism has never been greater. Become a Guardian supporter: http://gu.com/supporter/twitter',
        url: 'https://www.theguardian.com'
      }))
    }))

    const deploymentMocks = expected.map(({callbackDomain, socials}) =>
      nock(callbackDomain)
        .post('/foo/bar', {socials})
        .reply(200)
    )

    processUserLookupQueue()

    assert.ok(twitterApiMock.isDone(), 'We called Twitter')

    deploymentMocks.forEach((mock, i) =>
      assert.ok(mock.isDone(), `We posted back to deployment ${i}`)
    )

    assert.equal(TwitterApiQueue.find({status: 'queued'}).count(), 50, 'We have 50 jobs left in the queue')
    assert.equal(TwitterApiQueue.find({status: 'completed'}).count(), 100, 'We have 100 completed jobs')
  })
})
