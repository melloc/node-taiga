/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2018, Joyent, Inc.
 */

'use strict';

var assert = require('assert-plus');
var AVLTree = require('../lib/avl.js').AVLTree;
var test = require('tape');

// --- Internal helpers

function numcmp(a, b) {
    return a - b;
}

function log2(n) {
    return Math.log(n) / Math.log(2);
}

function validateNode(node) {
    var lh = 0;
    var rh = 0;

    assert.ok(node.an_tree, 'node.an_tree');

    if (node.an_parent === null) {
        assert.equal(node.an_tree.at_root, node, 'is root');
    }

    if (node.an_left !== null) {
        assert.equal(node.an_left.an_parent, node, 'is parent of left child');
        lh = validateNode(node.an_left);
    }

    if (node.an_right !== null) {
        assert.equal(node.an_right.an_parent, node, 'is parent of right child');
        rh = validateNode(node.an_right);
    }

    assert.ok(node.an_tilt >= -1, 'node.an_tilt >= -1');
    assert.ok(node.an_tilt <= 1, 'node.an_tilt <= 1');
    assert.equal(lh - rh, node.an_tilt, lh + ' - ' + rh + ' = ' + node.an_tilt);

    return Math.max(lh, rh) + 1;
}

function testTree(t, input) {
    var val;

    var tree = new AVLTree({
        compare: numcmp
    });

    input.forEach(function (v, i) {
        assert.equal(tree.length, i, 'correct tree length');
        tree.insert(v);
    });

    assert.equal(tree.length, input.length, 'correct tree length');

    input.sort(numcmp);

    var h = validateNode(tree.at_root);

    t.ok(h <= 1.44 * log2(input.length),
        'tree height is correctly bounded');

    t.deepEqual(tree.toArray(), input);
    t.deepEqual(tree.first().value(), input[0]);
    t.deepEqual(tree.last().value(), input[input.length - 1]);

    for (var j = 0; j < 10; j++) {
        val = input[Math.floor(input.length * Math.random())];
        t.equal(tree.find(val).value(), val);
    }

    var first = tree.first();
    var last = tree.last();

    t.deepEqual(first.value(), input[0]);
    t.deepEqual(last.value(), input[input.length - 1]);

    var fromNext = [];
    var fromPrev = [];
    var node = null;

    for (node = first; node !== null; node = node.next()) {
        fromNext.push(node.value());
    }

    for (node = last; node !== null; node = node.prev()) {
        fromPrev.unshift(node.value());
    }

    t.deepEqual(fromNext, input, 'fromNext matches input');
    t.deepEqual(fromPrev, input, 'fromPrev matches input');

    while (input.length > 0) {
        var idx = Math.floor(input.length * Math.random());
        val = input[idx];
        input.splice(idx, 1);
        tree.find(val).remove();
        if (input.length !== 0) {
            validateNode(tree.at_root);
        }
        assert.deepEqual(tree.toArray(), input, 'tree missing removed node');
        assert.deepEqual(tree.length, input.length, 'tree length decremented');
    }

    t.equal(tree.at_root, null, 'tree root is null');
    t.equal(tree.length, 0, 'tree length is 0');

    t.end();
}

function generateAndTestTree(t) {
    var input = new Array(100);

    for (var i = 0; i < 100; i++) {
        input[i] = Math.ceil(Math.random() * 500);
    }

    testTree(t, input);
}


// --- Tests

test('operations on empty tree', function (t) {
    var tree = new AVLTree({ compare: numcmp });

    t.equal(tree.first(), null, 'first() is null');
    t.equal(tree.last(), null, 'last() is null');
    t.equal(tree.find(5), null, 'find(5) is null when value isn\'t there');
    t.equal(tree.remove(5), null, 'remove(5) is null when value isn\'t there');

    t.end();
});

