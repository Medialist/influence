import Joi from 'joi-browser'
import difference from 'lodash.difference'
import { Meteor } from 'meteor/meteor'
import { HTTP } from 'meteor/http'
import { JsonRoutes } from 'meteor/simple:json-routes'
import { TwitterUsers, TwitterApiQueue, toSocial } from '../collections'
import * as TwitterApi from '../client'

/*
  Receives batches of social objects for enrichment.

  {
    callbackUrl: 'https://bm.medialist.io',
    socials: [{
      label: 'Twitter',
      value: 'guardian'
    }]
  }
*/
export const handleSocialsLookup = (socials, callbackUrl) => {
  console.log('Handling twitter socials lookup', callbackUrl, socials.length)

  const found = findSocials(socials)

  sendSocials({callbackUrl, socials: found})

  // pick out unknowns.
  const {screenNames, twitterIds} = findMissingSocials(socials, found)

  if (screenNames.length === 0 && twitterIds.length === 0) {
    return
  }

  // We're gonna insert a doc per screenName / twitterId, so batch it up.
  const bulkOp = TwitterApiQueue.rawCollection().initializeUnorderedBulkOp()

  screenNames.forEach(screenName => {
    bulkOp.insert({
      status: 'queued',
      createdAt: new Date(),
      endpoint: 'users/lookup',
      callbackUrl: callbackUrl,
      screenName
    })
  })

  twitterIds.forEach(twitterId => {
    bulkOp.insert({
      status: 'queued',
      createdAt: new Date(),
      endpoint: 'users/lookup',
      callbackUrl: callbackUrl,
      twitterId
    })
  })

  // wrap n go. Inserts the batch of docs in "1" shot.
  Meteor.wrapAsync(bulkOp.execute, bulkOp)()
}

export const sendSocials = ({callbackUrl, socials}) => {
  if (socials.length < 1) return true
  try {
    HTTP.post(callbackUrl, {
      data: { socials }
    })
  } catch (err) {
    // TODO: outbound payloads should be queued and retryed if the recipient fails to respond.
    console.log(`Failed to post socials to ${callbackUrl}`, socials.map(s => s.value))
    return false
  }
  return true
}

const BodySchema = Joi.object().keys({
  callbackUrl: Joi.string().uri({
    scheme: [
      'http',
      'https'
    ]
    // look for https://bm.medialist.io/foo/bar or http://localhost:3000/foo/bar
  }).regex(/(^https:\/\/\w+.medialist.io\/.+|^http:\/\/localhost:\d+\/.+)/, {name: 'Allowed callback urls'}),
  socials: Joi.array().items(
    Joi.object().keys({
      label: Joi.string().alphanum().required(),
      value: Joi.string().alphanum().required()
    }).unknown(true)
  )
})

JsonRoutes.add('post', '/webhook/socials/lookup', function (req, res, next) {
  const {body} = req
  Joi.validate(body, BodySchema)

  // If we get here, all is well. Processing occurs after reply. Data is sent to callback url.
  JsonRoutes.sendResult(res, {code: 200})

  const {socials, callbackUrl} = body

  handleSocialsLookup(socials, callbackUrl)
})

export const updateJobsStatus = (status, jobs) => {
  if (jobs.length === 0) return // nothing to do

  TwitterApiQueue.update({
    _id: {
      $in: jobs.map(j => j._id)
    }
  }, {
    $set: {
      status: status
    }
  }, {
    multi: true
  })
}

/*
 * Find up to 100 jobs and set their status to `processing`
 */
export const grabUserLookupJobs = () => {
  const jobs = TwitterApiQueue.find({
    status: 'queued',
    endpoint: 'users/lookup'
  }, {
    sort: {
      createdAt: 1
    },
    limit: 100
  }).fetch()

  updateJobsStatus('processing', jobs)

  return jobs
}

/*
 * Convert a batch of jobs into a single users/lookup request on twitterApi
 */
