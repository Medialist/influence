import React from 'react'
import { findPerson } from '/imports/api/fullcontact/methods'

export const Lookup = ({loading, email, person, onEmailChange, onSubmit}) => {
  return (
    <div className='m4 py4 pl4'>
      <div className='border py2 pr1 border-gray80 bg-white' style={{width: 323}}>
        <form onSubmit={onSubmit}>
          <input
            onChange={onEmailChange}
            value={email}
            type='search'
            placeholder='Search by email'
            className='flex-auto f-md normal gray20 placeholder-gray60'
            style={{outline: 'none', height: 30, lineHeight: 30, paddingLeft: 15, backgroundColor: 'transparent'}}
          />
        </form>
      </div>
      {person && <Person {...person} />}
    </div>
  )
}

export const Person = ({organizations, contactInfo}) => (
  <div class='flex'>
    <div className='flex-none' style={{width: 323}}>
      <div>
        <span className='f-xl gray-90'>{contactInfo.fullName}</span>
      </div>
    </div>
    <div className='flex-auto px2'>
      { organizations.map((org) => (
        <article className={`flex rounded px4 pt3 pb2 mb2 shadow-2`}>
          <div className='flex-auto'>
            <div className='flex'>
              <div className='flex-auto'>
                <span className='f-lg gray-90'>{org.name}</span>
              </div>
              <div className='flex-none'>
                <span className='f-lg gray-60'>{org.statDate}</span>
              </div>
              <div className='f-md gray-60'>{org.title}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
)

class LookupStateContainer extends React.Component {
  state = {
    loading: false,
    email: '',
    person: null
  }

  onEmailChange = (email) => {
    this.setState({email})
  }

  onSubmit = () => {
    const {email} = this.state
    findPerson.call({email}, (err, person) => {
      if (err) return console.error(err)
      this.setState({person})
    })
  }

  render () {
    <Lookup onEmailChange={onEmailChange} onSubmit={this.onSubmit} {...state} />
  }
}

export default LookupStateContainer
