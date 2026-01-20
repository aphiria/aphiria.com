<h1 id="doc-title">Collections</h1>

<h2 id="introduction">Introduction</h2>

Unfortunately, PHP's support for collections is relatively incomplete.  The `array` type is reused for multiple types, like hash tables and lists.  PHP also has _some_ support for advanced types in the SPL library, but it is incomplete, and its syntax is somewhat clunky.  To cover for PHP's lack of coverage of collections, Aphiria provides simple wrappers for common collections found in most other programming languages.

<h2 id="key-value-pairs">Key-Value Pairs</h2>

Like its name implies, `KeyValuePair` holds a key and a value.  Unlike key-value pairs in native PHP arrays, keys in `KeyValuePair` can be any value, including an object.  To instantiate one, pass in the key and value:

```php
use Aphiria\Collections\KeyValuePair;

$kvp = new KeyValuePair('thekey', 'thevalue');
```

<h3 id="key-value-pairs-key">KeyValuePair::key</h3>

_Runtime: O(1)_

To get the key-value pair's key, call

```php
$kvp->key;
```

<h3 id="key-value-pairs-value">KeyValuePair::value</h3>

_Runtime: O(1)_

To get the key-value pair's value, call

```php
$kvp->value;
```

<h2 id="array-lists">Array Lists</h2>

Aphiria's `ArrayList` is probably the most similar to PHP's built-in indexed array functionality.  You can instantiate one with or without an array:

```php
use Aphiria\Collections\ArrayList;
use function Aphiria\Collections\Functions\array_list;

$arrayList = new ArrayList();
// Or...
$arrayList = new ArrayList(['foo', 'bar']);
// Or...
$arrayList = array_list(['foo', 'bar']);
```

> **Note:** `ArrayList` implements `ArrayAccess` and `IteratorAggregate`, so you can use array-like accessors and iterate over it.

<h3 id="array-lists-add">add()</h3>

_Runtime: O(1)_

You can add a value via

```php
$arrayList->add('foo');
```

<h3 id="array-lists-add-range">addRange()</h3>

_Runtime: O(n), n = numbers of values added_

You can add multiple values at once:

```php
$arrayList->addRange(['foo', 'bar']);
```

<h3 id="array-lists-clear">clear()</h3>

_Runtime: O(1)_

You can remove all values in the array list:

```php
$arrayList->clear();
```

<h3 id="array-lists-contains-value">containsValue()</h3>

_Runtime: O(n)_

To check for a value, call

```php
$containsValue = $arrayList->containsValue('foo');
```

<h3 id="array-lists-count">count()</h3>

_Runtime: O(1)_

To grab the number of values in the array list, call

```php
$count = $arrayList->count();
```

<h3 id="array-lists-filter">filter()</h3>

_Runtime: O(n)_

To filter out values from the array list, call

```php
$filteredArrayList = $arrayList->filter(fn(string $value): bool => $value === 'foo');
```

<h3 id="array-lists-get">get()</h3>

_Runtime: O(1)_

To get the value at a certain index from an array list, call

```php
$value = $arrayList->get(123);
```

If the index is out of range, an `OutOfRangeException` will be thrown.

<h3 id="array-lists-index-of">indexOf()</h3>

_Runtime: O(n)_

To grab the index for a value, call

```php
$index = $arrayList->indexOf('foo');
```

<h3 id="array-lists-insert">insert()</h3>

_Runtime: O(1)_

To insert a value at a specific index, call

```php
$arrayList->insert(23, 'foo');
```

<h3 id="array-lists-intersect">intersect()</h3>

_Runtime: O(nm)_, n = number of values in the array list, and m = number of values in the parameter `iterable`

You can intersect an array list's values with any `iterable` (eg an array or even another `ArrayList`) by calling

```php
$intersectedList = $arrayList->intersect(['foo', 'bar']);
```

<h3 id="array-lists-map">map()</h3>

_Runtime: O(n)_

To apply a mapping to each value in the array list, call

```php
$mappedArrayList = $arrayList->map(fn(string $value): string => $value . 'baz');
```

<h3 id="array-lists-remove-index">removeIndex()</h3>

_Runtime: O(1)_

To remove a value by index, call

```php
$arrayList->removeIndex(123);
```

To remove a specific value, call

```php
$arrayList->removeValue('foo');
```

<h3 id="array-lists-reverse">reverse()</h3>

_Runtime: O(n)_

To reverse the values in the list, call

```php
$reversedList = $arrayList->reverse();
```

<h3 id="array-lists-sort">sort()</h3>

_Runtime: O(n log n)_

