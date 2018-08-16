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


// --- Internal helpers

/*
 * Check if "node" is the root node.
 */
function isRoot(node) {
    return (node.an_parent === null);
}

/*
 * Check whether "node" is a left child of its parent.
 */
function isLeftChild(node) {
    return node.an_parent !== null &&
        node === node.an_parent.an_left;
}

/*
 * Check whether "node" is a right child of its parent.
 */
function isRightChild(node) {
    return node.an_parent !== null &&
        node === node.an_parent.an_right;
}

/*
 * Perform a left rotation on "node".
 */
function rotateLeft(node) {
    var newParent = node.an_right;
    node.an_right = newParent.an_left;
    if (newParent.an_left !== null) {
        newParent.an_left.an_parent = node;
    }
    newParent.an_parent = node.an_parent;
    if (isRoot(node)) {
        node.an_tree.at_root = newParent;
    } else if (isLeftChild(node)) {
        node.an_parent.an_left = newParent;
    } else {
        node.an_parent.an_right = newParent;
    }

    newParent.an_left = node;
    node.an_parent = newParent;

    node.an_tilt = node.an_tilt + 1 - Math.min(newParent.an_tilt, 0);
    newParent.an_tilt = newParent.an_tilt + 1 + Math.max(node.an_tilt, 0);

    return newParent;
}

/*
 * Perform a right rotation on "node".
 */
function rotateRight(node) {
    var newParent = node.an_left;
    node.an_left = newParent.an_right;
    if (newParent.an_right !== null) {
        newParent.an_right.an_parent = node;
    }
    newParent.an_parent = node.an_parent;
    if (isRoot(node)) {
        node.an_tree.at_root = newParent;
    } else if (isLeftChild(node)) {
        node.an_parent.an_left = newParent;
    } else {
        node.an_parent.an_right = newParent;
    }

    newParent.an_right = node;
    node.an_parent = newParent;

    node.an_tilt = node.an_tilt - 1 - Math.max(newParent.an_tilt, 0);
    newParent.an_tilt = newParent.an_tilt - 1 + Math.min(node.an_tilt, 0);

    return newParent;
}

/*
 * Perform a left rotation on "oldLeft" (the left child of "node"), and then
 * perform a right rotation on "node".
 */
function rotateLeftRight(node, oldLeft) {
    var newParent = oldLeft.an_right;
    newParent.an_parent = node.an_parent;
    if (isRoot(node)) {
        node.an_tree.at_root = newParent;
    } else if (isLeftChild(node)) {
        node.an_parent.an_left = newParent;
    } else {
        node.an_parent.an_right = newParent;
    }

    oldLeft.an_right = newParent.an_left;
    if (newParent.an_left !== null) {
        newParent.an_left.an_parent = oldLeft;
    }
    oldLeft.an_parent = newParent;

    node.an_left = newParent.an_right;
    if (newParent.an_right !== null) {
        newParent.an_right.an_parent = node;
    }
    node.an_parent = newParent;

    newParent.an_left = oldLeft;
    newParent.an_right = node;

    var a = node.an_tilt;
    var b = oldLeft.an_tilt;
    var c = newParent.an_tilt;

    var d = b + 1 - Math.min(c, 0);
    var e = c + 1 + Math.max(d, 0);
    var f = a - 1 - Math.max(e, 0);
    var g = e - 1 + Math.min(f, 0);

    node.an_tilt = f;
    oldLeft.an_tilt = d;
    newParent.an_tilt = g;

    return newParent;
}

/*
 * Perform a right rotation on "oldRight" (the right child of "node"), and then
 * perform a left rotation on "node.
 */
function rotateRightLeft(node, oldRight) {
    var newParent = oldRight.an_left;
    newParent.an_parent = node.an_parent;
    if (isRoot(node)) {
        node.an_tree.at_root = newParent;
    } else if (isLeftChild(node)) {
        node.an_parent.an_left = newParent;
    } else {
        node.an_parent.an_right = newParent;
    }

    oldRight.an_left = newParent.an_right;
    if (newParent.an_right !== null) {
        newParent.an_right.an_parent = oldRight;
    }
    oldRight.an_parent = newParent;

    node.an_right = newParent.an_left;
    if (newParent.an_left !== null) {
        newParent.an_left.an_parent = node;
    }
    node.an_parent = newParent;

    newParent.an_right = oldRight;
    newParent.an_left = node;

    var a = node.an_tilt;
    var b = oldRight.an_tilt;
    var c = newParent.an_tilt;

    var d = b - 1 - Math.max(c, 0);
    var e = c - 1 + Math.min(d, 0);
    var f = a + 1 - Math.min(e, 0);
    var g = e + 1 + Math.max(f, 0);

    node.an_tilt = f;
    oldRight.an_tilt = d;
    newParent.an_tilt = g;

    return newParent;
}

