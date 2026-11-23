/**
 * The hidden terminal.
 *
 * Opened with the backtick key (or by typing "terminal" into the project
 * search, the path that works on a phone). Like the Everesting game it is
 * fetched only when someone finds it, carries its own <style>, and has no
 * dependencies. Everything it prints comes from the page itself or from
 * data/projects.json, so it can never disagree with what the site shows.
 *
 * All output is built with text nodes and <a> elements - never innerHTML -
 * so nothing read from the page or the JSON can inject markup.
 */
(function () {
  'use strict';

  var PROMPT = 'guest@ido-green:~$';
  var HISTORY_KEY = 'terminal-history';

  var CSS = [
    '#site-terminal{position:fixed;inset:0 0 auto 0;margin:0;width:100vw;max-width:100vw;height:62vh;max-height:none;padding:0;border:0;border-bottom:1px solid #1f3b2c;background:rgba(6,10,9,.96);color:#c6f6d5;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:0 18px 60px rgba(0,0,0,.55);overflow:hidden;animation:term-in .18s ease-out}',
    '#site-terminal[open]{display:flex;flex-direction:column}',
    '#site-terminal::backdrop{background:rgba(3,5,12,.45)}',
    '@keyframes term-in{from{transform:translateY(-100%)}}',
    '@media (prefers-reduced-motion:reduce){#site-terminal{animation:none}}',
    '@media (max-width:640px){#site-terminal{height:100dvh;font-size:13px}}',
    '#site-terminal .term-bar{display:flex;align-items:center;gap:12px;padding:8px 12px 8px 16px;border-bottom:1px solid #1f3b2c;color:#7fb99a;font-size:12px}',
    '#site-terminal .term-bar span{flex:1}',
    '#site-terminal .term-close{width:30px;height:30px;border:0;border-radius:50%;background:none;color:#7fb99a;font:20px/1 system-ui;cursor:pointer}',
    '#site-terminal .term-close:hover,#site-terminal .term-close:focus-visible{background:#12211a;color:#e6fff0;outline:none}',
    '#site-terminal .term-out{flex:1;overflow-y:auto;padding:12px 16px 4px;white-space:pre-wrap;overflow-wrap:anywhere}',
    '#site-terminal .term-line{margin:0}',
    '#site-terminal .term-cmd{color:#e6fff0}',
    '#site-terminal .term-muted{color:#6b8f7c}',
    '#site-terminal .term-err{color:#fca5a5}',
    '#site-terminal .term-egg{color:#fde68a}',
    '#site-terminal a{color:#67e8f9}',
    '#site-terminal form{display:flex;gap:8px;align-items:center;padding:6px 16px 14px}',
    '#site-terminal .term-prompt{color:#4ade80;white-space:nowrap}',
    '#site-terminal input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#e6fff0;font:inherit;caret-color:#4ade80}'
  ].join('');

  var dialog = null;
  var out = null;
  var input = null;
  var returnFocus = null;
  var projects = null;          // loaded lazily from data/projects.json
  var history = [];
  var historyIndex = 0;

  /* ---------------------------------------------------------------- output */

  // Each part is a string, or {text, href} for a link, or {text, cls}.
  function print(parts, cls) {
    var line = document.createElement('p');
    line.className = 'term-line' + (cls ? ' ' + cls : '');
    (Array.isArray(parts) ? parts : [parts]).forEach(function (part) {
      if (typeof part === 'string') {
        line.appendChild(document.createTextNode(part));
      } else if (part.href) {
        var a = document.createElement('a');
        a.href = part.href;
        if (/^https?:/.test(part.href)) { a.target = '_blank'; a.rel = 'noopener'; }
        a.textContent = part.text;
        line.appendChild(a);
      } else {
        var span = document.createElement('span');
        span.className = part.cls || '';
        span.textContent = part.text;
        line.appendChild(span);
      }
    });
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  function eggs() {
    return window.siteEggs || { found: function () { return []; }, total: 0, mark: function () { return false; } };
  }

  function eggLine() {
    var e = eggs();
    return '🥚 ' + e.found().length + '/' + e.total + ' eggs found';
  }

  function findEgg(id) {
    if (eggs().mark(id)) print('🥚 You found an egg! ' + eggLine().slice(3) + '. Type `eggs` to see them.', 'term-egg');
  }

  /* ------------------------------------------------------------------ data */

  function loadProjects() {
    if (projects) return Promise.resolve(projects);
    return fetch('/data/projects.json')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
      .then(function (d) { projects = d; return d; });
  }

  function textOf(root, sel) {
    var el = root.querySelector(sel);
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function closeThen(fn) {
    dialog.close();
    // Let the dialog finish closing (and focus return) before acting.
    setTimeout(fn, 0);
  }

  /* -------------------------------------------------------------- commands */

  var CAT_TARGETS = ['career', 'now', 'shipped', 'about'];

  var COMMANDS = {
    help: {
      about: 'list commands',
      run: function () {
        Object.keys(COMMANDS).forEach(function (name) {
          var c = COMMANDS[name];
          if (c.hidden) return;
          print([{ text: (name + (c.args ? ' ' + c.args : '')).padEnd(18), cls: 'term-cmd' }, c.about]);
        });
        print('Tab completes, ↑/↓ walks history, Esc closes. Some commands are not listed.', 'term-muted');
      }
    },
    ls: {
      args: '[projects]',
      about: 'list things to look at',
      run: function (args) {
        if (args[0] === 'projects' || args[0] === 'projects/') {
          return loadProjects().then(function (d) {
            d.categories.forEach(function (cat) {
              print(cat.title + '/', 'term-muted');
              d.projects.filter(function (p) { return p.category === cat.id; }).forEach(function (p) {
                print(['  ' + p.icon + ' ', { text: p.id.padEnd(14), cls: 'term-cmd' }, p.title]);
              });
            });
            print('Try: open <name>' + (d.projects.some(function (p) { return p.peek; }) ? ' or peek <name>' : ''), 'term-muted');
          });
        }
        print([{ text: 'projects/', cls: 'term-cmd' }, '  career  now  shipped  about']);
      }
    },
    cat: {
      args: '<file>',
      about: 'career, now, shipped or about',
      run: function (args) {
        var what = args[0];
        if (what === 'career') {
          document.querySelectorAll('.timeline-card').forEach(function (card) {
            print([{ text: textOf(card, '.timeline-badge').padEnd(15), cls: 'term-muted' },
              textOf(card, '.timeline-role') + ' @ ' + textOf(card, '.timeline-company')]);
          });
        } else if (what === 'now') {
          var items = document.querySelectorAll('#now-strip:not([hidden]) .now-item');
          if (!items.length) return print('now: nothing loaded right now. Ironic.', 'term-muted');
          items.forEach(function (li) { print(li.textContent.replace(/\s+/g, ' ').trim()); });
        } else if (what === 'shipped') {
          document.querySelectorAll('.shipped-item').forEach(function (item) {
            print([{ text: textOf(item, '.shipped-name'), cls: 'term-cmd' }, ' - ' + textOf(item, '.shipped-note')]);
          });
        } else if (what === 'about') {
          print(textOf(document, '.hero-description'));
        } else {
          print('cat: ' + (what || '') + ': No such file. Try one of: ' + CAT_TARGETS.join(', '), 'term-err');
        }
      }
    },
    open: {
      args: '<project>',
      about: 'open a project in a new tab',
      run: function (args) {
        return withProject(args[0], 'open', function (p) {
          print(['Opening ', { text: p.title, href: p.url }, '...']);
          window.open(p.url, '_blank', 'noopener');
        });
      }
    },
    peek: {
      args: '<project>',
      about: 'try a project without leaving',
      run: function (args) {
        return withProject(args[0], 'peek', function (p) {
          var btn = document.querySelector('#project-' + p.id + ' .project-peek');
          if (!btn || btn.hidden) return print('peek: ' + p.id + " doesn't allow embedding. Use: open " + p.id, 'term-err');
          closeThen(function () { btn.click(); });
        });
      }
    },
    surprise: {
      about: 'jump to a random project',
      run: function () {
        var btn = document.getElementById('surprise-btn');
        if (!btn) return print('surprise: the dice are missing.', 'term-err');
        closeThen(function () { btn.click(); });
      }
    },
    blog: {
      about: 'latest posts',
      run: function () {
        var posts = document.querySelectorAll('.post-card');
        if (!posts.length) return print(['Posts live at ', { text: 'greenido.wordpress.com', href: 'https://greenido.wordpress.com' }]);
        posts.forEach(function (a) { print(['• ', { text: textOf(a, '.post-title') || a.href, href: a.href }]); });
      }
    },
    everest: {
      about: 'you know what this is',
      run: function () {
        if (typeof window.launchEverestingEgg !== 'function') return print('everest: the mountain is closed today.', 'term-err');
        closeThen(window.launchEverestingEgg);
      }
    },
    eggs: {
      about: 'how many secrets have you found?',
      run: function () {
        var e = eggs();
        var found = e.found();
        print(eggLine());
        (e.all || []).forEach(function (egg) {
          var got = found.indexOf(egg.id) !== -1;
          print('  ' + (got ? '✅ ' + egg.name : '❔ ' + egg.hint), got ? 'term-egg' : 'term-muted');
        });
      }
    },
    whoami: {
      about: 'who are you?',
      run: function () { print('guest. The CTO is ' + (textOf(document, '.navbar-brand') || 'elsewhere') + '; you just have the keys to the terminal.'); }
    },
    contact: {
      about: 'say hello',
      run: function () { print(['→ ', { text: 'contact page', href: 'contact.html' }]); }
    },
    date: { about: 'what time is it', run: function () { print(new Date().toString()); } },
    echo: { args: '<text>', about: 'say it back', run: function (args) { print(args.join(' ')); } },
    history: {
      about: 'what you typed',
      run: function () { history.forEach(function (h, i) { print(String(i + 1).padStart(4) + '  ' + h); }); }
    },
    clear: { about: 'clear the screen', run: function () { out.replaceChildren(); } },
    exit: { about: 'close the terminal', run: function () { dialog.close(); } },

    // Unlisted. The `eggs` command hints at both.
    sudo: {
      hidden: true,
      run: function (args) {
        print('[sudo] password for guest: ********', 'term-muted');
        print(args.join(' ').indexOf('coffee') !== -1
          ? 'Brewing espresso... ☕ (Espresso Labs approves.)'
          : 'guest is not in the sudoers file. This incident will be reported to the CTO.');
        findEgg('sudo');
      }
    },
    rm: {
      hidden: true,
      run: function () {
        print('rm: refusing to delete 20+ years of side projects. They have feelings.', 'term-err');
        findEgg('rm');
      }
    }
  };

  function withProject(name, cmd, fn) {
    if (!name) { print(cmd + ': which project? Try: ls projects', 'term-err'); return; }
    return loadProjects().then(function (d) {
      var key = name.toLowerCase();
      var p = d.projects.filter(function (x) { return x.id === key; })[0];
      if (p) return fn(p);
      var near = d.projects.filter(function (x) {
        return x.id.indexOf(key) !== -1 || x.title.toLowerCase().indexOf(key) !== -1;
      }).map(function (x) { return x.id; });
      print(cmd + ': ' + name + ': no such project.' + (near.length ? ' Did you mean: ' + near.join(', ') + '?' : ' Try: ls projects'), 'term-err');
    });
  }

  function run(line) {
    var trimmed = line.trim();
    print([{ text: PROMPT + ' ', cls: 'term-prompt' }, { text: trimmed, cls: 'term-cmd' }]);
    if (!trimmed) return;

    history.push(trimmed);
    history = history.slice(-50);
    historyIndex = history.length;
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { /* history is a nicety */ }

    var words = trimmed.split(/\s+/);
    var name = words[0].toLowerCase();
    var cmd = Object.prototype.hasOwnProperty.call(COMMANDS, name) ? COMMANDS[name] : null;
    if (!cmd) {
      print(name + ': command not found. Type `help`.', 'term-err');
      return;
    }
    if (typeof window.gtag === 'function') window.gtag('event', 'terminal_command', { command: name });
    var result;
    try { result = cmd.run(words.slice(1)); } catch (e) { print(name + ': something broke. Classic.', 'term-err'); }
    if (result && result.catch) {
      result.catch(function () { print(name + ': could not load the data. Are you offline?', 'term-err'); });
    }
  }

  /* ------------------------------------------------------------ completion */

  function complete() {
    var value = input.value;
    var words = value.split(/\s+/);
    var pool;
    if (words.length <= 1) {
      pool = Object.keys(COMMANDS).filter(function (c) { return !COMMANDS[c].hidden; });
    } else if (words[0] === 'cat') {
      pool = CAT_TARGETS;
    } else if (words[0] === 'ls') {
      pool = ['projects'];
    } else if ((words[0] === 'open' || words[0] === 'peek') && projects) {
      pool = projects.projects
        .filter(function (p) { return words[0] === 'open' || p.peek; })
        .map(function (p) { return p.id; });
    } else {
      if (words[0] === 'open' || words[0] === 'peek') loadProjects().catch(function () {});
      return;
    }
    var stem = words[words.length - 1].toLowerCase();
    var hits = pool.filter(function (w) { return w.indexOf(stem) === 0; });
    if (hits.length === 1) {
      words[words.length - 1] = hits[0];
      input.value = words.join(' ') + ' ';
    } else if (hits.length > 1) {
      print(hits.join('  '), 'term-muted');
    }
  }

  /* -------------------------------------------------------------------- ui */

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    dialog = document.createElement('dialog');
    dialog.id = 'site-terminal';
    dialog.setAttribute('aria-label', 'Site terminal');

    var bar = document.createElement('div');
    bar.className = 'term-bar';
    var title = document.createElement('span');
    title.textContent = 'ido-green.sh';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'term-close';
    close.setAttribute('aria-label', 'Close terminal');
    close.textContent = '×';
    close.addEventListener('click', function () { dialog.close(); });
    bar.append(title, close);

    out = document.createElement('div');
    out.className = 'term-out';
    out.setAttribute('role', 'log');
    out.setAttribute('aria-live', 'polite');

    var form = document.createElement('form');
    var prompt = document.createElement('label');
    prompt.className = 'term-prompt';
    prompt.htmlFor = 'term-input';
    prompt.textContent = PROMPT;
    input = document.createElement('input');
    input.id = 'term-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('enterkeyhint', 'send');
    form.append(prompt, input);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var line = input.value;
      input.value = '';
      run(line);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        complete();
      } else if (e.key === 'ArrowUp' && history.length) {
        e.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex];
      } else if (e.key === 'ArrowDown' && history.length) {
        e.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || '';
      } else if (e.key === '`' && !input.value) {
        // The same key that opened it closes it, like a game console.
        e.preventDefault();
        dialog.close();
      }
    });

    // Clicking anywhere in the output puts you back at the prompt, unless
    // you are selecting text or following a link.
    out.addEventListener('click', function (e) {
      if (e.target.closest('a') || String(window.getSelection())) return;
      input.focus();
    });

    dialog.addEventListener('close', function () {
      document.body.classList.remove('peek-open-body');
      if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
    });

    dialog.append(bar, out, form);
    document.body.appendChild(dialog);

    try { history = JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || []; } catch (e) { history = []; }
    historyIndex = history.length;

    print('ido-green.sh - you found the terminal.', 'term-egg');
    print("Type `help` to look around. " + eggLine() + '.', 'term-muted');
  }

  window.openSiteTerminal = function () {
    if (!dialog) build();
    if (dialog.open) { input.focus(); return; }
    returnFocus = document.activeElement;
    document.body.classList.add('peek-open-body'); // reuses main.css's scroll lock
    dialog.showModal();
    input.focus();
    findEgg('terminal');
  };
})();
