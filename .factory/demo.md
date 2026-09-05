# Demo sandbox

Open [the demo](/demo) or append `?demo=1` to the home URL. The landing page
also has a **Try it with sample data** action.

The demo seeds four realistic practice rehearsals: a staff update, class
introduction, project briefing, and panel answer. Each has a target band,
estimated words per minute, time in range, and accessible pace samples.

The banner remains visible for the whole demo: **Demo — sample data, nothing
is saved**. **Reset demo** restores the shipped sample. **Start for real**
deletes the demo namespace and opens the ordinary pacer.

The sandbox uses `demo:pace-settings`, `demo:pace-theme`, and demo-prefixed
license keys in localStorage. Its IndexedDB database is `demo:pace-trail`.
Real use has separate unprefixed keys and the `pace-trail` IndexedDB database;
the demo never reads or writes either.

Every entry in `claims.json` starts from this route and runs from the documented
clean setup: `npm ci`, then the command recorded for that claim.
