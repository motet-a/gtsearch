
import {connect} from 'react-redux'

import Link from './link'
import f from './fcomp'

const {header, div} = f

const HeaderV = ({loggedIn}) =>
    header(
        Link(
            {
                routeName: 'root',
                className: 'Button Button--subtle',
            },
            'gtsearch',
        ),

        loggedIn && Link(
            {
                routeName: 'logout',
                className: 'logout',
            },
            'logout',
        ),
    )


const mapStateToProps = state => ({
    loggedIn: state.admin.loggedIn,
})

const Header = f(connect(mapStateToProps)(HeaderV))

export default Header
