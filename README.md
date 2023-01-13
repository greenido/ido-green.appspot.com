# 🏄🏽‍♀️ [ido-green.appspot.com](https://Ido-green.appspot.com)

My projects, demos and other fun stuff

## Tech Stack 🏔️
- Jest for *smoke tests* -- Check the automation with each push at: https://github.com/greenido/ido-green.appspot.com/actions
- Bootstrap
- [Font-Awesome](http://fortawesome.github.io/Font-Awesome/icons/#web-application)
- https://fontawesome.com/v4.7.0/icons/ -- http://fontawesome.io/icons/

## Bugs and Issues 🚨

Have a bug or an issue with this theme? [Open a new issue](https://github.com/greenido/ido-green.appspot.com/issues) here on GitHub.

## ToDos 🐅

- Fetch an RSS feed from the [blog](https://greenido.wordpress.com)
- 'Playroom' to the examples from [RoadShow page](ido-green.appspot.com/RoadShow.html)
- ServiceWorker - Use it to improve performance and to control the fetching of new / fresh content (e.g. blogs posts)

## Misc 👌🏼

```
 gcloud app deploy app.yaml --project theProjectID

 npm run --prefix tests/ test
```

Find the number of files in all the directories (under the current one)
```
 du -a | cut -d/ -f2 | sort | uniq -c | sort -nr
```