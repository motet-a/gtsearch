
import React from 'react'
import {connect} from 'react-redux'
import {withRoute} from 'react-router5'

import Button from './button'
import Link from './link'
import actions from './actions'
import constants from './constants'
import f from './fcomp'

const {div, h1, a} = f

export const NotFound = f(({name}) =>
    div(
        {className: 'ErrorPage'},

        h1('oops'),
        div('repository ' + name + ' not found.')
    ),
)

export const getRepoStatus = repo => [
    !repo.cloned && 'not cloned yet',
    repo.beingFetched && 'being fetched',
    repo.fetchFailed && 'last fetch failed',
].filter(v => v).join(', ')

class RepoInfoPageV extends React.Component {
    componentWillMount() {
        const {dispatch, repoName} = this.props
        return dispatch(actions.requestRepo(repoName))
    }

    remove = () => {
        const {dispatch, repoName} = this.props
        return dispatch(actions.requestDeleteRepo(repoName))
    }

    pull = () => {
        const {dispatch, repoName} = this.props
        return dispatch(actions.requestPullRepo(repoName))
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.deleteRepo.name == nextProps.repoName) {
            nextProps.router.navigate('root')
        }
    }

    render() {
        const {repo, deleteRepo, repoName, loggedIn} = this.props

        if (!repo) {
            return null
        }

        if (repo === constants.notFound) {
            return NotFound({name: repoName})
        }

        const status = getRepoStatus(repo)

        return div(
            {className: 'RepoInfoPage'},

            h1(repo.name),

            status && div('status: ' + status),

            a({href: repo.gitUrl}, repo.gitUrl),

            repo.webUrl && a({href: repo.webUrl}, repo.webUrl),

            repo.cloned && Link(
                {
                    routeName: 'repositorySearch',
                    routeParams: {name: repo.name},
                },
                'search',
            ),

            loggedIn && !repo.beingFetched && Button(
                {onClick: this.pull},
                repo.cloned ? 'pull' : 'clone again',
            ),

            loggedIn && !deleteRepo.loading && Button(
                {onClick: this.remove},
                'delete',
            ),
        )
    }
}

const mapStateToProps = (state, {route}) => {
    const {name} = route.params
    const repo = state.repos[name]

    return {
        repoName: name,
        repo,
        loggedIn: state.admin.loggedIn,
        deleteRepo: state.deleteRepo,
    }
}

const RepoInfoPage = f(withRoute(connect(mapStateToProps)(RepoInfoPageV)))

export default RepoInfoPage
