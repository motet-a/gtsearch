
import f from './fcomp'
import Link from './link'

const {a, footer} = f

const Footer = f(() =>
    footer(
        a(
            {
                href: 'https://github.com/motet-a/gtsearch',
                className: 'Button Button--subtle',
            },
            'github',
        ),

        Link(
            {
                routeName: 'login',
                className: 'Button Button--subtle',
            },
            'admin',
        ),

        a(
            {
                href: 'https://www.gnu.org/software/emacs/',
                className: 'vimShit Button Button--subtle',
            },
            ':wq',
        ),
    ),
)

export default Footer
