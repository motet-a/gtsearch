
import {send as wsSend} from './ws'



const requestLogin = plaintextPassword => dispatch => {
    dispatch({type: 'wsRequestLogin'})
    wsSend({type: 'login', plaintextPassword})
}

const receiveLogin = () => ({
    type: 'wsReceiveLogin',
})

const receiveLoginError = error => ({
    type: 'wsReceiveLoginError',
    error,
})



const requestLogout = () => dispatch => {
    dispatch({type: 'wsRequestLogout'})
    wsSend({type: 'logout'})
}



const requestRepos = () => dispatch => {
    dispatch({type: 'wsRequestRepos'})
    wsSend({type: 'fetchRepos'})
}

const receiveRepos = repos => ({
    type: 'wsReceiveRepos',
    repos,
})



const requestRepo = name => dispatch => {
    dispatch({type: 'wsRequestRepo', name})
    wsSend({type: 'fetchRepo', name})
}

const receiveRepo = repo => ({
    type: 'wsReceiveRepo',
    repo,
})

const receiveRepoNotFound = name => ({
    type: 'wsReceiveRepoNotFound',
    name,
})



const requestCreateRepo = repo => dispatch => {
    dispatch({type: 'wsRequestCreateRepo', repo})
    wsSend({type: 'createRepo', ...repo})
}

const receiveCreateRepo = name => ({
    type: 'wsReceiveCreateRepo',
    name,
})

const receiveCreateRepoError = error => ({
    type: 'wsReceiveCreateRepoError',
    error,
})



const requestDeleteRepo = name => dispatch => {
    dispatch({type: 'wsRequestDeleteRepo', name})
    wsSend({type: 'deleteRepo', name})
}

const receiveDeleteRepo = name => ({
    type: 'wsReceiveDeleteRepo',
    name,
})

const receiveDeleteRepoError = error => ({
    type: 'wsReceiveDeleteRepoError',
    error,
})



const requestPullRepo = name => dispatch => {
    dispatch({type: 'wsRequestPullRepo', name})
    wsSend({type: 'pullRepo', name})
}

const receivePullRepo = name => ({
    type: 'wsReceivePullRepo',
    name,
})

const receivePullRepoError = error => ({
    type: 'wsReceivePullRepoError',
    error,
})



const requestSearch = ({repoName, query}) => dispatch => {
    dispatch({type: 'wsRequestSearch', repoName, query})
    if (query) {
        wsSend({type: 'search', repoName, query})
    } else {
        dispatch(receiveSearchEnd({repoName, query}))
    }
}

const requestSearchLoadMore = () => dispatch =>  {
    wsSend({type: 'searchLoadMore'})
}

const receiveSearchResults = ({repoName, query, results}) => ({
    type: 'wsReceiveSearchResults',
    repoName,
    query,
    results,
})

const receiveSearchEnd = ({repoName, query}) => ({
    type: 'wsReceiveSearchEnd',
    repoName,
    query,
})


const boostrap = () => ({
    type: 'wsConnected',
})


export default {
    requestLogin,
    receiveLogin,
    receiveLoginError,

    requestRepos,
    receiveRepos,

    requestRepo,
    receiveRepo,
    receiveRepoNotFound,

    requestCreateRepo,
    receiveCreateRepo,
    receiveCreateRepoError,

    requestDeleteRepo,
    receiveDeleteRepo,
    receiveDeleteRepoError,

    requestPullRepo,
    receivePullRepo,
    receivePullRepoError,

    requestLogout,

    requestSearch,
    requestSearchLoadMore,
    receiveSearchResults,
    receiveSearchEnd,

    boostrap,
}
