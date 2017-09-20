import React from 'react'
import {
  BrowserRouter as Router,
  NavLink
} from 'react-router-dom'
import { Logo } from '/imports/ui/images/icons'

const Layout = () => (
  <Router>
    <div className='bg-gray10'>
      <NavLink exact to='/' style={{ padding: '19px 28px 18px 26px', display: 'inline-block' }} className='white f5 semibold xs-hide align-top' >
        <Logo />
      </NavLink>
    </div>
  </Router>
)

export default Layout
