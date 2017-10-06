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
  const found = findSocials(socials)

  // console.log('socials', JSON.stringify(found, null, 2))

  // send cached results
  HTTP.post(callbackUrl, {
    data: {
      socials: found
    }
  })

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
      label: Joi.string().alphanum(),
      value: Joi.string().alphanum()
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

export const processUserLookupQueue = () => {
  const jobs = TwitterApiQueue.find({
    status: 'queued',
    endpoint: 'users/lookup'
  }, {
    sort: {
      createdAt: 1
    },
    limit: 100
  }).fetch()

  if (jobs.length === 0) {
    // Nothing to do.
    return
  }

  TwitterApiQueue.update({
    _id: {
      $in: jobs.map(j => j._id)
    }
  }, {
    $set: {
      status: 'processing'
    }
  }, {
    multi: true
  })

  const payload = {
    screen_name: jobs.filter(j => !!j.screenName).map(j => j.twitterId).join(','),
    user_id: jobs.filter(j => !!j.twitterId).map(j => j.twitterId).join(',')
  }

  let res = null

  try {
    // 'users/lookup' lookup always returns an array.
    res = TwitterApi.post('users/lookup', payload)
  } catch (err) {
    console.error('twitter/users/lookup/apiError', 'Error from twitter', err.error)
  }

  if (!res || !res.data || !Array.isArray(res.data)) {
    console.error('twitter/users/lookup/noData', 'Response from Twitter has no data', res)
  } else {
    // Update or insert all the new things.
    res.data.forEach((user) => {
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

    // Group jobs by callbackUrl
    // { 'https://bm.medialist.io': [{twitterId: 'xyz'}, {screenName: 'Bob'}] }
    const jobMap = jobs.reduce((callbackMap, job) => {
      const jobList = callbackMap[job.callbackUrl] || []
      callbackMap[job.callbackUrl] = jobList.push(job)
      return callbackMap
    }, {})

    // [{
    //   callbackUrl: 'https://bm.medialist.io',
    //   socials: [{
    //     label: 'Twitter',
    //     value: 'guardian'
    //   }]
    // }]
    const callbackList = Object.keys(jobMap).map(callbackUrl => {
      const jobs = jobMap[callbackUrl]
      return {
        callbackUrl,
        socials: jobs.map(({twitterId, screenName}) => ({
          label: 'Twitter',
          value: screenName,
          twitterId
        }))
      }
    })

    // enrich with the new social info and send
    callbackList.forEach(obj => {
      const found = findSocials(obj.socials)
      // TODO: outbound payloads should be queued and retryed if the recipient fails to respond.
      HTTP.post(obj.callbackUrl, {
        data: {
          socials: found
        }
      })
      // TODO: Should we send explict not found messages?
    })

    // Jobs dun. Remove them.
    TwitterApiQueue.remove({
      _id: {
        $in: jobs.map(j => j._id)
      }
    })
  }
}

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
