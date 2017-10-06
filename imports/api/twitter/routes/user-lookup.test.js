/* global describe it beforeEach */

import { Meteor } from 'meteor/meteor'
import { resetDatabase } from 'meteor/xolvio:cleaner'
import assert from 'assert'
import nock from 'nock'
import omit from 'lodash.omit'
import { TwitterUsers, TwitterApiQueue } from '../collections'

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

  it('should pull up to 100 jobs from the queue and look them up on twitter and post the enriched socials to the callbackUrls', function () {
    const howManyDeployments = 10

    const jobs = (new Array(150)).fill(0).forEach((_, i) => {
      const subdomain = i % howManyDeployments
      const callbackUrl = `https://${subdomain}.medialist.io/foo/bar`
      return {
        status: 'queued',
        endpoint: 'users/lookup',
        callbackUrl: callbackUrl,
        screenName: 'guardian'
      }
    })

    // TODO
  })
})
