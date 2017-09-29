import { Meteor } from 'meteor/meteor'
import React from 'react'
import { withTracker } from 'meteor/react-meteor-data'
import { TwitterUsers } from '/imports/api/twitter/collections'
import { CircleAvatar } from '/imports/ui/images/avatar'
import Linkifier from 'react-linkifier'
import { Globe, AddressIcon } from '/imports/ui/images/icons'
import Loading from '/imports/ui/loading'

export const TwitterPage = ({loading, screenName, data, onScreenNameChange, onSubmit}) => {
  return (
    <div className='m4 pt4 pl4'>
      <div className='flex items-center'>
        <div className='flex-none border py2 pr1 border-gray80 bg-white' style={{width: 323}}>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
            <input
              name='twitter-screen-name'
              onChange={(e) => onScreenNameChange(e.currentTarget.value)}
              value={screenName}
              type='search'
              placeholder='Search by twitter @'
              className='flex-auto f-md normal gray20 placeholder-gray60'
              style={{width: '100%', outline: 'none', height: 30, lineHeight: 30, paddingLeft: 15, backgroundColor: 'transparent'}}
            />
          </form>
        </div>
        <div className='flex-auto pl4'>
          {loading && <Loading />}
          {!loading && screenName && !data && (
            <button className='btn bg-blue white' onClick={onSubmit}>Import from twitter</button>
          )}
        </div>
      </div>

      {(data && data._statusCode === 200) ? <TwitterUser {...data} /> : null }
      {(data && data._statusCode === 404) ? <NotFound screenName={screenName} /> : null }
    </div>
  )
}

export const NotFound = ({screenName}) => (
  <div style={{padding: 100}}>
    <div className='f-xxl gray40 center'><code>{screenName}</code> not found</div>
  </div>
)

export const TwitterUser = ({
  name,
  location,
  description,
  entities,
  status,
  screen_name: screenName,
  followers_count: followers,
  friends_count: following,
  profile_image_url_https: image,
  statuses_count: tweets
}) => (
  <div className='flex py6'>
    <div className='flex-none' style={{width: 323}}>
      <div className='flex'>
        <div className='flex-none pr3'>
          <CircleAvatar
            showTooltip
            name={screenName}
            size={80}
            avatar={image.replace('_normal.', '_400x400.')} />
        </div>
        <div className='flex-auto'>
          <div className='f-xxl gray10 semibold'>{name} </div>
          <div className='f-md gray40'>@{screenName}</div>
        </div>
      </div>
      <div className='pt4 flex'>
        <div className='flex-auto'>
          <div className='semibold f-sm'>Tweets</div>
          <div className='semibold f-xl'>{tweets}</div>
        </div>
        <div className='flex-auto'>
          <div className='semibold f-sm'>Follwing</div>
          <div className='semibold f-xl'>{following}</div>
        </div>
        <div className='flex-auto'>
          <div className='semibold f-sm'>Followers</div>
          <div className='semibold f-xl'>{followers}</div>
        </div>
      </div>
      <div className='f-lg gray10 py4' style={{lineHeight: '22px'}}>
        <Linkifier target='_blank' className='blue'>
          {description}
        </Linkifier>
      </div>
      {entities.url && entities.url.urls && entities.url.urls.map((link, i) => (
        <div key={i} className='pb2'>
          <a href={link.expanded_url} target='_blank' className='f-md blue'>
            <Globe className='mr2' /> {link.display_url}
          </a>
        </div>
      ))}
      <div>
        <AddressIcon className='mr2' /> {location}
      </div>
    </div>
    <div className='flex-auto px6'>
      { !status ? (
        <div className='f-xxl gray60 center'>No tweets</div>
      ) : (
        <div className='f-xxl gray40 center pb4'>Recent tweet</div>
      )}
      <Tweet {...status} />
    </div>
    <div className='flex-none' style={{width: 323}}>
      <div>
        <div className='f-xxl gray40 center pb4' />
      </div>
    </div>
  </div>
)

export const Tweet = ({text}) => (
  <article className={`flex rounded px4 py4 shadow-2 bg-white`}>
    <span className='f-lg gray10'>
      <Linkifier target='_blank' className='blue'>
        {text}
      </Linkifier>
    </span>
  </article>
)

export const SocialTag = ({url, typeName, username}) => (
  <a href={url}
    target='_blank'
    className='inline-block bg-gray10 white pointer rounded mr1 mb1 select-none'
    style={{height: 28, lineHeight: 1.5}}>
    <span className='inline-block px2 py1 white semibold f-xxs'>{typeName}</span>
    {username && <span className='inline-block px2 py1 gray40 semibold f-xxs border-gray20 border-left'>{username}</span>}
  </a>
)

export const Social = ({url, typeName, username}) => (
  <div className='pb2' style={{lineHeight: '22px'}}>
    <a className='f-sm gray10' href={url} target='_blank'>
      {typeName}<br />
      <code className='gray40'>{username}</code>
    </a>
  </div>
)

export const Org = ({name, title, startDate}) => (
  <article className={`flex rounded px4 pt3 pb2 mb2 shadow-2 bg-white`}>
    <div className='flex-auto'>
      <div className='flex'>
        <div className='flex-auto'>
          {name ? (
            <span className='f-lg gray10'>{name}</span>
          ) : (
            <span className='f-lg gray60'>(Unknown Organisation)</span>
          )}
          <div className='f-md gray40'>{title}</div>
        </div>
        <div className='flex-none'>
          <span className='f-lg gray40'>{startDate}</span>
        </div>
      </div>
    </div>
  </article>
)

export const SubHeader = ({text}) => (
  <div className='py2 pt4 my4 border-gray80 border-bottom'>
    <span className='m0 f-md normal gray20'>{text}</span>
  </div>
)

const MeteorDataContainer = withTracker(({screenName}) => {
  window.TwitterUsers = TwitterUsers
  const subs = [
    Meteor.subscribe('twitterUsers', {name: screenName})
  ]
  return {
    loading: subs.some(s => !s.ready()),
    data: TwitterUsers.findOne({}, {
      sort: {screen_name: 1}
    })
  }
})(TwitterPage)

class StateContainer extends React.Component {
  state = {
    screenName: ''
  }

  onScreenNameChange = (screenName) => {
    this.setState({screenName})
  }

  onSubmit = () => {
    const {screenName} = this.state
    Meteor.call('fetchTwitterUsers', {screenName}, (err) => {
      if (err) return console.error(err)
    })
  }

  render () {
    return (
      <MeteorDataContainer onScreenNameChange={this.onScreenNameChange} onSubmit={this.onSubmit} {...this.state} />
    )
  }
}

export default StateContainer