export const fetchUsersFromTwitter = (jobs) => {
  const payload = jobs.reduce((payload, job) => {
    // prefer userId
    if (job.twitterId) {
      payload.twitterIds.push(job.twitterId)
    } else {
      payload.screenNames.push(job.screenName)
    }
    return payload
  }, {
    screenNames: [],
    twitterIds: []
  })

  let res = null

  try {
    // 'users/lookup' lookup always returns an array.
    res = TwitterApi.post('users/lookup', {
      screen_name: payload.screenNames.join(','),
      user_id: payload.twitterIds.join(',')
    })

    if (!res || !res.data || !Array.isArray(res.data)) {
      throw new Error('twitter/users/lookup/noData', 'Response from Twitter has no data', res)
    }
  } catch (err) {
    console.error('twitter/users/lookup/apiError', 'Error from twitter', err.error)
    // Toss the jobs back to in the queue
    updateJobsStatus('queued', jobs)
    return []
  }

  return res.data
}

export const updateTwitterUsersCache = (users) => {
  // Update or insert all the new things.
  users.forEach((user) => {
    TwitterUsers.update({
      id_str: user.id_str
    }, {
      _createdAt: new Date(),
      _statusCode: 200,
      _normalisedScreenName: user.screen_name.toLowerCase(),
      ...user
    }, {
      upsert: true
    })
  })
}

export const createCallbackList = (jobs) => {
  // Group jobs by callbackUrl
  // { 'https://bm.medialist.io': [{twitterId: 'xyz'}, {screenName: 'Bob'}] }
  const jobMap = jobs.reduce((jobMap, job) => {
    if (!jobMap[job.callbackUrl]) {
      jobMap[job.callbackUrl] = []
    }
    jobMap[job.callbackUrl].push(job)
    return jobMap
  }, {})

  // [{
  //   callbackUrl: 'https://bm.medialist.io',
  //   socials: [{
  //     label: 'Twitter',
  //     value: 'guardian'
  //   }],
  //   jobs: [{_id: 'xxx', ...}]
  // }]
  const callbackList = Object.keys(jobMap).map(callbackUrl => {
    const jobs = jobMap[callbackUrl]
    return {
      callbackUrl,
      socials: jobs.map(({twitterId, screenName}) => ({
        label: 'Twitter',
        value: screenName,
        twitterId
      })),
      jobs: jobs
    }
  })

  return callbackList
}

/*
 * Grab a batch of individual look up jobs, merge them into a single twitter api
 * request, figure out who asked for what and callback to each requester with
 * arrays of enriched socials for all the profiles we could find.
 */
export const processUserLookupQueue = () => {
  const jobs = grabUserLookupJobs()

  if (jobs.length === 0) return

  const users = fetchUsersFromTwitter(jobs)

  updateTwitterUsersCache(users)

  const callbackList = createCallbackList(jobs)

  // enrich with the new social info and send
  callbackList.forEach(({callbackUrl, socials, jobs}) => {
    // TODO: Should we send explict not found messages?
    // This'll just respond with the subset of socials that could be enriched.
    // Missing ones are ignored.
    const found = findSocials(socials)
    const sent = sendSocials({callbackUrl, socials: found})
    const status = sent ? 'completed' : 'send-failed'
    updateJobsStatus(status, jobs)
  })
}

// Helper to look up enriched social profiles from basic ones
export const findSocials = (socials) => {
  const normalisedScreenNames = socials.filter(s => !s.twitterId).map(s => s.value.toLowerCase())
  const twitterIds = socials.filter(s => !!s.twitterId).map(s => s.twitterId)

  return TwitterUsers.find({
    $or: [{
      _normalisedScreenName: {
        $in: normalisedScreenNames
      }
    }, {
      id_str: {
        $in: twitterIds
      }
    }]
  }).map(toSocial)
}

// Helper to figure out which social profiles were found.
export const findMissingSocials = (wanted, found) => {
  const normalisedScreenNames = wanted.filter(s => !s.twitterId).map(s => s.value.toLowerCase())
  const twitterIds = wanted.filter(s => !!s.twitterId).map(s => s.twitterId)

  // pick out unknowns.
  const missingScreenNames = difference(normalisedScreenNames, found.map(s => s.value.toLowerCase()))
  const missingIds = difference(twitterIds, found.map(s => s.twitterId))
  return {
    screenNames: missingScreenNames || [],
    twitterIds: missingIds || []
  }
}
