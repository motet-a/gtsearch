
import React from 'react'
import {withRoute} from 'react-router5'
import {connect} from 'react-redux'

import actions from './actions'
import f from './fcomp'

class LogoutPageV extends React.Component {
    componentDidMount() {
        setTimeout(() => {
            const {dispatch, router} = this.props
            dispatch(actions.requestLogout())
            router.navigate('root')
        }, 0)
    }

    render = () => null
}

const LogoutPage = f(withRoute(connect()(LogoutPageV)))

export default LogoutPage
