
import React from 'react'

// I love React, but I hate JSX

const fcomp = component => (...children) => {
    let props = {}

    if (children.length &&
        typeof children[0] === 'object' &&
        !React.isValidElement(children[0])) {
        props = children[0]
        children.shift()
    }

    return React.createElement(component, props, ...children)
}

const htmlTags = `a abbr acronym address applet area article aside
audio b base basefont bdi bdo bgsound big blink blockquote body br
button canvas caption center cite code col colgroup command content
data datalist dd del details dfn dialog dir div dl dt element em embed
fieldset figcaption figure font footer form frame frameset h1 h2 h3 h4
h5 h6 head header hgroup hr html i iframe image img input ins isindex
kbd keygen label legend li link listing main map mark marquee menu
menuitem meta meter multicol nav nobr noembed noframes noscript object
ol optgroup option output p param picture plaintext pre progress q rp
rt rtc ruby s samp script section select shadow slot small source
spacer span strike strong style sub summary sup table tbody td
template textarea tfoot th thead time title tr track tt u ul var video
wbr xmp`.split(' ')

htmlTags.forEach(tag => {
    fcomp[tag] = fcomp(tag)
})

export default fcomp
