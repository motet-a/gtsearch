
import classnames from 'classnames'

import f from './fcomp'
const {div} = f

const Button = f(props =>
    div({
        ...props,
        className: classnames('Button', props.className),
    }),
)

export default Button
