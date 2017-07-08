
import React from 'react'
import {connect} from 'react-redux'
import classnames from 'classnames'

import constants from './constants'
import actions from './actions'
import f from './fcomp'
import Link from './link'
import {getRepoStatus} from './repo-info'

const {div, h1, strong} = f

const RepoLink = f(({repo}) =>
    Link(
        {
            className: classnames(
                'RepoLink',
                !repo.cloned && 'RepoLink--notCloned',
                repo.fetchFailed && 'RepoLink--fetchFailed',
            ),
            routeName: repo.cloned ? 'repositorySearch' : 'repositoryInfo',
            routeParams: {name: repo.name},
        },

        strong(repo.name),

        getRepoStatus(repo) && ' (' + getRepoStatus(repo) + ')',
    )
)

const sort = (list, compareFunc) => {
    list = list.slice()
    list.sort((a, b) => compareFunc(a, b) ? 1 : 0)
    return list
}

class ReposPageV extends React.Component {
    componentWillMount() {
        return this.props.dispatch(actions.requestRepos())
    }

    render() {
        const {repos, loggedIn} = this.props

        const clonedRepos = Object
            .values(repos)
            .filter(r => r != constants.notFound && r.cloned)

        const notClonedRepos = Object
            .values(repos)
            .filter(r => r != constants.notFound && !r.cloned)

        const renderRepo = repo =>
            RepoLink({repo, key: repo.name})

        const sortByName = repos =>
            sort(repos, (a, b) => a < b)

        const sortAndRender = repoList =>
            sortByName(repoList).map(renderRepo)

        return div(
            {className: 'ReposPage'},

            h1('repositories'),

            sortAndRender(clonedRepos),
            sortAndRender(notClonedRepos),

            loggedIn && Link(
                {routeName: 'createRepository'},
                'add a repository',
            ),
        )
    }
}

const mapStateToProps = state => {
    return {
        loggedIn: state.admin.loggedIn,
        repos: state.repos,
    }
}

const ReposPage = f(connect(mapStateToProps)(ReposPageV))

export default ReposPage
