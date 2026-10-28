const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createApp() {
    const elements = new Map();
    function element() {
        return {
            value: '', dataset: {}, children: [], listeners: {},
            classList: { add() {}, remove() {}, toggle() {} },
            set innerHTML(value) { this.html = value; this.children = []; },
            get innerHTML() { return this.html || ''; },
            appendChild(child) { this.children.push(child); },
            addEventListener(name, handler) { this.listeners[name] = handler; },
            querySelector() { return this.button ||= element(); },
            reset() {}, focus() {}
        };
    }
    const old = [{ keyword: 'Apple', url: 'https://old.example', favorite: false },
        { keyword: '9 Games', url: 'https://games.example', favorite: true }];
    const storage = new Map([['linkflow_keywords', JSON.stringify(old)]]);
    const alerts = [];
    const context = vm.createContext({
        document: {
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, element());
                return elements.get(id);
            },
            createElement: element, body: element()
        },
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        window: {}, alert: message => alerts.push(message), console: { error() {} },
        FileReader: class {
            readAsText(file) {
                if (file.error) this.onerror();
                else this.onload({ target: { result: file.text } });
            }
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), context);
    return {
        context, elements, storage, alerts, old,
        run: code => vm.runInContext(code, context),
        import: text => { context.file = { text }; vm.runInContext('importFromCSV(file)', context); },
        saved: () => JSON.parse(storage.get('linkflow_keywords')),
        select(letter) {
            elements.get('alphabetFilter').listeners.click({
                target: { closest: () => ({ dataset: { letter } }) }
            });
        },
        search(value) {
            elements.get('searchInput').value = value;
            elements.get('searchInput').listeners.input({ target: { value } });
        }
    };
}

test('all ten digit buttons render and filter by the first digit', () => {
    const app = createApp();
    const buttons = app.elements.get('alphabetFilter').children;
    assert.deepEqual(buttons.slice(0, 10).map(button => button.dataset.letter), [...'0123456789']);
    app.select('9');
    assert.equal(app.elements.get('keywordList').children.length, 1);
    assert.match(app.elements.get('keywordList').children[0].innerHTML, /9 Games/);
    app.select('9');
    assert.equal(app.elements.get('keywordList').children.length, 2);
});

for (const category of ['A', '9', 'Favorites']) {
    test(`typing search resets ${category} to All and finds matches across categories`, () => {
        const app = createApp();
        app.select(category);
        app.search('example');
        assert.equal(app.run('selectedLetter'), 'All');
        assert.match(app.elements.get('alphabetFilter').innerHTML, /all active/);
        assert.equal(app.elements.get('keywordList').children.length, 2);
        app.select('Favorites');
        app.search('');
        assert.equal(app.run('selectedLetter'), 'All');
    });
}

test('CSV replaces storage, resets stale edit/delete state, and survives reload', () => {
    const app = createApp();
    app.select('Favorites');
    app.search('old');
    app.run('editIndex.value = "1"; pendingDeleteIndex = 0');
    const csv = 'Keyword,URL,Title,Favorite,CreatedAt\nNew,https://new.example,Title,1,123';
    app.import(csv);
    assert.deepEqual(app.saved(), [{ keyword: 'New', url: 'https://new.example', title: 'Title', favorite: true, createdAt: 123 }]);
    assert.equal(app.run('editIndex.value'), '-1');
    assert.equal(app.run('pendingDeleteIndex'), -1);
    assert.equal(app.run('selectedLetter'), 'All');
    assert.equal(app.elements.get('searchInput').value, '');
    assert.equal(app.elements.get('keywordList').children.length, 1);
    assert.equal(app.run("JSON.parse(localStorage.getItem('linkflow_keywords'))[0].keyword"), 'New');
    app.import(csv);
    assert.equal(app.saved().length, 1);
});

test('CSV preserves BOM, Thai text, quoted commas, escaped quotes, multiline titles and CRLF', () => {
    const app = createApp();
    app.import('\uFEFFKeyword,URL,Title,Favorite,CreatedAt\r\n"เกม, 9",https://new.example,"Line 1\r\nLine ""2""",1,123\r\n\r\n');
    assert.equal(app.saved()[0].keyword, 'เกม, 9');
    assert.equal(app.saved()[0].title, 'Line 1\r\nLine "2"');
});

for (const csv of ['', 'Keyword,URL\n', 'Wrong,Header\nx,y',
    'Keyword,URL\nValid,https://new.example\nInvalid', 'Keyword,URL\n"Unclosed,url',
    'Keyword,URL\n"Closed"oops,url', 'Keyword,URL\n,url']) {
    test(`invalid or empty CSV keeps existing data: ${JSON.stringify(csv)}`, () => {
        const app = createApp();
        app.import(csv);
        assert.deepEqual(app.saved(), app.old);
        assert.equal(app.run('keywords.length'), 2);
        assert.match(app.alerts[0], /Failed/);
    });
}

test('storage write failure leaves in-memory keywords unchanged', () => {
    const app = createApp();
    app.context.localStorage.setItem = () => { throw new Error('Storage full'); };
    app.import('Keyword,URL\nNew,https://new.example');
    assert.deepEqual(app.saved(), app.old);
    assert.equal(app.run('keywords[0].keyword'), 'Apple');
    assert.match(app.alerts[0], /Failed/);
});

test('file read failure keeps existing keywords', () => {
    const app = createApp();
    app.context.file = { error: true };
    app.run('importFromCSV(file)');
    assert.deepEqual(app.saved(), app.old);
    assert.match(app.alerts[0], /Failed to read/);
});
