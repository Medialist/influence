import React from 'react'
import { SquareAvatar, CircleAvatar } from '/imports/ui/images/avatar'
import { findPerson } from '/imports/api/fullcontact/methods'

export const Lookup = ({loading, email, person, onEmailChange, onSubmit}) => {
  return (
    <div className='m4 pt4 pl4'>
      <div className='flex items-center'>
        <div className='flex-none border py2 pr1 border-gray80 bg-white' style={{width: 323}}>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
            <input
              name='fullcontact-email'
              onChange={(e) => onEmailChange(e.currentTarget.value)}
              value={email}
              type='search'
              placeholder='Search by email'
              className='flex-auto f-md normal gray20 placeholder-gray60'
              style={{width: '100%', outline: 'none', height: 30, lineHeight: 30, paddingLeft: 15, backgroundColor: 'transparent'}}
            />
          </form>
        </div>
        <div className='flex-auto'>
          {(person && person.likelihood) ? (
            <div className='pl6 f-lg gray40 monospace'>FullContact likelihood score: <code>{person.likelihood}</code></div>
          ) : null}
        </div>
      </div>
      {(person && person.status === 200) ? <Person {...person} /> : null }
      {(person && person.status === 404) ? <PersonNotFound {...person} /> : null }
    </div>
  )
}

export const PersonNotFound = ({_email}) => (
  <div style={{padding: 100}}>
    <div className='f-xxl gray40 center'>Person not found</div>
  </div>
)

export const Person = ({organizations = [], contactInfo, photos = [], demographics, socialProfiles}) => (
  <div className='flex py6'>
    <div className='flex-none' style={{width: 323}}>
      <div className='flex'>
        <div className='flex-none pr2'>
          {photos.filter(p => p.isPrimary).map(photo => (
            <CircleAvatar showTooltip name={photo.typeName} size={80} avatar={photo.url} key={photo.url} />
          ))}
        </div>
        <div className='flex-auto'>
          <div className='f-xxl gray10'>{contactInfo.fullName}</div>
          <div className='f-lg gray40 pt1'>{demographics.locationGeneral}</div>
          <div className='f-lg gray40'>{demographics.gender} aged {demographics.ageRange}</div>
        </div>
      </div>
      <div >
        {socialProfiles.filter(p => !!p.bio).map(p => (
          <p className='f-sm gray10' style={{lineHeight: '22px'}} key={p.typeId}>
            {p.bio}
            <a className='f-sm gray60 italic ml2' href={p.url} target='_blank'>{p.typeName}</a>
          </p>
        ))}
      </div>
      { photos.length > 0 && (
        <div>
          <SubHeader text='Photos' />
          {photos.filter(p => !p.isPrimary).map(photo => (
            <SquareAvatar className='mr1' showTooltip name={photo.typeName} size={55} avatar={photo.url} />
          ))}
        </div>
      )}
    </div>
    <div className='flex-auto px6'>
      { organizations.length === 0 ? (
        <div className='f-xxl gray60 center'>No known organisations</div>
      ) : (
        <div className='f-xxl gray40 center pb4'>Organisations</div>
      )}
      { organizations.map((org) => (
        <Org {...org} />
      ))}
    </div>
    <div className='flex-none' style={{width: 323}}>
      <div>
        <div className='f-xxl gray40 center pb4'>Socials</div>
        {socialProfiles.map(p => (
          <div className='pb2' style={{lineHeight: '22px'}} key={p.typeId}>
            <a className='f-sm gray10' href={p.url} target='_blank'>
              {p.typeName}<br />
              <code className='gray40'>{p.username}</code>
            </a>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const Org = ({name, title, startDate}) => (
  <article className={`flex rounded px4 pt3 pb2 mb2 shadow-2 bg-white`} key={name + title}>
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

class LookupStateContainer extends React.Component {
  state = {
    loading: false,
    email: 'olly@medialist.io',
    person: null
  }

  onEmailChange = (email) => {
    this.setState({email})
  }

  onSubmit = () => {
    const {email} = this.state
    findPerson.call({email}, (err, person) => {
      if (err) return console.error(err)
      console.log(person)
      this.setState({person})
    })
  }

  render () {
    return (
      <Lookup onEmailChange={this.onEmailChange} onSubmit={this.onSubmit} {...this.state} />
    )
  }
}

export default LookupStateContainer
