
import React from 'react'
import {withRoute} from 'react-router5'
import {connect} from 'react-redux'

import actions from './actions'
import f from './fcomp'
import Button from './button'

const {div, input, h1} = f

class LoginPageV extends React.Component {
    state = {
        password: '',
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.loggedIn) {
            nextProps.router.navigate('root')
        }
    }

    send = () => {
        const {dispatch} = this.props
        dispatch(actions.requestLogin(this.state.password))
    }

    keyPressed = event => {
        if (event.key === 'Enter') {
            this.send()
        }
    }

    render() {
        const {loading, error} = this.props

        return div(
            {className: 'LoginPage'},

            h1('admin login'),

            input({
                type: 'password',
                placeholder: 'password',
                autoFocus: true,
                onKeyPress: this.keyPressed,
                onChange: e => this.setState({password: e.target.value}),
            }),

            error && error.type === 'badPassword' && div(
                {className: 'error'},
                'invalid password',
            ),

            !loading && Button(
                {onClick: this.send},
                'login',
            ),
        )
    }
}

const mapStateToProps = state => ({
    ...state.admin,
})

const LoginPage = f(withRoute(connect(mapStateToProps)(LoginPageV)))

export default LoginPage
