import ReactDOM from 'react-dom'
import {Provider as StoreProvider} from 'react-redux'
import {createRouter} from 'router5'
import listenersPlugin from 'router5/plugins/listeners'
import browserPlugin from 'router5/plugins/browser'
import {RouterProvider, withRoute} from 'react-router5'

import ws from './ws'
import f from './fcomp'
import ReposPage from './repos'
import CreateRepoPage from './create-repo'
import RepoInfoPage from './repo-info'
import SearchPage from './search'
import LoginPage from './login'
import LogoutPage from './logout'
import Header from './header'
import Footer from './footer'
import store from './store'
import routes from './routes'

const {main} = f

const PageSwitch = f(withRoute(
    ({route}) => {
        switch (route.name) {
            case 'root':
                return ReposPage()
            case 'login':
                return LoginPage()
            case 'logout':
                return LogoutPage()
            case 'repositoryInfo':
                return RepoInfoPage()
            case 'repositorySearch':
                return SearchPage()
            case 'createRepository':
                return CreateRepoPage()
        }

        throw new Error('No page for route ' + route.name)
    }
))

const Main = f(({children}) =>
    main(
        Header(),
        children,
        Footer(),
    ),
)

const router = createRouter(
    routes,
    {
        defaultRoute: 'root',
        strictQueryParams: false,
    },
)
router.usePlugin(listenersPlugin())
router.usePlugin(browserPlugin())
router.start()

ReactDOM.render(
    f(StoreProvider)(
        {store},

        f(RouterProvider)(
            {router},

            Main(PageSwitch('hey')),
        ),
    ),

    document.getElementById('react-root'),
)

import './index.scss'
