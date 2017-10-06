/* global describe it */

import assert from 'assert'
import testUser from './methods/user.test.json'
import { toSocial } from './collections'

describe('toSocial', function () {
  // disabled until we have auth...
  it('should return a medialist friendly social object from a twitter user doc', function () {
    assert.deepEqual(toSocial(testUser[0]), {
      label: 'Twitter',
      value: 'guardian',
      twitterId: '87818409',
      name: 'The Guardian',
      profile_image_url_https: 'https://pbs.twimg.com/profile_images/877153924637175809/deHwf3Qu_normal.jpg',
      location: 'London',
      description: 'The need for independent journalism has never been greater. Become a Guardian supporter: http://gu.com/supporter/twitter',
      url: 'https://www.theguardian.com'
    })
  })
})