You can sort values similar to the way you can sort PHP arrays via `usort()`:

```php
$sortedList = $arrayList->sort(fn($a, $b): int => $a <=> $b);
```

<h3 id="array-lists-to-array">toArray()</h3>

_Runtime: O(1)_

You can get the underlying array by calling

```php
$array = $arrayList->toArray();
```

<h3 id="array-lists-union">union()</h3>

_Runtime: O(nm)_, n = number of values in the array list, and m = number of values in the parameter `iterable`

You can union an array list's values with any `iterable` (eg an array or even another `ArrayList`) via

```php
$unionedList = $arrayList->union(['foo', 'bar']);
```

<h2 id="hash-tables">Hash Tables</h2>

Hash tables are most similar to PHP's built-in associative array functionality - they map keys to values.  Unlike PHP associative arrays (which only supports scalars as keys), Aphiria's `HashTables` support scalars, objects, arrays, and resources as keys.  You can instantiate one with an associative array or a list of key-value pairs:

```php
use Aphiria\Collections\HashTable;
use function Aphiria\Collections\Functions\hash_table;

$hashTable = new HashTable();
// Or...
$hashTable = new HashTable(['foo' => 'bar']);
// Or...
$hashTable = new HashTable([new KeyValuePair('foo', 'bar')]); // Good for non-stringable keys
// Or...
$hashTable = hash_table(['foo' => 'bar']);
// Or...
$hashTable = hash_table([new KeyValuePair('foo', 'bar')]);
```

