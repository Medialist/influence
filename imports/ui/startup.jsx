import { Meteor } from 'meteor/meteor'
import React from 'react'
import { render } from 'react-dom'
import Layout from './layout'

Meteor.startup(() => {
  render(<Layout/>, document.getElementById('react-root'))
})
