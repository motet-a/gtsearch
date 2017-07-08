
import f from './fcomp'
import Link from './link'

const {a, footer} = f

const Footer = f(() =>
    footer(
        a(
            {href: 'https://github.com/motet-a/gtsearch'},
            'about',
        ),

        Link(
            {routeName: 'login'},
            'admin',
        ),

        a(
            {
                href: 'https://www.gnu.org/software/emacs/',
                className: 'vimShit',
            },
            ':wq',
        ),
    ),
)

export default Footer
