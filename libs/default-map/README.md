# DefaultMap

Javascript utility to mimic python's `collections.defaultdict`.
Allows you to make `Map` objects with a default value when a key is not found.

## Usage

```ts
import { DefaultMap, SetMap, MapMap, ArrayMap } from "@crafts/default-map";

// Create a map that returns "default value" for inexistent keys
const map = new DefaultMap(() => "default value");
map.get("inexistent key"); // === "default value"

// Readily available empty sets
const setMap = new SetMap();
const categoryA = setMap.get("category a"); // === new empty Set object

categoryA.add("value 1");
categoryA.clear();
setMap.has("category a"); // === true, keys are kept even if the set is empty

// Same thing for maps and arrays
const mapMap = new MapMap();
mapMap.get("missing key"); // === new empty Map object

const arrayMap = new ArrayMap();
arrayMap.get("missing key"); // === new empty Array object
```
