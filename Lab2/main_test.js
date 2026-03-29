const test = require('node:test');
const assert = require('assert');
const fs = require('fs');

// Stub fs.readFile globally to prevent ENOENT when Application is instantiated
const originalReadFile = fs.readFile;
fs.readFile = (file, encoding, callback) => {
    callback(null, 'Alice\nBob\nCharlie');
};

// Now require main.js
const { Application, MailSystem } = require('./main');

// Test MailSystem.write
test('MailSystem.write should return correct context string', () => {
    const mailSystem = new MailSystem();
    const result = mailSystem.write('Alice');
    assert.strictEqual(result, 'Congrats, Alice!');
});

// Test MailSystem.send returns boolean
test('MailSystem.send should return a boolean', () => {
    const mailSystem = new MailSystem();
    const result = mailSystem.send('Bob', 'Test context');
    assert.strictEqual(typeof result, 'boolean');
});

// Test MailSystem.send true case - stub Math.random
test('MailSystem.send should return true when Math.random > 0.5', () => {
    const mailSystem = new MailSystem();
    const originalRandom = Math.random;
    Math.random = () => 0.6;
    const result = mailSystem.send('Charlie', 'Test');
    Math.random = originalRandom;
    assert.strictEqual(result, true);
});

// Test MailSystem.send false case - stub Math.random
test('MailSystem.send should return false when Math.random <= 0.5', () => {
    const mailSystem = new MailSystem();
    const originalRandom = Math.random;
    Math.random = () => 0.4;
    const result = mailSystem.send('Diana', 'Test');
    Math.random = originalRandom;
    assert.strictEqual(result, false);
});

// Test Application.getRandomPerson
test('Application.getRandomPerson should return a person from people array', () => {
    const app = new Application();
    app.people = ['Alice', 'Bob', 'Charlie'];
    
    const person = app.getRandomPerson();
    assert.ok(['Alice', 'Bob', 'Charlie'].includes(person));
});

// Test Application.selectNextPerson - normal case
test('Application.selectNextPerson should select and return a person', () => {
    const app = new Application();
    app.people = ['Alice', 'Bob'];
    app.selected = [];
    
    // Stub getRandomPerson
    const originalGetRandomPerson = app.getRandomPerson;
    app.getRandomPerson = () => 'Alice';
    
    const result = app.selectNextPerson();
    
    app.getRandomPerson = originalGetRandomPerson;
    assert.strictEqual(result, 'Alice');
    assert.ok(app.selected.includes('Alice'));
});

// Test Application.selectNextPerson - all selected
test('Application.selectNextPerson should return null when all are selected', () => {
    const app = new Application();
    app.people = ['Alice', 'Bob'];
    app.selected = ['Alice', 'Bob'];
    
    const result = app.selectNextPerson();
    assert.strictEqual(result, null);
});

// Test Application.selectNextPerson - while loop with stub
test('Application.selectNextPerson should retry when person already selected', () => {
    const app = new Application();
    app.people = ['Alice', 'Bob', 'Charlie'];
    app.selected = ['Alice'];
    
    const originalGetRandomPerson = app.getRandomPerson;
    let callCount = 0;
    
    app.getRandomPerson = () => {
        callCount++;
        if (callCount === 1) return 'Alice'; // already selected
        return 'Bob'; // not selected
    };
    
    const result = app.selectNextPerson();
    
    app.getRandomPerson = originalGetRandomPerson;
    assert.strictEqual(result, 'Bob');
    assert.strictEqual(callCount, 2);
});

// Test Application.getNames
test('Application.getNames should return people array and selected array', async () => {
    // Override fs.readFile for this specific test
    const testReadFile = fs.readFile;
    fs.readFile = (file, encoding, callback) => {
        callback(null, 'TestUser1\nTestUser2\nTestUser3');
    };
    
    const app = new Application();
    const [people, selected] = await app.getNames();
    
    // Restore original
    fs.readFile = testReadFile;
    
    assert.ok(Array.isArray(people));
    assert.ok(people.length > 0);
    assert.deepStrictEqual(selected, []);
});

// Test Application.notifySelected - spy on methods
test('Application.notifySelected should call write and send for each selected', () => {
    const app = new Application();
    app.selected = ['Alice', 'Bob'];
    
    let writeCallCount = 0;
    let sendCallCount = 0;
    
    const originalWrite = app.mailSystem.write;
    const originalSend = app.mailSystem.send;
    
    app.mailSystem.write = function(name) {
        writeCallCount++;
        return originalWrite.call(this, name);
    };
    
    app.mailSystem.send = function(name, context) {
        sendCallCount++;
        return false;
    };
    
    app.notifySelected();
    
    app.mailSystem.write = originalWrite;
    app.mailSystem.send = originalSend;
    
    assert.strictEqual(writeCallCount, 2);
    assert.strictEqual(sendCallCount, 2);
});

// Test Application.notifySelected - verify parameters
test('Application.notifySelected should pass correct names to methods', () => {
    const app = new Application();
    app.selected = ['Alice', 'Bob'];
    
    const writeCalls = [];
    const sendCalls = [];
    
    const originalWrite = app.mailSystem.write;
    const originalSend = app.mailSystem.send;
    
    app.mailSystem.write = function(name) {
        writeCalls.push(name);
        return originalWrite.call(this, name);
    };
    
    app.mailSystem.send = function(name, context) {
        sendCalls.push({ name, context });
        return false;
    };
    
    app.notifySelected();
    
    app.mailSystem.write = originalWrite;
    app.mailSystem.send = originalSend;
    
    assert.deepStrictEqual(writeCalls, ['Alice', 'Bob']);
    assert.strictEqual(sendCalls.length, 2);
    assert.strictEqual(sendCalls[0].name, 'Alice');
    assert.strictEqual(sendCalls[0].context, 'Congrats, Alice!');
    assert.strictEqual(sendCalls[1].name, 'Bob');
    assert.strictEqual(sendCalls[1].context, 'Congrats, Bob!');
});
