
import throttle from 'lodash/throttle'
import React from 'react'
import {connect} from 'react-redux'
import {withRoute} from 'react-router5'
import Waypoint from 'react-waypoint'

import Link from './link'
import actions from './actions'
import constants from './constants'
import { NotFound } from './repo-info'
import f from './fcomp'

const {div, input, span, code, strong, a} = f

const getGitHubRepoName = gitUrl => {
    const prefix = 'https://github.com/'

    if (gitUrl.startsWith(prefix) &&
        gitUrl.endsWith('.git')) {
        return gitUrl.slice(prefix.length, gitUrl.length - 4)
    }

    return null
}

const mapMatches = (line, query, func, i = 0) => {
    const matchIndex = line.toLowerCase().indexOf(query.toLowerCase())
    if (!query || matchIndex === -1) {
        return line
    }

    const before = line.slice(0, matchIndex)
    const match = line.slice(matchIndex, matchIndex + query.length)
    const after = line.slice(matchIndex + query.length)
    return [
        before,
        func(match, i),
        ...mapMatches(after, query, func, i + 1),
    ]
}

const MatchingLine = ({line, query}) =>
    code(
        {title: line},
        mapMatches(line, query, (s, i) => strong({key: i}, s)),
    )

// navigate: A function called with 'up' or 'down' when ArrowUp or
// ArrowDown is pressed while the result link is focused.
const Result = f(({result, query, navigate}) =>
    a(
        {
            className: 'Result',
            href: result.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            onKeyDown(event) {
                if (event.key === 'ArrowUp') {
                    navigate(event, 'up')
                }
                if (event.key === 'ArrowDown') {
                    navigate(event, 'down')
                }
            },
        },

        span(
            {
                className: 'file',
                title: result.filePath,
            },
            result.filePath,
        ),

        span(
            {className: 'line'},
            result.lineNumber,
        ),

        MatchingLine(
            {
                line: result.line.trim(),
                query,
            },
        ),
    ),
)

class ResultListV extends React.Component {
    ref = null

    getResultDomElementByIndex(index) {
        const {results} = this.props

        if (!this.ref || !results[index]) {
            return null
        }

        const {children} = this.ref
        return children[index]
    }

    // Return true if an element has been focused.
    focusResultByIndex(index) {
        const e = this.getResultDomElementByIndex(index)
        if (e) {
            e.focus()
            return true
        }
    }

    onResultNavigation = (event, resultIndex, direction) => {
        event.preventDefault()

        if (resultIndex === 0 && direction === 'up') {
            this.props.focusTextInput()
        }

        const inc = direction === 'up' ? -1 : 1
        this.focusResultByIndex(resultIndex + inc)
    }

    renderResult = (result, index) => {
        const {query} = this.props

        return Result({
            key: index,
            result,
            query,
            navigate: (event, direction) => {
                this.onResultNavigation(event, index, direction)
            },
        })
    }

    render() {
        const {results, resultHash, loadMore} = this.props

        const resultElements = results.map(this.renderResult)

        const waypoint = f(Waypoint)({
            key: 'waypoint' + resultHash,
            onEnter: loadMore,
        })

        return div(
            {
                className: 'ResultList',
                ref: e => this.ref = e,
            },
            resultElements.concat([waypoint])
        )
    }
}

const ResultList = f(ResultListV)

class SearchPageV extends React.Component {
    componentWillMount() {
        const {dispatch, repoName} = this.props
        return dispatch(actions.requestRepo(repoName))
    }

    search = throttle(query => {
        const {dispatch, repoName} = this.props
        return dispatch(actions.requestSearch({repoName, query}))
    }, 200)

    onInputChange = event => {
        const query = event.target.value.trim()
        const {search} = this.props
        if (search && search.query === query) {
            return
        }
        this.search(query)
    }

    loadMore = () => {
        const {dispatch, search} = this.props
        if (search && search.loading) {
            setTimeout(() => {
                return dispatch(actions.requestSearchLoadMore())
            }, 0)
        }
    }

    get results() {
        const {repo, search} = this.props
        if (!search) {
            return []
        }

        const results = search.previousResults || search.results || []
        const gitHubName = getGitHubRepoName(repo.gitUrl)
        if (!gitHubName) {
            return results
        }

        results.forEach(result => {
            result.href = 'https://github.com/' +
                          gitHubName +
                          '/blob/master/' +
                          result.filePath +
                          '#L' + result.lineNumber
        })

        return results
    }

    renderStatus() {
        const {search} = this.props

        return (!search || !search.query) ? 'nothing to search' :
               search.loading ? 'loading...' :
               !search.results.length ? 'nothing found' :
               'that’s it.'
    }

    get resultHash() {
        const {search} = this.props
        if (!search) {
            return ''
        }

        const results = search.results || []

        return search.loading + results.length + search.query
    }

    onKeyDown = event => {
        const KeysToTransfer = [
            'PageDown', 'PageUp',
        ]

        const mustBeTransferred =
            KeysToTransfer.indexOf(event.key) !== -1

        if (mustBeTransferred) {
            // The whole page must scroll. Transfer the event to
            // the root element.
            const {nativeEvent} = event
            const newEvent = new nativeEvent.constructor(
                nativeEvent.type, nativeEvent,
            )
            document.dispatchEvent(newEvent)
        }
    }

    focusTextInput = () => {
        if (this.inputRef) {
            this.inputRef.focus()
        }
    }

    render() {
        const {repo, repoName, search} = this.props

        if (!repo) {
            return null
        }

        if (repo === constants.notFound) {
            return NotFound({name: repoName})
        }

        return div(
            {className: 'SearchPage'},

            div('search in ', Link(
                {
                    routeName: 'repositoryInfo',
                    routeParams: {name: repo.name},
                },
                repo.name,
            )),

            div(
                {className: 'SearchPage__inputWrapper'},
                input({
                    type: 'text',
                    placeholder: 'query',
                    onChange: this.onInputChange,
                    onKeyDown: this.onKeyDown,
                    autoFocus: true,
                    ref: input => this.inputRef = input,
                }),
            ),

            ResultList({
                results: this.results,
                resultHash: this.resultHash,
                query: search ? search.query : '',
                loadMore: this.loadMore,
                focusTextInput: this.focusTextInput,
            }),

            span(
                {className: 'searchStatus'},
                this.renderStatus(),
            ),
        )
    }
}

const mapStateToProps = (state, {route}) => {
    const {name} = route.params
    const repo = state.repos[name]
    const search = (state.search && state.search.repo === name) ?
                   state.search : null

    return {
        repoName: name,
        repo,
        search,
    }
}

const SearchPage = f(withRoute(connect(mapStateToProps)(SearchPageV)))

export default SearchPage
