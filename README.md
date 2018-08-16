# taiga

`taiga` is a collection of implementations of different tree structures.

# Installation

    npm install taiga

# API

## `AVLTree`

Construct a new [AVL tree](https://en.wikipedia.org/wiki/AVL_tree), whose
values are sorted using the function `compare`. For example:

```javascript
var mod_taiga = require('taiga');
var tree = new mod_taiga.AVLTree({
    compare: function numcmp(a, b) {
        return a - b;
    }
});

for (var i = 0; i < 5; ++i) {
    tree.insert(i);
}
```

Like [Array.prototype.sort()], `AVLTree` expects that the comparison function
returns a negative value when the first value should sort before the second,
`0` when the two are equal, and a positive value when the second value should
sort after the first.

### `AVLTree#toArray()`

Return an array of all values in the tree, in order from lowest value to
highest value.

### `AVLTree#forEach(f)`

Perform an in-order walk of the tree, calling the function
`f(value, index, node)` on every node.

### `AVLTree#first()`

Returns the lowest-valued node in the tree.

### `AVLTree#last()`

Returns the highest-valued node in the tree.

### `AVLTree#find(val)`

Search the tree for a node with a matching value. If none exist within the tree,
then this method returns `null`. Otherwise, it returns an `AVLNode`.

### `AVLTree#insert(val)`

Insert a value into the tree. This function returns the `AVLNode` that holds the
inserted value.

### `AVLTree#remove(val)`

Remove a value from the tree. Note that if there are multiple nodes within the
tree with the same value, then only one of them will be removed. This method
returns `null` if there was no matching value within the tree, or the removed
`AVLNode`.

## `AVLNode`

### `AVLNode#value()`

Return the value held by this node.

### `AVLNode#valid()`

Check whether this node is still within its tree.

### `AVLNode#remove()`

Remove this node from the tree.

### `AVLNode#prev()`

Return the previous equal- or lower-valued node within the tree.

### `AVLNode#next()`

Return the next equal- or higher-valued node within the tree.

# License

This Source Code Form is subject to the terms of the Mozilla Public License, v.
2.0.  For the full license text see LICENSE, or http://mozilla.org/MPL/2.0/.

Copyright (c) 2018, Joyent, Inc.

[Array.prototype.sort()]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
