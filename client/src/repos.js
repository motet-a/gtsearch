
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
                'RepoLink Button Button--subtle',
                !repo.cloned && 'RepoLink--notCloned',
                repo.pullFailed && 'RepoLink--pullFailed',
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

const AdminPassword = f(() =>
    f.abbr(
        {
            title: 'look at the logs, it is written on stdout',
        },
        'administration password',
    )
)

const NoRepos = f(({loggedIn}) =>
    div(
        {className: 'NoRepos'},

        !loggedIn && f.p('there is no repository yet.'),

        loggedIn ? f.p(
            '↓ use your superpowers ↓'
        ) : f.p(
            'but if you know the ', AdminPassword(),
            ', you can use your superpowers.',
        ),
    )
)

class ReposPageV extends React.Component {
    componentWillMount() {
        return this.props.dispatch(actions.requestRepos())
    }

    render() {
        const {repos, loggedIn, receivingRepos} = this.props

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

        const noRepos =
            !receivingRepos &&
            !clonedRepos.length &&
            !notClonedRepos.length

        return div(
            {className: 'ReposPage'},

            h1('repositories'),

            sortAndRender(clonedRepos),
            sortAndRender(notClonedRepos),

            noRepos && NoRepos({loggedIn}),

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
        receivingRepos: state.receivingRepos,
    }
}

const ReposPage = f(connect(mapStateToProps)(ReposPageV))

export default ReposPage
