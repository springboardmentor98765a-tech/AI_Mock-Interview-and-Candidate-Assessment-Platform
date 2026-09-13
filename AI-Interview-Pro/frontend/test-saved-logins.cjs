const assert = require("node:assert/strict");
const store = require("./saved-login-store.js");

function memoryStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(key, String(value)); },
        removeItem(key) { data.delete(key); }
    };
}

const storage = memoryStorage();

store.upsert("admin@example.com", "Admin123", "admin", storage);
assert.deepEqual(store.get(storage), [{
    email: "admin@example.com",
    password: "Admin123",
    role: "admin"
}], "admin credentials must be saved together");

store.upsert("candidate@example.com", "Candidate123", "candidate", storage);
store.upsert("ADMIN@example.com", "UpdatedAdmin123", "admin", storage);
assert.equal(store.get(storage).length, 2, "email matching should not create duplicates");
assert.equal(store.get(storage)[0].password, "UpdatedAdmin123", "a successful login must update the saved password");

storage.setItem(store.KEY, JSON.stringify([
    ...store.get(storage),
    { email: "unverified@example.com", password: "secret" },
    { email: "unknown@example.com", password: "secret", role: "owner" }
]));
assert.equal(store.get(storage).length, 2, "malformed or unknown-role records must not be displayed");
assert.equal(store.get(storage).every(account => "password" in account), true, "each valid saved login must include a password field");

store.remove("candidate@example.com", storage);
assert.deepEqual(store.get(storage).map(account => account.role), ["admin"], "one account can be removed without affecting admin");
assert.equal(store.get(storage)[0].password, "UpdatedAdmin123", "removing another account must preserve the saved password");

store.clear(storage);
assert.deepEqual(store.get(storage), [], "remove all should empty the saved login manager");

console.log("Saved-login storage tests passed.");
