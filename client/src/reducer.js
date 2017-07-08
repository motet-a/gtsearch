
import { combineReducers } from 'redux'

import constants from './constants'

const repos = (state = Object.create(null), action) => {
    switch (action.type) {
        case 'wsReceiveRepos': {
            let newRepos = Object.create(null)
            action.repos.forEach(r => newRepos[r.name] = r)
            return {
                ...state,
                ...newRepos,
            }
        }

        case 'wsReceiveRepo':
            return {
                ...state,
                [action.repo.name]: action.repo,
            }

        case 'wsReceiveRepoNotFound':
            return {
                ...state,
                [action.name]: constants.notFound,
            }

        case 'wsReceiveDeleteRepo': {
            const newState = {...state}
            delete newState[action.name]
            return newState
        }

    }

    return state
}

const search = (state = null, action) => {
    switch (action.type) {
        case 'wsRequestSearch':
            return {
                repo: action.repoName,
                query: action.query,
                previousResults: state ? state.results : null,
                results: null,
                loading: true,
            }

        case 'wsReceiveSearchResults':
            if (!state ||
                state.repo !== action.repoName ||
                state.query !== action.query) {
                return state
            }

            return {
                ...state,
                previousResults: null,
                results: (state.results || []).concat(action.results)
            }

        case 'wsReceiveSearchEnd':
            if (!state ||
                state.repo !== action.repoName ||
                state.query !== action.query) {
                return state
            }

            return {
                ...state,
                previousResults: null,
                results: state.results || [],
                loading: false,
            }
    }
    return state
}

const admin = (state = {}, action) => {
    switch (action.type) {
        case 'wsReceiveLogin':
            return {
                loggedIn: true,
            }

        case 'wsReceiveLoginError':
            return {
                error: action.error,
            }

        case 'wsRequestLogin':
            return {
                ...state,
                loading: true,
            }

        case 'wsRequestLogout':
            return {}
    }

    return state
}

const createRepo = (state = {}, action) => {
    switch (action.type) {
        case 'wsRequestCreateRepo':
            return {loading: true}

        case 'wsReceiveCreateRepo':
            return {name: action.name}

        case 'wsReceiveCreateRepoError':
            return {error: action.error}
    }

    return state
}

const deleteRepo = (state = {}, action) => {
    switch (action.type) {
        case 'wsRequestDeleteRepo':
            return {loading: true}

        case 'wsReceiveDeleteRepo':
            return {name: action.name}

        case 'wsReceiveDeleteRepoError':
            return {error: action.error}
    }

    return state
}

const ws = (state = {connected: false}, action) => {
    switch (action.type) {
        case 'wsConnected':
            return {connected: true}
    }

    return state
}

export default combineReducers({
    repos,
    search,
    admin,
    createRepo,
    deleteRepo,
    ws,
})
