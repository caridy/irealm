# IRealm Library

This experimental library provides an abstraction on top of the Realm Proposal API (Stage 2 - Callable Boundary) to imitate what a same domain iframe does with a regular Window, providing access to multiple globals.

This library (which is around 2k gzipped) relies on a membrane implementation to provide full access to the `globalThis` of the newly created realm.