/*
 * Do an in-order walk of all the nodes within the subtree rooted at "node".
 */
function forEachNode(node, f, idx) {
    if (node === null) {
        return idx;
    }

    idx = forEachNode(node.an_left, f, idx);
    f(node.an_val, idx, node);
    idx = forEachNode(node.an_right, f, idx + 1);

    return idx;
}

/*
 * Given a right-heavy node, rebalance it and its children to maintain
 * the AVL tree invariants.
 */
function rebalanceLeft(node) {
    if (node.an_right.an_tilt > 0) {
        rotateRightLeft(node, node.an_right);
    } else {
        rotateLeft(node);
    }
}

/*
 * Given a left-heavy node, rebalance it and its children to maintain
 * the AVL tree invariants.
 */
function rebalanceRight(node) {
    if (node.an_left.an_tilt < 0) {
        rotateLeftRight(node, node.an_left);
    } else {
        rotateRight(node);
    }
}

/*
 * When a new node is inserted into the tree, we retrace to the root,
 * incrementing each node's tilt along the way, until we hit a node
 * that requires rebalancing.
 */
function updateTilt(node) {
    do {
        if (node.an_tilt > 1) {
            rebalanceRight(node);
            return;
        } else if (node.an_tilt < -1) {
            rebalanceLeft(node);
            return;
        } else if (node.an_parent === null) {
            return;
        }

        if (isLeftChild(node)) {
            node.an_parent.an_tilt += 1;
        } else {
            node.an_parent.an_tilt -= 1;
        }

        node = node.an_parent;
    } while (node.an_tilt !== 0);
}

function removeNode(node) {
    var successor = null;
    var sibling = null;
    var isLeft = false;
    var balance;

    if (node.an_left !== null && node.an_right !== null) {
        /*
         * We have two children, so we find an adjacent node (our predecessor
         * when left-heavy, and successor when right-heavy), remove it, and then
         * swap it with this node.
         */
        successor = node.an_tilt > 0
            ? node.an_left.max()
            : node.an_right.min();
        removeNode(successor);

        successor.an_tilt = node.an_tilt;

        if (node.an_left !== null) {
            successor.an_left = node.an_left;
            successor.an_left.an_parent = successor;
        }

        if (node.an_right !== null) {
            successor.an_right = node.an_right;
            successor.an_right.an_parent = successor;
        }

        successor.an_parent = node.an_parent;
        if (isRoot(node)) {
            node.an_tree.at_root = successor;
        } else if (isLeftChild(node)) {
            node.an_parent.an_left = successor;
        } else {
            node.an_parent.an_right = successor;
        }

        return;
    }

    /*
     * If there's only one child, it takes the removed node's place in the
     * parent. If we have no children, then removal is just a matter of
     * unlinking the node from the parent.
     */
    if (node.an_left !== null) {
        node.an_left.an_parent = node.an_parent;
        if (isRoot(node)) {
            node.an_tree.at_root = node.an_left;
        } else if (isLeftChild(node)) {
            node.an_parent.an_left = node.an_left;
            isLeft = true;
        } else {
            node.an_parent.an_right = node.an_left;
        }
        node = node.an_left;
    } else if (node.an_right !== null) {
        node.an_right.an_parent = node.an_parent;
        if (isRoot(node)) {
            node.an_tree.at_root = node.an_right;
        } else if (isLeftChild(node)) {
            node.an_parent.an_left = node.an_right;
            isLeft = true;
        } else {
            node.an_parent.an_right = node.an_right;
        }
        node = node.an_right;
    } else {
        if (isRoot(node)) {
            /* The tree is now empty. */
            node.an_tree.at_root = null;
            return;
        } else if (isLeftChild(node)) {
            node.an_parent.an_left = null;
            isLeft = true;
        } else {
            node.an_parent.an_right = null;
        }
    }

    /*
     * Now that we have removed our node, we have reduced the height of the
     * node's ancestors by one. We need to retrace the tree and perform any
     * necessary rotations to restore balance.
     */
    for (var parent = node.an_parent; parent !== null;
        parent = node.an_parent, isLeft = isLeftChild(node)) {
        if (isLeft) {
            if (parent.an_tilt < 0) {
                parent.an_tilt = -2;
                sibling = parent.an_right;
                balance = sibling.an_tilt;
                if (balance > 0) {
                    node = rotateRightLeft(parent, sibling);
                } else {
                    node = rotateLeft(parent);
                }
            } else if (parent.an_tilt === 0) {
                parent.an_tilt = -1;
                break;
            } else {
                node = parent;
                node.an_tilt = 0;
                continue;
            }
        } else {
            if (parent.an_tilt > 0) {
                parent.an_tilt = 2;
                sibling = parent.an_left;
                balance = sibling.an_tilt;
                if (balance < 0) {
                    node = rotateLeftRight(parent, sibling);
                } else {
                    node = rotateRight(parent);
                }
            } else if (parent.an_tilt === 0) {
                parent.an_tilt = 1;
                break;
            } else {
                node = parent;
                node.an_tilt = 0;
                continue;
            }
        }

        if (balance === 0) {
            break;
        }
    }
}

