import React from 'react'
import {
  BrowserRouter as Router,
  NavLink,
  Route
} from 'react-router-dom'
import { Logo } from '/imports/ui/images/icons'
import Lookup from '/imports/ui/lookup/lookup'
import TwitterPage from '/imports/ui/twitter/twitter-page'

const linkStyle = { padding: '19px 25px 20px', display: 'inline-block' }

const Layout = () => (
  <Router>
    <div>
      <div className='bg-gray10'>
        <NavLink exact to='/' style={{ padding: '19px 28px 18px 26px', display: 'inline-block' }} className='white f5 semibold xs-hide align-top' >
          <Logo />
        </NavLink>
        <nav style={{display: 'inline-block'}}>
          <NavLink exact to='/' style={linkStyle} className='white f-sm semibold opacity-30 hover-opacity-50 active-opacity-100' activeClassName='active bg-black'>
            FullContact
          </NavLink>
          <NavLink to='/twitter' style={linkStyle} className='white f-sm semibold opacity-30 hover-opacity-50 active-opacity-100' activeClassName='active bg-black'>
            Twitter
          </NavLink>
        </nav>
      </div>
      <Route path='/' exact component={Lookup} />
      <Route path='/twitter' component={TwitterPage} />
    </div>
  </Router>
)

export default Layout
