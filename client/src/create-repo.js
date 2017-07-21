
import React from 'react'
import {withRoute} from 'react-router5'
import {connect} from 'react-redux'

import actions from './actions'
import Button from './button'
import f from './fcomp'

const {div, input, h1} = f

class CreateRepoPageV extends React.Component {
    state = {
        name: '',
        gitUrl: '',
        webUrl: '',
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.name) {
            nextProps.router.navigate(
                'repositoryInfo',
                {name: nextProps.name},
            )
        }
    }

    send = () => {
        const {dispatch} = this.props
        dispatch(actions.requestCreateRepo(this.state))
    }

    get errorMessage() {
        const {error} = this.props
        if (!error) {
            return null
        }

        switch (error.type) {
            case 'badName':
                return 'invalid name, should match ^[a-z0-9-]{1,64}$'

            case 'badGitUrl':
                return 'invalid git url'

            case 'nameAlreadyExists':
                return 'the name is already used by another repository'

            case 'notLoggedIn':
                return 'not logged in'
        }

        return 'Error'
    }

    renderError() {
        return this.errorMessage && div(
            {className: 'error'},
            this.errorMessage,
        )
    }

    keyPressed = event => {
        if (event.key === 'Enter') {
            this.send()
        }
    }

    render() {
        const {loading} = this.props

        return div(
            {className: 'CreateRepoPage'},
            h1('add a repository'),

            input({
                type: 'text',
                placeholder: 'unique name',
                autoFocus: true,
                onKeyPress: this.keyPressed,
                onChange: e => this.setState({name: e.target.value}),
            }),

            input({
                type: 'text',
                placeholder: 'git repository url',
                onKeyPress: this.keyPressed,
                onChange: e => this.setState({gitUrl: e.target.value}),
            }),

            this.renderError(),

            !loading && Button(
                {onClick: this.send},
                'add',
            ),
        )
    }
}

const mapStateToProps = state => ({
    ...state.createRepo,
})

const CreateRepoPage = f(withRoute(connect(mapStateToProps)(CreateRepoPageV)))

export default CreateRepoPage