> **Note:** `HashTable` implements `ArrayAccess` and `IteratorAggregate`, so you can use array-like accessors and iterate over it. The keys will be numeric, and the values will be [key-value pairs](#key-value-pairs).

<h3 id="hash-tables-add">add()</h3>

_Runtime: O(1)_

To add a value, call

```php
$hashTable->add('foo', 'bar');
```

<h3 id="hash-tables-add-range">addRange()</h3>

_Runtime: O(n), n = number of values added_

To add multiple values at once, pass in an associative array or a list of `KeyValuePair` objects:

```php
$hashTable->addRange(['foo' => 'bar', 'baz' => 'blah']);
// Or...
$kvps = [
    new KeyValuePair('foo', 'bar'),
    new KeyValuePair('baz', 'blah'),
];
$hashTable->addRange($kvps);
```

<h3 id="hash-tables-clear">clear()</h3>

_Runtime: O(1)_

You can remove all values:

```php
$hashTable->clear();
```

<h3 id="hash-tables-contains-key">containsKey()</h3>

_Runtime: O(1)_

To check for a value, call

```php
$containsKey = $hashTable->containsKey('foo');
```

<h3 id="hash-tables-contains-value">containsValue()</h3>

_Runtime: O(n)_

To check for a key, call

```php
$containsValue = $hashTable->containsValue('foo');
```

<h3 id="hash-tables-count">count()</h3>

_Runtime: O(1)_

To get the number of values in the hash table, call

```php
$count = $hashTable->count();
```

<h3 id="hash-tables-filter">filter()</h3>

_Runtime: O(n)_

To filter out key-value pairs from the hash table, call

```php
$filteredHashTable = $hashTable->filter(fn(KeyValuePair $kvp): bool => $kvp->value === 'foo');
```

<h3 id="hash-tables-get">get()</h3>

_Runtime: O(1)_

To get a value at a key, call

```php
$value = $hashTable->get('foo');
```

If the value does not exist, an `OutOfBoundsException` will be thrown.

<h3 id="hash-tables-get-keys">keys</h3>

_Runtime: O(n)_

You can grab all of the keys in the hash table:

```php
$hashTable->keys;
```

<h3 id="hash-tables-map">map()</h3>

_Runtime: O(n)_

To apply a mapping to each key-value pair in the hash table, call

```php
$mappedHashTable = $hashTable->map(fn(KeyValuePair $kvp): KeyValuePair => new KeyValuePair($kvp->key, $kvp->value . 'baz'));
```

<h3 id="hash-tables-remove-key">removeKey()</h3>

_Runtime: O(1)_

To remove a value at a certain key, call

```php
$hashTable->removeKey('foo');
```

<h3 id="hash-tables-remove-value">removeValue()</h3>

_Runtime: O(n)_

To remove a value, call

```php
$hashTable->removeValue('foo');
```

<h3 id="hash-tables-to-array">toArray()</h3>

_Runtime: O(n)_

To get the underlying array, call

```php
$array = $hashTable->toArray();
```

This will return a list of `KeyValuePair` - not an associative array.  The reason for this is that keys can be non-strings, which is not supported in PHP.

<h3 id="hash-tables-try-get">tryGet()</h3>

_Runtime: O(1)_

If you would like to try to safely get a value that may or may not exist, use `tryGet()`.  It'll return `true` if the key exists, otherwise `false`.  It will also set the second parameter to the value if the key exists.

```php
$value = null;
$exists = $hashTable->tryGet('foo', $value);
```

<h3 id="hash-tables-get-values">values</h3>

_Runtime: O(n)_

You can grab all of the values in the hash table:

```php
$hashTable->values;
```

<h2 id="hash-sets">Hash Sets</h2>

Hash sets are lists with unique values.  They accept objects, scalars, arrays, and resources as values.  You can instantiate one with or without a list of values:

```php
use Aphiria\Collections\HashSet;
use function Aphiria\Collections\Functions\hash_set;

$set = new HashSet();
// Or...
$set = new HashSet(['foo', 'bar']);
// Or...
$set = hash_set(['foo', 'bar']);
```

> **Note:** `HashSet` implements `IteratorAggregate`, so you can iterate over it.

<h3 id="hash-sets-add">add()</h3>

_Runtime: O(1)_

You can add a value via

```php
$set->add('foo');
```

<h3 id="hash-sets-add-range">addRange()</h3>

_Runtime: O(n), n = number of values added_

You can add multiple values at once:

```php
$set->addRange(['foo', 'bar']);
```

<h3 id="hash-sets-clear">clear()</h3>

_Runtime: O(1)_

To remove all values in the set, call `clear()`:

```php
$set->clear();
```

<h3 id="hash-sets-contains-value">containsValue()</h3>

_Runtime: O(1)_

To check for a value, call

```php
$containsValue = $set->containsValue('foo');
```

<h3 id="hash-sets-count">count()</h3>

_Runtime: O(1)_

To grab the number of values in the hash set, call

```php
$count = $set->count();
```

<h3 id="hash-sets-filter">filter()</h3>

_Runtime: O(n)_

To filter out values in the hash set, call

```php
$filteredSet = $set->filter(fn(string $value): bool => $value === 'foo');
```

<h3 id="hash-sets-intersect">intersect()</h3>

_Runtime: O(nm), n = number of values in the hash set, and m = number of values in the parameter `iterable`_

You can intersect a hash set with any `iterable` (eg an array or even another `HashSet`) by calling

```php
$intersectedSet = $set->intersect(['foo', 'bar']);
```

<h3 id="hash-sets-map">map()</h3>

_Runtime: O(n)_

To apply a mapping to each value in the hash set, call

```php
$mappedSet = $set->map(fn(string $value): string => $value . 'baz');
```

<h3 id="hash-sets-remove-value">removeValue()</h3>

_Runtime: O(1)_

To remove a specific value, call

```php
$set->removeValue('foo');
```

<h3 id="hash-sets-sort">sort()</h3>

_Runtime: O(n log n)_

You can sort values similar to the way you can sort PHP arrays via `usort()`:

```php
$sortedSet = $set->sort(fn($a, $b): int => $a <=> $b);
```

<h3 id="hash-sets-to-array">toArray()</h3>

_Runtime: O(n)_

To get the underlying array, call

```php
$array = $set->toArray();
```

<h3 id="hash-sets-union">union()</h3>

_Runtime: O(nm), n = number of values in the hash set, and m = number of values in the parameter `iterable`_

You can union a hash set with any `iterable` (eg an array or even another `HashSet`) via

```php
$unionedSet = $set->union(['foo', 'bar']);
```

<h2 id="stacks">Stacks</h2>

Stacks are first-in, last-out (FILO) data structures.  To create one, call

```php
use Aphiria\Collections\Stack;
use function Aphiria\Collections\Functions\stack;

$stack = new Stack();
// Or...
$stack = stack();
```

> **Note:** `Stack` implements `IteratorAggregate`, so you can iterate over it.

<h3 id="stacks-clear">clear()</h3>

_Runtime: O(1)_

To clear the values in the stack, call

```php
$stack->clear();
```

<h3 id="stacks-contains-value">containsValue()</h3>

_Runtime: O(n)_

To check for a value within a stack, call

```php
$containsValue = $stack->containsValue('foo');
```

<h3 id="stacks-count">count()</h3>

_Runtime: O(1)_

To get the number of values in the stack, call

```php
$count = $stack->count();
```

<h3 id="stacks-peek">peek()</h3>

_Runtime: O(1)_

To peek at the top value in the stack, call

```php
$value = $stack->peek();
```

<h3 id="stacks-pop">pop()</h3>

_Runtime: O(1)_

To pop a value off the stack, call

```php
$value = $stack->pop();
```

If there are no values in the stack, this will return `null`.

<h3 id="stacks-push">push()</h3>

_Runtime: O(1)_

To push a value onto the stack, call

```php
$stack->push('foo');
```

If there are no values in the stack, this will return `null`.

<h3 id="stacks-to-array">toArray()</h3>

_Runtime: O(1)_

To get the underlying array, call

```php
$array = $stack->toArray();
```

<h2 id="queues">Queues</h2>

Queues are first-in, first-out (FIFO) data structures.  To create one, call

```php
use Aphiria\Collections\Queue;
use function Aphiria\Collections\Functions\queue;

$queue = new Queue();
// Or...
$queue = queue();
```

> **Note:** `Queue` implements `IteratorAggregate`, so you can iterate over it.

<h3 id="queues-clear">clear()</h3>

_Runtime: O(1)_

To clear the queue, call

```php
$queue->clear();
```

<h3 id="queues-contains-value">containsValue()</h3>

_Runtime: O(n)_

To check for a value within a queue, call

```php
$containsValue = $queue->containsValue('foo');
```

<h3 id="queues-count">count()</h3>

_Runtime: O(1)_

To get the number of values in the queue, call

```php
$count = $queue->count();
```

<h3 id="queues-dequeue">dequeue()</h3>

_Runtime: O(1)_

To dequeue a value from the queue, call

```php
$value = $queue->dequeue();
```

If there are no values in the queue, this will return `null`.

<h3 id="queues-enqueue">enqueue()</h3>

_Runtime: O(1)_

To enqueue a value onto the queue, call

```php
$queue->enqueue('foo');
```

<h3 id="queues-peek">peek()</h3>

_Runtime: O(1)_

To peek at the value at the beginning of the queue, call

```php
$value = $queue->peek();
```

If there are no values in the queue, this will return `null`.

<h3 id="queues-to-array">toArray()</h3>

_Runtime: O(1)_

To get the underlying array, call

```php
$array = $queue->toArray();
```

<h2 id="immutable-array-lists">Immutable Array Lists</h2>

`ImmutableArrayList` are read-only [array lists](#array-lists).  To instantiate one, pass in the array of values:

```php
use Aphiria\Collections\ImmutableArrayList;
use function Aphiria\Collections\Functions\immutable_array_list;

$arrayList = new ImmutableArrayList(['foo', 'bar']);
// Or...
$arrayList = immutable_array_list(['foo', 'bar']);
```

> **Note:** `ImmutableArrayList` implements `ArrayAccess` and `IteratorAggregate`, so you can use array-like accessors and iterate over it.

<h3 id="immutable-array-lists-contains-value">containsValue()</h3>

_Runtime: O(n)_

To check for a value, call

```php
$containsValue = $arrayList->containsValue('foo');
```

<h3 id="immutable-array-lists-count">count()</h3>

_Runtime: O(1)_

To grab the number of values in the array list, call

```php
$count = $arrayList->count();
```

<h3 id="immutable-array-lists-filter">filter()</h3>

_Runtime: O(n)_

To filter out values from the array list, call

```php
$filteredArrayList = $arrayList->filter(fn(string $value): bool => $value === 'foo');
```

<h3 id="immutable-array-lists-get">get()</h3>

_Runtime: O(1)_

To get the value at a certain index from an array list, call

```php
$value = $arrayList->get(123);
```

If the index is out of range, an `OutOfRangeException` will be thrown.

<h3 id="immutable-array-lists-index-of">indexOf()</h3>

_Runtime: O(n)_

To grab the index for a value, call

```php
$index = $arrayList->indexOf('foo');
```

<h3 id="immutable-array-lists-map">map()</h3>

_Runtime: O(n)_

To apply a mapping to each value in the array list, call

```php
$mappedArrayList = $arrayList->map(fn(string $value): string => $value . 'baz');
```

If the array list doesn't contain the value, `null` will be returned.

<h3 id="immutable-array-lists-to-array">toArray()</h3>

_Runtime: O(1)_

If you want to grab the underlying array, call

```php
$array = $arrayList->toArray();
```

<h2 id="immutable-hash-tables">Immutable Hash Tables</h2>

Sometimes, your business logic might dictate that a [hash table](#hash-tables) is read-only.  Aphiria provides support via `ImmutableHashTable`.  It requires that you pass an associative array or a list of key-value pairs into its constructor:

```php
use Aphiria\Collections\ImmutableHashTable;
use function Aphiria\Collections\Functions\immutable_hash_table;

$hashTable = new ImmutableHashTable(['foo' => 'bar']);
// Or...
$hashTable = new ImmutableHashTable([new KeyValuePair('foo', 'bar')]); // Good for non-stringable keys
// Or...
$hashTable = immutable_hash_table(['foo' => 'bar']);
// Or...
$hashTable = immutable_hash_table([new KeyValuePair('foo', 'bar')]);
```

> **Note:** `ImmutableHashTable` implements `ArrayAccess` and `IteratorAggregate`, so you can use array-like accessors and iterate over it. When iterating, the keys will be numeric, and the values will be [key-value pairs](#key-value-pairs).

<h3 id="immutable-hash-tables-contains-key">containsKey()</h3>

_Runtime: O(1)_

To check for a key, call

```php
$containsKey = $hashTable->containsKey('foo');
```

<h3 id="immutable-hash-tables-contains-value">containsValue()</h3>

_Runtime: O(n)_

To check for a value, call

```php
$containsValue = $hashTable->containsValue('foo');
```

<h3 id="immutable-hash-tables-count">count()</h3>

_Runtime: O(1)_

To get the number of values in the hash table, call

```php
$count = $hashTable->count();
```

<h3 id="immutable-hash-tables-filter">filter()</h3>

_Runtime: O(n)_

To filter out key-value pairs from the hash table, call

```php
$filteredHashTable = $hashTable->filter(fn(KeyValuePair $kvp): bool => $kvp->value === 'foo');
```

<h3 id="immutable-hash-tables-get">get()</h3>

_Runtime: O(1)_

To get a value at a key, call

```php
$value = $hashTable->get('foo');
```

If the value does not exist, an `OutOfBoundsException` will be thrown.

<h3 id="immutable-hash-tables-get-keys">keys</h3>

_Runtime: O(n)_

You can grab all of the keys in the hash table:

```php
$hashTable->keys;
```

<h3 id="immutable-hash-tables-map">map()</h3>

_Runtime: O(n)_

To apply a mapping to each key-value pair in the hash table, call

```php
$mappedHashTable = $hashTable->map(fn(KeyValuePair $kvp): KeyValuePair => new KeyValuePair($kvp->key, $kvp->value . 'baz'));
```

<h3 id="immutable-hash-tables-to-array">toArray()</h3>

_Runtime: O(n)_

To get the underlying array, call

```php
$array = $hashTable->toArray();
```

This will return a list of `KeyValuePair` - not an associative array.  The reason for this is that keys can be non-strings (eg objects) in hash tables, but keys in PHP associative arrays must be serializable.

<h3 id="immutable-hash-tables-try-get">tryGet()</h3>

_Runtime: O(1)_

If you would like to try to safely get a value that may or may not exist, use `tryGet()`.  It'll return `true` if the key exists, otherwise `false`.  It will also set the second parameter to the value if the key exists.

```php
$value = null;
$exists = $hashTable->tryGet('foo', $value);
```

<h3 id="immutable-hash-tables-get-values">values</h3>

_Runtime: O(n)_

You can grab all of the values in the hash table:

```php
$hashTable->values;
```

<h2 id="immutable-hash-sets">Immutable Hash Sets</h2>

Immutable hash sets are read-only [hash sets](#hash-sets).  They accept objects, scalars, arrays, and resources as values.  You can instantiate one with a list of values:

```php
use Aphiria\Collections\ImmutableHashSet;
use function Aphiria\Collections\Functions\immutable_hash_set;

$set = new ImmutableHashSet(['foo', 'bar']);
// Or...
$set = immutable_hash_set(['foo', 'bar']);
```

> **Note:** `ImmutableHashSet` implements `IteratorAggregate`, so you can iterate over it.

<h3 id="immutable-hash-sets-contains-value">containsValue()</h3>

_Runtime: O(1)_

To check for a value, call

```php
$containsValue = $set->containsValue('foo');
```

<h3 id="immutable-hash-sets-count">count()</h3>

_Runtime: O(1)_

To grab the number of values in the set, call

```php
$count = $set->count();
```

<h3 id="immutable-hash-sets-filter">filter()</h3>

_Runtime: O(n)_

To filter out values in the hash set, call

```php
$filteredSet = $set->filter(fn(string $value): bool => $value === 'foo');
```

<h3 id="immutable-hash-sets-map">map()</h3>

_Runtime: O(n)_

To apply a mapping to each value in the hash set, call

```php
$mappedSet = $set->map(fn(string $value): string => $value . 'baz');
```

<h3 id="immutable-hash-sets-to-array">toArray()</h3>

_Runtime: O(n)_

To get the underlying array, call

```php
$array = $set->toArray();
```