test('operations on node before and after removal', function (t) {
    var tree = new AVLTree({ compare: numcmp });
    var node1 = tree.insert(1);
    var node2 = tree.insert(2);
    var node3 = tree.insert(3);

    t.equal(node1.valid(), true, 'node1 is valid');
    t.equal(node2.valid(), true, 'node2 is valid');
    t.equal(node3.valid(), true, 'node3 is valid');

    t.equal(node1.value(), 1, 'node1 contains 1');
    t.equal(node2.value(), 2, 'node2 contains 2');
    t.equal(node3.value(), 3, 'node3 contains 3');

    t.equal(node1.next(), node2, 'node1.next() is node2');
    t.equal(node2.next(), node3, 'node2.next() is node3');
    t.equal(node3.next(), null, 'node3.prev() is null');

    t.equal(node1.prev(), null, 'node1.prev() is null');
    t.equal(node2.prev(), node1, 'node2.prev() is node1');
    t.equal(node3.prev(), node2, 'node3.prev() is node2');

    /* Remove the middle value. */
    t.equal(tree.remove(2), node2, 'tree.remove(2) returns node2');

    t.equal(node1.valid(), true, 'node1 is valid');
    t.equal(node2.valid(), false, 'node2 is now invalid');
    t.equal(node3.valid(), true, 'node3 is valid');

    t.equal(node1.value(), 1, 'node1 still contains 1');
    t.equal(node2.value(), 2, 'node2 still contains 2');
    t.equal(node3.value(), 3, 'node3 still contains 3');

    t.equal(node1.next(), node3, 'node1.next() is now node3');
    t.equal(node2.next(), null, 'node2.next() is now null');
    t.equal(node3.next(), null, 'node3.next() is still null');

    t.equal(node1.prev(), null, 'node1.prev() is still null');
    t.equal(node2.prev(), null, 'node2.prev() is now null');
    t.equal(node3.prev(), node1, 'node3.prev() is now node1');

    t.throws(function () {
        node2.remove();
    }, /node has already been removed/, 'node2.remove() now throws');

    t.end();
});

test('alternating equal values', function (t) {
    testTree(t, [
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60,
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60,
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60,
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60,
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60,
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60,
        20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60, 20, 40, 60
    ]);
});

test('random values #1', function (t) {
    testTree(t, [
        465, 132, 217, 12, 124, 378, 404, 276, 110, 387, 160, 111, 243, 114, 47,
        484, 459, 29, 37, 293, 471, 64, 215, 164, 206, 197, 491, 13, 361, 164,
        317, 308, 107, 372, 321, 113, 94, 327, 25, 442, 137, 407, 115, 34, 25,
        43, 298, 198, 488, 113, 171, 302, 376, 252, 46, 259, 400, 290, 430, 330,
        18, 97, 175, 423, 168, 463, 341, 170, 403, 253, 42, 314, 420, 370, 161,
        486, 172, 140, 257, 152, 365, 119, 112, 232, 169, 55, 396, 80, 164, 362,
        28, 234, 253, 278, 458, 140, 236, 254, 444, 180
    ]);
});

test('random values #2', function (t) {
    testTree(t, [
        187, 263, 499, 325, 38, 195, 153, 319, 30, 391, 412, 317, 338, 359,
        337, 261, 271, 300, 440, 358, 348, 439, 250, 240, 2, 386, 269, 83, 276,
        115, 246, 80, 120, 108, 492, 442, 84, 36, 194, 470, 453, 24, 332, 483,
        79, 497, 153, 247, 467, 473, 162, 463, 37, 246, 90, 236, 31, 227, 132,
        150, 76, 211, 160, 7, 444, 444, 421, 212, 149, 40, 407, 261, 405, 432,
        268, 441, 203, 113, 215, 214, 76, 74, 345, 55, 40, 164, 103, 67, 107,
        135, 430, 324, 499, 499, 219, 49, 318, 52, 374, 316
    ]);
});

test('insert numbers 0-999 ascending', function (t) {
    var input = new Array(1000);

    for (var i = 0; i < 1000; ++i) {
        input[i] = i;
    }

    testTree(t, input);
});

test('insert numbers 0-999 descending', function (t) {
    var input = new Array(1000);

    for (var i = 0; i < 1000; ++i) {
        input[i] = 999 - i;
    }

    testTree(t, input);
});

test('generate 10 random trees', function (t) {
    t.plan(10);

    for (var i = 1; i <= 10; ++i) {
        t.test('random tree ' + i, generateAndTestTree);
    }
});