/*
 * Construct a new node for an AVL tree. Each node has slots for a left and a
 * right child, a corresponding value for the node, a tilt indicating the
 * difference in max height of its children (left - right), and pointer to the
 * parent node and containing tree.
 */
function AVLNode(tree, val, parent) {
    this.an_tree = tree;
    this.an_val = val;

    this.an_parent = parent;
    this.an_left = null;
    this.an_right = null;
    this.an_tilt = 0;
}

/*
 * Remove this node from the tree.
 */
AVLNode.prototype.remove = function () {
    if (this.an_tree === null) {
        throw new Error('node has already been removed!');
    }

    removeNode(this);

    this.an_tree.at_length -= 1;

    this.an_tilt = 0;
    this.an_tree = null;
    this.an_left = null;
    this.an_right = null;
    this.an_parent = null;
};

/*
 * Get the smallest value within the subtree rooted at this node.
 */
AVLNode.prototype.min = function () {
    var node = this; // eslint-disable-line

    while (node.an_left !== null) {
        node = node.an_left;
    }

    return node;
};

/*
 * Get the largest value within the subtree rooted at this node.
 */
AVLNode.prototype.max = function () {
    var node = this; // eslint-disable-line

    while (node.an_right !== null) {
        node = node.an_right;
    }

    return node;
};

/*
 * Return the next value in the tree.
 */
AVLNode.prototype.next = function () {
    if (this.an_right !== null) {
        return this.an_right.min();
    }

    var node = this; // eslint-disable-line
    while (node !== null) {
        if (isLeftChild(node)) {
            return node.an_parent;
        }

        node = node.an_parent;
    }

    return null;
};

/*
 * Return the previous value in the tree.
 */
AVLNode.prototype.prev = function () {
    if (this.an_left !== null) {
        return this.an_left.max();
    }

    var node = this; // eslint-disable-line
    while (node !== null) {
        if (isRightChild(node)) {
            return node.an_parent;
        }

        node = node.an_parent;
    }

    return null;
};

/*
 * Get the value that this node holds.
 */
AVLNode.prototype.value = function () {
    return this.an_val;
};

/*
 * Check whether this node is still a valid node, i.e., it's still within
 * a tree.
 */
AVLNode.prototype.valid = function () {
    return (this.an_tree !== null);
};


// --- Exports

function AVLTree(opts) {
    assert.object(opts, 'opts');
    assert.func(opts.compare, 'opts.compare');

    this.at_length = 0;
    this.at_root = null;
    this.at_comp = opts.compare;
}

AVLTree.prototype.first = function () {
    var node = this.at_root;
    if (node === null) {
        return null;
    }

    return node.min();
};

AVLTree.prototype.last = function () {
    var node = this.at_root;
    if (node === null) {
        return null;
    }

    return node.max();
};

AVLTree.prototype.find = function find(val) {
    var node = this.at_root;
    var cmp;

    while (node !== null && (cmp = this.at_comp(val, node.an_val)) !== 0) {
        if (cmp < 0) {
            node = node.an_left;
        } else {
            node = node.an_right;
        }
    }

    return node;
};

AVLTree.prototype.remove = function remove(val) {
    var node = this.find(val);
    if (node !== null) {
        node.remove();
    }
    return node;
};

AVLTree.prototype.insert = function insert(val) {
    var node;

    this.at_length += 1;

    if (this.at_root === null) {
        node = this.at_root = new AVLNode(this, val, null);
        return node;
    }

    var next = this.at_root;
    var cmp, parent;

    while (next !== null) {
        parent = next;

        cmp = this.at_comp(val, next.an_val);
        if (cmp <= 0) {
            next = next.an_left;
        } else {
            next = next.an_right;
        }
    }

    node = new AVLNode(this, val, parent);
    if (cmp <= 0) {
        parent.an_left = node;
    } else {
        parent.an_right = node;
    }

    updateTilt(node);

    return node;
};

AVLTree.prototype.forEach = function forEachTree(f) {
    assert.func(f, 'f');

    forEachNode(this.at_root, f, 0);
};

AVLTree.prototype.toArray = function toArrayTree() {
    var array = new Array(this.at_length);

    this.forEach(function pushNodeValue(v, i) {
        array[i] = v;
    });

    return array;
};

Object.defineProperty(AVLTree.prototype, 'length', {
    get: function getTreeLength() {
        return this.at_length;
    }
});


module.exports = {
    AVLTree: AVLTree
};
