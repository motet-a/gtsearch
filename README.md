
# gtsearch

[![Build Status](https://travis-ci.org/motet-a/gtsearch.svg?branch=master)](https://travis-ci.org/motet-a/gtsearch)

This is a web server and web client for GNU grep and Git
repositories. It is a kind of a much simpler [Hound] or [Livegrep],
which does not require to index files.

[Here](http://gtsearch.3.141.ovh/) is a running demo instance.

![demo-gif-image](demo.gif?raw=true)

# Is it slow?

Yes and no. `grep` on Linux is blazing fast on small
repositories. Moreover, the `gtsearch` server streams results via
WebSockets to the client in order to show the first matches instantly.

`gtsearch` starts one `grep` process per search. When some results
don't fit on the client screen, the `grep` process is paused with
`kill(SIGTSTP)`. When the user scrolls down the result list, the
server resumes the `grep` process with `kill(SIGCONT)`. When the user
starts a new search, the previous `grep` process is killed with
`kill(SIGTERM)`. It’s a bit tricky but it works.

However, `grep` is much slower with specific queries on very large
repositories. Consider using [Hound] or [Livegrep] instead.

# Regexps?

Currently no, but it’s really easy to implement since `grep` supports
them. Please send PRs.

# Deploy

```sh
docker run -d -p 8080:8080 -e GTSEARCH_ADDRESS=0.0.0.0 moteta/gtsearch:0.6
```

It listens on `localhost` by default.

Repositories and SQLite files are stored at `/gs/server/var/` in the 
container. Feel free to create a volume.

That’s it.

[Hound]: https://github.com/etsy/hound
[livegrep]: https://github.com/livegrep/livegrep
